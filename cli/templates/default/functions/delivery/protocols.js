// functions/delivery/protocols.js
const ftp = require('basic-ftp')
const { Client: SSHClient } = require('ssh2')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')
const { BlobServiceClient } = require('@azure/storage-blob')
const axios = require('axios')
const fs = require('fs')
const fsp = fs.promises
const path = require('path')
const os = require('os')
const { Buffer } = require('buffer')
const admin = require('firebase-admin')

const storage = admin.storage()
const { cleanForFirestore } = require('../utils/validation')
const { 
  calculateMD5, 
  addDeliveryLog, 
  downloadFile, 
  extractFileExtension, 
  extractFileName 
} = require('../utils/helpers')

// Get project ID and distributor ID
const projectId = process.env.GCLOUD_PROJECT || 
                  process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : 
                  'my-project';

const DEFAULT_DISTRIBUTOR_ID = process.env.DISTRIBUTOR_ID || 
                               process.env.GCLOUD_PROJECT || 
                               'my-distributor';

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

  const FormData = require('form-data')
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
  const organizationName = process.env.VITE_ORGANIZATION_NAME || 'Platform'
  
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
      distributorId: deliveryPackage.distributorId || target.config?.distributorId || DEFAULT_DISTRIBUTOR_ID,
      messageId: deliveryPackage.metadata?.messageId,
      messageSubType: deliveryPackage.messageSubType || 'Initial',
      audioFiles: deliveryPackage.audioFiles?.length || 0,
      imageFiles: deliveryPackage.imageFiles?.length || 0,
      hasERN: !!deliveryPackage.ernXml,
      upc: deliveryPackage.upc
    })
    
    // Prepare the DSP-specific payload - clean undefined values
    const payload = cleanForFirestore({
      distributorId: deliveryPackage.distributorId || target.config?.distributorId || process.env.DISTRIBUTOR_ID || 'default-distributor',
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
    const distributorId = deliveryPackage.distributorId || target.config?.distributorId || DEFAULT_DISTRIBUTOR_ID
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

module.exports = {
  deliverViaFTP,
  deliverViaSFTP,
  deliverViaS3,
  deliverViaAPI,
  deliverToDSP,
  deliverViaAzure,
  deliverViaStorage
}