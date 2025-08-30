// src/services/batch.js
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '../firebase'

class BatchService {
  constructor() {
    this.collection = 'batches'
  }

  /**
   * Create a new batch
   */
  async createBatch(userId, data) {
    try {
      const batchData = {
        userId,
        name: data.name || `Batch ${new Date().toLocaleDateString()}`,
        description: data.description || '',
        type: data.type || 'standard', // 'standard', 'upc-only', 'metadata-less'
        status: 'active', // 'active', 'processing', 'completed', 'archived'
        
        // Statistics
        stats: {
          totalReleases: 0,
          completeReleases: 0,
          incompleteReleases: 0,
          catalogedReleases: 0, // Moved to catalog
          pendingMetadata: 0,
          pendingAudio: 0,
          pendingArtwork: 0
        },
        
        // Source information
        source: {
          type: data.sourceType, // 'csv', 'upc-list', 'manual'
          fileName: data.fileName || null,
          uploadedAt: data.uploadedAt || null
        },
        
        releases: [], // Will contain release objects
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, this.collection), batchData)
      return { id: docRef.id, ...batchData }
    } catch (error) {
      console.error('Error creating batch:', error)
      throw error
    }
  }

  /**
   * Get all batches for a user
   */
  async getUserBatches(userId) {
    try {
      const q = query(
        collection(db, this.collection),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching batches:', error)
      throw error
    }
  }

  /**
   * Get a single batch
   */
  async getBatch(batchId) {
    try {
      const docRef = doc(db, this.collection, batchId)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        throw new Error('Batch not found')
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      }
    } catch (error) {
      console.error('Error fetching batch:', error)
      throw error
    }
  }

  /**
   * Update batch
   */
  async updateBatch(batchId, updates) {
    try {
      const docRef = doc(db, this.collection, batchId)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return { id: batchId, ...updates }
    } catch (error) {
      console.error('Error updating batch:', error)
      throw error
    }
  }

  /**
   * Add releases to batch
   */
  async addReleasesToBatch(batchId, releases) {
    try {
      const batch = await this.getBatch(batchId)
      
      // Merge with existing releases (avoid duplicates by UPC)
      const existingUPCs = new Set(batch.releases?.map(r => r.upc) || [])
      const newReleases = releases.filter(r => !existingUPCs.has(r.upc))
      
      const updatedReleases = [...(batch.releases || []), ...newReleases]
      
      // Update stats
      const stats = this.calculateBatchStats(updatedReleases)
      
      await this.updateBatch(batchId, {
        releases: updatedReleases,
        stats
      })
      
      return updatedReleases
    } catch (error) {
      console.error('Error adding releases to batch:', error)
      throw error
    }
  }

  /**
   * Update a release within a batch
   */
  async updateReleaseInBatch(batchId, releaseUPC, updates) {
    try {
      const batch = await this.getBatch(batchId)
      
      const updatedReleases = batch.releases.map(release => {
        if (release.upc === releaseUPC) {
          return { ...release, ...updates, lastUpdated: new Date().toISOString() }
        }
        return release
      })
      
      const stats = this.calculateBatchStats(updatedReleases)
      
      await this.updateBatch(batchId, {
        releases: updatedReleases,
        stats
      })
      
      return updatedReleases.find(r => r.upc === releaseUPC)
    } catch (error) {
      console.error('Error updating release in batch:', error)
      throw error
    }
  }

  /**
   * Calculate batch statistics
   */
  calculateBatchStats(releases) {
    const stats = {
      totalReleases: releases.length,
      completeReleases: 0,
      incompleteReleases: 0,
      catalogedReleases: 0,
      pendingMetadata: 0,
      pendingAudio: 0,
      pendingArtwork: 0
    }
    
    releases.forEach(release => {
      if (release.cataloged) {
        stats.catalogedReleases++
      } else if (this.isReleaseComplete(release)) {
        stats.completeReleases++
      } else {
        stats.incompleteReleases++
        
        if (!release.metadata || Object.keys(release.metadata).length === 0) {
          stats.pendingMetadata++
        }
        if (!release.hasAllAudio) {
          stats.pendingAudio++
        }
        if (!release.coverArt) {
          stats.pendingArtwork++
        }
      }
    })
    
    return stats
  }

  /**
   * Check if a release is complete
   */
  isReleaseComplete(release) {
    return !!(
      release.metadata &&
      release.metadata.title &&
      release.tracks?.length > 0 &&
      release.hasAllAudio &&
      release.coverArt
    )
  }

  /**
   * Mark release as cataloged
   */
  async markReleaseAsCataloged(batchId, releaseUPC, catalogId) {
    return this.updateReleaseInBatch(batchId, releaseUPC, {
      cataloged: true,
      catalogId,
      catalogedAt: new Date().toISOString()
    })
  }

  /**
   * Delete batch
   */
  async deleteBatch(batchId) {
    try {
      await deleteDoc(doc(db, this.collection, batchId))
      return true
    } catch (error) {
      console.error('Error deleting batch:', error)
      throw error
    }
  }

  /**
   * Archive batch
   */
  async archiveBatch(batchId) {
    return this.updateBatch(batchId, {
      status: 'archived',
      archivedAt: serverTimestamp()
    })
  }
}

export default new BatchService()