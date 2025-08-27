// src/services/deliveryTargets.js
import { db, functions } from '../firebase'
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
import { httpsCallable } from 'firebase/functions'

// Cloud Functions for encryption (we'll create these)
const encryptSensitiveData = httpsCallable(functions, 'encryptSensitiveData')
const decryptSensitiveData = httpsCallable(functions, 'decryptSensitiveData')

export class DeliveryTargetService {
  constructor() {
    this.collection = 'deliveryTargets'
    // Fields that contain sensitive data
    this.sensitiveFields = [
      'password',
      'privateKey',
      'secretKey',
      'accessKey',
      'accountKey',
      'apiKey',
      'authToken',
      'clientSecret'
    ]
  }

  /**
   * Encrypt sensitive fields in config
   */
  async encryptConfig(config) {
    if (!config) return config
    
    const encryptedConfig = { ...config }
    
    for (const field of this.sensitiveFields) {
      if (config[field] && config[field].length > 0) {
        try {
          // Only encrypt if not already encrypted (check for base64 pattern)
          if (!this.isEncrypted(config[field])) {
            const { data } = await encryptSensitiveData({ 
              text: config[field] 
            })
            encryptedConfig[field] = data.encrypted
            encryptedConfig[`${field}_encrypted`] = true // Mark as encrypted
          }
        } catch (error) {
          console.error(`Failed to encrypt ${field}:`, error)
          throw new Error('Failed to encrypt sensitive data')
        }
      }
    }
    
    return encryptedConfig
  }

  /**
   * Decrypt sensitive fields in config
   */
  async decryptConfig(config) {
    if (!config) return config
    
    const decryptedConfig = { ...config }
    
    for (const field of this.sensitiveFields) {
      if (config[field] && config[`${field}_encrypted`]) {
        try {
          const { data } = await decryptSensitiveData({ 
            encrypted: config[field] 
          })
          decryptedConfig[field] = data.decrypted
          // Remove the encrypted flag from the returned object
          delete decryptedConfig[`${field}_encrypted`]
        } catch (error) {
          console.error(`Failed to decrypt ${field}:`, error)
          // Return masked value if decryption fails
          decryptedConfig[field] = '********'
        }
      }
    }
    
    return decryptedConfig
  }

  /**
   * Check if a value appears to be encrypted
   */
  isEncrypted(value) {
    // Check if it's a base64 string with our encryption signature
    const encryptedPattern = /^[A-Za-z0-9+/]+=*$/
    return value.length > 100 && encryptedPattern.test(value)
  }

  /**
   * Create a new delivery target with encrypted credentials
   */
  async createTarget(targetData, tenantId) {
    try {
      // Encrypt sensitive config fields
      const encryptedConfig = await this.encryptConfig(targetData.config)
      
      const target = {
        ...targetData,
        config: encryptedConfig,
        tenantId,
        // Genre mapping configuration
        genreMapping: {
          enabled: targetData.genreMapping?.enabled || false,
          mappingId: targetData.genreMapping?.mappingId || null,
          mappingName: targetData.genreMapping?.mappingName || null,
          strictMode: targetData.genreMapping?.strictMode || false,
          fallbackGenre: targetData.genreMapping?.fallbackGenre || null
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        active: targetData.active !== false
      }

      const docRef = await addDoc(collection(db, this.collection), target)
      
      // Return with decrypted config for immediate use
      return { 
        id: docRef.id, 
        ...target,
        config: targetData.config // Return original unencrypted for UI
      }
    } catch (error) {
      console.error('Error creating delivery target:', error)
      throw error
    }
  }

  /**
   * Update a delivery target with encryption
   */
  async updateTarget(targetId, updates) {
    try {
      // If config is being updated, encrypt it
      let processedUpdates = { ...updates }
      if (updates.config) {
        processedUpdates.config = await this.encryptConfig(updates.config)
      }
      
      const docRef = doc(db, this.collection, targetId)
      await updateDoc(docRef, {
        ...processedUpdates,
        updatedAt: new Date()
      })
      
      return { 
        id: targetId, 
        ...updates // Return original unencrypted
      }
    } catch (error) {
      console.error('Error updating delivery target:', error)
      throw error
    }
  }

  /**
   * Get a single delivery target with decrypted credentials
   */
  async getTarget(targetId) {
    try {
      const docRef = doc(db, this.collection, targetId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        // Decrypt config before returning
        const decryptedConfig = await this.decryptConfig(data.config)
        return { 
          id: docSnap.id, 
          ...data,
          config: decryptedConfig
        }
      } else {
        throw new Error('Delivery target not found')
      }
    } catch (error) {
      console.error('Error getting delivery target:', error)
      throw error
    }
  }

  /**
   * Get all delivery targets for a tenant with decrypted credentials
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
      for (const doc of querySnapshot.docs) {
        const data = doc.data()
        // Decrypt config for each target
        const decryptedConfig = await this.decryptConfig(data.config)
        targets.push({ 
          id: doc.id, 
          ...data,
          config: decryptedConfig
        })
      }
      
      return targets
    } catch (error) {
      console.error('Error getting tenant targets:', error)
      throw error
    }
  }

  /**
   * Delete a delivery target (no changes needed)
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
   * Get default commercial models for a DSP type (no changes needed)
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

  /**
   * Migrate existing unencrypted targets (one-time migration)
   */
  async migrateUnencryptedTargets(tenantId) {
    try {
      const targets = await this.getTenantTargets(tenantId)
      let migrated = 0
      
      for (const target of targets) {
        let needsUpdate = false
        
        // Check if any sensitive fields are unencrypted
        for (const field of this.sensitiveFields) {
          if (target.config?.[field] && !target.config[`${field}_encrypted`]) {
            needsUpdate = true
            break
          }
        }
        
        if (needsUpdate) {
          await this.updateTarget(target.id, {
            config: target.config
          })
          migrated++
        }
      }
      
      return { migrated, total: targets.length }
    } catch (error) {
      console.error('Error migrating targets:', error)
      throw error
    }
  }
}

export default new DeliveryTargetService()