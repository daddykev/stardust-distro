// src/services/delivery.js
import { db, storage } from '../firebase'
import { 
  doc, 
  updateDoc, 
  getDoc,
  getDocs,
  deleteDoc,
  Timestamp,
  collection,
  addDoc,
  arrayUnion,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import { ref as storageRef, getBlob, getDownloadURL } from 'firebase/storage'
import { getFunctions, httpsCallable } from 'firebase/functions'

export class DeliveryService {
  constructor() {
    this.maxRetries = 3
    this.retryDelays = [5000, 15000, 60000] // Exponential backoff
    this.functions = getFunctions()
    this.collection = 'deliveries'
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
        message: 'Preparing delivery package with DDEX naming'
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
          totalFiles: deliveryPackage.files.length,
          upc: deliveryPackage.upc
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
   * Prepare delivery package (ERN + assets) with DDEX-compliant naming
   */
  async preparePackage(delivery) {
    const files = []
    
    // Get the release for UPC/barcode and track information
    const releaseDoc = await getDoc(doc(db, 'releases', delivery.releaseId))
    if (!releaseDoc.exists()) {
      throw new Error('Release not found')
    }
    
    const release = releaseDoc.data()
    const upc = release.basic?.barcode || '0000000000000'
    const discNumber = '01' // Default to disc 01 for now
    
    // Log UPC being used
    console.log(`Preparing package with UPC: ${upc}`)
    
    // Add ERN file (already contains properly escaped URLs)
    if (delivery.ernXml) {
      files.push({
        name: `${delivery.ernMessageId}.xml`,
        content: delivery.ernXml,
        type: 'text/xml',
        isERN: true
      })
    }

    // Add audio files with DDEX naming
    if (delivery.package?.audioFiles && release.tracks) {
      delivery.package.audioFiles.forEach((audioUrl, index) => {
        if (audioUrl) {
          const track = release.tracks[index]
          const trackNumber = String(track?.sequenceNumber || index + 1).padStart(3, '0')
          
          // Extract original extension from URL
          const originalExt = this.extractFileExtension(audioUrl)
          
          // DDEX standard: UPC_DiscNumber_TrackNumber.extension
          const ddexFileName = `${upc}_${discNumber}_${trackNumber}.${originalExt}`
          
          console.log(`Audio file ${index + 1}: ${this.extractFileName(audioUrl)} → ${ddexFileName}`)
          
          files.push({
            name: ddexFileName,  // This is what will be used for delivery
            originalName: this.extractFileName(audioUrl),  // Keep for reference
            url: audioUrl,
            type: 'audio',
            needsDownload: true,
            trackNumber: track?.sequenceNumber || index + 1,
            isrc: track?.isrc
          })
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
          
          console.log(`Image file ${index + 1}: ${this.extractFileName(imageUrl)} → ${ddexFileName}`)
          
          files.push({
            name: ddexFileName,  // This is what will be used for delivery
            originalName: this.extractFileName(imageUrl),  // Keep for reference
            url: imageUrl,
            type: 'image',
            needsDownload: true,
            imageType: index === 0 ? 'FrontCover' : 'Additional'
          })
        }
      })
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
      upc,
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
    
    // Log the DDEX file naming summary
    console.log('DDEX File Naming Applied:')
    console.log(`  UPC: ${upc}`)
    console.log(`  ERN: ${files.find(f => f.isERN)?.name}`)
    console.log(`  Audio files: ${files.filter(f => f.type === 'audio').map(f => f.name).join(', ')}`)
    console.log(`  Image files: ${files.filter(f => f.type === 'image').map(f => f.name).join(', ')}`)
    
    return deliveryPackage
  }

  /**
   * Extract file extension from URL - Enhanced for Firebase Storage URLs
   */
  extractFileExtension(url) {
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
      
      // Try to determine from the path structure
      // Firebase Storage URLs often have the extension before parameters
      const pathMatch = pathname.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
      if (pathMatch) {
        const ext = pathMatch[1].toLowerCase()
        if (['mp3', 'wav', 'flac', 'jpg', 'png'].includes(ext)) {
          return ext
        }
      }
      
      // Default extensions based on context
      // For audio files, default to wav (most common for DDEX)
      // For images, default to jpg
      console.warn(`Could not determine extension for ${url}, defaulting to wav`)
      return 'wav'
    } catch (error) {
      console.error('Error extracting file extension:', error)
      return 'wav'
    }
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
   * Generate a delivery receipt
   */
  generateReceipt(delivery, result) {
    return {
      receiptId: `RCP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deliveryId: delivery.id,
      releaseId: delivery.releaseId,
      targetId: delivery.targetId,
      targetName: delivery.targetName,
      protocol: delivery.targetProtocol,
      status: 'completed',
      timestamp: new Date().toISOString(),
      ernMessageId: delivery.ernMessageId,
      filesDelivered: result.files?.length || 0,
      bytesTransferred: result.bytesTransferred || 0,
      dspMessageId: result.acknowledgmentId || result.messageId,
      acknowledgment: result.acknowledgment || 'Delivery completed successfully',
      testMode: delivery.testMode
    }
  }

  /**
   * Send notification after delivery
   */
  async sendNotification(delivery, type, data) {
    try {
      await addDoc(collection(db, 'notifications'), {
        type,
        deliveryId: delivery.id,
        releaseTitle: delivery.releaseTitle,
        targetName: delivery.targetName,
        tenantId: delivery.tenantId,
        timestamp: Timestamp.now(),
        data
      })
      
      console.log(`Notification sent: ${type} for delivery ${delivery.id}`)
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  /**
   * Handle delivery error and retry logic
   */
  async handleDeliveryError(deliveryId, error) {
    try {
      const delivery = await this.getDelivery(deliveryId)
      const attemptNumber = (delivery.attempts?.length || 0) + 1
      
      if (attemptNumber < this.maxRetries) {
        const retryDelay = this.retryDelays[attemptNumber - 1]
        const retryAt = new Date(Date.now() + retryDelay)
        
        await this.addDeliveryLog(deliveryId, {
          level: 'warning',
          step: 'retry_scheduled',
          message: `Retry #${attemptNumber} scheduled for ${retryAt.toISOString()}`,
          details: {
            attemptNumber,
            retryDelay,
            error: error.message
          }
        })
        
        await updateDoc(doc(db, 'deliveries', deliveryId), {
          status: 'queued',
          scheduledAt: Timestamp.fromDate(retryAt),
          retryCount: attemptNumber,
          lastError: error.message,
          attempts: arrayUnion({
            attemptNumber,
            timestamp: Timestamp.now(),
            error: error.message
          })
        })
      } else {
        await this.addDeliveryLog(deliveryId, {
          level: 'error',
          step: 'max_retries',
          message: `Maximum retries (${this.maxRetries}) exceeded`,
          details: {
            attempts: attemptNumber,
            finalError: error.message
          }
        })
        
        await updateDoc(doc(db, 'deliveries', deliveryId), {
          status: 'failed',
          failedAt: Timestamp.now(),
          error: error.message,
          attempts: arrayUnion({
            attemptNumber,
            timestamp: Timestamp.now(),
            error: error.message
          })
        })
        
        await this.sendNotification(delivery, 'failed', { error: error.message })
      }
    } catch (err) {
      console.error('Error handling delivery error:', err)
    }
  }

  /**
   * Generate idempotency key for a delivery
   * This ensures the same release/target/message combination can't be delivered twice
   */
  generateIdempotencyKey(releaseId, targetId, messageType, messageSubType, ernMessageId) {
    // Create a deterministic key based on delivery parameters
    // This prevents duplicate deliveries of the same content
    const components = [
      releaseId,
      targetId,
      messageType || 'NewReleaseMessage',
      messageSubType || 'Initial',
      ernMessageId || Date.now()
    ].filter(Boolean).join('_')
    
    // Add a hash for safety (in case of special characters)
    const hash = components.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0).toString(36)
    
    return `IDMP_${components}_${hash}`.replace(/[^a-zA-Z0-9_-]/g, '_')
  }

  /**
   * Check if a delivery with this idempotency key already exists
   */
  async checkIdempotencyKey(idempotencyKey) {
    try {
      const q = query(
        collection(db, this.collection),
        where('idempotencyKey', '==', idempotencyKey),
        limit(1)
      )
      
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        const existing = snapshot.docs[0]
        return { 
          exists: true, 
          delivery: { id: existing.id, ...existing.data() }
        }
      }
      
      return { exists: false }
    } catch (error) {
      console.error('Error checking idempotency key:', error)
      return { exists: false }
    }
  }

  /**
   * Create a new delivery with idempotency protection
   */
  async createDelivery(deliveryData) {
    try {
      // Generate idempotency key if not provided
      if (!deliveryData.idempotencyKey) {
        deliveryData.idempotencyKey = this.generateIdempotencyKey(
          deliveryData.releaseId,
          deliveryData.targetId,
          deliveryData.messageType,
          deliveryData.messageSubType,
          deliveryData.ernMessageId
        )
      }
      
      console.log('Creating delivery with idempotency key:', deliveryData.idempotencyKey)
      
      // Check if this delivery already exists
      const idempotencyCheck = await this.checkIdempotencyKey(deliveryData.idempotencyKey)
      if (idempotencyCheck.exists) {
        console.log('Delivery already exists with this idempotency key, returning existing:', idempotencyCheck.delivery.id)
        
        // Return the existing delivery with isDuplicate flag
        return {
          ...idempotencyCheck.delivery,
          isDuplicate: true  // Add this flag
        }
      }
      
      // Add creation timestamps and idempotency key
      const docRef = await addDoc(collection(db, this.collection), {
        ...deliveryData,
        idempotencyKey: deliveryData.idempotencyKey,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      console.log('Created new delivery with ID:', docRef.id)
      
      return { 
        id: docRef.id, 
        ...deliveryData,
        idempotencyKey: deliveryData.idempotencyKey
      }
    } catch (error) {
      console.error('Error creating delivery:', error)
      throw error
    }
  }

  /**
   * Get all deliveries for a tenant
   */
  async getDeliveries(tenantId) {
    try {
      const q = query(
        collection(db, this.collection),
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Error getting deliveries:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time delivery updates
   */
  subscribeToDeliveries(tenantId, callback) {
    const q = query(
      collection(db, this.collection),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    )
    
    return onSnapshot(q, (snapshot) => {
      const deliveries = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }))
      callback(deliveries)
    })
  }

  /**
   * Cancel a delivery
   */
  async cancelDelivery(deliveryId) {
    try {
      await this.updateDeliveryStatus(deliveryId, 'cancelled', {
        cancelledAt: Timestamp.now()
      })
      
      return { success: true }
    } catch (error) {
      console.error('Error cancelling delivery:', error)
      throw error
    }
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(deliveryId) {
    try {
      // Get current delivery data
      const delivery = await this.getDelivery(deliveryId)
      
      // Reset status to queued and clear error
      await updateDoc(doc(db, this.collection, deliveryId), {
        status: 'queued',
        error: null,
        retryAt: Timestamp.now(),
        scheduledAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      return { success: true }
    } catch (error) {
      console.error('Error retrying delivery:', error)
      throw error
    }
  }

  /**
   * Delete a delivery
   */
  async deleteDelivery(deliveryId) {
    try {
      await deleteDoc(doc(db, this.collection, deliveryId))
      return { success: true }
    } catch (error) {
      console.error('Error deleting delivery:', error)
      throw error
    }
  }

  /**
   * Test connection to a delivery target
   */
  async testConnection(targetConfig) {
    try {
      // Create a test package
      const testPackage = {
        deliveryId: 'test',
        files: [{
          name: 'test.xml',
          content: '<?xml version="1.0"?><test>Connection test</test>',
          type: 'text/xml',
          isERN: true
        }],
        metadata: {
          messageId: 'TEST_' + Date.now(),
          testMode: true,
          priority: 'low'
        }
      }

      // Try to connect based on protocol
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

  /**
   * Extract filename from URL - Enhanced to handle Firebase Storage URLs
   */
  extractFileName(url) {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const parts = pathname.split('/')
      let filename = parts[parts.length - 1]
      
      // Remove URL parameters
      filename = filename.split('?')[0]
      
      // Decode URL encoding
      filename = decodeURIComponent(filename)
      
      // Remove Firebase Storage prefixes if present
      if (filename.includes('%2F')) {
        const decodedParts = filename.split('%2F')
        filename = decodedParts[decodedParts.length - 1]
      }
      
      // Sanitize for filesystem (remove special chars except . _ -)
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      
      return filename || `file_${Date.now()}`
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