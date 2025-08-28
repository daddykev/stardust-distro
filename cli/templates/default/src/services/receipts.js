// src/services/receipts.js
import { db } from '../firebase'
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc,
  getDocs,
  updateDoc,
  query, 
  where, 
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore'

export class ReceiptService {
  constructor() {
    this.collection = 'receipts'
  }

  /**
   * Create a normalized receipt from delivery data
   */
  async createReceipt(deliveryData, result) {
    try {
      // Normalize receipt data across all protocols
      const receipt = {
        // Core identifiers
        receiptId: this.generateReceiptId(),
        deliveryId: deliveryData.id,
        releaseId: deliveryData.releaseId,
        targetId: deliveryData.targetId,
        tenantId: deliveryData.tenantId,
        
        // Release information
        releaseTitle: deliveryData.releaseTitle,
        releaseArtist: deliveryData.releaseArtist,
        upc: deliveryData.upc,
        
        // Target information
        targetName: deliveryData.targetName,
        targetProtocol: deliveryData.targetProtocol,
        targetType: deliveryData.targetType || 'DSP',
        
        // Message information
        messageType: deliveryData.messageType || 'NewReleaseMessage',
        messageSubType: deliveryData.messageSubType || 'Initial',
        ernVersion: deliveryData.ernVersion || '4.3',
        ernMessageId: deliveryData.ernMessageId,
        
        // Delivery status
        status: result.success ? 'completed' : 'failed',
        deliveryStarted: deliveryData.startedAt || Timestamp.now(),
        deliveryCompleted: Timestamp.now(),
        deliveryDuration: result.duration || 0,
        
        // Protocol-specific details
        protocolDetails: this.normalizeProtocolDetails(deliveryData.targetProtocol, result),
        
        // Files transferred
        filesTransferred: {
          ern: result.ernDelivered || !!result.files?.find(f => f.isERN),
          audioCount: result.audioFiles?.length || 0,
          imageCount: result.imageFiles?.length || 0,
          totalFiles: result.files?.length || 0,
          totalBytes: result.bytesTransferred || 0,
          files: this.normalizeFileList(result.files)
        },
        
        // DSP acknowledgment
        acknowledgment: {
          dspMessageId: result.acknowledgmentId || result.messageId || null,
          dspDeliveryId: result.deliveryId || null,
          dspResponse: result.acknowledgment || result.response || 'Delivery completed',
          acknowledged: !!result.acknowledgmentId,
          acknowledgedAt: result.acknowledgmentId ? Timestamp.now() : null
        },
        
        // Validation & compliance
        validation: {
          ernValid: deliveryData.ernValid !== false,
          filesValid: result.filesValid !== false,
          md5Verified: result.md5Verified || false,
          ddexCompliant: true, // Set based on validation
          warnings: result.warnings || []
        },
        
        // Metadata
        testMode: deliveryData.testMode || false,
        priority: deliveryData.priority || 'normal',
        notes: deliveryData.notes || '',
        retryCount: deliveryData.retryCount || 0,
        
        // Timestamps
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) // 90 days
      }
      
      // Store in Firestore
      const docRef = await addDoc(collection(db, this.collection), receipt)
      
      // Also update the delivery with receipt reference
      if (deliveryData.id) {
        await updateDoc(doc(db, 'deliveries', deliveryData.id), {
          receiptId: docRef.id,
          receiptGenerated: true,
          receiptGeneratedAt: Timestamp.now()
        })
      }
      
      return { id: docRef.id, ...receipt }
    } catch (error) {
      console.error('Error creating receipt:', error)
      throw error
    }
  }

  /**
   * Normalize protocol-specific details
   */
  normalizeProtocolDetails(protocol, result) {
    const details = {
      protocol,
      timestamp: new Date().toISOString()
    }
    
    switch (protocol) {
      case 'FTP':
      case 'SFTP':
        return {
          ...details,
          host: result.host || 'unknown',
          directory: result.directory || '/',
          filesUploaded: result.files?.length || 0,
          connectionTime: result.connectionTime || 0,
          transferTime: result.transferTime || 0
        }
        
      case 'S3':
        return {
          ...details,
          bucket: result.bucket || 'unknown',
          region: result.region || 'us-east-1',
          prefix: result.prefix || '',
          etags: result.files?.map(f => f.etag).filter(Boolean) || [],
          multipartUsed: result.multipartUsed || false
        }
        
      case 'API':
        return {
          ...details,
          endpoint: result.endpoint || 'unknown',
          statusCode: result.statusCode || 200,
          responseTime: result.duration || 0,
          headers: result.headers || {},
          method: result.method || 'POST'
        }
        
      case 'Azure':
        return {
          ...details,
          container: result.container || 'unknown',
          accountName: result.accountName || 'unknown',
          blobCount: result.files?.length || 0
        }
        
      case 'Storage':
      case 'storage':
        return {
          ...details,
          bucket: result.bucket || 'default',
          basePath: result.basePath || 'unknown',
          projectId: result.projectId || 'stardust-distro'
        }
        
      default:
        return details
    }
  }

  /**
   * Normalize file list across protocols
   */
  normalizeFileList(files) {
    if (!files || !Array.isArray(files)) return []
    
    return files.map(file => ({
      name: file.name || file.fileName || 'unknown',
      ddexName: file.ddexName || file.name,
      originalName: file.originalName || null,
      type: file.type || this.inferFileType(file.name),
      size: file.size || 0,
      md5Hash: file.md5Hash || file.md5 || null,
      uploadedAt: file.uploadedAt || new Date().toISOString(),
      status: file.status || 'completed',
      location: file.location || file.url || null
    }))
  }

  /**
   * Infer file type from name
   */
  inferFileType(fileName) {
    if (!fileName) return 'unknown'
    const ext = fileName.split('.').pop().toLowerCase()
    
    if (['xml'].includes(ext)) return 'ern'
    if (['wav', 'mp3', 'flac', 'm4a'].includes(ext)) return 'audio'
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image'
    return 'other'
  }

  /**
   * Generate unique receipt ID
   */
  generateReceiptId() {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `RCP_${timestamp}_${random}`
  }

  /**
   * Update acknowledgment when DSP responds
   */
  async updateAcknowledgment(receiptId, acknowledgmentData) {
    try {
      const updates = {
        'acknowledgment.acknowledged': true,
        'acknowledgment.acknowledgedAt': Timestamp.now(),
        'acknowledgment.dspMessageId': acknowledgmentData.messageId || null,
        'acknowledgment.dspDeliveryId': acknowledgmentData.deliveryId || null,
        'acknowledgment.dspResponse': acknowledgmentData.response || 'Acknowledged',
        'acknowledgment.dspStatus': acknowledgmentData.status || 'received',
        updatedAt: Timestamp.now()
      }
      
      await updateDoc(doc(db, this.collection, receiptId), updates)
      
      return { success: true }
    } catch (error) {
      console.error('Error updating acknowledgment:', error)
      throw error
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId) {
    try {
      const docRef = doc(db, this.collection, receiptId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      }
      return null
    } catch (error) {
      console.error('Error getting receipt:', error)
      throw error
    }
  }

  /**
   * Get receipts for a release
   */
  async getReleaseReceipts(releaseId) {
    try {
      const q = query(
        collection(db, this.collection),
        where('releaseId', '==', releaseId),
        orderBy('createdAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      const receipts = []
      
      snapshot.forEach(doc => {
        receipts.push({ id: doc.id, ...doc.data() })
      })
      
      return receipts
    } catch (error) {
      console.error('Error getting release receipts:', error)
      return []
    }
  }

  /**
   * Get receipts for reconciliation
   */
  async getReceiptsForReconciliation(tenantId, filters = {}) {
    try {
      // Query the deliveries collection instead of receipts collection
      const constraints = [
        where('tenantId', '==', tenantId),
        where('status', '==', 'completed'), // Only completed deliveries have receipts
      ]
      
      // Add date range filter
      if (filters.startDate) {
        constraints.push(where('completedAt', '>=', Timestamp.fromDate(filters.startDate)))
      }
      if (filters.endDate) {
        constraints.push(where('completedAt', '<=', Timestamp.fromDate(filters.endDate)))
      }
      
      // Add status filter (already handled by status == 'completed' above)
      
      // Add target filter
      if (filters.targetId) {
        constraints.push(where('targetId', '==', filters.targetId))
      }
      
      constraints.push(orderBy('completedAt', 'desc'))
      
      if (filters.limit) {
        constraints.push(limit(filters.limit))
      }
      
      // Query deliveries collection, not receipts
      const q = query(collection(db, 'deliveries'), ...constraints)
      const snapshot = await getDocs(q)
      
      const receipts = []
      snapshot.forEach(doc => {
        const data = doc.data()
        // Only include deliveries that have receipt data
        if (data.receipt) {
          receipts.push({
            id: doc.id,
            // Map delivery fields to receipt fields expected by the dashboard
            deliveryId: doc.id,
            releaseId: data.releaseId,
            targetId: data.targetId,
            tenantId: data.tenantId,
            
            releaseTitle: data.releaseTitle,
            releaseArtist: data.releaseArtist,
            upc: data.upc,
            
            targetName: data.targetName,
            targetProtocol: data.targetProtocol,
            targetType: data.targetType || 'DSP',
            
            messageType: data.messageType || 'NewReleaseMessage',
            messageSubType: data.messageSubType || 'Initial',
            ernVersion: data.ernVersion || '4.3',
            ernMessageId: data.ernMessageId,
            
            status: data.status,
            deliveryStarted: data.startedAt,
            deliveryCompleted: data.completedAt,
            deliveryDuration: data.totalDuration || 0,
            
            // Map the receipt data
            acknowledgment: {
              acknowledged: !!(data.receipt.acknowledgmentId || data.receipt.dspMessageId),
              dspMessageId: data.receipt.dspMessageId || data.receipt.acknowledgmentId,
              dspResponse: data.receipt.acknowledgment || 'Completed'
            },
            
            filesTransferred: {
              totalFiles: data.receipt.files?.length || 1,
              totalBytes: data.receipt.bytesTransferred || 0
            },
            
            // Include the raw receipt for details
            receipt: data.receipt,
            
            createdAt: data.createdAt,
            completedAt: data.completedAt
          })
        }
      })
      
      return receipts
    } catch (error) {
      console.error('Error getting reconciliation receipts:', error)
      return []
    }
  }

  /**
   * Generate reconciliation report
   */
  async generateReconciliationReport(tenantId, dateRange) {
    try {
      const receipts = await this.getReceiptsForReconciliation(tenantId, dateRange)
      
      const report = {
        period: {
          start: dateRange.startDate,
          end: dateRange.endDate
        },
        summary: {
          totalDeliveries: receipts.length,
          successful: receipts.filter(r => r.status === 'completed').length,
          failed: receipts.filter(r => r.status === 'failed').length,
          acknowledged: receipts.filter(r => r.acknowledgment?.acknowledged).length,
          unacknowledged: receipts.filter(r => !r.acknowledgment?.acknowledged && r.status === 'completed').length
        },
        byTarget: {},
        byMessageType: {},
        byProtocol: {},
        receipts: receipts
      }
      
      // Group by target
      receipts.forEach(receipt => {
        const targetName = receipt.targetName || 'Unknown'
        if (!report.byTarget[targetName]) {
          report.byTarget[targetName] = {
            total: 0,
            successful: 0,
            failed: 0,
            acknowledged: 0
          }
        }
        
        report.byTarget[targetName].total++
        if (receipt.status === 'completed') {
          report.byTarget[targetName].successful++
        } else {
          report.byTarget[targetName].failed++
        }
        if (receipt.acknowledgment?.acknowledged) {
          report.byTarget[targetName].acknowledged++
        }
        
        // Group by message type
        const messageType = receipt.messageSubType || 'Initial'
        report.byMessageType[messageType] = (report.byMessageType[messageType] || 0) + 1
        
        // Group by protocol
        const protocol = receipt.targetProtocol || 'Unknown'
        report.byProtocol[protocol] = (report.byProtocol[protocol] || 0) + 1
      })
      
      return report
    } catch (error) {
      console.error('Error generating reconciliation report:', error)
      throw error
    }
  }

  /**
   * Export receipts to JSON
   */
  exportReceipts(receipts, fileName = 'delivery_receipts') {
    const dataStr = JSON.stringify(receipts, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Archive old receipts (move to cold storage)
   */
  async archiveOldReceipts(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
      
      const q = query(
        collection(db, this.collection),
        where('createdAt', '<', Timestamp.fromDate(cutoffDate)),
        limit(100)
      )
      
      const snapshot = await getDocs(q)
      let archived = 0
      
      // In production, you'd move these to a separate archive collection
      // or cold storage solution
      for (const doc of snapshot.docs) {
        const receipt = doc.data()
        
        // Add to archive collection
        await addDoc(collection(db, 'receipts_archive'), {
          ...receipt,
          archivedAt: Timestamp.now(),
          originalId: doc.id
        })
        
        // Delete from main collection
        await doc.ref.delete()
        archived++
      }
      
      return { archived }
    } catch (error) {
      console.error('Error archiving receipts:', error)
      throw error
    }
  }
}

export default new ReceiptService()