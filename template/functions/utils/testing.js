// functions/utils/testing.js
const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const axios = require('axios')
const ftp = require('basic-ftp')
const { Client: SSHClient } = require('ssh2')
const { S3Client } = require('@aws-sdk/client-s3')
const { ListObjectsV2Command } = require('@aws-sdk/client-s3')
const { BlobServiceClient } = require('@azure/storage-blob')

const { requireAuth } = require('../middleware/auth')
const { validateWith, sanitizeInputs } = require('../middleware/validation')
const { checkRateLimit } = require('../middleware/auth')

/**
 * Test delivery connection
 */
const testDeliveryConnection = onCall({
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

/**
 * Test API endpoint
 */
const testAPIEndpoint = onRequest({
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

module.exports = {
  testDeliveryConnection,
  testAPIEndpoint
}