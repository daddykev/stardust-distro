// functions/index.js
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const admin = require('firebase-admin')
const ftp = require('basic-ftp')
const { Client: SSHClient } = require('ssh2')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')
const { BlobServiceClient } = require('@azure/storage-blob')
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs').promises
const path = require('path')
const os = require('os')
const crypto = require('crypto')

// Initialize Firebase Admin
admin.initializeApp()
const db = admin.firestore()
const storage = admin.storage()

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
 * Callable function for MD5 calculation
 */
exports.calculateFileMD5 = onCall({
  timeoutSeconds: 60,
  memory: '256MB',
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }
  
  const { url } = request.data
  
  if (!url) {
    throw new HttpsError('invalid-argument', 'URL is required')
  }
  
  try {
    console.log(`Calculating MD5 for: ${url}`)
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
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
    const log = {
      timestamp,
      level: logEntry.level || 'info', // info, warning, error, success
      step: logEntry.step || 'general',
      message: logEntry.message,
      details: logEntry.details || null,
      duration: logEntry.duration || null
    }
    
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
// SCHEDULED FUNCTIONS
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
    
    // TEMPORARY: Simpler query while index builds
    const now = admin.firestore.Timestamp.now()
    const snapshot = await db.collection('deliveries')
      .where('status', '==', 'queued')
      .limit(10)
      .get()

    if (snapshot.empty) {
      console.log('No deliveries to process')
      return { processed: 0 }
    }

    // Filter in memory for now
    const deliveriesToProcess = []
    snapshot.forEach(doc => {
      const data = doc.data()
      // Check if scheduledAt is in the past
      if (data.scheduledAt && data.scheduledAt.toMillis() <= now.toMillis()) {
        deliveriesToProcess.push({ id: doc.id, data })
      }
    })
    
    // Sort by priority and scheduledAt in memory
    deliveriesToProcess.sort((a, b) => {
      // First by priority (desc)
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 }
      const aPriority = priorityOrder[a.data.priority] || 2
      const bPriority = priorityOrder[b.data.priority] || 2
      if (aPriority !== bPriority) return bPriority - aPriority
      
      // Then by scheduledAt (asc)
      return a.data.scheduledAt.toMillis() - b.data.scheduledAt.toMillis()
    })

    const promises = []
    for (const delivery of deliveriesToProcess.slice(0, 10)) {
      console.log(`Processing delivery ${delivery.id}`)
      promises.push(processDelivery(delivery.id, delivery.data))
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
// CALLABLE FUNCTIONS
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }
  
  const { target, package: deliveryPackage } = request.data
  
  if (!target || !deliveryPackage) {
    throw new HttpsError('invalid-argument', 'Missing required parameters')
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }
  
  const { target, package: deliveryPackage } = request.data
  
  if (!target || !deliveryPackage) {
    throw new HttpsError('invalid-argument', 'Missing required parameters')
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }
  
  const { target, package: deliveryPackage } = request.data
  
  if (!target || !deliveryPackage) {
    throw new HttpsError('invalid-argument', 'Missing required parameters')
  }
  
  try {
    return await deliverViaS3(target, deliveryPackage)
  } catch (error) {
    console.error('S3 delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * API Delivery Handler - Updated for DSP Authentication
 */
exports.deliverAPI = onCall({
  timeoutSeconds: 300,
  memory: '512MB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }
  
  const { target, package: deliveryPackage } = request.data
  
  if (!target || !deliveryPackage) {
    throw new HttpsError('invalid-argument', 'Missing required parameters')
  }
  
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
 * Specialized DSP Delivery Implementation with Enhanced Logging
 */
async function deliverToDSP(target, deliveryPackage) {
  const deliveryId = deliveryPackage.deliveryId || 'api_delivery'
  
  try {
    // Log DSP delivery start
    console.log(`Starting DSP delivery to ${target.endpoint}`)
    
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
      audioFiles: deliveryPackage.audioFiles?.length || 0,
      imageFiles: deliveryPackage.imageFiles?.length || 0,
      hasERN: !!deliveryPackage.ernXml,
      upc: deliveryPackage.upc
    })
    
    // Prepare the DSP-specific payload
    const payload = {
      distributorId: deliveryPackage.distributorId || target.config?.distributorId || 'stardust-distro',
      messageId: deliveryPackage.metadata?.messageId || deliveryPackage.messageId,
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
        releaseCount: 1
      },
      processing: {
        status: 'received',
        receivedAt: new Date().toISOString()
      },
      // Add file transfer instructions
      fileTransferRequired: true,
      sourceStorage: 'firebase',
      sourceDeliveryId: deliveryId
    }
    
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
 * Azure Delivery Handler
 */
exports.deliverAzure = onCall({
  timeoutSeconds: 300,
  memory: '1GB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }
  
  const { target, package: deliveryPackage } = request.data
  
  if (!target || !deliveryPackage) {
    throw new HttpsError('invalid-argument', 'Missing required parameters')
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }
  
  const { tenantId, startDate, endDate } = request.data
  
  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'Tenant ID is required')
  }
  
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
// DELIVERY PROCESSING FUNCTIONS WITH ENHANCED LOGGING
// ============================================================================

/**
 * Process individual delivery with comprehensive logging
 */
async function processDelivery(deliveryId, delivery) {
  const startTime = Date.now()
  
  try {
    console.log(`Starting delivery ${deliveryId} to ${delivery.targetName}`)
    
    // Log: Starting delivery
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'initialization',
      message: 'Starting cloud function delivery process'
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
        endpoint: target.connection?.endpoint ? 'configured' : 'not configured'
      }
    })
    
    console.log(`Target protocol: ${target.protocol || delivery.targetProtocol}`)
    console.log(`Target endpoint: ${target.connection?.endpoint || 'Not configured'}`)
    
    // Use protocol from delivery if target doesn't have it
    const protocol = target.protocol || delivery.targetProtocol
    
    // Log: Preparing package
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'package_preparation',
      message: 'Preparing delivery package with DDEX naming'
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
    }

    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 'package_preparation',
      message: `Package prepared with ${deliveryPackage.files.length} files (DDEX naming applied)`,
      details: {
        audioFiles: deliveryPackage.audioFiles?.length || 0,
        imageFiles: deliveryPackage.imageFiles?.length || 0,
        ernIncluded: !!deliveryPackage.ernXml,
        upc: deliveryPackage.upc
      }
    })

    // Log: Starting delivery execution
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'delivery_execution',
      message: `Starting ${protocol} delivery to ${target.name}`
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

    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 'delivery_execution',
      message: `Delivery completed via ${protocol}`,
      duration: deliveryDuration,
      details: {
        filesDelivered: result.files?.length || 0,
        bytesTransferred: result.bytesTransferred || 0,
        acknowledgmentId: result.acknowledgmentId || result.deliveryId
      }
    })

    // Log: Generating receipt
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'receipt_generation',
      message: 'Generating delivery receipt'
    })

    // Update delivery as completed
    const totalDuration = Date.now() - startTime
    
    await db.collection('deliveries').doc(deliveryId).update({
      status: 'completed',
      completedAt: admin.firestore.Timestamp.now(),
      totalDuration,
      receipt: {
        acknowledgment: result.acknowledgment || 'Delivery completed successfully',
        dspMessageId: result.messageId || `DSP_${Date.now()}`,
        timestamp: admin.firestore.Timestamp.now(),
        files: result.files || []
      }
    })

    await addDeliveryLog(deliveryId, {
      level: 'success',
      step: 'completion',
      message: `Delivery completed successfully in ${Math.round(totalDuration / 1000)}s`,
      duration: totalDuration,
      details: {
        protocol,
        targetName: target.name,
        totalFiles: result.files?.length || 0
      }
    })

    // Send success notification
    await sendNotification({ ...delivery, id: deliveryId }, 'success', result)

    console.log(`Delivery ${deliveryId} completed successfully`)
    return result
  } catch (error) {
    console.error(`Error processing delivery ${deliveryId}:`, error)
    
    await addDeliveryLog(deliveryId, {
      level: 'error',
      step: 'error_handling',
      message: `Delivery failed: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack
      }
    })
    
    // Handle retry logic
    await handleDeliveryError(deliveryId, { ...delivery, id: deliveryId }, error)
    
    throw error
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
    
    await addDeliveryLog(deliveryId, {
      level: 'info',
      step: 'storage_upload',
      message: `Uploading to path: ${basePath}`,
      details: {
        distributorId,
        bucket: bucket.name,
        upc: deliveryPackage.upc
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
          
          console.log(`Downloading ${file.originalName} from: ${file.url}`)
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
          
          await storageFile.save(fileBuffer, {
            metadata: {
              contentType: file.isERN ? 'text/xml' : 
                          file.type === 'audio' ? 'audio/mpeg' : 'image/jpeg',
              metadata: {
                distributorId: distributorId,
                messageId: deliveryPackage.metadata.messageId,
                releaseTitle: deliveryPackage.releaseTitle || 'Unknown',
                testMode: String(deliveryPackage.metadata.testMode),
                originalName: file.originalName || file.name,
                ddexName: file.name,
                upc: deliveryPackage.upc,
                md5Hash: md5Hash
              }
            }
          })
          
          uploadedFiles.push({
            name: file.name, // DDEX compliant name
            originalName: file.originalName,
            path: filePath,
            size: fileBuffer.length,
            md5Hash: md5Hash,
            uploadedAt: new Date().toISOString()
          })
          
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
      upc: deliveryPackage.upc
    }
  } catch (error) {
    console.error('Storage delivery error:', error)
    throw new Error(`Storage delivery failed: ${error.message}`)
  }
}

/**
 * Handle delivery error with retry logic and logging
 */
async function handleDeliveryError(deliveryId, delivery, error) {
  const attemptNumber = (delivery.attempts?.length || 0) + 1
  const maxRetries = 3
  const retryDelays = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000] // 5min, 15min, 1hr

  const attempt = {
    attemptNumber,
    startTime: admin.firestore.Timestamp.now(),
    endTime: admin.firestore.Timestamp.now(),
    status: 'failed',
    error: error.message
  }

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
        error: error.message
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
      nextRetryIn: retryDelay / 1000
    })
  } else {
    // Max retries reached
    await addDeliveryLog(deliveryId, {
      level: 'error',
      step: 'max_retries',
      message: `Maximum retries (${maxRetries}) exceeded - delivery failed permanently`,
      details: {
        attempts: attemptNumber,
        finalError: error.message
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
      attempts: attemptNumber
    })
  }
}

/**
 * Prepare delivery package with DDEX naming
 */
async function prepareDeliveryPackage(delivery) {
  const files = []

  // Add ERN file
  if (delivery.ernXml) {
    files.push({
      name: `${delivery.ernMessageId}.xml`,
      content: delivery.ernXml,
      type: 'text/xml',
      isERN: true
    })
  }

  // Add references to audio and image files
  // Note: These should already have DDEX names from the client-side preparePackage
  if (delivery.package?.audioFiles) {
    delivery.package.audioFiles.forEach((url, index) => {
      if (url) {
        // Extract the DDEX name if it was set, otherwise generate it
        const ddexName = delivery.package.audioFileNames?.[index] || 
                        `${delivery.upc || '0000000000000'}_01_${String(index + 1).padStart(3, '0')}.wav`
        
        files.push({
          name: ddexName, // Use DDEX name
          originalName: extractFileName(url),
          url,
          type: 'audio',
          needsDownload: true
        })
      }
    })
  }

  if (delivery.package?.imageFiles) {
    delivery.package.imageFiles.forEach((url, index) => {
      if (url) {
        // Extract the DDEX name if it was set, otherwise generate it
        const ddexName = delivery.package.imageFileNames?.[index] || 
                        (index === 0 ? `${delivery.upc || '0000000000000'}.jpg` : 
                                      `${delivery.upc || '0000000000000'}_${String(index + 1).padStart(2, '0')}.jpg`)
        
        files.push({
          name: ddexName, // Use DDEX name
          originalName: extractFileName(url),
          url,
          type: 'image',
          needsDownload: true
        })
      }
    })
  }

  return {
    deliveryId: delivery.id,
    releaseTitle: delivery.releaseTitle,
    targetName: delivery.targetName,
    files,
    metadata: {
      messageId: delivery.ernMessageId,
      testMode: delivery.testMode,
      priority: delivery.priority
    },
    upc: delivery.upc
  }
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
      secure: target.secure || target.connection?.secure || false
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
        fileContent = await fs.readFile(localPath)
        md5Hash = calculateMD5(fileContent)
      } else {
        // Write ERN XML directly
        fileContent = Buffer.from(file.content, 'utf8')
        await fs.writeFile(localPath, fileContent)
        md5Hash = calculateMD5(fileContent)
      }

      // Upload to FTP with DDEX name
      await client.uploadFrom(localPath, file.name)
      
      uploadedFiles.push({
        name: file.name, // DDEX name
        originalName: file.originalName,
        size: fileContent.length,
        md5Hash: md5Hash,
        uploadedAt: new Date().toISOString()
      })

      console.log(`FTP: Uploaded ${file.name} (MD5: ${md5Hash})`)

      // Clean up local file
      await fs.unlink(localPath)
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
      await fs.rmdir(tempDir, { recursive: true })
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
                fileContent = await fs.readFile(localPath)
                md5Hash = calculateMD5(fileContent)
              } else {
                fileContent = Buffer.from(file.content, 'utf8')
                await fs.writeFile(localPath, fileContent)
                md5Hash = calculateMD5(fileContent)
              }

              // Upload via SFTP with DDEX name
              await new Promise((uploadResolve, uploadReject) => {
                sftp.fastPut(localPath, remotePath, (err) => {
                  if (err) uploadReject(err)
                  else uploadResolve()
                })
              })

              uploadedFiles.push({
                name: file.name, // DDEX name
                originalName: file.originalName,
                size: fileContent.length,
                md5Hash: md5Hash,
                uploadedAt: new Date().toISOString()
              })

              console.log(`SFTP: Uploaded ${file.name} (MD5: ${md5Hash})`)

              // Clean up local file
              await fs.unlink(localPath)
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
          await fs.rmdir(tempDir, { recursive: true })
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
          Metadata: {
            'delivery-id': deliveryPackage.deliveryId,
            'message-id': deliveryPackage.metadata.messageId,
            'test-mode': String(deliveryPackage.metadata.testMode),
            'original-name': file.originalName || '',
            'ddex-name': file.name,
            'upc': deliveryPackage.upc || '',
            'md5-hash': md5Hash
          }
        }
      })

      const result = await multipartUpload.done()
      
      uploadedFiles.push({
        name: file.name, // DDEX name
        originalName: file.originalName,
        location: `https://${bucket}.s3.${target.region || target.connection?.region}.amazonaws.com/${key}`,
        etag: result.ETag,
        size: fileContent.length,
        md5Hash: md5Hash,
        uploadedAt: new Date().toISOString()
      })
    } else {
      // Regular upload for smaller files
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileContent,
        ContentType: file.type === 'text/xml' ? 'text/xml' : 'application/octet-stream',
        ContentMD5: Buffer.from(md5Hash, 'hex').toString('base64'),
        Metadata: {
          'delivery-id': deliveryPackage.deliveryId,
          'message-id': deliveryPackage.metadata.messageId,
          'test-mode': String(deliveryPackage.metadata.testMode),
          'original-name': file.originalName || '',
          'ddex-name': file.name,
          'upc': deliveryPackage.upc || '',
          'md5-hash': md5Hash
        }
      })

      const result = await s3Client.send(command)
      
      uploadedFiles.push({
        name: file.name, // DDEX name
        originalName: file.originalName,
        location: `https://${bucket}.s3.${target.region || target.connection?.region}.amazonaws.com/${key}`,
        etag: result.ETag,
        size: fileContent.length,
        md5Hash: md5Hash,
        uploadedAt: new Date().toISOString()
      })
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

  // Add metadata including UPC
  formData.append('metadata', JSON.stringify({
    messageId: deliveryPackage.metadata.messageId,
    releaseTitle: deliveryPackage.releaseTitle,
    testMode: deliveryPackage.metadata.testMode,
    upc: deliveryPackage.upc
  }))

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
        upc: deliveryPackage.upc
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

    const uploadResponse = await blockBlobClient.upload(
      fileContent,
      fileContent.length,
      {
        blobHTTPHeaders: {
          blobContentMD5: Buffer.from(md5Hash, 'hex').toString('base64')
        },
        metadata: {
          deliveryId: deliveryPackage.deliveryId,
          messageId: deliveryPackage.metadata.messageId,
          originalName: file.originalName || '',
          ddexName: file.name,
          upc: deliveryPackage.upc || '',
          md5Hash: md5Hash
        }
      }
    )

    uploadedFiles.push({
      name: file.name, // DDEX name
      originalName: file.originalName,
      etag: uploadResponse.etag,
      size: fileContent.length,
      md5Hash: md5Hash,
      uploadedAt: new Date().toISOString()
    })
    
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Download file from URL to local path
 */
async function downloadFile(url, localPath) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  })
  
  const writer = fs.createWriteStream(localPath)
  response.data.pipe(writer)
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
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

/**
 * Send notifications
 */
async function sendNotification(delivery, type, data) {
  try {
    // Ensure delivery has an id
    if (!delivery.id) {
      console.warn('Delivery missing id for notification')
      return
    }
    
    // Store notification in Firestore
    await db.collection('notifications').add({
      type,
      deliveryId: delivery.id,
      releaseTitle: delivery.releaseTitle || 'Unknown',
      targetName: delivery.targetName || 'Unknown',
      tenantId: delivery.tenantId,
      timestamp: admin.firestore.Timestamp.now(),
      data
    })

    console.log(`Notification sent: ${type} for delivery ${delivery.id}`)
    
    // TODO: Implement email notifications with SendGrid/SES
    // if (type === 'failed' || type === 'success') {
    //   await sendEmailNotification(delivery, type, data)
    // }
  } catch (error) {
    console.error('Error sending notification:', error)
    // Don't throw - notification failure shouldn't stop delivery
  }
}