// src/services/delivery.js
import { db, storage } from '../firebase'
import { 
  doc, 
  updateDoc, 
  getDoc,
  Timestamp,
  collection,
  addDoc,
  arrayUnion
} from 'firebase/firestore'
import { ref as storageRef, getBlob, getDownloadURL } from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'

export class DeliveryService {
  constructor() {
    this.maxRetries = 3
    this.retryDelays = [5000, 15000, 60000] // Exponential backoff
    this.functions = getFunctions()
  }

  /**
   * Add a log entry to the delivery record
   */
  async addDeliveryLog(deliveryId, logEntry) {
    try {
      const timestamp = Timestamp.now()
      const log = {
        timestamp,
        level: logEntry.level || 'info', // info, warning, error, success
        step: logEntry.step || 'general',
        message: logEntry.message,
        details: logEntry.details || null,
        duration: logEntry.duration || null
      }
      
      // Update the delivery document with the new log
      await updateDoc(doc(db, 'deliveries', deliveryId), {
        logs: arrayUnion(log),
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

  /**
   * Process a delivery job with detailed logging
   */
  async processDelivery(deliveryId) {
    const startTime = Date.now()
    
    try {
      // Log: Starting delivery
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'initialization',
        message: 'Starting delivery process'
      })

      // Get delivery details
      const delivery = await this.getDelivery(deliveryId)
      
      if (!delivery) {
        throw new Error('Delivery not found')
      }

      // Log: Delivery loaded
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'initialization',
        message: `Loaded delivery for "${delivery.releaseTitle}" to ${delivery.targetName}`,
        details: {
          releaseId: delivery.releaseId,
          targetProtocol: delivery.targetProtocol,
          testMode: delivery.testMode
        }
      })

      // Update status to processing
      await this.updateDeliveryStatus(deliveryId, 'processing', {
        startedAt: Timestamp.now(),
        logs: []
      })

      // Get delivery target configuration
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'target_configuration',
        message: 'Loading target configuration'
      })
      
      const target = await this.getDeliveryTarget(delivery.targetId)
      
      await this.addDeliveryLog(deliveryId, {
        level: 'success',
        step: 'target_configuration',
        message: `Target configured: ${target.name} (${target.protocol})`,
        details: {
          protocol: target.protocol,
          type: target.type,
          testMode: target.testMode
        }
      })
      
      // Prepare delivery package
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'package_preparation',
        message: 'Preparing delivery package'
      })
      
      const deliveryPackage = await this.preparePackage(delivery)
      
      await this.addDeliveryLog(deliveryId, {
        level: 'success',
        step: 'package_preparation',
        message: `Package prepared: ${deliveryPackage.files.length} files`,
        details: {
          ernFiles: deliveryPackage.files.filter(f => f.isERN).length,
          audioFiles: deliveryPackage.files.filter(f => f.type === 'audio').length,
          imageFiles: deliveryPackage.files.filter(f => f.type === 'image').length,
          totalFiles: deliveryPackage.files.length
        }
      })
      
      // Execute delivery based on protocol
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'delivery_execution',
        message: `Starting ${target.protocol} delivery to ${target.name}`
      })
      
      let result
      const deliveryStartTime = Date.now()
      
      switch (target.protocol) {
        case 'FTP':
          result = await this.deliverViaFTP(target, deliveryPackage, deliveryId)
          break
        case 'SFTP':
          result = await this.deliverViaSFTP(target, deliveryPackage, deliveryId)
          break
        case 'S3':
          result = await this.deliverViaS3(target, deliveryPackage, deliveryId)
          break
        case 'API':
          result = await this.deliverViaAPI(target, deliveryPackage, deliveryId)
          break
        case 'Azure':
          result = await this.deliverViaAzure(target, deliveryPackage, deliveryId)
          break
        default:
          throw new Error(`Unsupported protocol: ${target.protocol}`)
      }
      
      const deliveryDuration = Date.now() - deliveryStartTime

      await this.addDeliveryLog(deliveryId, {
        level: 'success',
        step: 'delivery_execution',
        message: `Delivery completed via ${target.protocol}`,
        duration: deliveryDuration,
        details: {
          filesDelivered: result.files?.length || 0,
          bytesTransferred: result.bytesTransferred || 0,
          acknowledgmentId: result.acknowledgmentId || result.deliveryId
        }
      })

      // Generate receipt
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'receipt_generation',
        message: 'Generating delivery receipt'
      })
      
      const receipt = this.generateReceipt(delivery, result)
      
      // Update delivery status to completed
      const totalDuration = Date.now() - startTime
      
      await this.updateDeliveryStatus(deliveryId, 'completed', {
        completedAt: Timestamp.now(),
        receipt,
        deliveredFiles: result.files,
        totalDuration
      })

      await this.addDeliveryLog(deliveryId, {
        level: 'success',
        step: 'completion',
        message: `Delivery completed successfully in ${Math.round(totalDuration / 1000)}s`,
        duration: totalDuration,
        details: {
          receiptId: receipt.receiptId,
          dspMessageId: receipt.dspMessageId
        }
      })

      // Send success notification
      await this.sendNotification(delivery, 'success', result)

      return result
    } catch (error) {
      console.error('Delivery processing error:', error)
      
      await this.addDeliveryLog(deliveryId, {
        level: 'error',
        step: 'error_handling',
        message: `Delivery failed: ${error.message}`,
        details: {
          error: error.message,
          stack: error.stack
        }
      })
      
      // Handle retry logic
      await this.handleDeliveryError(deliveryId, error)
      
      throw error
    }
  }

  /**
   * Prepare delivery package (ERN + assets) with authentication
   */
  async preparePackage(delivery) {
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

    // Add audio files
    if (delivery.package?.audioFiles) {
      for (const audioUrl of delivery.package.audioFiles) {
        if (audioUrl) {
          files.push({
            name: this.extractFileName(audioUrl),
            url: audioUrl,
            type: 'audio',
            needsDownload: true
          })
        }
      }
    }

    // Add image files
    if (delivery.package?.imageFiles) {
      for (const imageUrl of delivery.package.imageFiles) {
        if (imageUrl) {
          files.push({
            name: this.extractFileName(imageUrl),
            url: imageUrl,
            type: 'image',
            needsDownload: true
          })
        }
      }
    }

    // Get target configuration to add authentication data
    const targetDoc = await getDoc(doc(db, 'deliveryTargets', delivery.targetId))
    const target = targetDoc.data()
    
    // Build the complete package with authentication
    const deliveryPackage = {
      deliveryId: delivery.id,
      releaseTitle: delivery.releaseTitle,
      releaseArtist: delivery.releaseArtist,
      targetName: delivery.targetName,
      files,
      metadata: {
        messageId: delivery.ernMessageId,
        testMode: delivery.testMode,
        priority: delivery.priority,
        timestamp: Date.now()
      }
    }
    
    // Add DSP-specific authentication data
    if (target.type === 'DSP' && target.config?.distributorId) {
      deliveryPackage.distributorId = target.config.distributorId
      deliveryPackage.metadata.distributorId = target.config.distributorId
    }
    
    return deliveryPackage
  }

  /**
   * FTP Delivery Protocol using v2 Functions with logging
   */
  async deliverViaFTP(target, deliveryPackage, deliveryId) {
    try {
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'ftp_connection',
        message: `Connecting to FTP server: ${target.connection.host}`
      })

      const deliverFTP = httpsCallable(this.functions, 'deliverFTP')
      const result = await deliverFTP({
        target: {
          host: target.connection.host,
          port: target.connection.port,
          username: target.connection.username,
          password: target.connection.password,
          directory: target.connection.directory,
          secure: target.connection.secure || false
        },
        package: deliveryPackage
      })
      
      await this.addDeliveryLog(deliveryId, {
        level: 'success',
        step: 'ftp_upload',
        message: 'FTP upload completed successfully',
        details: {
          filesUploaded: result.data.files?.length || 0
        }
      })
      
      return result.data
    } catch (error) {
      console.error('FTP delivery error:', error)
      throw new Error(`FTP delivery failed: ${error.message}`)
    }
  }

  /**
   * SFTP Delivery Protocol using v2 Functions with logging
   */
  async deliverViaSFTP(target, deliveryPackage, deliveryId) {
    try {
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'sftp_connection',
        message: `Connecting to SFTP server: ${target.connection.host}`
      })

      const deliverSFTP = httpsCallable(this.functions, 'deliverSFTP')
      const result = await deliverSFTP({
        target: {
          host: target.connection.host,
          port: target.connection.port,
          username: target.connection.username,
          password: target.connection.password,
          privateKey: target.connection.privateKey,
          passphrase: target.connection.passphrase,
          directory: target.connection.directory
        },
        package: deliveryPackage
      })
      
      await this.addDeliveryLog(deliveryId, {
        level: 'success',
        step: 'sftp_upload',
        message: 'SFTP upload completed successfully',
        details: {
          filesUploaded: result.data.files?.length || 0
        }
      })
      
      return result.data
    } catch (error) {
      console.error('SFTP delivery error:', error)
      throw new Error(`SFTP delivery failed: ${error.message}`)
    }
  }

  /**
   * S3 Delivery Protocol using v2 Functions with logging
   */
  async deliverViaS3(target, deliveryPackage, deliveryId) {
    try {
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 's3_connection',
        message: `Connecting to S3 bucket: ${target.connection.bucket}`
      })

      const deliverS3 = httpsCallable(this.functions, 'deliverS3')
      const result = await deliverS3({
        target: {
          bucket: target.connection.bucket,
          region: target.connection.region,
          accessKeyId: target.connection.accessKeyId,
          secretAccessKey: target.connection.secretAccessKey,
          prefix: target.connection.prefix || ''
        },
        package: deliveryPackage
      })
      
      await this.addDeliveryLog(deliveryId, {
        level: 'success',
        step: 's3_upload',
        message: 'S3 upload completed successfully',
        details: {
          bucket: target.connection.bucket,
          filesUploaded: result.data.files?.length || 0
        }
      })
      
      return result.data
    } catch (error) {
      console.error('S3 delivery error:', error)
      throw new Error(`S3 delivery failed: ${error.message}`)
    }
  }

  /**
   * API Delivery Protocol with enhanced logging
   */
  async deliverViaAPI(target, deliveryPackage, deliveryId) {
    try {
      // Log API preparation
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'api_preparation',
        message: `Preparing API request to ${target.connection.endpoint}`
      })

      // For DSP deliveries, we need to send the data differently
      if (target.type === 'DSP') {
        // Log DSP-specific preparation
        await this.addDeliveryLog(deliveryId, {
          level: 'info',
          step: 'api_preparation',
          message: 'Configuring DSP-specific payload',
          details: {
            distributorId: target.config?.distributorId || 'stardust-distro',
            messageId: deliveryPackage.metadata.messageId,
            fileCount: deliveryPackage.files.length
          }
        })

        // Prepare headers with authentication
        const headers = {
          'Content-Type': 'application/json'
        }
        
        // Add API key authentication if present
        if (target.config?.apiKey) {
          headers['Authorization'] = `Bearer ${target.config.apiKey}`
        }
        
        // Prepare the payload for DSP
        const audioFiles = deliveryPackage.files.filter(f => f.type === 'audio').map(f => f.url)
        const imageFiles = deliveryPackage.files.filter(f => f.type === 'image').map(f => f.url)
        
        // Log file preparation
        await this.addDeliveryLog(deliveryId, {
          level: 'info',
          step: 'file_preparation',
          message: `Preparing ${audioFiles.length} audio and ${imageFiles.length} image files for transfer`,
          details: {
            audioCount: audioFiles.length,
            imageCount: imageFiles.length,
            ernIncluded: true
          }
        })

        const payload = {
          distributorId: target.config.distributorId || 'stardust-distro',
          messageId: deliveryPackage.metadata.messageId,
          releaseTitle: deliveryPackage.releaseTitle,
          releaseArtist: deliveryPackage.releaseArtist,
          ernXml: deliveryPackage.files.find(f => f.isERN)?.content,
          testMode: deliveryPackage.metadata.testMode,
          priority: deliveryPackage.metadata.priority,
          audioFiles,
          imageFiles,
          // These fields are required by DSP:
          ern: {
            messageId: deliveryPackage.metadata.messageId,
            version: '4.3',
            releaseCount: 1
          },
          processing: {
            status: 'received',
            receivedAt: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          // Add file download instructions
          fileTransferRequired: true,
          sourceStorage: 'firebase'
        }
        
        // Log API call
        await this.addDeliveryLog(deliveryId, {
          level: 'info',
          step: 'api_transmission',
          message: `Sending API request to ${target.connection.endpoint}`,
          details: {
            method: 'POST',
            payloadSize: JSON.stringify(payload).length,
            hasAuth: !!headers['Authorization']
          }
        })
        
        console.log('Sending to DSP:', target.connection.endpoint)
        console.log('Payload summary:', {
          distributorId: payload.distributorId,
          messageId: payload.messageId,
          audioFiles: payload.audioFiles.length,
          imageFiles: payload.imageFiles.length
        })
        
        // Call the Cloud Function with DSP-specific configuration
        const deliverAPI = httpsCallable(this.functions, 'deliverAPI')
        const startTime = Date.now()
        
        const result = await deliverAPI({
          target: {
            endpoint: target.connection.endpoint,
            method: 'POST',
            headers: headers,
            type: 'DSP'
          },
          package: payload
        })
        
        const apiDuration = Date.now() - startTime
        
        // Check if the result indicates success
        if (!result.data?.success) {
          await this.addDeliveryLog(deliveryId, {
            level: 'error',
            step: 'api_response',
            message: 'DSP rejected delivery',
            details: {
              error: result.data?.error,
              duration: apiDuration
            }
          })
          throw new Error(result.data?.error || 'DSP delivery failed')
        }
        
        // Log successful API response
        await this.addDeliveryLog(deliveryId, {
          level: 'success',
          step: 'api_response',
          message: 'DSP accepted delivery',
          duration: apiDuration,
          details: {
            acknowledgmentId: result.data.acknowledgmentId,
            deliveryId: result.data.deliveryId,
            responseTime: `${apiDuration}ms`
          }
        })
        
        // Note about file transfer
        await this.addDeliveryLog(deliveryId, {
          level: 'info',
          step: 'file_transfer_note',
          message: 'Files referenced by URL - DSP will download asynchronously',
          details: {
            audioUrls: audioFiles,
            imageUrls: imageFiles
          }
        })
        
        return result.data
      }
      
      // Standard API delivery (non-DSP)
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'api_standard',
        message: 'Executing standard API delivery'
      })
      
      const deliverAPI = httpsCallable(this.functions, 'deliverAPI')
      const result = await deliverAPI({
        target: {
          endpoint: target.connection.endpoint,
          method: target.connection.method || 'POST',
          headers: target.connection.headers || {}
        },
        package: deliveryPackage
      })
      
      await this.addDeliveryLog(deliveryId, {
        level: 'success',
        step: 'api_standard',
        message: 'API delivery completed successfully'
      })
      
      return result.data
      
    } catch (error) {
      console.error('API delivery error:', error)
      
      await this.addDeliveryLog(deliveryId, {
        level: 'error',
        step: 'api_error',
        message: `API delivery failed: ${error.message}`,
        details: {
          error: error.message,
          response: error.response?.data
        }
      })
      
      // Extract meaningful error message
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          'Unknown delivery error'
      
      throw new Error(`API delivery failed: ${errorMessage}`)
    }
  }

  /**
   * Azure Blob Storage Delivery Protocol using v2 Functions with logging
   */
  async deliverViaAzure(target, deliveryPackage, deliveryId) {
    try {
      await this.addDeliveryLog(deliveryId, {
        level: 'info',
        step: 'azure_connection',
        message: `Connecting to Azure container: ${target.connection.containerName}`
      })

      const deliverAzure = httpsCallable(this.functions, 'deliverAzure')
      const result = await deliverAzure({
        target: {
          accountName: target.connection.accountName,
          accountKey: target.connection.accountKey,
          containerName: target.connection.containerName,
          prefix: target.connection.prefix || ''
        },
        package: deliveryPackage
      })
      
      await this.addDeliveryLog(deliveryId, {
        level: 'success',
        step: 'azure_upload',
        message: 'Azure upload completed successfully',
        details: {
          container: target.connection.containerName,
          filesUploaded: result.data.files?.length || 0
        }
      })
      
      return result.data
    } catch (error) {
      console.error('Azure delivery error:', error)
      throw new Error(`Azure delivery failed: ${error.message}`)
    }
  }

  /**
   * Handle delivery errors with retry logic
   */
  async handleDeliveryError(deliveryId, error) {
    try {
      const delivery = await this.getDelivery(deliveryId)
      if (!delivery) return

      const attemptNumber = (delivery.attempts?.length || 0) + 1

      // Record the attempt
      const attempt = {
        attemptNumber,
        startTime: Timestamp.now(),
        endTime: Timestamp.now(),
        status: 'failed',
        error: error.message
      }

      // Check if we should retry
      if (attemptNumber < this.maxRetries) {
        // Schedule retry with exponential backoff
        const retryDelay = this.retryDelays[attemptNumber - 1] || 60000
        
        await this.addDeliveryLog(deliveryId, {
          level: 'warning',
          step: 'retry_scheduled',
          message: `Scheduling retry ${attemptNumber}/${this.maxRetries} in ${retryDelay / 1000}s`,
          details: {
            attemptNumber,
            retryDelay,
            error: error.message
          }
        })
        
        await this.updateDeliveryStatus(deliveryId, 'queued', {
          attempts: [...(delivery.attempts || []), attempt],
          scheduledAt: Timestamp.fromMillis(Date.now() + retryDelay),
          lastError: error.message,
          retryCount: attemptNumber
        })

        // Send retry notification
        await this.sendNotification(delivery, 'retry', {
          attemptNumber,
          nextRetryIn: retryDelay / 1000
        })
      } else {
        // Max retries reached, mark as failed
        await this.addDeliveryLog(deliveryId, {
          level: 'error',
          step: 'max_retries',
          message: `Maximum retries (${this.maxRetries}) exceeded - delivery failed`,
          details: {
            attempts: attemptNumber,
            finalError: error.message
          }
        })
        
        await this.updateDeliveryStatus(deliveryId, 'failed', {
          attempts: [...(delivery.attempts || []), attempt],
          failedAt: Timestamp.now(),
          error: error.message
        })

        // Send failure notification
        await this.sendNotification(delivery, 'failed', {
          error: error.message,
          attempts: attemptNumber
        })
      }
    } catch (err) {
      console.error('Error handling delivery error:', err)
    }
  }

  /**
   * Send notifications for delivery events
   */
  async sendNotification(delivery, type, data = {}) {
    try {
      const notification = {
        type,
        deliveryId: delivery.id,
        releaseTitle: delivery.releaseTitle,
        targetName: delivery.targetName,
        tenantId: delivery.tenantId,
        timestamp: Timestamp.now(),
        data
      }

      // Store notification in Firestore
      await addDoc(collection(db, 'notifications'), notification)

      // In production, also send email/webhook notifications
      if (type === 'failed' || type === 'success') {
        await this.sendEmailNotification(delivery, type, data)
      }
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  /**
   * Send email notification using v2 Functions
   */
  async sendEmailNotification(delivery, type, data) {
    try {
      // Only send if we have a sendNotification function deployed
      if (process.env.VUE_APP_ENABLE_EMAIL_NOTIFICATIONS === 'true') {
        const sendNotification = httpsCallable(this.functions, 'sendNotification')
        await sendNotification({
          type: 'email',
          template: `delivery_${type}`,
          to: delivery.userEmail || delivery.tenantEmail,
          data: {
            releaseTitle: delivery.releaseTitle,
            targetName: delivery.targetName,
            ...data
          }
        })
      }
    } catch (error) {
      console.error('Error sending email notification:', error)
      // Don't throw - email failure shouldn't stop delivery process
    }
  }

  /**
   * Generate delivery receipt
   */
  generateReceipt(delivery, result) {
    return {
      receiptId: `RCP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deliveryId: delivery.id,
      messageId: delivery.ernMessageId,
      targetName: delivery.targetName,
      timestamp: new Date().toISOString(),
      status: 'delivered',
      files: result.files || [],
      acknowledgment: result.acknowledgment || 'Delivery completed successfully',
      dspMessageId: result.dspMessageId || result.messageId,
      metadata: {
        protocol: result.protocol,
        duration: result.duration,
        bytesTransferred: result.bytesTransferred
      }
    }
  }

  /**
   * Get delivery analytics using v2 Functions
   */
  async getAnalytics(tenantId, dateRange = {}) {
    try {
      const getDeliveryAnalytics = httpsCallable(this.functions, 'getDeliveryAnalytics')
      const result = await getDeliveryAnalytics({
        tenantId,
        startDate: dateRange.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: dateRange.endDate || new Date()
      })
      
      return result.data
    } catch (error) {
      console.error('Error getting analytics:', error)
      
      // Fallback to local calculation if function fails
      const deliveries = await this.getDeliveriesForTenant(tenantId)
      return this.calculateLocalAnalytics(deliveries)
    }
  }

  /**
   * Calculate analytics locally (fallback)
   */
  calculateLocalAnalytics(deliveries) {
    const analytics = {
      total: deliveries.length,
      completed: 0,
      failed: 0,
      queued: 0,
      processing: 0,
      byTarget: {},
      byProtocol: {},
      averageDeliveryTime: 0,
      successRate: 0
    }

    let totalDeliveryTime = 0
    let completedCount = 0

    deliveries.forEach(delivery => {
      // Count by status
      if (analytics[delivery.status] !== undefined) {
        analytics[delivery.status]++
      }

      // Count by target
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
        
        // Calculate delivery time
        if (delivery.startedAt && delivery.completedAt) {
          const startTime = delivery.startedAt.toDate ? delivery.startedAt.toDate() : new Date(delivery.startedAt)
          const endTime = delivery.completedAt.toDate ? delivery.completedAt.toDate() : new Date(delivery.completedAt)
          totalDeliveryTime += (endTime - startTime)
          completedCount++
        }
      } else if (delivery.status === 'failed') {
        analytics.byTarget[delivery.targetName].failed++
      }

      // Count by protocol
      if (delivery.targetProtocol) {
        if (!analytics.byProtocol[delivery.targetProtocol]) {
          analytics.byProtocol[delivery.targetProtocol] = 0
        }
        analytics.byProtocol[delivery.targetProtocol]++
      }
    })

    // Calculate averages
    if (completedCount > 0) {
      analytics.averageDeliveryTime = Math.round(totalDeliveryTime / completedCount / 1000) // in seconds
    }

    if (analytics.total > 0) {
      analytics.successRate = Math.round((analytics.completed / analytics.total) * 100)
    }

    return analytics
  }

  /**
   * Test delivery connection
   */
  async testConnection(targetConfig) {
    try {
      // Create a test package with minimal data
      const testPackage = {
        deliveryId: 'test_' + Date.now(),
        releaseTitle: 'Connection Test',
        targetName: targetConfig.name,
        files: [{
          name: 'test.txt',
          content: 'This is a connection test file',
          type: 'text/plain',
          isERN: false
        }],
        metadata: {
          messageId: 'TEST_' + Date.now(),
          testMode: true,
          priority: 'low'
        }
      }

      let result
      switch (targetConfig.protocol) {
        case 'FTP':
          result = await this.deliverViaFTP(targetConfig, testPackage, 'test')
          break
        case 'SFTP':
          result = await this.deliverViaSFTP(targetConfig, testPackage, 'test')
          break
        case 'S3':
          result = await this.deliverViaS3(targetConfig, testPackage, 'test')
          break
        case 'API':
          result = await this.deliverViaAPI(targetConfig, testPackage, 'test')
          break
        case 'Azure':
          result = await this.deliverViaAzure(targetConfig, testPackage, 'test')
          break
        default:
          throw new Error(`Unsupported protocol: ${targetConfig.protocol}`)
      }

      return {
        success: true,
        message: 'Connection successful',
        timestamp: new Date(),
        details: result
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Connection failed',
        timestamp: new Date(),
        error: error
      }
    }
  }

  /**
   * Get delivery logs
   */
  async getDeliveryLogs(deliveryId) {
    try {
      const docRef = doc(db, 'deliveries', deliveryId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const delivery = docSnap.data()
        return delivery.logs || []
      }
      return []
    } catch (error) {
      console.error('Error getting delivery logs:', error)
      return []
    }
  }

  // Helper methods
  async getDelivery(deliveryId) {
    try {
      const docRef = doc(db, 'deliveries', deliveryId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      }
      return null
    } catch (error) {
      console.error('Error getting delivery:', error)
      throw error
    }
  }

  async getDeliveryTarget(targetId) {
    try {
      const docRef = doc(db, 'deliveryTargets', targetId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      }
      throw new Error('Delivery target not found')
    } catch (error) {
      console.error('Error getting delivery target:', error)
      throw error
    }
  }

  async updateDeliveryStatus(deliveryId, status, updates = {}) {
    try {
      const docRef = doc(db, 'deliveries', deliveryId)
      await updateDoc(docRef, {
        status,
        ...updates,
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error updating delivery status:', error)
      throw error
    }
  }

  async getDeliveriesForTenant(tenantId) {
    try {
      const deliveries = []
      const snapshot = await db.collection('deliveries')
        .where('tenantId', '==', tenantId)
        .get()
      
      snapshot.forEach(doc => {
        deliveries.push({ id: doc.id, ...doc.data() })
      })
      
      return deliveries
    } catch (error) {
      console.error('Error getting deliveries for tenant:', error)
      return []
    }
  }

  extractFileName(url) {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const parts = pathname.split('/')
      const filename = parts[parts.length - 1]
      
      // Decode URL encoding and remove query params
      return decodeURIComponent(filename.split('?')[0])
    } catch (error) {
      // Fallback for invalid URLs
      return `file_${Date.now()}`
    }
  }

  /**
   * Get delivery receipt
   */
  async getDeliveryReceipt(deliveryId) {
    try {
      const docRef = doc(db, 'deliveries', deliveryId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const delivery = docSnap.data()
        if (delivery.receipt) {
          return delivery.receipt
        }
      }
      return null
    } catch (error) {
      console.error('Error getting delivery receipt:', error)
      throw error
    }
  }

  /**
   * Download delivery receipt as JSON
   */
  downloadReceipt(delivery) {
    if (!delivery.receipt) {
      console.error('No receipt available for this delivery')
      return
    }

    const receipt = {
      ...delivery.receipt,
      deliveryId: delivery.id,
      releaseTitle: delivery.releaseTitle,
      targetName: delivery.targetName,
      completedAt: delivery.completedAt
    }

    const blob = new Blob([JSON.stringify(receipt, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `delivery_receipt_${delivery.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Download ERN XML
   */
  downloadERN(delivery) {
    if (!delivery.ernXml) {
      console.error('No ERN available for this delivery')
      return
    }

    const blob = new Blob([delivery.ernXml], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${delivery.releaseTitle}_${delivery.targetName}_${delivery.ernMessageId}.xml`
      .replace(/[^a-z0-9]/gi, '_')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export default new DeliveryService()