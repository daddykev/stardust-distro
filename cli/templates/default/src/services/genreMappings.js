// src/services/genreMappings.js
import { db } from '../firebase'
import { 
  collection, doc, getDoc, getDocs, setDoc, 
  updateDoc, deleteDoc, query, where, orderBy, Timestamp 
} from 'firebase/firestore'

export class GenreMappingService {
  constructor() {
    this.collection = 'genreMappings'
  }

  async getTenantMappings(tenantId, targetDSP = null) {
    try {
      let q = query(
        collection(db, this.collection),
        where('tenantId', '==', tenantId),
        orderBy('updatedAt', 'desc')
      )
      
      if (targetDSP) {
        q = query(q, where('targetDSP', '==', targetDSP))
      }
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error getting tenant mappings:', error)
      return []
    }
  }

  async getMapping(mappingId) {
    try {
      const docRef = doc(db, this.collection, mappingId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      }
      return null
    } catch (error) {
      console.error('Error getting mapping:', error)
      return null
    }
  }

  async createMapping(mappingData) {
    try {
      const docRef = doc(collection(db, this.collection))
      await setDoc(docRef, {
        ...mappingData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating mapping:', error)
      throw error
    }
  }

  async updateMapping(mappingId, updates) {
    try {
      const docRef = doc(db, this.collection, mappingId)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      })
    } catch (error) {
      console.error('Error updating mapping:', error)
      throw error
    }
  }

  async deleteMapping(mappingId) {
    try {
      const docRef = doc(db, this.collection, mappingId)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error deleting mapping:', error)
      throw error
    }
  }

  async getDefaultMapping(tenantId, targetDSP) {
    try {
      const q = query(
        collection(db, this.collection),
        where('tenantId', '==', tenantId),
        where('targetDSP', '==', targetDSP),
        where('isDefault', '==', true)
      )
      
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        return { id: doc.id, ...doc.data() }
      }
      
      // Fall back to built-in mappings
      return this.getBuiltInMapping(targetDSP)
    } catch (error) {
      console.error('Error getting default mapping:', error)
      return this.getBuiltInMapping(targetDSP)
    }
  }

  getBuiltInMapping(targetDSP) {
    // Import the existing hardcoded mappings as fallback
    const { genreService } = require('../dictionaries/genres/index')
    const stats = genreService.getMappingStats(targetDSP)
    
    return {
      id: `builtin-${targetDSP}`,
      name: `Built-in ${targetDSP} mapping`,
      targetDSP,
      isBuiltIn: true,
      stats
    }
  }

  async mapGenre(genreCode, mappingId) {
    const mapping = await this.getMapping(mappingId)
    if (!mapping) return null
    
    return mapping.mappings?.[genreCode] || 
           mapping.mappings?.['*'] || 
           mapping.fallbackGenre || 
           null
  }
}

export default new GenreMappingService()