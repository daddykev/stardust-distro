// src/services/catalog.js
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
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore'

export class CatalogService {
  constructor() {
    this.collection = 'releases'
  }

  /**
   * Create a new release
   */
  async createRelease(releaseData, userId) {
    try {
      const release = {
        ...releaseData,
        status: releaseData.status || 'draft',
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tenantId: userId, // For now, using userId as tenantId
        ddex: {
          version: releaseData.preview?.ernVersion || '4.3',
          profile: releaseData.preview?.profile || 'AudioAlbum',
          validated: false
        }
      }

      const docRef = await addDoc(collection(db, this.collection), release)
      return { id: docRef.id, ...release }
    } catch (error) {
      console.error('Error creating release:', error)
      throw error
    }
  }

  /**
   * Update an existing release
   */
  async updateRelease(releaseId, updates) {
    try {
      const docRef = doc(db, this.collection, releaseId)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return { id: releaseId, ...updates }
    } catch (error) {
      console.error('Error updating release:', error)
      throw error
    }
  }

  /**
   * Get a single release by ID
   */
  async getRelease(releaseId) {
    try {
      const docRef = doc(db, this.collection, releaseId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      } else {
        throw new Error('Release not found')
      }
    } catch (error) {
      console.error('Error getting release:', error)
      throw error
    }
  }

  /**
   * Get all releases for a user
   */
  async getUserReleases(userId, options = {}) {
    try {
      const constraints = [
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      ]

      if (options.status) {
        constraints.push(where('status', '==', options.status))
      }

      if (options.limit) {
        constraints.push(limit(options.limit))
      }

      const q = query(collection(db, this.collection), ...constraints)
      const querySnapshot = await getDocs(q)
      
      const releases = []
      querySnapshot.forEach((doc) => {
        releases.push({ id: doc.id, ...doc.data() })
      })
      
      return releases
    } catch (error) {
      console.error('Error getting user releases:', error)
      throw error
    }
  }

  /**
   * Delete a release
   */
  async deleteRelease(releaseId) {
    try {
      await deleteDoc(doc(db, this.collection, releaseId))
      return true
    } catch (error) {
      console.error('Error deleting release:', error)
      throw error
    }
  }

  /**
   * Save a draft release
   */
  async saveDraft(releaseData, userId, releaseId = null) {
    try {
      const draftData = {
        ...releaseData,
        status: 'draft',
        isDraft: true
      }

      if (releaseId) {
        return await this.updateRelease(releaseId, draftData)
      } else {
        return await this.createRelease(draftData, userId)
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      throw error
    }
  }

  /**
   * Publish a release (change from draft to ready)
   */
  async publishRelease(releaseId) {
    try {
      return await this.updateRelease(releaseId, {
        status: 'ready',
        isDraft: false,
        publishedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error publishing release:', error)
      throw error
    }
  }

  /**
   * Add a track to a release
   */
  async addTrack(releaseId, trackData) {
    try {
      const release = await this.getRelease(releaseId)
      const tracks = release.tracks || []
      
      const newTrack = {
        id: Date.now().toString(),
        sequenceNumber: tracks.length + 1,
        // Ensure these fields are captured
        title: trackData.title,
        artist: trackData.artist || release.basic?.displayArtist,
        displayArtist: trackData.displayArtist || trackData.artist || release.basic?.displayArtist,
        duration: trackData.duration || 0,
        isrc: trackData.isrc || '',
        // Store audio metadata
        audio: {
          url: trackData.audio?.url,
          format: trackData.audio?.format || 'WAV',
          duration: trackData.audio?.duration || trackData.duration,
          bitrate: trackData.audio?.bitrate,
          sampleRate: trackData.audio?.sampleRate
        },
        // Store additional metadata
        metadata: {
          title: trackData.title,
          displayArtist: trackData.displayArtist || trackData.artist,
          genre: trackData.genre,
          language: trackData.language || 'en',
          contributors: trackData.contributors || []
        },
        createdAt: new Date().toISOString()
      }
      
      tracks.push(newTrack)
      
      await this.updateRelease(releaseId, { tracks })
      return newTrack
    } catch (error) {
      console.error('Error adding track:', error)
      throw error
    }
  }

  /**
   * Update track in a release
   */
  async updateTrack(releaseId, trackId, updates) {
    try {
      const release = await this.getRelease(releaseId)
      const tracks = release.tracks || []
      
      const trackIndex = tracks.findIndex(t => t.id === trackId)
      if (trackIndex === -1) {
        throw new Error('Track not found')
      }
      
      tracks[trackIndex] = { ...tracks[trackIndex], ...updates }
      
      await this.updateRelease(releaseId, { tracks })
      return tracks[trackIndex]
    } catch (error) {
      console.error('Error updating track:', error)
      throw error
    }
  }

  /**
   * Remove track from a release
   */
  async removeTrack(releaseId, trackId) {
    try {
      const release = await this.getRelease(releaseId)
      const tracks = (release.tracks || []).filter(t => t.id !== trackId)
      
      // Resequence tracks
      tracks.forEach((track, index) => {
        track.sequenceNumber = index + 1
      })
      
      await this.updateRelease(releaseId, { tracks })
      return true
    } catch (error) {
      console.error('Error removing track:', error)
      throw error
    }
  }

  /**
   * Reorder tracks in a release
   */
  async reorderTracks(releaseId, trackIds) {
    try {
      const release = await this.getRelease(releaseId)
      const tracks = release.tracks || []
      
      const reorderedTracks = trackIds.map((id, index) => {
        const track = tracks.find(t => t.id === id)
        if (!track) throw new Error(`Track ${id} not found`)
        return { ...track, sequenceNumber: index + 1 }
      })
      
      await this.updateRelease(releaseId, { tracks: reorderedTracks })
      return reorderedTracks
    } catch (error) {
      console.error('Error reordering tracks:', error)
      throw error
    }
  }
}

export default new CatalogService()