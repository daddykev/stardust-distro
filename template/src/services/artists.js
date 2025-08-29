// src/services/artists.js
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
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase'

class ArtistsService {
  constructor() {
    this.collectionName = 'artists'
  }

  /**
   * Create a new artist
   */
  async createArtist(artistData, userId) {
    try {
      const artist = {
        ...artistData,
        userId,
        status: 'active',
        verified: false,
        releaseCount: 0,
        trackCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, this.collectionName), artist)
      return { id: docRef.id, ...artist }
    } catch (error) {
      console.error('Error creating artist:', error)
      throw error
    }
  }

  /**
   * Get all artists for a user
   */
  async getUserArtists(userId, options = {}) {
    try {
      const constraints = [where('userId', '==', userId)]
      
      if (options.type) {
        constraints.push(where('type', '==', options.type))
      }
      
      if (options.status) {
        constraints.push(where('status', '==', options.status))
      }
      
      constraints.push(orderBy('name'))
      
      if (options.limit) {
        constraints.push(limit(options.limit))
      }

      const q = query(collection(db, this.collectionName), ...constraints)
      const snapshot = await getDocs(q)
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching artists:', error)
      throw error
    }
  }

  /**
   * Get a single artist
   */
  async getArtist(artistId) {
    try {
      const docRef = doc(db, this.collectionName, artistId)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        throw new Error('Artist not found')
      }
      
      return { id: docSnap.id, ...docSnap.data() }
    } catch (error) {
      console.error('Error fetching artist:', error)
      throw error
    }
  }

  /**
   * Update an artist
   */
  async updateArtist(artistId, updates) {
    try {
      const docRef = doc(db, this.collectionName, artistId)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      
      return { id: artistId, ...updates }
    } catch (error) {
      console.error('Error updating artist:', error)
      throw error
    }
  }

  /**
   * Delete an artist
   */
  async deleteArtist(artistId) {
    try {
      await deleteDoc(doc(db, this.collectionName, artistId))
      return true
    } catch (error) {
      console.error('Error deleting artist:', error)
      throw error
    }
  }

  /**
   * Check if Spotify/Apple ID is already in use
   */
  async checkExternalIdExists(platform, externalId, excludeArtistId = null) {
    try {
      const field = platform === 'spotify' ? 'spotifyArtistId' : 'appleArtistId'
      const constraints = [where(field, '==', externalId)]
      
      const q = query(collection(db, this.collectionName), ...constraints)
      const snapshot = await getDocs(q)
      
      const results = snapshot.docs.filter(doc => doc.id !== excludeArtistId)
      return results.length > 0
    } catch (error) {
      console.error('Error checking external ID:', error)
      throw error
    }
  }

  /**
   * Search artists by name
   */
  async searchArtists(searchTerm, userId) {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a simple prefix search. Consider using Algolia or Elasticsearch for better search
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        orderBy('name'),
        limit(20)
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error searching artists:', error)
      throw error
    }
  }
}

export default new ArtistsService()