// src/services/testTargets.js
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

class TestTargetsService {
  constructor() {
    // Test endpoints configuration
    this.testEndpoints = {
      // Firebase Storage (Already Available - FREE)
      storage: {
        name: 'Test - Firebase Storage',
        protocol: 'storage',
        enabled: true,
        config: {
          path: '/test-deliveries',
          bucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com'
        }
      },

      // FTP - Using FTP test server (FREE)
      ftp: {
        name: 'Test - FTP Server (dlptest.com)',
        protocol: 'FTP',
        enabled: true,
        config: {
          host: 'ftp.dlptest.com',
          port: 21,
          username: 'dlpuser',
          password: 'rNrKYTX9g7z3RgJRmxWuGHbeu',
          directory: '/test',
          secure: false
        }
      },

      // SFTP - Using test.rebex.net (FREE)
      sftp: {
        name: 'Test - SFTP Server (Rebex)',
        protocol: 'SFTP',
        enabled: true,
        config: {
          host: 'test.rebex.net',
          port: 22,
          username: 'demo',
          password: 'password',
          directory: '/pub/example'
        }
      },

      // S3 - Using MinIO local instance or LocalStack
      s3: {
        name: 'Test - S3 (LocalStack/MinIO)',
        protocol: 'S3',
        enabled: true,
        config: {
          endpoint: 'http://localhost:9000', // MinIO endpoint
          bucket: 'test-deliveries',
          region: 'us-east-1',
          accessKeyId: 'minioadmin',
          secretAccessKey: 'minioadmin',
          forcePathStyle: true // Required for MinIO
        }
      },

      // API - Using your own Cloud Function
      api: {
        name: 'Test - REST API (Cloud Function)',
        protocol: 'API',
        enabled: true,
        config: {
          endpoint: process.env.VITE_FUNCTIONS_URL ? `${process.env.VITE_FUNCTIONS_URL}/testAPIEndpoint` : 'https://your-api-endpoint.cloudfunctions.net/testAPIEndpoint',
          authType: 'Bearer',
          apiKey: 'test-api-key-123',
          headers: {
            'X-Test-Mode': 'true'
          }
        }
      },

      // Azure - Using Azurite local emulator
      azure: {
        name: 'Test - Azure (Azurite)',
        protocol: 'Azure',
        enabled: true,
        config: {
          connectionString: 'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;',
          containerName: 'test-deliveries'
        }
      },

      // Alternative: HTTPBin for API testing (FREE)
      apiHttpBin: {
        name: 'Test - API (httpbin.org)',
        protocol: 'API',
        enabled: true,
        config: {
          endpoint: 'https://httpbin.org/post',
          authType: 'None',
          headers: {
            'X-Test': 'true'
          }
        }
      }
    }
  }

  /**
   * Get all available test targets
   */
  getTestTargets() {
    return Object.values(this.testEndpoints).filter(t => t.enabled)
  }

  /**
   * Get test target by protocol
   */
  getTestTargetByProtocol(protocol) {
    return Object.values(this.testEndpoints).find(
      t => t.protocol.toLowerCase() === protocol.toLowerCase() && t.enabled
    )
  }

  /**
   * Create a test delivery package
   */
  createTestPackage(protocol) {
    const timestamp = Date.now()
    
    return {
      deliveryId: `TEST_${protocol}_${timestamp}`,
      messageId: `TEST_MSG_${timestamp}`,
      files: [
        {
          name: `TEST_${timestamp}.xml`,
          content: `<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43" MessageSchemaVersionId="ern/43">
  <MessageHeader>
    <MessageId>TEST_${timestamp}</MessageId>
    <MessageCreatedDateTime>${new Date().toISOString()}</MessageCreatedDateTime>
  </MessageHeader>
  <TestMode>true</TestMode>
</ern:NewReleaseMessage>`,
          type: 'text/xml',
          isERN: true
        }
      ],
      metadata: {
        test: true,
        protocol,
        timestamp
      }
    }
  }

  /**
   * Run comprehensive test for a protocol
   */
  async testProtocol(protocol) {
    const target = this.getTestTargetByProtocol(protocol)
    if (!target) {
      throw new Error(`No test target available for protocol: ${protocol}`)
    }

    const testPackage = this.createTestPackage(protocol)
    const results = {
      protocol,
      target: target.name,
      tests: []
    }

    // Test 1: Connection
    try {
      const connectStart = Date.now()
      const connected = await this.testConnection(target.config, protocol)
      results.tests.push({
        name: 'Connection',
        passed: connected,
        duration: Date.now() - connectStart,
        details: connected ? 'Connected successfully' : 'Connection failed'
      })
    } catch (error) {
      results.tests.push({
        name: 'Connection',
        passed: false,
        error: error.message
      })
    }

    // Test 2: File Upload
    try {
      const uploadStart = Date.now()
      const uploaded = await this.testFileUpload(target.config, protocol, testPackage)
      results.tests.push({
        name: 'File Upload',
        passed: uploaded.success,
        duration: Date.now() - uploadStart,
        details: `Uploaded ${uploaded.filesCount || 0} files`
      })
    } catch (error) {
      results.tests.push({
        name: 'File Upload',
        passed: false,
        error: error.message
      })
    }

    // Test 3: Error Handling
    try {
      const errorHandled = await this.testErrorHandling(target.config, protocol)
      results.tests.push({
        name: 'Error Handling',
        passed: errorHandled,
        details: 'Errors handled gracefully'
      })
    } catch (error) {
      results.tests.push({
        name: 'Error Handling',
        passed: false,
        error: error.message
      })
    }

    // Calculate summary
    results.totalTests = results.tests.length
    results.passed = results.tests.filter(t => t.passed).length
    results.failed = results.tests.filter(t => !t.passed).length
    results.successRate = Math.round((results.passed / results.totalTests) * 100)

    return results
  }

  /**
   * Test connection to target
   */
  async testConnection(config, protocol) {
    // Call your existing Cloud Function
    const testConnectionFn = httpsCallable(functions, 'testDeliveryConnection')
    
    try {
      const result = await testConnectionFn({
        protocol,
        config,
        testMode: true
      })
      
      return result.data.success
    } catch (error) {
      console.error(`Connection test failed for ${protocol}:`, error)
      return false
    }
  }

  /**
   * Test file upload
   */
  async testFileUpload(config, protocol, testPackage) {
    // Map to appropriate Cloud Function based on protocol
    const functionMap = {
      'FTP': 'deliverFTP',
      'SFTP': 'deliverSFTP',
      'S3': 'deliverS3',
      'API': 'deliverAPI',
      'Azure': 'deliverAzure',
      'storage': 'deliverStorage'
    }

    const functionName = functionMap[protocol] || 'deliverStorage'
    const deliverFn = httpsCallable(functions, functionName)

    try {
      const result = await deliverFn({
        target: config,
        package: testPackage,
        testMode: true
      })

      return {
        success: true,
        filesCount: testPackage.files.length,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling(config, protocol) {
    // Send invalid package to test error handling
    const invalidPackage = {
      deliveryId: 'TEST_ERROR',
      files: [], // Empty files should trigger error
      metadata: { test: true }
    }

    try {
      const functionMap = {
        'FTP': 'deliverFTP',
        'SFTP': 'deliverSFTP',
        'S3': 'deliverS3',
        'API': 'deliverAPI',
        'Azure': 'deliverAzure',
        'storage': 'deliverStorage'
      }

      const functionName = functionMap[protocol] || 'deliverStorage'
      const deliverFn = httpsCallable(functions, functionName)

      await deliverFn({
        target: config,
        package: invalidPackage,
        testMode: true
      })

      // If we get here without error, error handling failed
      return false
    } catch (error) {
      // We expect an error - this is good!
      return true
    }
  }
}

export default new TestTargetsService()