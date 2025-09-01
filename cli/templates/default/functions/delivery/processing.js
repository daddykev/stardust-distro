// functions/delivery/processing.js
const admin = require('firebase-admin')
const db = admin.firestore()

const { cleanForFirestore } = require('../utils/validation')
const { addDeliveryLog, extractFileExtension, extractFileName } = require('../utils/helpers')
const {
  deliverViaFTP,
  deliverViaSFTP,
  deliverViaS3,
  deliverViaAPI,
  deliverToDSP,
  deliverViaAzure,
  deliverViaStorage
} = require('./protocols')

// Import notification function (will be created in notifications.js)
let sendNotification;
// Defer import to avoid circular dependency
setTimeout(() => {
  sendNotification = require('../services/notifications').sendNotification;
}, 0);

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
                                    process.env.DISTRIBUTOR_ID || 
                                    process.env.GCLOUD_PROJECT || 
                                    'default-distributor'
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
    if (sendNotification) {
      await sendNotification({ ...delivery, id: deliveryId }, 'success', {
        ...result,
        messageSubType: delivery.messageSubType || 'Initial'
      })
    }

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
    if (sendNotification) {
      await sendNotification({ ...delivery, id: deliveryId }, 'retry', {
        attemptNumber,
        nextRetryIn: retryDelay / 1000,
        messageSubType: delivery.messageSubType || 'Initial'
      })
    }
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
    if (sendNotification) {
      await sendNotification({ ...delivery, id: deliveryId }, 'failed', {
        error: error.message,
        attempts: attemptNumber,
        messageSubType: delivery.messageSubType || 'Initial'
      })
    }
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

module.exports = {
  processDelivery,
  handleDeliveryError,
  prepareDeliveryPackage,
  acquireDeliveryLock,
  releaseDeliveryLock,
  processDeliveryWithLock
}