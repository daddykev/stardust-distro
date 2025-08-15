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
// SCHEDULED FUNCTIONS
// ============================================================================

/**
 * Process delivery queue - runs every minute
 */
exports.processDeliveryQueue = onSchedule({
  schedule: 'every 1 minutes',
  timeoutSeconds: 540,
  memory: '1GB',
  maxInstances: 3
}, async (event) => {
  try {
    console.log('Processing delivery queue...')
    
    // Get queued deliveries that are ready to process
    const now = admin.firestore.Timestamp.now()
    const snapshot = await db.collection('deliveries')
      .where('status', '==', 'queued')
      .where('scheduledAt', '<=', now)
      .orderBy('priority', 'desc')
      .orderBy('scheduledAt', 'asc')
      .limit(10)
      .get()

    if (snapshot.empty) {
      console.log('No deliveries to process')
      return { processed: 0 }
    }

    const promises = []
    snapshot.forEach(doc => {
      console.log(`Processing delivery ${doc.id}`)
      promises.push(processDelivery(doc.id, doc.data()))
    })

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
 * Specialized DSP Delivery Implementation
 */
async function deliverToDSP(target, deliveryPackage) {
  try {
    // Prepare the DSP-specific payload
    const payload = {
      distributorId: deliveryPackage.distributorId,
      messageId: deliveryPackage.metadata?.messageId || deliveryPackage.messageId,
      releaseTitle: deliveryPackage.releaseTitle,
      releaseArtist: deliveryPackage.releaseArtist,
      ernXml: deliveryPackage.ernXml || deliveryPackage.files?.find(f => f.isERN)?.content,
      testMode: deliveryPackage.metadata?.testMode || false,
      priority: deliveryPackage.metadata?.priority || 'normal',
      timestamp: new Date().toISOString(),
      // ADD THESE for DSP Ingestion.vue compatibility:
      ern: {
        messageId: deliveryPackage.metadata?.messageId || deliveryPackage.messageId,
        releaseCount: 1 // Or calculate from actual releases
      },
      processing: {
        status: 'received',
        receivedAt: new Date().toISOString()
      }
    }
    
    // Prepare headers with authentication
    const headers = {
      'Content-Type': 'application/json'
    }
    
    // Add Bearer token if API key is provided
    if (target.headers?.Authorization) {
      headers.Authorization = target.headers.Authorization
    }
    
    console.log(`Delivering to DSP: ${target.endpoint}`)
    console.log(`Distributor ID: ${payload.distributorId}`)
    
    // Make the API request
    const response = await axios({
      method: 'POST',
      url: target.endpoint,
      headers,
      data: payload,
      timeout: 30000
    })
    
    console.log('DSP Response:', response.data)
    
    return {
      success: true,
      protocol: 'API',
      response: response.data,
      statusCode: response.status,
      messageId: payload.messageId,
      files: [{
        name: 'manifest.xml',
        status: 'completed',
        uploadedAt: new Date().toISOString()
      }],
      acknowledgment: response.data.acknowledgment || response.data.message || 'Delivery accepted by DSP'
    }
  } catch (error) {
    console.error('DSP Delivery Error:', error.response?.data || error.message)
    
    if (error.response) {
      throw new Error(`DSP rejected delivery: ${error.response.data?.error || error.response.statusText}`)
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
// DELIVERY PROCESSING FUNCTIONS
// ============================================================================

/**
 * Process individual delivery
 */
async function processDelivery(deliveryId, delivery) {
  try {
    console.log(`Starting delivery ${deliveryId} to ${delivery.targetName}`)
    
    // Update status to processing
    await db.collection('deliveries').doc(deliveryId).update({
      status: 'processing',
      startedAt: admin.firestore.Timestamp.now()
    })

    // Get target configuration
    const targetDoc = await db.collection('deliveryTargets')
      .doc(delivery.targetId)
      .get()
    
    if (!targetDoc.exists) {
      throw new Error('Delivery target not found')
    }

    const target = targetDoc.data()

    // Prepare delivery package
    const deliveryPackage = await prepareDeliveryPackage(delivery)

    // Execute delivery based on protocol
    let result
    switch (target.protocol) {
      case 'FTP':
        result = await deliverViaFTP(target, deliveryPackage)
        break
      case 'SFTP':
        result = await deliverViaSFTP(target, deliveryPackage)
        break
      case 'S3':
        result = await deliverViaS3(target, deliveryPackage)
        break
      case 'API':
        result = await deliverViaAPI(target, deliveryPackage)
        break
      case 'Azure':
        result = await deliverViaAzure(target, deliveryPackage)
        break
      default:
        throw new Error(`Unsupported protocol: ${target.protocol}`)
    }

    // Update delivery as completed
    await db.collection('deliveries').doc(deliveryId).update({
      status: 'completed',
      completedAt: admin.firestore.Timestamp.now(),
      receipt: {
        acknowledgment: 'Delivery completed successfully',
        dspMessageId: result.messageId || `DSP_${Date.now()}`,
        timestamp: admin.firestore.Timestamp.now(),
        files: result.files || []
      }
    })

    // Send success notification
    await sendNotification(delivery, 'success', result)

    console.log(`Delivery ${deliveryId} completed successfully`)
    return result
  } catch (error) {
    console.error(`Error processing delivery ${deliveryId}:`, error)
    
    // Handle retry logic
    await handleDeliveryError(deliveryId, delivery, error)
    
    throw error
  }
}

/**
 * Prepare delivery package
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
  if (delivery.package?.audioFiles) {
    delivery.package.audioFiles.forEach(url => {
      if (url) {
        files.push({
          name: extractFileName(url),
          url,
          type: 'audio',
          needsDownload: true
        })
      }
    })
  }

  if (delivery.package?.imageFiles) {
    delivery.package.imageFiles.forEach(url => {
      if (url) {
        files.push({
          name: extractFileName(url),
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
    }
  }
}

// ============================================================================
// PROTOCOL IMPLEMENTATIONS
// ============================================================================

/**
 * FTP Delivery Implementation
 */
async function deliverViaFTP(target, deliveryPackage) {
  const client = new ftp.Client()
  const tempDir = path.join(os.tmpdir(), `delivery_${Date.now()}`)
  
  try {
    await fs.mkdir(tempDir, { recursive: true })
    
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

    // Upload each file
    for (const file of deliveryPackage.files) {
      const localPath = path.join(tempDir, file.name)
      
      // Download file from Storage if needed
      if (file.needsDownload) {
        await downloadFile(file.url, localPath)
      } else {
        // Write ERN XML directly
        await fs.writeFile(localPath, file.content)
      }

      // Upload to FTP
      await client.uploadFrom(localPath, file.name)
      uploadedFiles.push({
        name: file.name,
        size: (await fs.stat(localPath)).size,
        uploadedAt: new Date().toISOString()
      })

      // Clean up local file
      await fs.unlink(localPath)
    }

    await client.close()
    
    return {
      success: true,
      protocol: 'FTP',
      files: uploadedFiles,
      messageId: deliveryPackage.metadata.messageId
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
 * SFTP Delivery Implementation
 */
async function deliverViaSFTP(target, deliveryPackage) {
  const conn = new SSHClient()
  const tempDir = path.join(os.tmpdir(), `delivery_${Date.now()}`)
  
  return new Promise(async (resolve, reject) => {
    try {
      await fs.mkdir(tempDir, { recursive: true })
      
      conn.on('ready', async () => {
        conn.sftp(async (err, sftp) => {
          if (err) {
            conn.end()
            return reject(err)
          }

          try {
            const uploadedFiles = []
            const targetDir = target.directory || target.connection?.directory || '.'

            // Upload each file
            for (const file of deliveryPackage.files) {
              const localPath = path.join(tempDir, file.name)
              const remotePath = path.posix.join(targetDir, file.name)
              
              // Prepare local file
              if (file.needsDownload) {
                await downloadFile(file.url, localPath)
              } else {
                await fs.writeFile(localPath, file.content)
              }

              // Upload via SFTP
              await new Promise((uploadResolve, uploadReject) => {
                sftp.fastPut(localPath, remotePath, (err) => {
                  if (err) uploadReject(err)
                  else uploadResolve()
                })
              })

              uploadedFiles.push({
                name: file.name,
                size: (await fs.stat(localPath)).size,
                uploadedAt: new Date().toISOString()
              })

              // Clean up local file
              await fs.unlink(localPath)
            }

            conn.end()
            
            resolve({
              success: true,
              protocol: 'SFTP',
              files: uploadedFiles,
              messageId: deliveryPackage.metadata.messageId
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
 * S3 Delivery Implementation
 */
async function deliverViaS3(target, deliveryPackage) {
  const s3Client = new S3Client({
    region: target.region || target.connection?.region,
    credentials: {
      accessKeyId: target.accessKeyId || target.connection?.accessKeyId,
      secretAccessKey: target.secretAccessKey || target.connection?.secretAccessKey
    }
  })

  const uploadedFiles = []
  const bucket = target.bucket || target.connection?.bucket
  const prefix = target.prefix || target.connection?.prefix || ''

  for (const file of deliveryPackage.files) {
    let fileContent
    
    if (file.needsDownload) {
      // Download file from Storage
      const response = await axios.get(file.url, { responseType: 'arraybuffer' })
      fileContent = Buffer.from(response.data)
    } else {
      fileContent = Buffer.from(file.content)
    }

    const key = path.posix.join(prefix, file.name)
    
    // For large files, use multipart upload
    if (fileContent.length > 5 * 1024 * 1024) { // 5MB threshold
      const multipartUpload = new Upload({
        client: s3Client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: fileContent,
          ContentType: file.type === 'text/xml' ? 'text/xml' : 'application/octet-stream',
          Metadata: {
            'delivery-id': deliveryPackage.deliveryId,
            'message-id': deliveryPackage.metadata.messageId,
            'test-mode': String(deliveryPackage.metadata.testMode)
          }
        }
      })

      const result = await multipartUpload.done()
      
      uploadedFiles.push({
        name: file.name,
        location: `https://${bucket}.s3.${target.region || target.connection?.region}.amazonaws.com/${key}`,
        etag: result.ETag,
        uploadedAt: new Date().toISOString()
      })
    } else {
      // Regular upload for smaller files
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileContent,
        ContentType: file.type === 'text/xml' ? 'text/xml' : 'application/octet-stream',
        Metadata: {
          'delivery-id': deliveryPackage.deliveryId,
          'message-id': deliveryPackage.metadata.messageId,
          'test-mode': String(deliveryPackage.metadata.testMode)
        }
      })

      const result = await s3Client.send(command)
      
      uploadedFiles.push({
        name: file.name,
        location: `https://${bucket}.s3.${target.region || target.connection?.region}.amazonaws.com/${key}`,
        etag: result.ETag,
        uploadedAt: new Date().toISOString()
      })
    }
  }

  return {
    success: true,
    protocol: 'S3',
    files: uploadedFiles,
    messageId: deliveryPackage.metadata.messageId
  }
}

/**
 * Standard API Delivery Implementation
 */
async function deliverViaAPI(target, deliveryPackage) {
  const formData = new FormData()
  
  // Add ERN XML
  const ernFile = deliveryPackage.files.find(f => f.isERN)
  if (ernFile) {
    formData.append('ern', Buffer.from(ernFile.content), {
      filename: ernFile.name,
      contentType: 'text/xml'
    })
  }

  // Add metadata
  formData.append('metadata', JSON.stringify({
    messageId: deliveryPackage.metadata.messageId,
    releaseTitle: deliveryPackage.releaseTitle,
    testMode: deliveryPackage.metadata.testMode
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

  // Make API request
  const response = await axios({
    method: target.method || target.connection?.method || 'POST',
    url: target.endpoint || target.connection?.endpoint,
    data: formData,
    headers,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  })

  return {
    success: true,
    protocol: 'API',
    response: response.data,
    statusCode: response.status,
    messageId: deliveryPackage.metadata.messageId
  }
}

/**
 * Storage Delivery Handler for DSP
 */
exports.deliverStorage = onCall({
  timeoutSeconds: 300,
  memory: '512MB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }
  
  const { target, package: deliveryPackage } = request.data
  
  try {
    const bucket = admin.storage().bucket(target.bucket || 'stardust-dsp.firebasestorage.app')
    const uploadedFiles = []
    
    for (const upload of target.uploads) {
      let fileBuffer
      
      if (upload.needsDownload && upload.url) {
        // Download file from URL
        const response = await axios.get(upload.url, { responseType: 'arraybuffer' })
        fileBuffer = Buffer.from(response.data)
      } else if (upload.content) {
        // Use provided content
        fileBuffer = Buffer.from(upload.content)
      }
      
      if (fileBuffer) {
        const file = bucket.file(upload.path)
        await file.save(fileBuffer, {
          metadata: {
            contentType: upload.contentType || 'application/octet-stream',
            metadata: upload.metadata || {}
          }
        })
        
        uploadedFiles.push({
          name: upload.path,
          size: fileBuffer.length,
          uploadedAt: new Date().toISOString()
        })
      }
    }
    
    return {
      success: true,
      protocol: 'Storage',
      files: uploadedFiles,
      messageId: deliveryPackage.metadata?.messageId,
      bucket: target.bucket,
      distributorId: target.distributorId
    }
  } catch (error) {
    console.error('Storage delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Azure Blob Storage Implementation
 */
async function deliverViaAzure(target, deliveryPackage) {
  const accountName = target.accountName || target.connection?.accountName
  const accountKey = target.accountKey || target.connection?.accountKey
  
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
  )
  
  const containerName = target.containerName || target.connection?.containerName
  const containerClient = blobServiceClient.getContainerClient(containerName)

  const uploadedFiles = []
  const prefix = target.prefix || target.connection?.prefix || ''

  for (const file of deliveryPackage.files) {
    const blobName = path.posix.join(prefix, file.name)
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)
    
    let fileContent
    if (file.needsDownload) {
      const response = await axios.get(file.url, { responseType: 'arraybuffer' })
      fileContent = Buffer.from(response.data)
    } else {
      fileContent = Buffer.from(file.content)
    }

    const uploadResponse = await blockBlobClient.upload(
      fileContent,
      fileContent.length,
      {
        metadata: {
          deliveryId: deliveryPackage.deliveryId,
          messageId: deliveryPackage.metadata.messageId
        }
      }
    )

    uploadedFiles.push({
      name: file.name,
      etag: uploadResponse.etag,
      uploadedAt: new Date().toISOString()
    })
  }

  return {
    success: true,
    protocol: 'Azure',
    files: uploadedFiles,
    messageId: deliveryPackage.metadata.messageId
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
 * Handle delivery error with retry logic
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

    await db.collection('deliveries').doc(deliveryId).update({
      status: 'queued',
      attempts: admin.firestore.FieldValue.arrayUnion(attempt),
      scheduledAt,
      lastError: error.message,
      retryCount: attemptNumber
    })

    console.log(`Scheduled retry #${attemptNumber} for delivery ${deliveryId}`)
    
    // Send retry notification
    await sendNotification(delivery, 'retry', {
      attemptNumber,
      nextRetryIn: retryDelay / 1000
    })
  } else {
    // Max retries reached
    await db.collection('deliveries').doc(deliveryId).update({
      status: 'failed',
      attempts: admin.firestore.FieldValue.arrayUnion(attempt),
      failedAt: admin.firestore.Timestamp.now(),
      error: error.message
    })

    console.log(`Delivery ${deliveryId} failed after ${attemptNumber} attempts`)
    
    // Send failure notification
    await sendNotification(delivery, 'failed', {
      error: error.message,
      attempts: attemptNumber
    })
  }
}

/**
 * Send notifications
 */
async function sendNotification(delivery, type, data) {
  try {
    // Store notification in Firestore
    await db.collection('notifications').add({
      type,
      deliveryId: delivery.id,
      releaseTitle: delivery.releaseTitle,
      targetName: delivery.targetName,
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