// functions/index.js
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const admin = require('firebase-admin')
const axios = require('axios')
const cors = require('cors');
const express = require('express');

// Initialize Firebase Admin
admin.initializeApp()
const db = admin.firestore()

// Import helper utilities
const { 
  calculateMD5, 
  setupAdmin, 
  downloadExternalImage 
} = require('./utils/helpers')

// Import testing utilities
const { 
  testDeliveryConnection, 
  testAPIEndpoint 
} = require('./utils/testing')

// Import middleware
const { requireAuth, requireTenantAccess, checkRateLimit } = require('./middleware/auth')
const { validateWith } = require('./middleware/validation')

// Import delivery handlers
const {
  deliverFTP,
  deliverSFTP,
  deliverS3,
  deliverAPI,
  deliverAzure
} = require('./delivery/handlers')

// Import delivery processing - only what we actually use
const {
  processDeliveryWithLock,
  acquireDeliveryLock,
  releaseDeliveryLock
} = require('./delivery/processing')

// Import fingerprinting functions
const fingerprintingFunctions = require('./services/fingerprinting')

// Import notification functions
const notificationFunctions = require('./services/notifications')

// Import encryption functions
const { encryptSensitiveData, decryptSensitiveData } = require('./encryption')

// Import audio and image metadata functions
const metadataFunctions = require('./services/metadata')

// Get project ID dynamically from Firebase environment
const projectId = process.env.GCLOUD_PROJECT || 
                  process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : 
                  'my-project';

/**
 * Get dynamic CORS origins based on environment
 */
function getCorsOrigins() {
  const origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:5001',
    'https://*.cloudfunctions.net'
  ];
  
  // Add Firebase hosting URLs
  if (projectId) {
    origins.push(
      `https://${projectId}.web.app`,
      `https://${projectId}.firebaseapp.com`
    );
  }
  
  // Add custom domain if configured
  if (process.env.CUSTOM_DOMAIN) {
    origins.push(process.env.CUSTOM_DOMAIN);
  }
  
  // Add any additional origins from environment
  if (process.env.ADDITIONAL_ORIGINS) {
    origins.push(...process.env.ADDITIONAL_ORIGINS.split(','));
  }
  
  return origins;
}

const corsOptions = {
  origin: getCorsOrigins(),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

// Create Express app for API routes
const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// Import API routes
const deezerRoutes = require('./api/deezer');
app.use('/deezer', deezerRoutes);

const spotifyRoutes = require('./api/spotify');
app.use('/spotify', spotifyRoutes);

// Export the Express app as a Cloud Function
exports.api = onRequest(app);

// Export encryption functions
exports.encryptSensitiveData = encryptSensitiveData
exports.decryptSensitiveData = decryptSensitiveData

// Export metadata extraction functions
exports.extractAudioMetadata = metadataFunctions.extractAudioMetadata
exports.extractImageMetadata = metadataFunctions.extractImageMetadata

// Set global options for v2 functions
setGlobalOptions({
  maxInstances: 10,
  region: 'us-central1',
  timeoutSeconds: 540, // 9 minutes for large file transfers
  memory: '1GB'
})

// ============================================================================
// CALLABLE FUNCTION: Calculate MD5
// ============================================================================

exports.calculateFileMD5 = onCall({
  timeoutSeconds: 60,
  memory: '256MB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('calculateMD5')(request);
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
// CALLABLE FUNCTIONS: Analytics
// ============================================================================

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
  await checkRateLimit(request.auth.uid, 60, 60000);
  
  const { tenantId, startDate, endDate } = request.data;
  
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
// EXPORTS
// ============================================================================

// Export delivery handlers
exports.deliverFTP = deliverFTP
exports.deliverSFTP = deliverSFTP
exports.deliverS3 = deliverS3
exports.deliverAPI = deliverAPI
exports.deliverAzure = deliverAzure

// Export testing functions
exports.testDeliveryConnection = testDeliveryConnection
exports.testAPIEndpoint = testAPIEndpoint

// Export admin functions
exports.setupAdmin = setupAdmin
exports.downloadExternalImage = downloadExternalImage

// Export fingerprinting functions
exports.calculateFileFingerprint = fingerprintingFunctions.calculateFileFingerprint
exports.checkDuplicates = fingerprintingFunctions.checkDuplicates
exports.calculateAudioFingerprint = fingerprintingFunctions.calculateAudioFingerprint
exports.calculateBatchFingerprints = fingerprintingFunctions.calculateBatchFingerprints
exports.getFingerprintStats = fingerprintingFunctions.getFingerprintStats

// Export notification functions
exports.onUserCreated = notificationFunctions.onUserCreated
exports.sendWeeklySummaries = notificationFunctions.sendWeeklySummaries