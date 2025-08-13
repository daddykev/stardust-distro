// src/services/deliveryTargets.js
import { db } from '../firebase'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore'

export class DeliveryTargetService {
  constructor() {
    this.collection = 'deliveryTargets'
  }

  /**
   * Create a new delivery target
   */
  async createTarget(targetData, tenantId) {
    try {
      const target = {
        ...targetData,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: targetData.active !== false
      }

      const docRef = await addDoc(collection(db, this.collection), target)
      return { id: docRef.id, ...target }
    } catch (error) {
      console.error('Error creating delivery target:', error)
      throw error
    }
  }

  /**
   * Update a delivery target
   */
  async updateTarget(targetId, updates) {
    try {
      const docRef = doc(db, this.collection, targetId)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      })
      return { id: targetId, ...updates }
    } catch (error) {
      console.error('Error updating delivery target:', error)
      throw error
    }
  }

  /**
   * Get a single delivery target
   */
  async getTarget(targetId) {
    try {
      const docRef = doc(db, this.collection, targetId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      } else {
        throw new Error('Delivery target not found')
      }
    } catch (error) {
      console.error('Error getting delivery target:', error)
      throw error
    }
  }

  /**
   * Get all delivery targets for a tenant
   */
  async getTenantTargets(tenantId, options = {}) {
    try {
      const constraints = [
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc')
      ]

      if (options.active !== undefined) {
        constraints.push(where('active', '==', options.active))
      }

      const q = query(collection(db, this.collection), ...constraints)
      const querySnapshot = await getDocs(q)
      
      const targets = []
      querySnapshot.forEach((doc) => {
        targets.push({ id: doc.id, ...doc.data() })
      })
      
      return targets
    } catch (error) {
      console.error('Error getting tenant targets:', error)
      throw error
    }
  }

  /**
   * Delete a delivery target
   */
  async deleteTarget(targetId) {
    try {
      await deleteDoc(doc(db, this.collection, targetId))
      return true
    } catch (error) {
      console.error('Error deleting delivery target:', error)
      throw error
    }
  }

  /**
   * Test connection to a delivery target
   */
  async testConnection(targetConfig) {
    // This would normally test the actual connection
    // For now, we'll simulate it
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.2 // 80% success rate for demo
        resolve({
          success,
          message: success ? 'Connection successful' : 'Connection failed: Timeout',
          timestamp: new Date()
        })
      }, 2000)
    })
  }

  /**
   * Get default commercial models for a DSP type
   */
  getDefaultCommercialModels(dspType) {
    const defaults = {
      'Spotify': [
        {
          type: 'SubscriptionModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        },
        {
          type: 'AdvertisementSupportedModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        }
      ],
      'Apple Music': [
        {
          type: 'SubscriptionModel',
          usageTypes: ['OnDemandStream', 'TetheredDownload'],
          territories: ['Worldwide']
        }
      ],
      'Amazon Music': [
        {
          type: 'SubscriptionModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        },
        {
          type: 'PayAsYouGoModel',
          usageTypes: ['PermanentDownload'],
          territories: ['Worldwide']
        }
      ],
      'YouTube Music': [
        {
          type: 'AdvertisementSupportedModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        },
        {
          type: 'SubscriptionModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        }
      ],
      'Deezer': [
        {
          type: 'SubscriptionModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        },
        {
          type: 'AdvertisementSupportedModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        }
      ],
      'Default': [
        {
          type: 'PayAsYouGoModel',
          usageTypes: ['PermanentDownload'],
          territories: ['Worldwide']
        }
      ]
    }
    
    return defaults[dspType] || defaults['Default']
  }
}

export default new DeliveryTargetService()