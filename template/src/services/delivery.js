// src/services/delivery.js
import { db, storage } from '../firebase'
import { 
  doc, 
  updateDoc, 
  getDoc,
  Timestamp,
  collection,
  addDoc
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
   * Process a delivery job
   */
  async processDelivery(deliveryId) {
    try {
      // Get delivery details
      const delivery = await this.getDelivery(deliveryId)
      
      if (!delivery) {
        throw new Error('Delivery not found')
      }

      // Update status to processing
      await this.updateDeliveryStatus(deliveryId, 'processing', {
        startedAt: Timestamp.now()
      })

      // Get delivery target configuration
      const target = await this.getDeliveryTarget(delivery.targetId)
      
      // Prepare delivery package
      const deliveryPackage = await this.preparePackage(delivery)
      
      // Execute delivery based on protocol
      let result
      switch (target.protocol) {
        case 'FTP':
          result = await this.deliverViaFTP(target, deliveryPackage)
          break
        case 'SFTP':
          result = await this.deliverViaSFTP(target, deliveryPackage)
          break
        case 'S3':
          result = await this.deliverViaS3(target, deliveryPackage)
          break
        case 'API':
          result = await this.deliverViaAPI(target, deliveryPackage)
          break
        case 'Azure':
          result = await this.deliverViaAzure(target, deliveryPackage)
          break
        default:
          throw new Error(`Unsupported protocol: ${target.protocol}`)
      }

      // Update delivery status to completed
      await this.updateDeliveryStatus(deliveryId, 'completed', {
        completedAt: Timestamp.now(),
        receipt: this.generateReceipt(delivery, result),
        deliveredFiles: result.files
      })

      // Send success notification
      await this.sendNotification(delivery, 'success', result)

      return result
    } catch (error) {
      console.error('Delivery processing error:', error)
      
      // Handle retry logic
      await this.handleDeliveryError(deliveryId, error)
      
      throw error
    }
  }

  /**
   * Prepare delivery package (ERN + assets)
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

  /**
   * FTP Delivery Protocol using v2 Functions
   */
  async deliverViaFTP(target, deliveryPackage) {
    try {
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
      
      return result.data
    } catch (error) {
      console.error('FTP delivery error:', error)
      throw new Error(`FTP delivery failed: ${error.message}`)
    }
  }

  /**
   * SFTP Delivery Protocol using v2 Functions
   */
  async deliverViaSFTP(target, deliveryPackage) {
    try {
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
      
      return result.data
    } catch (error) {
      console.error('SFTP delivery error:', error)
      throw new Error(`SFTP delivery failed: ${error.message}`)
    }
  }

  /**
   * S3 Delivery Protocol using v2 Functions
   */
  async deliverViaS3(target, deliveryPackage) {
    try {
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
      
      return result.data
    } catch (error) {
      console.error('S3 delivery error:', error)
      throw new Error(`S3 delivery failed: ${error.message}`)
    }
  }

  /**
   * API Delivery Protocol using v2 Functions
   */
  async deliverViaAPI(target, deliveryPackage) {
    try {
      const deliverAPI = httpsCallable(this.functions, 'deliverAPI')
      const result = await deliverAPI({
        target: {
          endpoint: target.connection.endpoint,
          method: target.connection.method || 'POST',
          headers: target.connection.headers || {},
          auth: {
            type: target.connection.authType,
            credentials: target.connection.credentials
          }
        },
        package: deliveryPackage
      })
      
      return result.data
    } catch (error) {
      console.error('API delivery error:', error)
      throw new Error(`API delivery failed: ${error.message}`)
    }
  }

  /**
   * Azure Blob Storage Delivery Protocol using v2 Functions
   */
  async deliverViaAzure(target, deliveryPackage) {
    try {
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
          result = await this.deliverViaFTP(targetConfig, testPackage)
          break
        case 'SFTP':
          result = await this.deliverViaSFTP(targetConfig, testPackage)
          break
        case 'S3':
          result = await this.deliverViaS3(targetConfig, testPackage)
          break
        case 'API':
          result = await this.deliverViaAPI(targetConfig, testPackage)
          break
        case 'Azure':
          result = await this.deliverViaAzure(targetConfig, testPackage)
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
      const parts = url.split('/')
      const fileName = parts[parts.length - 1].split('?')[0]
      return decodeURIComponent(fileName)
    } catch (error) {
      return 'unknown_file'
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