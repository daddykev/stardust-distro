// src/services/deliveryHistory.js
import { db } from '../firebase'
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore'

export class DeliveryHistoryService {
  constructor() {
    this.collection = 'deliveryHistory'
  }

  /**
   * Record a delivery in history
   */
  async recordDelivery(deliveryData) {
    try {
      const historyRecord = {
        releaseId: deliveryData.releaseId,
        targetId: deliveryData.targetId,
        targetName: deliveryData.targetName,
        messageType: deliveryData.messageType || 'NewReleaseMessage',
        messageSubType: deliveryData.messageSubType, // 'Initial', 'Update', 'Takedown'
        ernVersion: deliveryData.ernVersion,
        messageId: deliveryData.ernMessageId,
        deliveryId: deliveryData.deliveryId,
        tenantId: deliveryData.tenantId,
        status: deliveryData.status,
        deliveredAt: deliveryData.completedAt || Timestamp.now(),
        createdAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, this.collection), historyRecord)
      return { id: docRef.id, ...historyRecord }
    } catch (error) {
      console.error('Error recording delivery history:', error)
      throw error
    }
  }

  /**
   * Check if a release has been delivered to a target before
   */
  async hasBeenDelivered(releaseId, targetId) {
    try {
      const q = query(
        collection(db, this.collection),
        where('releaseId', '==', releaseId),
        where('targetId', '==', targetId),
        where('status', '==', 'completed'),
        where('messageSubType', 'in', ['Initial', 'Update']),
        orderBy('deliveredAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      return !snapshot.empty
    } catch (error) {
      console.error('Error checking delivery history:', error)
      return false
    }
  }

  /**
   * Get last successful delivery for a release/target combination
   */
  async getLastDelivery(releaseId, targetId) {
    try {
      const q = query(
        collection(db, this.collection),
        where('releaseId', '==', releaseId),
        where('targetId', '==', targetId),
        where('status', '==', 'completed'),
        orderBy('deliveredAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        return { id: doc.id, ...doc.data() }
      }
      return null
    } catch (error) {
      console.error('Error getting last delivery:', error)
      return null
    }
  }

  /**
   * Get delivery history for a release
   */
  async getReleaseHistory(releaseId) {
    try {
      const q = query(
        collection(db, this.collection),
        where('releaseId', '==', releaseId),
        orderBy('deliveredAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      const history = []
      snapshot.forEach(doc => {
        history.push({ id: doc.id, ...doc.data() })
      })
      return history
    } catch (error) {
      console.error('Error getting release history:', error)
      return []
    }
  }

  /**
   * Determine appropriate message type based on history
   */
  async determineMessageType(releaseId, targetId, isUpdate = false, isTakedown = false) {
    try {
      // Check for explicit takedown
      if (isTakedown) {
        return {
          messageType: 'NewReleaseMessage',
          messageSubType: 'Takedown',
          includeDeals: false
        }
      }

      // Check delivery history
      const hasBeenDelivered = await this.hasBeenDelivered(releaseId, targetId)
      
      if (!hasBeenDelivered) {
        return {
          messageType: 'NewReleaseMessage',
          messageSubType: 'Initial',
          includeDeals: true
        }
      } else {
        // If explicitly marked as update or if content has changed
        return {
          messageType: 'NewReleaseMessage',
          messageSubType: 'Update',
          includeDeals: true
        }
      }
    } catch (error) {
      console.error('Error determining message type:', error)
      // Default to initial if we can't determine
      return {
        messageType: 'NewReleaseMessage',
        messageSubType: 'Initial',
        includeDeals: true
      }
    }
  }
}

export default new DeliveryHistoryService()