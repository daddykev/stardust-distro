// functions/index.js
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const admin = require('firebase-admin')
const ftp = require('basic-ftp')
const { Client: SSHClient } = require('ssh2')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')
const { BlobServiceClient } = require('@azure/storage-blob')
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs');           // streaming APIs
const fsp = fs.promises;            // promise APIs
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { Buffer } = require('buffer')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')

// Security imports
const { requireAuth, requireTenantAccess, checkRateLimit } = require('./middleware/auth')
const { validateWith, sanitizeInputs, validateFileUpload } = require('./middleware/validation')
const { cleanForFirestore } = require('./utils/validation')

const { encryptSensitiveData, decryptSensitiveData } = require('./encryption')

const cors = require('cors');
const express = require('express');

// Initialize Firebase Admin
admin.initializeApp()
const db = admin.firestore()
const storage = admin.storage()

// Configure CORS
const corsOptions = {
  origin: [
    'https://stardust-distro.org',
    'https://stardust-distro.web.app',
    'https://stardust-distro.firebaseapp.com',
    'https://*.cloudfunctions.net',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

// Create Express app for API routes
const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// Import Deezer API routes
const deezerRoutes = require('./api/deezer');
app.use('/deezer', deezerRoutes);

// Import Spotify API routes
const spotifyRoutes = require('./api/spotify');
app.use('/spotify', spotifyRoutes);

// Export the Express app as a Cloud Function
exports.api = onRequest(app);

// Encryption functions
exports.encryptSensitiveData = encryptSensitiveData
exports.decryptSensitiveData = decryptSensitiveData

// Set global options for v2 functions
setGlobalOptions({
  maxInstances: 10,
  region: 'us-central1',
  timeoutSeconds: 540, // 9 minutes for large file transfers
  memory: '1GB'
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate MD5 hash of a buffer
 */
function calculateMD5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

/**
 * Callable function for MD5 calculation with security
 */
exports.calculateFileMD5 = onCall({
  timeoutSeconds: 60,
  memory: '256MB',
  cors: true
}, async (request) => {
  // Validate auth
  requireAuth(request);
  
  // Validate and sanitize input
  validateWith('calculateMD5')(request);
  
  // Rate limiting: 100 requests per minute
  await checkRateLimit(request.auth.uid, 100, 60000);
  
  const { url } = request.data;
  
  try {
    console.log(`Calculating MD5 for: ${url}`)
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 500 * 1024 * 1024 // 500MB max
    })
    
    const buffer = Buffer.from(response.data)
    const md5Hash = calculateMD5(buffer)
    
    return {
      url,
      md5: md5Hash,
      size: buffer.length
    }
  } catch (error) {
    console.error('Error calculating MD5:', error)
    throw new HttpsError('internal', `Failed to calculate MD5: ${error.message}`)
  }
})

// ============================================================================
// LOGGING HELPER
// ============================================================================

/**
 * Add a log entry to the delivery record
 */
async function addDeliveryLog(deliveryId, logEntry) {
  try {
    const timestamp = admin.firestore.Timestamp.now()
    const log = cleanForFirestore({
      timestamp,
      level: logEntry.level || 'info',
      step: logEntry.step || 'general',
      message: logEntry.message,
      details: logEntry.details,
      duration: logEntry.duration
    })
    
    // Update the delivery document with the new log
    await db.collection('deliveries').doc(deliveryId).update({
      logs: admin.firestore.FieldValue.arrayUnion(log),
      lastLogAt: timestamp,
      currentStep: logEntry.step
    })
    
    // Also log to console for debugging
    console.log(`[${log.level.toUpperCase()}] ${deliveryId} - ${log.step}: ${log.message}`)
    
    return log
  } catch (error) {
    console.error('Error adding delivery log:', error)
  }
}

// ============================================================================
// SCHEDULED FUNCTIONS (No auth needed for system functions)
// ============================================================================

/**
 * Process delivery queue - runs every minute
 */
exports.processDeliveryQueue = onSchedule({
  schedule: '* * * * *',
  timeoutSeconds: 540,
  memory: '1GB',
  maxInstances: 3
}, async (event) => {
  try {
    console.log('Processing delivery queue...')
    
    // Get queued deliveries
    const now = admin.firestore.Timestamp.now()
    const snapshot = await db.collection('deliveries')
      .where('status', '==', 'queued')
      .limit(10)
      .get()

    if (snapshot.empty) {
      console.log('No deliveries to process')
      return { processed: 0 }
    }

    // Filter and process deliveries with lock protection
    const promises = []
    
    for (const doc of snapshot.docs) {
      const delivery = { id: doc.id, ...doc.data() }
      
      // Check if scheduledAt is in the past
      if (delivery.scheduledAt && delivery.scheduledAt.toMillis() <= now.toMillis()) {
        // Try to acquire lock before processing
        const lockResult = await acquireDeliveryLock(delivery.id, delivery.idempotencyKey)
        
        if (lockResult.acquired) {
          console.log(`Processing delivery ${delivery.id} with idempotency key: ${delivery.idempotencyKey}`)
          
          // Process the delivery with lock protection
          promises.push(
            processDeliveryWithLock(delivery.id, delivery, lockResult.lockData)
              .catch(error => {
                console.error(`Error processing ${delivery.id}:`, error)
                // Release lock on error
                releaseDeliveryLock(delivery.id, delivery.idempotencyKey, 'failed', { error: error.message })
                throw error
              })
          )
        } else {
          console.log(`Skipping delivery ${delivery.id}: ${lockResult.reason}`)
          
          // If already completed, update the delivery status
          if (lockResult.reason === 'completed' && lockResult.result) {
            await db.collection('deliveries').doc(delivery.id).update({
              status: 'completed',
              completedAt: admin.firestore.Timestamp.now(),
              note: 'Completed by another worker'
            })
          }
        }
      }
    }

    const results = await Promise.allSettled(promises)
    
    const processed = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    console.log(`Processed ${processed} deliveries, ${failed} failed`)
    return { processed, failed }
  } catch (error) {
    console.error('Error processing delivery queue:', error)
    throw error
  }
})

// ============================================================================
// CALLABLE FUNCTIONS WITH SECURITY
// ============================================================================

/**
 * FTP Delivery Handler
 */
exports.deliverFTP = onCall({
  timeoutSeconds: 300,
  memory: '512MB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  // Verify authentication
  requireAuth(request);
  
  // Validate input
  validateWith('deliverFTP')(request);
  
  // Rate limiting: 20 deliveries per minute
  await checkRateLimit(request.auth.uid, 20, 60000);
  
  const { target, package: deliveryPackage } = request.data;
  
  // Additional file validation
  if (deliveryPackage.files) {
    deliveryPackage.files.forEach(file => {
      validateFileUpload(file);
    });
  }
  
  try {
    return await deliverViaFTP(target, deliveryPackage)
  } catch (error) {
    console.error('FTP delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * SFTP Delivery Handler
 */
exports.deliverSFTP = onCall({
  timeoutSeconds: 300,
  memory: '512MB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('deliverSFTP')(request);
  await checkRateLimit(request.auth.uid, 20, 60000);
  
  const { target, package: deliveryPackage } = request.data;
  
  if (deliveryPackage.files) {
    deliveryPackage.files.forEach(file => {
      validateFileUpload(file);
    });
  }
  
  try {
    return await deliverViaSFTP(target, deliveryPackage)
  } catch (error) {
    console.error('SFTP delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * S3 Delivery Handler
 */
exports.deliverS3 = onCall({
  timeoutSeconds: 300,
  memory: '1GB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('deliverS3')(request);
  await checkRateLimit(request.auth.uid, 20, 60000);
  
  const { target, package: deliveryPackage } = request.data;
  
  if (deliveryPackage.files) {
    deliveryPackage.files.forEach(file => {
      validateFileUpload(file);
    });
  }
  
  try {
    return await deliverViaS3(target, deliveryPackage)
  } catch (error) {
    console.error('S3 delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * API Delivery Handler
 */
exports.deliverAPI = onCall({
  timeoutSeconds: 300,
  memory: '512MB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('deliverAPI')(request);
  await checkRateLimit(request.auth.uid, 20, 60000);
  
  const { target, package: deliveryPackage } = request.data;
  
  try {
    // Check if this is a DSP delivery that needs special handling
    if (target.type === 'DSP' && deliveryPackage.distributorId) {
      return await deliverToDSP(target, deliveryPackage)
    } else {
      return await deliverViaAPI(target, deliveryPackage)
    }
  } catch (error) {
    console.error('API delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Azure Delivery Handler
 */
exports.deliverAzure = onCall({
  timeoutSeconds: 300,
  memory: '1GB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('deliverAzure')(request);
  await checkRateLimit(request.auth.uid, 20, 60000);
  
  const { target, package: deliveryPackage } = request.data;
  
  if (deliveryPackage.files) {
    deliveryPackage.files.forEach(file => {
      validateFileUpload(file);
    });
  }
  
  try {
    return await deliverViaAzure(target, deliveryPackage)
  } catch (error) {
    console.error('Azure delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Get Delivery Analytics
 */
exports.getDeliveryAnalytics = onCall({
  timeoutSeconds: 60,
  memory: '256MB',
  maxInstances: 10,
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('getDeliveryAnalytics')(request);
  await checkRateLimit(request.auth.uid, 60, 60000); // 60 requests per minute
  
  const { tenantId, startDate, endDate } = request.data;
  
  // Verify tenant access
  await requireTenantAccess(request, tenantId);
  
  try {
    const deliveries = await db.collection('deliveries')
      .where('tenantId', '==', tenantId)
      .where('createdAt', '>=', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .where('createdAt', '<=', endDate || new Date())
      .get()

    const analytics = {
      total: 0,
      completed: 0,
      failed: 0,
      queued: 0,
      processing: 0,
      cancelled: 0,
      byTarget: {},
      byProtocol: {},
      byMessageType: {},
      averageDeliveryTime: 0,
      successRate: 0
    }

    let totalDeliveryTime = 0
    let completedCount = 0

    deliveries.forEach(doc => {
      const delivery = doc.data()
      analytics.total++
      
      // Count by status
      if (analytics[delivery.status] !== undefined) {
        analytics[delivery.status]++
      }

      // Count by message type
      const messageSubType = delivery.messageSubType || 'Initial'
      if (!analytics.byMessageType[messageSubType]) {
        analytics.byMessageType[messageSubType] = 0
      }
      analytics.byMessageType[messageSubType]++

      // By target
      if (!analytics.byTarget[delivery.targetName]) {
        analytics.byTarget[delivery.targetName] = {
          total: 0,
          completed: 0,
          failed: 0
        }
      }
      analytics.byTarget[delivery.targetName].total++
      
      if (delivery.status === 'completed') {
        analytics.byTarget[delivery.targetName].completed++
      } else if (delivery.status === 'failed') {
        analytics.byTarget[delivery.targetName].failed++
      }

      // By protocol
      if (delivery.targetProtocol) {
        if (!analytics.byProtocol[delivery.targetProtocol]) {
          analytics.byProtocol[delivery.targetProtocol] = 0
        }
        analytics.byProtocol[delivery.targetProtocol]++
      }

      // Calculate delivery time for completed deliveries
      if (delivery.status === 'completed' && delivery.startedAt && delivery.completedAt) {
        const deliveryTime = delivery.completedAt.toMillis() - delivery.startedAt.toMillis()
        totalDeliveryTime += deliveryTime
        completedCount++
      }
    })

    if (completedCount > 0) {
      analytics.averageDeliveryTime = Math.round(totalDeliveryTime / completedCount / 1000) // in seconds
    }

    if (analytics.total > 0) {
      analytics.successRate = Math.round((analytics.completed / analytics.total) * 100)
    }

    return analytics
  } catch (error) {
    console.error('Analytics error:', error)
    throw new HttpsError('internal', error.message)
  }
})

// ============================================================================
// DELIVERY PROCESSING FUNCTIONS WITH ENHANCED LOGGING AND MESSAGE TYPE SUPPORT
// ============================================================================

/**
 * Process individual delivery with comprehensive logging and message type support
 */
async function processDelivery(deliveryId, delivery) {
  const startTime = Date.now()
  
  try {
    console.log(`Starting delivery ${deliveryId} to ${delivery.targetName}`)
    console.log(`Idempotency Key: ${delivery.idempotencyKey}`)
    console.log(`Message Type: ${delivery.messageType}, SubType: ${delivery.messageSubType}`)
    
    // Log: Starting delivery with idempotency info
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'initialization',
      message: `Starting cloud function delivery process (${delivery.messageSubType || 'Initial'} message)`,
      details: {
        messageType: delivery.messageType || 'NewReleaseMessage',
        messageSubType: delivery.messageSubType || 'Initial',
        idempotencyKey: delivery.idempotencyKey
      }
    })
    
    // Update status to processing
    await db.collection('deliveries').doc(deliveryId).update({
      status: 'processing',
      startedAt: admin.firestore.Timestamp.now()
    })

    // Log: Loading target configuration
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'target_configuration',
      message: 'Loading delivery target configuration'
    })

    // Get target configuration
    const targetDoc = await db.collection('deliveryTargets')
      .doc(delivery.targetId)
      .get()
    
    if (!targetDoc.exists) {
      throw new Error('Delivery target not found')
    }

    const target = targetDoc.data()
    
    // Merge delivery connection info with target (delivery might have more recent config)
    if (delivery.connection) {
      target.connection = { ...target.connection, ...delivery.connection }
    }
    
    // Merge config data
    if (delivery.config) {
      target.config = { ...target.config, ...delivery.config }
    }
    
    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 'target_configuration',
      message: `Target loaded: ${target.name} (${target.protocol || delivery.targetProtocol})`,
      details: {
        protocol: target.protocol || delivery.targetProtocol,
        type: target.type,
        endpoint: target.connection?.endpoint ? 'configured' : 'not configured',
        messageSubType: delivery.messageSubType || 'Initial'
      }
    })
    
    console.log(`Target protocol: ${target.protocol || delivery.targetProtocol}`)
    console.log(`Target endpoint: ${target.connection?.endpoint || 'Not configured'}`)
    console.log(`Message SubType: ${delivery.messageSubType || 'Initial'}`)
    
    // Use protocol from delivery if target doesn't have it
    const protocol = target.protocol || delivery.targetProtocol
    
    // Log: Preparing package
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'package_preparation',
      message: `Preparing ${delivery.messageSubType || 'Initial'} delivery package with DDEX naming`
    })
    
    // Prepare delivery package with DSP-specific data
    const deliveryPackage = await prepareDeliveryPackage(delivery)
    
    // Add distributor ID and other DSP-specific data
    if (target.type === 'DSP' || delivery.targetType === 'DSP') {
      deliveryPackage.distributorId = delivery.config?.distributorId || 
                                     target.config?.distributorId || 
                                     'stardust-distro'
      deliveryPackage.ernXml = delivery.ernXml
      deliveryPackage.releaseTitle = delivery.releaseTitle
      deliveryPackage.releaseArtist = delivery.releaseArtist
      deliveryPackage.audioFiles = delivery.package?.audioFiles || []
      deliveryPackage.imageFiles = delivery.package?.imageFiles || []
      deliveryPackage.upc = delivery.upc
      deliveryPackage.messageSubType = delivery.messageSubType || 'Initial'
    }

    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 'package_preparation',
      message: `${delivery.messageSubType || 'Initial'} package prepared with ${deliveryPackage.files.length} files (DDEX naming applied)`,
      details: {
        audioFiles: deliveryPackage.audioFiles?.length || 0,
        imageFiles: deliveryPackage.imageFiles?.length || 0,
        ernIncluded: !!deliveryPackage.ernXml,
        upc: deliveryPackage.upc,
        messageSubType: delivery.messageSubType || 'Initial'
      }
    })

    // Log: Starting delivery execution
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'delivery_execution',
      message: `Starting ${protocol} delivery of ${delivery.messageSubType || 'Initial'} message to ${target.name}`
    })

    // Execute delivery based on protocol
    let result
    const deliveryStartTime = Date.now()
    
    switch (protocol) {
      case 'FTP':
        result = await deliverViaFTP(target, deliveryPackage, deliveryId)
        break
      case 'SFTP':
        result = await deliverViaSFTP(target, deliveryPackage, deliveryId)
        break
      case 'S3':
        result = await deliverViaS3(target, deliveryPackage, deliveryId)
        break
      case 'API':
        // Check if this is a DSP delivery
        if (target.type === 'DSP' || delivery.targetType === 'DSP') {
          result = await deliverToDSP(target, deliveryPackage)
        } else {
          result = await deliverViaAPI(target, deliveryPackage, deliveryId)
        }
        break
      case 'Azure':
        result = await deliverViaAzure(target, deliveryPackage, deliveryId)
        break
      case 'storage':
      case 'Storage':
      case 'STORAGE':
        result = await deliverViaStorage(target, deliveryPackage, deliveryId)
        break
      default:
        throw new Error(`Unsupported protocol: ${protocol}`)
    }
    
    const deliveryDuration = Date.now() - deliveryStartTime

    // Build clean details object for log
    const executionDetails = cleanForFirestore({
      filesDelivered: result.files?.length || 0,
      bytesTransferred: result.bytesTransferred || 0,
      messageSubType: delivery.messageSubType || 'Initial',
      acknowledgmentId: result.acknowledgmentId,
      deliveryId: result.deliveryId
    })

    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 'delivery_execution',
      message: `${delivery.messageSubType || 'Initial'} delivery completed via ${protocol}`,
      duration: deliveryDuration,
      details: executionDetails
    })

    // Log: Generating receipt
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'receipt_generation',
      message: 'Generating delivery receipt'
    })

    // Update delivery as completed - FIX: Clean undefined values
    const totalDuration = Date.now() - startTime
    
    // Build receipt object with only defined values
    const receipt = cleanForFirestore({
      acknowledgment: result.acknowledgment || 'Delivery completed successfully',
      timestamp: admin.firestore.Timestamp.now(),
      files: result.files || [],
      messageSubType: delivery.messageSubType || 'Initial',
      dspMessageId: result.messageId,
      acknowledgmentId: result.acknowledgmentId,
      deliveryId: result.deliveryId,
      bytesTransferred: result.bytesTransferred
    })
    
    await db.collection('deliveries').doc(deliveryId).update({
      status: 'completed',
      completedAt: admin.firestore.Timestamp.now(),
      totalDuration,
      receipt
    })

    // Record in delivery history for successful completion - FIX: Clean undefined values
    if (delivery.status !== 'test') {
      const historyRecord = cleanForFirestore({
        releaseId: delivery.releaseId,
        targetId: delivery.targetId,
        targetName: delivery.targetName,
        messageType: delivery.messageType || 'NewReleaseMessage',
        messageSubType: delivery.messageSubType || 'Initial',
        ernVersion: delivery.ernVersion || '4.3',
        messageId: delivery.ernMessageId,
        deliveryId: deliveryId,
        tenantId: delivery.tenantId,
        status: 'completed',
        deliveredAt: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
        receipt: {
          acknowledgmentId: result.acknowledgmentId,
          dspMessageId: result.messageId,
          bytesTransferred: result.bytesTransferred
        }
      })
      
      await db.collection('deliveryHistory').add(historyRecord)
      
      console.log(`Recorded ${delivery.messageSubType || 'Initial'} delivery in history for release ${delivery.releaseId}`)
    }

    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 'completion',
      message: `${delivery.messageSubType || 'Initial'} delivery completed successfully in ${Math.round(totalDuration / 1000)}s`,
      duration: totalDuration,
      details: {
        protocol,
        targetName: target.name,
        totalFiles: result.files?.length || 0,
        messageSubType: delivery.messageSubType || 'Initial'
      }
    })

    // Send success notification
    await sendNotification({ ...delivery, id: deliveryId }, 'success', {
      ...result,
      messageSubType: delivery.messageSubType || 'Initial'
    })

    console.log(`Delivery ${deliveryId} completed successfully (${delivery.messageSubType || 'Initial'} message)`)
    return result
  } catch (error) {
    console.error(`Error processing delivery ${deliveryId}:`, error)
    
    await addDeliveryLog(deliveryId, {
      level: 'error',
      step: 'error_handling',
      message: `${delivery.messageSubType || 'Initial'} delivery failed: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack,
        messageSubType: delivery.messageSubType || 'Initial'
      }
    })
    
    // Handle retry logic
    await handleDeliveryError(deliveryId, { ...delivery, id: deliveryId }, error)
    
    throw error
  }
}

/**
 * Handle delivery error with retry logic and logging - FIXED
 */
async function handleDeliveryError(deliveryId, delivery, error) {
  const attemptNumber = (delivery.attempts?.length || 0) + 1
  const maxRetries = 3
  const retryDelays = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000] // 5min, 15min, 1hr

  const attempt = cleanForFirestore({
    attemptNumber,
    startTime: admin.firestore.Timestamp.now(),
    endTime: admin.firestore.Timestamp.now(),
    status: 'failed',
    error: error.message,
    messageSubType: delivery.messageSubType
  })

  if (attemptNumber < maxRetries) {
    // Schedule retry
    const retryDelay = retryDelays[attemptNumber - 1]
    const scheduledAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + retryDelay
    )

    await addDeliveryLog(deliveryId, {
      level: 'warning',
      step: 'retry_scheduled',
      message: `Scheduling retry ${attemptNumber}/${maxRetries} in ${retryDelay / 60000} minutes`,
      details: {
        attemptNumber,
        retryDelay,
        error: error.message,
        messageSubType: delivery.messageSubType || 'Initial'
      }
    })

    await db.collection('deliveries').doc(deliveryId).update({
      status: 'queued',
      attempts: admin.firestore.FieldValue.arrayUnion(attempt),
      scheduledAt,
      lastError: error.message,
      retryCount: attemptNumber
    })

    console.log(`Scheduled retry #${attemptNumber} for delivery ${deliveryId}`)
    
    // Send retry notification - ensure delivery has id
    await sendNotification({ ...delivery, id: deliveryId }, 'retry', {
      attemptNumber,
      nextRetryIn: retryDelay / 1000,
      messageSubType: delivery.messageSubType || 'Initial'
    })
  } else {
    // Max retries reached
    await addDeliveryLog(deliveryId, {
      level: 'error',
      step: 'max_retries',
      message: `Maximum retries (${maxRetries}) exceeded - delivery failed permanently`,
      details: {
        attempts: attemptNumber,
        finalError: error.message,
        messageSubType: delivery.messageSubType || 'Initial'
      }
    })

    await db.collection('deliveries').doc(deliveryId).update({
      status: 'failed',
      attempts: admin.firestore.FieldValue.arrayUnion(attempt),
      failedAt: admin.firestore.Timestamp.now(),
      error: error.message
    })

    console.log(`Delivery ${deliveryId} failed after ${attemptNumber} attempts`)
    
    // Send failure notification - ensure delivery has id
    await sendNotification({ ...delivery, id: deliveryId }, 'failed', {
      error: error.message,
      attempts: attemptNumber,
      messageSubType: delivery.messageSubType || 'Initial'
    })
  }
}

/**
 * Prepare delivery package with DDEX naming and message type support - FIXED
 */
async function prepareDeliveryPackage(delivery) {
  const files = []

  // Get the release for UPC/barcode and track information
  const releaseDoc = await db.collection('releases').doc(delivery.releaseId).get()
  if (!releaseDoc.exists) {
    throw new Error('Release not found')
  }
  
  const release = releaseDoc.data()
  const upc = release.basic?.barcode || delivery.upc || '0000000000000'
  const discNumber = '01' // Default to disc 01 for now
  const messageSubType = delivery.messageSubType || 'Initial'
  
  // Log UPC and message type being used
  console.log(`Preparing ${messageSubType} package with UPC: ${upc}`)
  
  // Add ERN file (already contains properly escaped URLs and correct message type)
  if (delivery.ernXml) {
    const ernFile = cleanForFirestore({
      name: `${delivery.ernMessageId}.xml`,
      content: delivery.ernXml,
      type: 'text/xml',
      isERN: true,
      messageSubType: delivery.messageSubType
    })
    
    files.push(ernFile)
  }

  // For takedown messages, we may not need to include audio/image files
  if (messageSubType !== 'Takedown') {
    // Add audio files with DDEX naming
    if (delivery.package?.audioFiles && release.tracks) {
      delivery.package.audioFiles.forEach((audioUrl, index) => {
        if (audioUrl) {
          const track = release.tracks[index]
          const trackNumber = String(track?.sequenceNumber || index + 1).padStart(3, '0')
          
          // Extract original extension from URL
          const originalExt = extractFileExtension(audioUrl)
          
          // DDEX standard: UPC_DiscNumber_TrackNumber.extension
          const ddexFileName = `${upc}_${discNumber}_${trackNumber}.${originalExt}`
          
          console.log(`Audio file ${index + 1}: ${extractFileName(audioUrl)} → ${ddexFileName}`)
          
          const audioFile = cleanForFirestore({
            name: ddexFileName,  // This is what will be used for delivery
            originalName: extractFileName(audioUrl),  // Keep for reference
            url: audioUrl,
            type: 'audio',
            needsDownload: true,
            trackNumber: track?.sequenceNumber || index + 1,
            isrc: track?.isrc
          })
          
          files.push(audioFile)
        }
      })
    }

    // Add image files with DDEX naming
    if (delivery.package?.imageFiles) {
      delivery.package.imageFiles.forEach((imageUrl, index) => {
        if (imageUrl) {
          // Main cover art uses UPC as filename
          // Additional images get numbered suffixes
          const ddexFileName = index === 0 ? `${upc}.jpg` : `${upc}_${String(index + 1).padStart(2, '0')}.jpg`
          
          console.log(`Image file ${index + 1}: ${extractFileName(imageUrl)} → ${ddexFileName}`)
          
          files.push({
            name: ddexFileName,  // This is what will be used for delivery
            originalName: extractFileName(imageUrl),  // Keep for reference
            url: imageUrl,
            type: 'image',
            needsDownload: true,
            imageType: index === 0 ? 'FrontCover' : 'Additional'
          })
        }
      })
    }
  }

  // Get target configuration to add authentication data
  const targetDoc = await db.collection('deliveryTargets').doc(delivery.targetId).get()
  const target = targetDoc.exists ? targetDoc.data() : null
  
  // Build the complete package with authentication and message type
  const deliveryPackage = {
    deliveryId: delivery.id,
    releaseTitle: delivery.releaseTitle,
    releaseArtist: delivery.releaseArtist,
    targetName: delivery.targetName,
    upc,
    files,
    metadata: {
      messageId: delivery.ernMessageId,
      messageType: delivery.messageType || 'NewReleaseMessage',
      messageSubType: messageSubType,
      testMode: delivery.testMode || false,
      priority: delivery.priority || 'normal',
      timestamp: Date.now()
    }
  }
  
  // Add DSP-specific authentication data if it exists
  if (target && target.type === 'DSP' && target.config?.distributorId) {
    deliveryPackage.distributorId = target.config.distributorId
    deliveryPackage.metadata.distributorId = target.config.distributorId
  }
  
  // Log the DDEX file naming summary
  console.log(`DDEX File Naming Applied for ${messageSubType} message:`)
  console.log(`  UPC: ${upc}`)
  console.log(`  ERN: ${files.find(f => f.isERN)?.name || 'N/A'}`)
  console.log(`  Audio files: ${files.filter(f => f.type === 'audio').map(f => f.name).join(', ') || 'None'}`)
  console.log(`  Image files: ${files.filter(f => f.type === 'image').map(f => f.name).join(', ') || 'None'}`)
  
  return deliveryPackage
}

// ============================================================================
// PROTOCOL IMPLEMENTATIONS WITH DDEX NAMING AND MD5 HASHING
// ============================================================================

/**
 * FTP Delivery Implementation with DDEX naming and MD5 hashing
 */
async function deliverViaFTP(target, deliveryPackage, deliveryId) {
  const client = new ftp.Client()
  const tempDir = path.join(os.tmpdir(), `delivery_${Date.now()}`)
  
  try {
    await fs.mkdir(tempDir, { recursive: true })
    
    if (deliveryId && deliveryId !== 'test') {
      await addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'ftp_connection',
        message: `Connecting to FTP server: ${target.host || target.connection?.host}`
      })
    }
    
    // Connect to FTP server
    await client.access({
      host: target.host || target.connection?.host,
      port: target.port || target.connection?.port || 21,
      user: target.username || target.connection?.username,
      password: target.password || target.connection?.password,
      secure: target.secure || target.connection?.secure || false,
      pasv: true,  // Enable passive mode by default
      connTimeout: 10000,
      pasvTimeout: 10000,
      keepalive: 5000
    })

    // Change to target directory
    const directory = target.directory || target.connection?.directory
    if (directory) {
      await client.ensureDir(directory)
      await client.cd(directory)
    }

    const uploadedFiles = []

    // Upload each file with DDEX naming and MD5 hashing
    for (const file of deliveryPackage.files) {
      // Use DDEX name for local file
      const localPath = path.join(tempDir, file.name)
      
      console.log(`FTP: Processing ${file.name} (original: ${file.originalName || 'ERN'})`)
      
      let fileContent
      let md5Hash
      
      // Download file from Storage if needed
      if (file.needsDownload) {
        await downloadFile(file.url, localPath)
        // Calculate MD5 after download
        fileContent = await fsp.readFile(localPath)
        md5Hash = calculateMD5(fileContent)
      } else {
        // Write ERN XML directly
        fileContent = Buffer.from(file.content, 'utf8')
        await fsp.writeFile(localPath, fileContent)
        md5Hash = calculateMD5(fileContent)
      }

      // Upload to FTP with DDEX name
      await client.uploadFrom(localPath, file.name)
      
      const uploadedFile = cleanForFirestore({
        name: file.name, // DDEX name
        size: fileContent.length,
        md5Hash: md5Hash,
        uploadedAt: new Date().toISOString(),
        originalName: file.originalName
      })
      
      uploadedFiles.push(uploadedFile)

      console.log(`FTP: Uploaded ${file.name} (MD5: ${md5Hash})`)

      // Clean up local file
      await fsp.unlink(localPath)
    }

    await client.close()
    
    if (deliveryId && deliveryId !== 'test') {
      await addDeliveryLog(deliveryId, {
        level: 'success',
        step: 'ftp_upload',
        message: `Uploaded ${uploadedFiles.length} files via FTP with DDEX naming`,
        details: {
          filesUploaded: uploadedFiles.length,
          totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
          upc: deliveryPackage.upc,
          md5Hashes: uploadedFiles.map(f => ({ name: f.name, md5: f.md5Hash }))
        }
      })
    }
    
    return {
      success: true,
      protocol: 'FTP',
      files: uploadedFiles,
      messageId: deliveryPackage.metadata.messageId,
      bytesTransferred: uploadedFiles.reduce((sum, f) => sum + f.size, 0)
    }
  } catch (error) {
    console.error('FTP Error:', error)
    client.close()
    throw error
  } finally {
    // Clean up temp directory
    try {
      await fsp.rmdir(tempDir, { recursive: true })
    } catch (e) {
      console.error('Cleanup error:', e)
    }
  }
}

/**
 * SFTP Delivery Implementation with DDEX naming and MD5 hashing
 */
async function deliverViaSFTP(target, deliveryPackage, deliveryId) {
  const conn = new SSHClient()
  const tempDir = path.join(os.tmpdir(), `delivery_${Date.now()}`)
  
  return new Promise(async (resolve, reject) => {
    try {
      await fs.mkdir(tempDir, { recursive: true })
      
      if (deliveryId && deliveryId !== 'test') {
        await addDeliveryLog(deliveryId, {
          level: 'info',
          step: 'sftp_connection',
          message: `Connecting to SFTP server: ${target.host || target.connection?.host}`
        })
      }
      
      conn.on('ready', async () => {
        conn.sftp(async (err, sftp) => {
          if (err) {
            conn.end()
            return reject(err)
          }

          try {
            const uploadedFiles = []
            const targetDir = target.directory || target.connection?.directory || '.'

            // Upload each file with DDEX naming and MD5 hashing
            for (const file of deliveryPackage.files) {
              // Use DDEX name for local and remote file
              const localPath = path.join(tempDir, file.name)
              const remotePath = path.posix.join(targetDir, file.name)
              
              console.log(`SFTP: Processing ${file.name} (original: ${file.originalName || 'ERN'})`)
              
              let fileContent
              let md5Hash
                
              // Prepare local file
              if (file.needsDownload) {
                await downloadFile(file.url, localPath)
                fileContent = await fsp.readFile(localPath)
                md5Hash = calculateMD5(fileContent)
              } else {
                fileContent = Buffer.from(file.content, 'utf8')
                await fsp.writeFile(localPath, fileContent)
                md5Hash = calculateMD5(fileContent)
              }

              // Upload via SFTP with DDEX name
              await new Promise((uploadResolve, uploadReject) => {
                sftp.fastPut(localPath, remotePath, (err) => {
                  if (err) uploadReject(err)
                  else uploadResolve()
                })
              })

              const uploadedFile = cleanForFirestore({
                name: file.name, // DDEX name
                size: fileContent.length,
                md5Hash: md5Hash,
                uploadedAt: new Date().toISOString(),
                originalName: file.originalName
              })
              
              uploadedFiles.push(uploadedFile)

              console.log(`SFTP: Uploaded ${file.name} (MD5: ${md5Hash})`)

              // Clean up local file
              await fsp.unlink(localPath)
            }

            conn.end()
            
            if (deliveryId && deliveryId !== 'test') {
              await addDeliveryLog(deliveryId, {
                level: 'success',
                step: 'sftp_upload',
                message: `Uploaded ${uploadedFiles.length} files via SFTP with DDEX naming`,
                details: {
                  filesUploaded: uploadedFiles.length,
                  totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
                  upc: deliveryPackage.upc,
                  md5Hashes: uploadedFiles.map(f => ({ name: f.name, md5: f.md5Hash }))
                }
              })
            }
            
            resolve({
              success: true,
              protocol: 'SFTP',
              files: uploadedFiles,
              messageId: deliveryPackage.metadata.messageId,
              bytesTransferred: uploadedFiles.reduce((sum, f) => sum + f.size, 0)
            })
          } catch (error) {
            conn.end()
            reject(error)
          }
        })
      })

      conn.on('error', (err) => {
        reject(err)
      })

      // Connect with appropriate authentication
      const connectionConfig = {
        host: target.host || target.connection?.host,
        port: target.port || target.connection?.port || 22,
        username: target.username || target.connection?.username
      }

      const privateKey = target.privateKey || target.connection?.privateKey
      const password = target.password || target.connection?.password
      
      if (privateKey) {
        connectionConfig.privateKey = privateKey
        const passphrase = target.passphrase || target.connection?.passphrase
        if (passphrase) {
          connectionConfig.passphrase = passphrase
        }
      } else if (password) {
        connectionConfig.password = password
      }

      conn.connect(connectionConfig)
    } catch (error) {
      reject(error)
    } finally {
      // Clean up temp directory
      setTimeout(async () => {
        try {
          await fsp.rmdir(tempDir, { recursive: true })
        } catch (e) {
          console.error('Cleanup error:', e)
        }
      }, 5000)
    }
  })
}

/**
 * S3 Delivery Implementation with DDEX naming and MD5 hashing
 */
async function deliverViaS3(target, deliveryPackage, deliveryId) {
  const s3Client = new S3Client({
    region: target.region || target.connection?.region,
    credentials: {
      accessKeyId: target.accessKeyId || target.connection?.accessKeyId,
      secretAccessKey: target.secretAccessKey || target.connection?.secretAccessKey
    }
  })

  if (deliveryId && deliveryId !== 'test') {
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 's3_connection',
      message: `Connecting to S3 bucket: ${target.bucket || target.connection?.bucket}`
    })
  }

  const uploadedFiles = []
  const bucket = target.bucket || target.connection?.bucket
  const prefix = target.prefix || target.connection?.prefix || ''

  for (const file of deliveryPackage.files) {
    let fileContent
    let md5Hash
    
    console.log(`S3: Processing ${file.name} (original: ${file.originalName || 'ERN'})`)
    
    if (file.needsDownload) {
      // Download file from Storage
      const response = await axios.get(file.url, { responseType: 'arraybuffer' })
      fileContent = Buffer.from(response.data)
    } else {
      fileContent = Buffer.from(file.content)
    }
    
    // Calculate MD5 hash
    md5Hash = calculateMD5(fileContent)

    // Use DDEX name for S3 key
    const key = path.posix.join(prefix, file.name)
    
    console.log(`S3: Uploading to key: ${key} (MD5: ${md5Hash})`)
    
    // Build metadata object with only defined values
    const metadata = cleanForFirestore({
      'delivery-id': deliveryPackage.deliveryId || '',
      'message-id': deliveryPackage.metadata.messageId || '',
      'message-sub-type': deliveryPackage.metadata.messageSubType || 'Initial',
      'test-mode': String(deliveryPackage.metadata.testMode || false),
      'ddex-name': file.name,
      'upc': deliveryPackage.upc || '',
      'md5-hash': md5Hash,
      'original-name': file.originalName
    })
    
    // For large files, use multipart upload
    if (fileContent.length > 5 * 1024 * 1024) { // 5MB threshold
      const multipartUpload = new Upload({
        client: s3Client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: fileContent,
          ContentType: file.type === 'text/xml' ? 'text/xml' : 'application/octet-stream',
          ContentMD5: Buffer.from(md5Hash, 'hex').toString('base64'),
          Metadata: metadata
        }
      })

      const result = await multipartUpload.done()
      
      const uploadedFile = cleanForFirestore({
        name: file.name, // DDEX name
        location: `https://${bucket}.s3.${target.region || target.connection?.region}.amazonaws.com/${key}`,
        etag: result.ETag,
        size: fileContent.length,
        md5Hash: md5Hash,
        uploadedAt: new Date().toISOString(),
        originalName: file.originalName
      })
      
      uploadedFiles.push(uploadedFile)
    } else {
      // Regular upload for smaller files
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileContent,
        ContentType: file.type === 'text/xml' ? 'text/xml' : 'application/octet-stream',
        ContentMD5: Buffer.from(md5Hash, 'hex').toString('base64'),
        Metadata: metadata
      })

      const result = await s3Client.send(command)
      
      const uploadedFile = cleanForFirestore({
        name: file.name, // DDEX name
        location: `https://${bucket}.s3.${target.region || target.connection?.region}.amazonaws.com/${key}`,
        etag: result.ETag,
        size: fileContent.length,
        md5Hash: md5Hash,
        uploadedAt: new Date().toISOString(),
        originalName: file.originalName
      })
      
      uploadedFiles.push(uploadedFile)
    }
    
    console.log(`S3: Uploaded ${file.name} (MD5: ${md5Hash})`)
  }

  if (deliveryId && deliveryId !== 'test') {
    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 's3_upload',
      message: `Uploaded ${uploadedFiles.length} files to S3 with DDEX naming`,
      details: {
        bucket,
        filesUploaded: uploadedFiles.length,
        totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
        upc: deliveryPackage.upc,
        md5Hashes: uploadedFiles.map(f => ({ name: f.name, md5: f.md5Hash }))
      }
    })
  }

  return {
    success: true,
    protocol: 'S3',
    files: uploadedFiles,
    messageId: deliveryPackage.metadata.messageId,
    bytesTransferred: uploadedFiles.reduce((sum, f) => sum + f.size, 0)
  }
}

/**
 * Standard API Delivery Implementation with logging
 */
async function deliverViaAPI(target, deliveryPackage, deliveryId) {
  if (deliveryId && deliveryId !== 'test') {
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'api_preparation',
      message: `Preparing API request to ${target.endpoint || target.connection?.endpoint}`
    })
  }

  const formData = new FormData()
  
  // Add ERN XML
  const ernFile = deliveryPackage.files.find(f => f.isERN)
  if (ernFile) {
    formData.append('ern', Buffer.from(ernFile.content), {
      filename: ernFile.name,
      contentType: 'text/xml'
    })
  }

  // Add metadata including UPC and message type - clean undefined values
  const metadata = cleanForFirestore({
    messageId: deliveryPackage.metadata.messageId,
    messageType: deliveryPackage.metadata.messageType || 'NewReleaseMessage',
    messageSubType: deliveryPackage.metadata.messageSubType || 'Initial',
    releaseTitle: deliveryPackage.releaseTitle,
    testMode: deliveryPackage.metadata.testMode || false,
    upc: deliveryPackage.upc
  })
  
  formData.append('metadata', JSON.stringify(metadata))

  // Prepare headers
  const headers = {
    ...(target.headers || target.connection?.headers || {}),
    ...formData.getHeaders()
  }

  // Add authentication
  const authType = target.auth?.type || target.connection?.authType
  const credentials = target.auth?.credentials || target.connection?.credentials
  
  if (authType === 'Bearer' && credentials?.token) {
    headers['Authorization'] = `Bearer ${credentials.token}`
  } else if (authType === 'Basic' && credentials?.username && credentials?.password) {
    const auth = Buffer.from(
      `${credentials.username}:${credentials.password}`
    ).toString('base64')
    headers['Authorization'] = `Basic ${auth}`
  }

  const startTime = Date.now()
  
  // Make API request
  const response = await axios({
    method: target.method || target.connection?.method || 'POST',
    url: target.endpoint || target.connection?.endpoint,
    data: formData,
    headers,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  })

  const duration = Date.now() - startTime

  if (deliveryId && deliveryId !== 'test') {
    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 'api_response',
      message: 'API delivery completed successfully',
      duration,
      details: {
        statusCode: response.status,
        responseTime: `${duration}ms`,
        upc: deliveryPackage.upc,
        messageSubType: deliveryPackage.metadata.messageSubType || 'Initial'
      }
    })
  }

  return {
    success: true,
    protocol: 'API',
    response: response.data,
    statusCode: response.status,
    messageId: deliveryPackage.metadata.messageId,
    duration
  }
}

/**
 * Specialized DSP Delivery Implementation with Enhanced Logging
 */
async function deliverToDSP(target, deliveryPackage) {
  const deliveryId = deliveryPackage.deliveryId || 'api_delivery'
  
  try {
    // Log DSP delivery start
    console.log(`Starting DSP delivery to ${target.endpoint}`)
    console.log(`Message SubType: ${deliveryPackage.messageSubType || 'Initial'}`)
    
    // Get the endpoint from the correct location
    const endpoint = target.endpoint || target.connection?.endpoint
    
    if (!endpoint) {
      const error = 'DSP endpoint not configured. Please configure the API endpoint in delivery target settings.'
      console.error(error)
      throw new Error(error)
    }
    
    // Log package details
    console.log(`DSP Package Summary:`, {
      distributorId: deliveryPackage.distributorId,
      messageId: deliveryPackage.metadata?.messageId,
      messageSubType: deliveryPackage.messageSubType || 'Initial',
      audioFiles: deliveryPackage.audioFiles?.length || 0,
      imageFiles: deliveryPackage.imageFiles?.length || 0,
      hasERN: !!deliveryPackage.ernXml,
      upc: deliveryPackage.upc
    })
    
    // Prepare the DSP-specific payload - clean undefined values
    const payload = cleanForFirestore({
      distributorId: deliveryPackage.distributorId || target.config?.distributorId || 'stardust-distro',
      messageId: deliveryPackage.metadata?.messageId || deliveryPackage.messageId,
      messageType: deliveryPackage.metadata?.messageType || 'NewReleaseMessage',
      messageSubType: deliveryPackage.messageSubType || 'Initial',
      releaseTitle: deliveryPackage.releaseTitle,
      releaseArtist: deliveryPackage.releaseArtist,
      ernXml: deliveryPackage.ernXml || deliveryPackage.files?.find(f => f.isERN)?.content,
      testMode: deliveryPackage.metadata?.testMode || false,
      priority: deliveryPackage.metadata?.priority || 'normal',
      audioFiles: deliveryPackage.audioFiles || [],
      imageFiles: deliveryPackage.imageFiles || [],
      timestamp: new Date().toISOString(),
      upc: deliveryPackage.upc,
      // ADD THESE for DSP Ingestion.vue compatibility:
      ern: {
        messageId: deliveryPackage.metadata?.messageId || deliveryPackage.messageId,
        version: '4.3',
        releaseCount: 1,
        messageSubType: deliveryPackage.messageSubType || 'Initial'
      },
      processing: {
        status: 'received',
        receivedAt: new Date().toISOString()
      },
      // Add file transfer instructions
      fileTransferRequired: true,
      sourceStorage: 'firebase',
      sourceDeliveryId: deliveryId
    })
    
    // Prepare headers with authentication
    const headers = {
      'Content-Type': 'application/json'
    }
    
    // Add Bearer token if API key is provided
    const apiKey = target.headers?.Authorization || 
                   target.connection?.apiKey || 
                   target.config?.apiKey
    
    if (apiKey) {
      // Handle both "Bearer xxx" format and plain token
      headers.Authorization = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
    }
    
    console.log(`Sending to DSP endpoint: ${endpoint}`)
    console.log(`Distributor ID: ${payload.distributorId}`)
    console.log(`Has authentication: ${!!headers.Authorization}`)
    console.log(`UPC: ${payload.upc}`)
    console.log(`Message SubType: ${payload.messageSubType}`)
    
    // Make the API request
    const startTime = Date.now()
    const response = await axios({
      method: 'POST',
      url: endpoint,
      headers,
      data: payload,
      timeout: 30000,
      validateStatus: function (status) {
        // Accept any status in the 2xx or 3xx range
        return status >= 200 && status < 400
      }
    })
    
    const duration = Date.now() - startTime
    
    console.log('DSP Response Status:', response.status)
    console.log('DSP Response:', response.data)
    console.log(`DSP API call completed in ${duration}ms`)
    
    // Log file transfer note
    if (payload.audioFiles.length > 0 || payload.imageFiles.length > 0) {
      console.log(`NOTE: ${payload.audioFiles.length} audio and ${payload.imageFiles.length} image files referenced by URL`)
      console.log('DSP will need to download these files asynchronously')
      
      // Log the actual URLs for debugging
      if (payload.audioFiles.length > 0) {
        console.log('Audio file URLs:', payload.audioFiles)
      }
      if (payload.imageFiles.length > 0) {
        console.log('Image file URLs:', payload.imageFiles)
      }
    }
    
    return {
      success: true,
      protocol: 'API',
      response: response.data,
      statusCode: response.status,
      messageId: payload.messageId,
      duration,
      files: [{
        name: 'manifest.xml',
        status: 'completed',
        uploadedAt: new Date().toISOString()
      }],
      acknowledgment: response.data?.acknowledgment || 
                      response.data?.message || 
                      `Delivery accepted by DSP (Status: ${response.status})`,
      bytesTransferred: JSON.stringify(payload).length,
      fileTransferNote: 'Files referenced by URL - DSP will download asynchronously'
    }
  } catch (error) {
    console.error('DSP Delivery Error:', error.response?.data || error.message)
    
    if (error.response) {
      const errorMessage = error.response.data?.error || 
                          error.response.data?.message || 
                          error.response.statusText || 
                          'Unknown error'
      console.error(`DSP rejected delivery with status ${error.response.status}: ${errorMessage}`)
      throw new Error(`DSP rejected delivery (${error.response.status}): ${errorMessage}`)
    }
    throw error
  }
}

/**
 * Azure Blob Storage Implementation with DDEX naming and MD5 hashing
 */
async function deliverViaAzure(target, deliveryPackage, deliveryId) {
  const accountName = target.accountName || target.connection?.accountName
  const accountKey = target.accountKey || target.connection?.accountKey
  
  if (deliveryId && deliveryId !== 'test') {
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'azure_connection',
      message: `Connecting to Azure container: ${target.containerName || target.connection?.containerName}`
    })
  }
  
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
  )
  
  const containerName = target.containerName || target.connection?.containerName
  const containerClient = blobServiceClient.getContainerClient(containerName)

  const uploadedFiles = []
  const prefix = target.prefix || target.connection?.prefix || ''

  for (const file of deliveryPackage.files) {
    // Use DDEX name for blob name
    const blobName = path.posix.join(prefix, file.name)
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)
    
    console.log(`Azure: Processing ${file.name} (original: ${file.originalName || 'ERN'})`)
    console.log(`Azure: Uploading to blob: ${blobName}`)
    
    let fileContent
    let md5Hash
    
    if (file.needsDownload) {
      const response = await axios.get(file.url, { responseType: 'arraybuffer' })
      fileContent = Buffer.from(response.data)
    } else {
      fileContent = Buffer.from(file.content)
    }
    
    // Calculate MD5 hash
    md5Hash = calculateMD5(fileContent)
    console.log(`Azure: MD5 hash: ${md5Hash}`)

    // Build metadata object with only defined values
    const metadata = cleanForFirestore({
      deliveryId: deliveryPackage.deliveryId || '',
      messageId: deliveryPackage.metadata.messageId || '',
      messageSubType: deliveryPackage.metadata.messageSubType || 'Initial',
      ddexName: file.name,
      upc: deliveryPackage.upc || '',
      md5Hash: md5Hash,
      originalName: file.originalName
    })

    const uploadResponse = await blockBlobClient.upload(
      fileContent,
      fileContent.length,
      {
        blobHTTPHeaders: {
          blobContentMD5: Buffer.from(md5Hash, 'hex').toString('base64')
        },
        metadata: metadata
      }
    )

    const uploadedFile = cleanForFirestore({
      name: file.name, // DDEX name
      etag: uploadResponse.etag,
      size: fileContent.length,
      md5Hash: md5Hash,
      uploadedAt: new Date().toISOString(),
      originalName: file.originalName
    })
    
    uploadedFiles.push(uploadedFile)
    
    console.log(`Azure: Uploaded ${file.name} (MD5: ${md5Hash})`)
  }

  if (deliveryId && deliveryId !== 'test') {
    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 'azure_upload',
      message: `Uploaded ${uploadedFiles.length} files to Azure with DDEX naming`,
      details: {
        container: containerName,
        filesUploaded: uploadedFiles.length,
        totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
        upc: deliveryPackage.upc,
        md5Hashes: uploadedFiles.map(f => ({ name: f.name, md5: f.md5Hash }))
      }
    })
  }

  return {
    success: true,
    protocol: 'Azure',
    files: uploadedFiles,
    messageId: deliveryPackage.metadata.messageId,
    bytesTransferred: uploadedFiles.reduce((sum, f) => sum + f.size, 0)
  }
}

/**
 * Storage Delivery Implementation (Firebase Storage) with logging and DDEX naming
 */
async function deliverViaStorage(target, deliveryPackage, deliveryId) {
  try {
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'storage_preparation',
      message: 'Preparing Firebase Storage delivery with DDEX naming'
    })
    
    const bucket = storage.bucket()
    const uploadedFiles = []
    
    // Determine the storage path
    const timestamp = Date.now()
    const distributorId = deliveryPackage.distributorId || target.config?.distributorId || 'unknown'
    const basePath = `deliveries/${distributorId}/${timestamp}`
    
    console.log(`Uploading to Storage: ${basePath}`)
    console.log(`UPC: ${deliveryPackage.upc}`)
    console.log(`Message SubType: ${deliveryPackage.metadata.messageSubType || 'Initial'}`)
    
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'storage_upload',
      message: `Uploading to path: ${basePath}`,
      details: {
        distributorId,
        bucket: bucket.name,
        upc: deliveryPackage.upc,
        messageSubType: deliveryPackage.metadata.messageSubType || 'Initial'
      }
    })
    
    // Upload files with DDEX naming
    for (const file of deliveryPackage.files) {
      try {
        let fileBuffer
        let filePath
        let md5Hash
        
        if (file.isERN) {
          // ERN file - use its name directly
          filePath = `${basePath}/${file.name}`
          fileBuffer = Buffer.from(file.content, 'utf8')
          md5Hash = calculateMD5(fileBuffer)
        } else if (file.needsDownload) {
          // Audio/Image files - use DDEX name
          filePath = `${basePath}/${file.type}/${file.name}` // file.name already has DDEX naming
          
          console.log(`Downloading ${file.originalName || 'file'} from: ${file.url}`)
          console.log(`Will upload as: ${file.name}`)
          
          const response = await axios.get(file.url, { 
            responseType: 'arraybuffer',
            timeout: 30000
          })
          fileBuffer = Buffer.from(response.data)
          md5Hash = calculateMD5(fileBuffer)
        }
        
        if (fileBuffer && filePath) {
          const storageFile = bucket.file(filePath)
          
          // Build metadata object with only defined values
          const metadata = cleanForFirestore({
            distributorId: distributorId,
            messageId: deliveryPackage.metadata.messageId,
            messageSubType: deliveryPackage.metadata.messageSubType || 'Initial',
            releaseTitle: deliveryPackage.releaseTitle || 'Unknown',
            testMode: String(deliveryPackage.metadata.testMode || false),
            ddexName: file.name,
            upc: deliveryPackage.upc,
            md5Hash: md5Hash,
            originalName: file.originalName
          })
          
          await storageFile.save(fileBuffer, {
            metadata: {
              contentType: file.isERN ? 'text/xml' : 
                          file.type === 'audio' ? 'audio/mpeg' : 'image/jpeg',
              metadata: metadata
            }
          })
          
          const uploadedFile = cleanForFirestore({
            name: file.name, // DDEX compliant name
            path: filePath,
            size: fileBuffer.length,
            md5Hash: md5Hash,
            uploadedAt: new Date().toISOString(),
            originalName: file.originalName
          })
          
          uploadedFiles.push(uploadedFile)
          
          console.log(`✅ Uploaded ${file.name} to: ${filePath} (MD5: ${md5Hash})`)
        }
      } catch (fileError) {
        console.error(`Failed to upload file ${file.name}:`, fileError.message)
        // Continue with other files
      }
    }
    
    const audioCount = uploadedFiles.filter(f => f.path.includes('/audio/')).length
    const imageCount = uploadedFiles.filter(f => f.path.includes('/image/')).length
    
    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 'storage_upload',
      message: `Uploaded ${uploadedFiles.length} files to Storage with DDEX naming`,
      details: {
        ernFiles: uploadedFiles.filter(f => f.name.endsWith('.xml')).length,
        audioFiles: audioCount,
        imageFiles: imageCount,
        basePath,
        upc: deliveryPackage.upc,
        messageSubType: deliveryPackage.metadata.messageSubType || 'Initial',
        md5Hashes: uploadedFiles.map(f => ({ name: f.name, md5: f.md5Hash }))
      }
    })
    
    // If this is a DSP delivery, trigger the ingestion
    if (deliveryPackage.distributorId) {
      console.log(`Notifying DSP of new delivery in storage...`)
      
      await addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'storage_notification',
        message: 'Notifying DSP of storage delivery'
      })
      
      // The DSP's processStorageDelivery function will pick this up
      // Or we can notify via API if configured
      if (target.connection?.notifyEndpoint) {
        try {
          await axios.post(target.connection.notifyEndpoint, {
            distributorId: distributorId,
            deliveryPath: basePath,
            messageId: deliveryPackage.metadata.messageId,
            messageSubType: deliveryPackage.metadata.messageSubType || 'Initial',
            timestamp: new Date().toISOString(),
            upc: deliveryPackage.upc
          })
          console.log('✅ DSP notified of storage delivery')
          
          await addDeliveryLog(deliveryId, {
            level: 'success',
            step: 'storage_notification',
            message: 'DSP notified successfully'
          })
        } catch (notifyError) {
          console.error('Failed to notify DSP:', notifyError.message)
          
          await addDeliveryLog(deliveryId, {
            level: 'warning',
            step: 'storage_notification',
            message: 'DSP notification failed, but files uploaded successfully',
            details: { error: notifyError.message }
          })
          // Don't fail the delivery if notification fails
        }
      }
    }
    
    return {
      success: true,
      protocol: 'Storage',
      bucket: bucket.name,
      basePath: basePath,
      files: uploadedFiles,
      messageId: deliveryPackage.metadata.messageId,
      acknowledgment: `Uploaded ${uploadedFiles.length} files to Storage`,
      bytesTransferred: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
      upc: deliveryPackage.upc,
      messageSubType: deliveryPackage.metadata.messageSubType || 'Initial'
    }
  } catch (error) {
    console.error('Storage delivery error:', error)
    throw new Error(`Storage delivery failed: ${error.message}`)
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Download file from URL to local path
 */
async function downloadFile(url, localPath) {
  const writer = fs.createWriteStream(localPath)
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  })
  
  response.data.pipe(writer)
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

/**
 * Extract file extension from URL
 */
function extractFileExtension(url) {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const parts = pathname.split('/')
    let filename = parts[parts.length - 1]
    
    // Remove URL parameters
    filename = filename.split('?')[0]
    
    // Decode URL encoding
    filename = decodeURIComponent(filename)
    
    // Handle Firebase Storage URLs that might have encoded parts
    if (filename.includes('%2F')) {
      const decodedParts = filename.split('%2F')
      filename = decodedParts[decodedParts.length - 1]
    }
    
    // Extract extension
    const extMatch = filename.match(/\.([^.]+)$/)
    if (extMatch) {
      const ext = extMatch[1].toLowerCase()
      // Map common audio formats
      if (ext === 'mp3' || ext === 'mpeg') return 'mp3'
      if (ext === 'wav' || ext === 'wave') return 'wav'
      if (ext === 'flac') return 'flac'
      if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
      if (ext === 'png') return 'png'
      return ext
    }
    
    // Default extensions based on context
    console.warn(`Could not determine extension for ${url}, defaulting to wav`)
    return 'wav'
  } catch (error) {
    console.error('Error extracting file extension:', error)
    return 'wav'
  }
}

/**
 * Extract filename from URL
 */
function extractFileName(url) {
  try {
    const parts = url.split('/')
    const fileName = parts[parts.length - 1].split('?')[0]
    return decodeURIComponent(fileName)
  } catch (error) {
    return 'unknown_file'
  }
}

// ============================================================================
// TEST CONNECTION WITH SECURITY
// ============================================================================

exports.testDeliveryConnection = onCall({
  timeoutSeconds: 60,
  maxInstances: 10,
  cors: true,
  consumeAppCheckToken: false
}, async (request) => {
  requireAuth(request);
  validateWith('testDeliveryConnection')(request);
  await checkRateLimit(request.auth.uid, 30, 60000); // 30 tests per minute
  
  const { protocol, config, testMode } = request.data;

  if (!testMode) {
    throw new HttpsError('invalid-argument', 'Test mode required')
  }

  // Sanitize config
  const sanitizedConfig = sanitizeInputs(config);

  try {
    switch (protocol) {
      case 'storage':
        // Test Firebase Storage connection
        const bucket = admin.storage().bucket()
        await bucket.file('test/connection.txt').save('test')
        await bucket.file('test/connection.txt').delete()
        return { success: true, message: 'Storage connection successful' }

      case 'FTP':
        // Test FTP connection with passive mode and timeout
        const ftpClient = new ftp.Client()
        
        // Set shorter timeout to prevent gateway timeout
        ftpClient.ftp.timeout = 10000  // 10 seconds instead of default 30
        
        const ftpConfig = {
          host: sanitizedConfig.host,
          port: sanitizedConfig.port || 21,
          user: sanitizedConfig.username || sanitizedConfig.user,
          password: sanitizedConfig.password,
          secure: sanitizedConfig.secure || false,
          connTimeout: 10000,
          pasvTimeout: 10000,
          keepalive: 5000
        }
        
        if (sanitizedConfig.forcePasv || sanitizedConfig.pasv) {
          ftpClient.ftp.pasv = true
        }
        
        try {
          await ftpClient.access(ftpConfig)
          
          const listPromise = ftpClient.list('/')
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('List timeout')), 5000)
          )
          
          try {
            const list = await Promise.race([listPromise, timeoutPromise])
            ftpClient.close()
            
            return { 
              success: true, 
              message: 'FTP connection successful',
              filesFound: Array.isArray(list) ? list.length : 0
            }
          } catch (listError) {
            ftpClient.close()
            return { 
              success: true, 
              message: 'FTP connection successful (list skipped)',
              note: 'Connected but directory listing timed out'
            }
          }
        } catch (ftpError) {
          ftpClient.close()
          console.error('FTP test error:', ftpError)
          return { 
            success: false, 
            message: ftpError.message,
            code: ftpError.code 
          }
        }

      case 'SFTP':
        // Test SFTP connection with timeout
        return new Promise((resolve, reject) => {
          const sftpConn = new SSHClient()
          
          const timeout = setTimeout(() => {
            sftpConn.end()
            resolve({ 
              success: false, 
              message: 'SFTP connection timeout (10s)',
              note: 'SSH2 may not be compatible with Cloud Functions'
            })
          }, 10000)
          
          sftpConn.on('ready', () => {
            clearTimeout(timeout)
            sftpConn.sftp((err, sftp) => {
              if (err) {
                sftpConn.end()
                resolve({ success: false, message: err.message })
                return
              }
              
              sftpConn.end()
              resolve({ 
                success: true, 
                message: 'SFTP connection successful'
              })
            })
          })
          
          sftpConn.on('error', (err) => {
            clearTimeout(timeout)
            resolve({ 
              success: false, 
              message: err.message,
              code: err.code 
            })
          })
          
          const sftpConfig = {
            host: sanitizedConfig.host,
            port: sanitizedConfig.port || 22,
            username: sanitizedConfig.username,
            password: sanitizedConfig.password,
            readyTimeout: 10000,
            timeout: 10000
          }
          
          if (sanitizedConfig.privateKey) {
            sftpConfig.privateKey = sanitizedConfig.privateKey
            if (sanitizedConfig.passphrase) {
              sftpConfig.passphrase = sanitizedConfig.passphrase
            }
          }
          
          try {
            sftpConn.connect(sftpConfig)
          } catch (connectError) {
            clearTimeout(timeout)
            resolve({ 
              success: false, 
              message: 'SSH2 Client initialization failed',
              error: connectError.message
            })
          }
        })

      case 'S3':
        // Test S3 connection with timeout
        const { ListObjectsV2Command } = require('@aws-sdk/client-s3')
        
        const s3Client = new S3Client({
          region: sanitizedConfig.region,
          endpoint: sanitizedConfig.endpoint,
          credentials: {
            accessKeyId: sanitizedConfig.accessKeyId,
            secretAccessKey: sanitizedConfig.secretAccessKey
          },
          forcePathStyle: sanitizedConfig.forcePathStyle,
          requestHandler: {
            requestTimeout: 10000,
            httpsAgent: {
              connectTimeout: 10000
            }
          }
        })
        
        const command = new ListObjectsV2Command({
          Bucket: sanitizedConfig.bucket,
          MaxKeys: 1
        })
        
        await s3Client.send(command)
        return { success: true, message: 'S3 connection successful' }

      case 'API':
        // Test API connection with timeout
        if (!sanitizedConfig.endpoint) {
          return { 
            success: false, 
            message: 'API endpoint not configured' 
          }
        }
        
        try {
          const response = await axios({
            method: 'HEAD',
            url: sanitizedConfig.endpoint,
            headers: sanitizedConfig.headers || {},
            timeout: 10000,
            validateStatus: function (status) {
              return status < 500
            }
          })
          
          return { 
            success: true, 
            message: 'API endpoint accessible',
            statusCode: response.status 
          }
        } catch (apiError) {
          if (apiError.code === 'ECONNREFUSED') {
            return { 
              success: false, 
              message: 'API endpoint unreachable (connection refused)' 
            }
          }
          if (apiError.code === 'ECONNABORTED') {
            return { 
              success: false, 
              message: 'API request timeout (10s)' 
            }
          }
          return { 
            success: false, 
            message: apiError.message 
          }
        }

      case 'Azure':
        // Test Azure connection
        const blobServiceClient = BlobServiceClient.fromConnectionString(
          sanitizedConfig.connectionString
        )
        const containerClient = blobServiceClient.getContainerClient(
          sanitizedConfig.containerName
        )
        
        const exists = await containerClient.exists()
        if (!exists) {
          await containerClient.create()
        }
        
        return { success: true, message: 'Azure connection successful' }

      default:
        throw new Error(`Unknown protocol: ${protocol}`)
    }
  } catch (error) {
    console.error(`Test connection failed for ${protocol}:`, error)
    return { 
      success: false, 
      message: error.message,
      protocol,
      stack: error.stack 
    }
  }
})

// Add test API endpoint
exports.testAPIEndpoint = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  // Simple test endpoint that accepts deliveries
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed')
    return
  }

  const testMode = req.headers['x-test-mode'] === 'true'
  
  if (!testMode) {
    res.status(403).send('Test mode only')
    return
  }

  // Log the received data
  console.log('Test API received:', {
    headers: req.headers,
    body: req.body,
    files: req.body.files?.length || 0
  })

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Return success response
  res.status(200).json({
    success: true,
    deliveryId: req.body.deliveryId || 'TEST_' + Date.now(),
    acknowledgment: 'TEST_ACK_' + Date.now(),
    timestamp: new Date().toISOString(),
    filesReceived: req.body.files?.length || 0
  })
})

// ============================================================================
// IDEMPOTENCY & LOCKING FUNCTIONS
// ============================================================================

/**
 * Acquire a processing lock for a delivery using Firestore transactions
 * This prevents multiple workers from processing the same delivery
 */
async function acquireDeliveryLock(deliveryId, idempotencyKey) {
  const lockId = idempotencyKey || `delivery_${deliveryId}`
  const lockRef = db.collection('locks').doc(lockId)
  
  try {
    const result = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef)
      
      if (lockDoc.exists) {
        const lockData = lockDoc.data()
        
        // Check if lock is still valid (not expired)
        const lockExpiry = lockData.expiresAt?.toMillis() || 0
        const now = Date.now()
        
        if (lockExpiry > now && lockData.status === 'processing') {
          // Lock is held by another process
          console.log(`Lock held for ${lockId}, expires in ${(lockExpiry - now) / 1000}s`)
          return { acquired: false, reason: 'locked' }
        }
        
        // Check if this delivery was already completed
        if (lockData.status === 'completed') {
          console.log(`Delivery ${lockId} already completed`)
          return { acquired: false, reason: 'completed', result: lockData.result }
        }
      }
      
      // Acquire the lock
      const lockData = cleanForFirestore({
        deliveryId,
        idempotencyKey,
        status: 'processing',
        acquiredAt: admin.firestore.Timestamp.now(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 600000), // 10 minute expiry
        instanceId: process.env.K_SERVICE ? process.env.K_REVISION : 'local',
        attempt: (lockDoc.exists ? lockDoc.data().attempt || 0 : 0) + 1
      })
      
      transaction.set(lockRef, lockData)
      console.log(`Lock acquired for ${lockId}`)
      return { acquired: true, lockData }
    })
    
    return result
  } catch (error) {
    console.error(`Failed to acquire lock for ${lockId}:`, error)
    return { acquired: false, reason: 'error', error }
  }
}

/**
 * Release a delivery lock after processing
 */
async function releaseDeliveryLock(deliveryId, idempotencyKey, status, result = null) {
  const lockId = idempotencyKey || `delivery_${deliveryId}`
  const lockRef = db.collection('locks').doc(lockId)
  
  try {
    const updateData = cleanForFirestore({
      status,
      releasedAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 86400000), // Keep for 24 hours
      result
    })
    
    await lockRef.update(updateData)
    console.log(`Lock released for ${lockId} with status: ${status}`)
  } catch (error) {
    console.error(`Failed to release lock for ${lockId}:`, error)
  }
}

/**
 * Process delivery with lock protection
 */
async function processDeliveryWithLock(deliveryId, delivery, lockData) {
  try {
    // Process the delivery
    const result = await processDelivery(deliveryId, delivery)
    
    // Release lock with success status
    await releaseDeliveryLock(deliveryId, delivery.idempotencyKey, 'completed', {
      completedAt: new Date().toISOString(),
      ...result
    })
    
    return result
  } catch (error) {
    // Release lock with error status
    await releaseDeliveryLock(deliveryId, delivery.idempotencyKey, 'failed', {
      error: error.message,
      failedAt: new Date().toISOString()
    })
    
    throw error
  }
}

/**
 * Clean up expired locks (run daily)
 */
exports.cleanupExpiredLocks = onSchedule({
  schedule: 'every day 03:00',
  timeoutSeconds: 60,
  memory: '256MB'
}, async (event) => {
  try {
    const now = admin.firestore.Timestamp.now()
    const expiredLocks = await db.collection('locks')
      .where('expiresAt', '<', now)
      .limit(100)
      .get()
    
    const batch = db.batch()
    let count = 0
    
    expiredLocks.forEach(doc => {
      batch.delete(doc.ref)
      count++
    })
    
    if (count > 0) {
      await batch.commit()
      console.log(`Cleaned up ${count} expired locks`)
    }
    
    return { cleaned: count }
  } catch (error) {
    console.error('Error cleaning up locks:', error)
    throw error
  }
})

// ============================================================================
// CONTENT FINGERPRINTING FUNCTIONS WITH SECURITY
// ============================================================================

/**
 * Calculate comprehensive file fingerprint (MD5 + SHA-256 + SHA-1)
 */
exports.calculateFileFingerprint = onCall({
  timeoutSeconds: 60,
  memory: '512MB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('calculateFileFingerprint')(request);
  await checkRateLimit(request.auth.uid, 60, 60000);
  
  const { url, fileName, fileSize, fileType } = request.data;
  
  try {
    console.log(`Calculating fingerprint for: ${fileName || url}`)
    
    // Download file
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 500 * 1024 * 1024 // 500MB max
    })
    
    const buffer = Buffer.from(response.data)
    
    // Calculate multiple hashes in parallel
    const [md5Hash, sha256Hash, sha1Hash] = await Promise.all([
      crypto.createHash('md5').update(buffer).digest('hex'),
      crypto.createHash('sha256').update(buffer).digest('hex'),
      crypto.createHash('sha1').update(buffer).digest('hex')
    ])
    
    const fingerprint = {
      url,
      fileName: fileName || 'unknown',
      fileSize: fileSize || buffer.length,
      fileType: fileType || response.headers['content-type'],
      actualSize: buffer.length,
      hashes: {
        md5: md5Hash,
        sha256: sha256Hash,
        sha1: sha1Hash
      },
      timestamp: new Date().toISOString()
    }
    
    // Store fingerprint in Firestore with cleaned data
    const fingerprintId = sha256Hash
    await db.collection('fingerprints').doc(fingerprintId).set(cleanForFirestore({
      ...fingerprint,
      userId: request.auth.uid,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }))
    
    return fingerprint
  } catch (error) {
    console.error('Error calculating fingerprint:', error)
    throw new HttpsError('internal', `Failed to calculate fingerprint: ${error.message}`)
  }
})

/**
 * Check for duplicate files across the system
 */
exports.checkDuplicates = onCall({
  timeoutSeconds: 30,
  memory: '256MB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('checkDuplicates')(request);
  await checkRateLimit(request.auth.uid, 100, 60000);
  
  const { md5, sha256, sha1, threshold = 100 } = request.data;
  
  try {
    const duplicates = []
    
    // Check SHA-256 (document ID)
    if (sha256) {
      const sha256Doc = await db.collection('fingerprints').doc(sha256).get()
      if (sha256Doc.exists) {
        duplicates.push({
          type: 'exact',
          matchType: 'sha256',
          similarity: 100,
          fingerprint: sha256Doc.data()
        })
      }
    }
    
    // Check MD5
    if (md5 && duplicates.length === 0) {
      const md5Query = await db.collection('fingerprints')
        .where('hashes.md5', '==', md5)
        .limit(5)
        .get()
      
      md5Query.forEach(doc => {
        duplicates.push({
          type: 'exact',
          matchType: 'md5',
          similarity: 100,
          fingerprint: doc.data()
        })
      })
    }
    
    // Check SHA-1
    if (sha1 && duplicates.length === 0) {
      const sha1Query = await db.collection('fingerprints')
        .where('hashes.sha1', '==', sha1)
        .limit(5)
        .get()
      
      sha1Query.forEach(doc => {
        duplicates.push({
          type: 'exact',
          matchType: 'sha1',
          similarity: 100,
          fingerprint: doc.data()
        })
      })
    }
    
    return {
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates,
      checkedHashes: { md5, sha256, sha1 }
    }
  } catch (error) {
    console.error('Error checking duplicates:', error)
    throw new HttpsError('internal', `Failed to check duplicates: ${error.message}`)
  }
})

/**
 * Calculate audio fingerprint for similarity detection
 */
exports.calculateAudioFingerprint = onCall({
  timeoutSeconds: 120,
  memory: '1GB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('calculateAudioFingerprint')(request);
  await checkRateLimit(request.auth.uid, 30, 60000); // 30 audio fingerprints per minute
  
  const { url, trackId, releaseId } = request.data;
  
  try {
    console.log(`Calculating audio fingerprint for: ${url}`)
    
    // Download audio file
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxContentLength: 500 * 1024 * 1024 // 500MB max
    })
    
    const buffer = Buffer.from(response.data)
    
    // Calculate basic hash
    const md5Hash = crypto.createHash('md5').update(buffer).digest('hex')
    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex')
    
    // Create simplified audio fingerprint based on file characteristics
    const audioFingerprint = {
      fileSize: buffer.length,
      md5: md5Hash,
      sha256: sha256Hash,
      chunkHashes: []
    }
    
    // Sample the audio at regular intervals for a simple fingerprint
    const chunkSize = Math.floor(buffer.length / 32) // 32 sample points
    for (let i = 0; i < 32; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, buffer.length)
      const chunk = buffer.slice(start, end)
      const chunkHash = crypto.createHash('md5').update(chunk).digest('hex').substring(0, 8)
      audioFingerprint.chunkHashes.push(chunkHash)
    }
    
    // Create composite fingerprint
    audioFingerprint.composite = audioFingerprint.chunkHashes.join('')
    
    // Store in Firestore
    const fingerprintDoc = cleanForFirestore({
      type: 'audio',
      url,
      trackId,
      releaseId,
      fingerprint: audioFingerprint,
      userId: request.auth.uid,
      createdAt: admin.firestore.Timestamp.now()
    })
    
    await db.collection('audioFingerprints').doc(sha256Hash).set(fingerprintDoc)
    
    // Check for similar audio
    const similar = await findSimilarAudio(audioFingerprint.composite, sha256Hash)
    
    return {
      fingerprint: audioFingerprint,
      similar: similar,
      fingerprintId: sha256Hash
    }
  } catch (error) {
    console.error('Error calculating audio fingerprint:', error)
    throw new HttpsError('internal', `Failed to calculate audio fingerprint: ${error.message}`)
  }
})

/**
 * Batch fingerprint calculation for multiple files
 */
exports.calculateBatchFingerprints = onCall({
  timeoutSeconds: 300,
  memory: '1GB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('calculateBatchFingerprints')(request);
  await checkRateLimit(request.auth.uid, 10, 60000); // 10 batch operations per minute
  
  const { files, releaseId } = request.data;
  
  try {
    console.log(`Calculating fingerprints for ${files.length} files`)
    
    const results = []
    const errors = []
    
    // Process files in parallel with concurrency limit
    const batchSize = 5
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      
      const batchResults = await Promise.allSettled(
        batch.map(async (file) => {
          try {
            const response = await axios.get(file.url, {
              responseType: 'arraybuffer',
              timeout: 30000
            })
            
            const buffer = Buffer.from(response.data)
            
            const fingerprint = {
              fileName: file.name,
              fileType: file.type,
              fileSize: buffer.length,
              hashes: {
                md5: crypto.createHash('md5').update(buffer).digest('hex'),
                sha256: crypto.createHash('sha256').update(buffer).digest('hex')
              }
            }
            
            return { success: true, file: file.name, fingerprint }
          } catch (error) {
            return { success: false, file: file.name, error: error.message }
          }
        })
      )
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value)
          } else {
            errors.push(result.value)
          }
        } else {
          errors.push({
            success: false,
            file: batch[index].name,
            error: result.reason.message
          })
        }
      })
    }
    
    // Check for duplicates within the batch
    const duplicatesInBatch = []
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        if (results[i].fingerprint.hashes.md5 === results[j].fingerprint.hashes.md5) {
          duplicatesInBatch.push({
            file1: results[i].file,
            file2: results[j].file,
            type: 'exact'
          })
        }
      }
    }
    
    // Store all fingerprints
    if (releaseId) {
      const batch = db.batch()
      
      results.forEach(result => {
        const docRef = db.collection('fingerprints').doc(result.fingerprint.hashes.sha256)
        batch.set(docRef, cleanForFirestore({
          ...result.fingerprint,
          releaseId,
          userId: request.auth.uid,
          createdAt: admin.firestore.Timestamp.now()
        }))
      })
      
      await batch.commit()
    }
    
    return {
      success: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
      duplicatesInBatch
    }
  } catch (error) {
    console.error('Error in batch fingerprint calculation:', error)
    throw new HttpsError('internal', `Failed to process batch: ${error.message}`)
  }
})

/**
 * Get fingerprint statistics for a release
 */
exports.getFingerprintStats = onCall({
  timeoutSeconds: 30,
  memory: '256MB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('getFingerprintStats')(request);
  await checkRateLimit(request.auth.uid, 60, 60000);
  
  const { releaseId } = request.data;
  
  try {
    const fingerprints = await db.collection('fingerprints')
      .where('releaseId', '==', releaseId)
      .get()
    
    const audioFingerprints = await db.collection('audioFingerprints')
      .where('releaseId', '==', releaseId)
      .get()
    
    const stats = {
      totalFiles: fingerprints.size + audioFingerprints.size,
      totalSize: 0,
      fileTypes: {},
      duplicates: [],
      audioTracks: audioFingerprints.size
    }
    
    const hashes = new Map()
    
    fingerprints.forEach(doc => {
      const data = doc.data()
      stats.totalSize += data.fileSize || 0
      
      const type = data.fileType || 'unknown'
      stats.fileTypes[type] = (stats.fileTypes[type] || 0) + 1
      
      // Check for duplicates
      if (data.hashes) {
        const existing = hashes.get(data.hashes.md5)
        if (existing) {
          stats.duplicates.push({
            file1: existing.fileName,
            file2: data.fileName,
            hash: data.hashes.md5
          })
        } else {
          hashes.set(data.hashes.md5, data)
        }
      }
    })
    
    return stats
  } catch (error) {
    console.error('Error getting fingerprint stats:', error)
    throw new HttpsError('internal', `Failed to get stats: ${error.message}`)
  }
})

/**
 * Helper function to find similar audio
 */
async function findSimilarAudio(compositeFingerprint, excludeId) {
  try {
    const snapshot = await db.collection('audioFingerprints')
      .where('type', '==', 'audio')
      .limit(100)
      .get()
    
    const similar = []
    
    snapshot.forEach(doc => {
      if (doc.id === excludeId) return
      
      const data = doc.data()
      if (data.fingerprint && data.fingerprint.composite) {
        const similarity = calculateStringSimilarity(
          compositeFingerprint,
          data.fingerprint.composite
        )
        
        if (similarity > 80) {
          similar.push({
            id: doc.id,
            similarity,
            trackId: data.trackId,
            releaseId: data.releaseId,
            url: data.url
          })
        }
      }
    })
    
    return similar.sort((a, b) => b.similarity - a.similarity)
  } catch (error) {
    console.error('Error finding similar audio:', error)
    return []
  }
}

/**
 * Calculate string similarity percentage
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0
  
  const len = Math.min(str1.length, str2.length)
  let matches = 0
  
  for (let i = 0; i < len; i++) {
    if (str1[i] === str2[i]) matches++
  }
  
  return Math.round((matches / len) * 100)
}

// ============================================================================
// EMAIL & NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Send notification (internal function)
 */
async function sendNotification(delivery, type, data) {
  try {
    const notification = cleanForFirestore({
      type,
      deliveryId: delivery.id,
      releaseTitle: delivery.releaseTitle || 'Unknown',
      targetName: delivery.targetName || 'Unknown',
      tenantId: delivery.tenantId,
      timestamp: admin.firestore.Timestamp.now(),
      data
    })
    
    await db.collection('notifications').add(notification)
    console.log(`Notification sent: ${type} for delivery ${delivery.id}`)

    if (delivery.tenantId && (type === 'success' || type === 'failed' || type === 'retry')) {
      try {
        const userDoc = await db.collection('users').doc(delivery.tenantId).get()
        
        if (userDoc.exists) {
          const user = userDoc.data()
          
          if (user.notifications?.emailNotifications !== false && 
              user.notifications?.deliveryStatus !== false) {
            
            let subject, htmlBody, textBody
            
            if (type === 'success') {
              subject = `✅ Delivery Successful: ${delivery.releaseTitle || 'Release'}`
              htmlBody = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #34a853;">✅ Delivery Successful!</h2>
                  <p>Hi ${user.displayName || 'there'},</p>
                  <p>Your release <strong>"${delivery.releaseTitle}"</strong> by <strong>${delivery.releaseArtist}</strong> was successfully delivered to <strong>${delivery.targetName}</strong>.</p>
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Delivery ID:</strong> ${delivery.id}</p>
                    <p><strong>Message Type:</strong> ${delivery.messageSubType || 'Initial'}</p>
                    <p><strong>Files Delivered:</strong> ${data?.filesDelivered || 'Unknown'}</p>
                  </div>
                  <p><a href="https://yourdomain.com/deliveries/${delivery.id}" style="display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px;">View Details</a></p>
                  <p>Best regards,<br>The Stardust Distro Team</p>
                </div>
              `
              textBody = `Delivery successful! "${delivery.releaseTitle}" was delivered to ${delivery.targetName}. View details at https://yourdomain.com/deliveries/${delivery.id}`
              
            } else if (type === 'failed') {
              subject = `⚠️ Delivery Failed: ${delivery.releaseTitle || 'Release'}`
              htmlBody = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #ea4335;">⚠️ Delivery Failed</h2>
                  <p>Hi ${user.displayName || 'there'},</p>
                  <p>The delivery of <strong>"${delivery.releaseTitle}"</strong> to <strong>${delivery.targetName}</strong> has failed.</p>
                  <div style="background: #fce8e6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Error:</strong> ${data?.error || 'Unknown error'}</p>
                    <p><strong>Attempts:</strong> ${data?.attempts || 1}</p>
                  </div>
                  <p>Please check your delivery target configuration and try again.</p>
                  <p><a href="https://yourdomain.com/deliveries/${delivery.id}" style="display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px;">View Logs</a></p>
                  <p>Best regards,<br>The Stardust Distro Team</p>
                </div>
              `
              textBody = `Delivery failed. "${delivery.releaseTitle}" could not be delivered to ${delivery.targetName}. Error: ${data?.error || 'Unknown'}. View logs at https://yourdomain.com/deliveries/${delivery.id}`
              
            } else if (type === 'retry') {
              const nextRetry = data?.nextRetryIn ? `in ${Math.round(data.nextRetryIn / 60)} minutes` : 'soon'
              subject = `🔄 Delivery Retry Scheduled: ${delivery.releaseTitle || 'Release'}`
              htmlBody = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #fbbc04;">🔄 Delivery Retry Scheduled</h2>
                  <p>Hi ${user.displayName || 'there'},</p>
                  <p>We're automatically retrying the delivery of <strong>"${delivery.releaseTitle}"</strong> to <strong>${delivery.targetName}</strong>.</p>
                  <div style="background: #fef7e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Attempt:</strong> ${data?.attemptNumber || 1} of 3</p>
                    <p><strong>Next Retry:</strong> ${nextRetry}</p>
                  </div>
                  <p>No action required. We'll notify you when the retry completes.</p>
                  <p>Best regards,<br>The Stardust Distro Team</p>
                </div>
              `
              textBody = `Delivery retry scheduled for "${delivery.releaseTitle}". Attempt ${data?.attemptNumber || 1} of 3. Next retry ${nextRetry}.`
            }
            
            if (subject && htmlBody) {
              await db.collection('mail').add({
                to: user.email,
                message: {
                  subject: subject,
                  html: htmlBody,
                  text: textBody
                },
                createdAt: admin.firestore.Timestamp.now()
              })
              
              console.log(`Email queued for ${user.email}: ${type}`)
            }
          }
        }
      } catch (emailError) {
        console.error('Error queueing email:', emailError)
      }
    }
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}

/**
 * Send welcome email when user document is created (v2 syntax)
 */
exports.onUserCreated = onDocumentCreated({
  document: 'users/{userId}',
  region: 'us-central1'
}, async (event) => {
  const user = event.data.data()
  const userId = event.params.userId
  
  try {
    console.log(`New user created: ${user.email}`)
    
    await db.collection('mail').add({
      to: user.email,
      message: {
        subject: 'Welcome to Stardust Distro! 🚀',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Welcome to Stardust Distro! 🚀</h1>
            </div>
            <div style="background: white; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p>Hi ${user.displayName || user.organizationName || 'there'},</p>
              <p>Your account has been created successfully! You're now ready to start distributing your music to the world's leading digital service providers.</p>
              <h3 style="color: #1a73e8;">🎵 Get Started:</h3>
              <ul style="line-height: 2;">
                <li>📀 <strong>Create your first release</strong> - Upload tracks, artwork, and metadata</li>
                <li>🎯 <strong>Configure delivery targets</strong> - Connect to Spotify, Apple Music, and more</li>
                <li>📊 <strong>Track your deliveries</strong> - Monitor status in real-time</li>
                <li>✅ <strong>DDEX compliant</strong> - Industry-standard delivery format</li>
              </ul>
              <p style="text-align: center; margin: 30px 0;">
                <a href="https://yourdomain.com/dashboard" style="display: inline-block; padding: 14px 30px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Open Dashboard</a>
              </p>
              <p>If you have any questions, feel free to reach out!</p>
              <p>Best regards,<br>The Stardust Distro Team</p>
            </div>
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>© 2025 Stardust Distro. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `Welcome to Stardust Distro!

Hi ${user.displayName || user.organizationName || 'there'},

Your account has been created successfully! You're now ready to start distributing your music.

Get Started:
- Create your first release
- Configure delivery targets
- Track your deliveries
- DDEX compliant delivery

Open Dashboard: https://yourdomain.com/dashboard

Best regards,
The Stardust Distro Team`
      },
      createdAt: admin.firestore.Timestamp.now()
    })
    
    console.log(`Welcome email queued for ${user.email}`)
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
})

/**
 * Send weekly summaries (already using v2 syntax)
 */
exports.sendWeeklySummaries = onSchedule({
  schedule: 'every monday 09:00',
  timeoutSeconds: 120,
  memory: '512MB',
  region: 'us-central1'
}, async (event) => {
  try {
    console.log('Starting weekly summary emails...')
    
    const oneWeekAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    )
    
    const users = await db.collection('users')
      .where('notifications.weeklyReports', '==', true)
      .get()
    
    let emailsSent = 0
    
    for (const userDoc of users.docs) {
      const user = userDoc.data()
      const userId = userDoc.id
      
      try {
        const deliveries = await db.collection('deliveries')
          .where('tenantId', '==', userId)
          .where('createdAt', '>=', oneWeekAgo)
          .get()
        
        if (deliveries.size === 0) {
          console.log(`No deliveries for user ${user.email}, skipping`)
          continue
        }
        
        const stats = {
          total: deliveries.size,
          successful: 0,
          failed: 0,
          pending: 0
        }
        
        deliveries.forEach(doc => {
          const delivery = doc.data()
          if (delivery.status === 'completed') stats.successful++
          else if (delivery.status === 'failed') stats.failed++
          else stats.pending++
        })
        
        const successRate = stats.total > 0 ? 
          Math.round((stats.successful / stats.total) * 100) : 0
        
        await db.collection('mail').add({
          to: user.email,
          message: {
            subject: `📊 Your Weekly Stardust Distro Summary`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a73e8;">📊 Weekly Summary</h2>
                <p>Hi ${user.displayName || 'there'},</p>
                <p>Here's your distribution activity for the past week:</p>
                <div style="display: flex; justify-content: space-around; text-align: center; padding: 30px; background: #f8f9fa; border-radius: 8px;">
                  <div>
                    <div style="font-size: 32px; font-weight: bold; color: #1a73e8;">${stats.total}</div>
                    <div style="color: #666; font-size: 14px;">Total Deliveries</div>
                  </div>
                  <div>
                    <div style="font-size: 32px; font-weight: bold; color: ${successRate > 80 ? '#34a853' : successRate > 50 ? '#fbbc04' : '#ea4335'};">${successRate}%</div>
                    <div style="color: #666; font-size: 14px;">Success Rate</div>
                  </div>
                  <div>
                    <div style="font-size: 32px; font-weight: bold; color: #34a853;">${stats.successful}</div>
                    <div style="color: #666; font-size: 14px;">Successful</div>
                  </div>
                </div>
                ${stats.failed > 0 ? `<p style="color: #ea4335;">⚠️ You have ${stats.failed} failed deliveries that may need attention.</p>` : ''}
                <p><a href="https://yourdomain.com/analytics" style="display: inline-block; padding: 12px 24px; background: #1a73e8; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Full Analytics</a></p>
                <p>Keep up the great work!</p>
                <p>Best regards,<br>The Stardust Distro Team</p>
              </div>
            `,
            text: `Weekly Summary\n\nTotal Deliveries: ${stats.total}\nSuccess Rate: ${successRate}%\nSuccessful: ${stats.successful}\nFailed: ${stats.failed}\n\nView full analytics: https://yourdomain.com/analytics`
          },
          createdAt: admin.firestore.Timestamp.now()
        })
        
        emailsSent++
        console.log(`Weekly summary queued for ${user.email}`)
      } catch (userError) {
        console.error(`Error processing user ${user.email}:`, userError)
      }
    }
    
    console.log(`Weekly summaries sent: ${emailsSent}`)
    return { emailsSent }
  } catch (error) {
    console.error('Error sending weekly summaries:', error)
    throw error
  }
})

exports.setupAdmin = onCall({
  cors: true
}, async (request) => {
  // This should only be called during initial setup
  const { email } = request.data;
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, { 
      admin: true, 
      role: 'admin' 
    });
    
    // Update user document
    await admin.firestore()
      .collection('users')
      .doc(user.uid)
      .set({
        email: user.email,
        displayName: user.displayName,
        role: 'admin',
        updatedAt: admin.firestore.Timestamp.now()
      }, { merge: true });
    
    return { 
      success: true, 
      message: 'Admin role set successfully'
    };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});