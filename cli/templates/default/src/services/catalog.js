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

/**
 * Helper function to clean data for Firestore
 * Removes undefined values and File objects
 */
const cleanForFirestore = (data) => {
  if (data === null || data === undefined) {
    return null
  }
  
  if (data instanceof Date || typeof data !== 'object') {
    return data
  }
  
  if (data instanceof File) {
    return null // Don't send File objects to Firestore
  }
  
  if (Array.isArray(data)) {
    return data
      .map(item => cleanForFirestore(item))
      .filter(item => item !== undefined)
  }
  
  const cleaned = {}
  for (const [key, value] of Object.entries(data)) {
    // Skip undefined values entirely
    if (value !== undefined) {
      const cleanedValue = cleanForFirestore(value)
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue
      }
    }
  }
  
  return cleaned
}

export class CatalogService {
  constructor() {
    this.collection = 'releases'
  }

  /**
   * Create a new release
   */
  async createRelease(releaseData, userId) {
    try {
      // Clean the data before saving
      const cleanedData = cleanForFirestore(releaseData)
      
      const release = {
        ...cleanedData,
        status: cleanedData.status || 'draft',
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tenantId: userId, // For now, using userId as tenantId
        ddex: {
          version: cleanedData.preview?.ernVersion || '4.3',
          profile: cleanedData.preview?.profile || 'AudioAlbum',
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
      // Clean the updates before sending to Firestore
      const cleanedUpdates = cleanForFirestore(updates)
      
      const docRef = doc(db, this.collection, releaseId)
      await updateDoc(docRef, {
        ...cleanedUpdates,
        updatedAt: serverTimestamp()
      })
      return { id: releaseId, ...cleanedUpdates }
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
      // Clean the data before processing
      const cleanedData = cleanForFirestore(releaseData)
      
      const draftData = {
        ...cleanedData,
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
   * Add a track to a release with enhanced metadata
   */
  async addTrack(releaseId, trackData) {
    try {
      const release = await this.getRelease(releaseId)
      const tracks = release.tracks || []
      
      // Clean track data
      const cleanedTrackData = cleanForFirestore(trackData)
      
      const newTrack = {
        id: Date.now().toString(),
        sequenceNumber: tracks.length + 1,
        
        // Basic track information
        title: cleanedTrackData.title,
        artist: cleanedTrackData.artist || release.basic?.displayArtist,
        displayArtist: cleanedTrackData.displayArtist || cleanedTrackData.artist || release.basic?.displayArtist,
        duration: cleanedTrackData.duration || 0,
        isrc: cleanedTrackData.isrc || '',
        
        // Enhanced audio metadata
        audio: cleanedTrackData.audio ? {
          // File information
          url: cleanedTrackData.audio.url,
          path: cleanedTrackData.audio.path,
          fileName: cleanedTrackData.audio.fileName || cleanedTrackData.audio.name,
          fileSize: cleanedTrackData.audio.fileSize || cleanedTrackData.audio.size,
          uploadedAt: cleanedTrackData.audio.uploadedAt,
          
          // Format information
          format: cleanedTrackData.audio.format || 'WAV',
          codec: cleanedTrackData.audio.codec,
          mimeType: cleanedTrackData.audio.mimeType || cleanedTrackData.audio.contentType,
          
          // Technical specifications
          duration: cleanedTrackData.audio.duration || cleanedTrackData.duration,
          bitrate: cleanedTrackData.audio.bitrate,
          sampleRate: cleanedTrackData.audio.sampleRate,
          bitsPerSample: cleanedTrackData.audio.bitsPerSample,
          channels: cleanedTrackData.audio.channels,
          channelLayout: cleanedTrackData.audio.channelLayout,
          lossless: cleanedTrackData.audio.lossless,
          
          // Quality information
          qualityBadge: cleanedTrackData.audio.qualityBadge,
          isHighResolution: cleanedTrackData.audio.isHighResolution,
          
          // Fingerprinting
          fingerprint: cleanedTrackData.audio.fingerprint,
          audioFingerprint: cleanedTrackData.audio.audioFingerprint,
          
          // Metadata extraction info
          metadata: cleanedTrackData.audio.metadata,
          metadataExtractedAt: cleanedTrackData.audio.metadataExtractedAt || new Date().toISOString()
        } : null,
        
        // Embedded tags from file (if any)
        embeddedTags: cleanedTrackData.embeddedTags || cleanedTrackData.audio?.embeddedTags || null,
        
        // Track-level metadata
        metadata: cleanedTrackData.metadata ? {
          title: cleanedTrackData.metadata.title || cleanedTrackData.title,
          displayArtist: cleanedTrackData.metadata.displayArtist || cleanedTrackData.displayArtist,
          genre: cleanedTrackData.metadata.genre,
          language: cleanedTrackData.metadata.language || 'en',
          contributors: cleanedTrackData.metadata.contributors || [],
          writers: cleanedTrackData.metadata.writers || [],
          publishers: cleanedTrackData.metadata.publishers || []
        } : null,
        
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
   * Update track in a release with enhanced metadata
   */
  async updateTrack(releaseId, trackId, updates) {
    try {
      const release = await this.getRelease(releaseId)
      const tracks = release.tracks || []
      
      const trackIndex = tracks.findIndex(t => t.id === trackId)
      if (trackIndex === -1) {
        throw new Error('Track not found')
      }
      
      // Clean the updates
      const cleanedUpdates = cleanForFirestore(updates)
      
      // If audio metadata is being updated, merge it properly
      if (cleanedUpdates.audio) {
        const existingAudio = tracks[trackIndex].audio || {}
        cleanedUpdates.audio = {
          ...existingAudio,
          ...cleanedUpdates.audio,
          // Ensure metadata is properly merged
          metadata: cleanedUpdates.audio.metadata ? {
            ...existingAudio.metadata,
            ...cleanedUpdates.audio.metadata
          } : existingAudio.metadata,
          // Update extraction timestamp if new metadata
          metadataExtractedAt: cleanedUpdates.audio.metadata ? 
            new Date().toISOString() : existingAudio.metadataExtractedAt
        }
      }
      
      tracks[trackIndex] = { ...tracks[trackIndex], ...cleanedUpdates }
      
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

  /**
   * Update release cover art with enhanced metadata
   */
  async updateReleaseCoverArt(releaseId, coverData) {
    try {
      const release = await this.getRelease(releaseId)
      const existingAssets = release.assets || {}
      
      const updates = {
        assets: {
          ...existingAssets,
          coverImage: {
            // File information
            url: coverData.url,
            path: coverData.path,
            name: coverData.name || coverData.fileName,
            size: coverData.size || coverData.fileSize,
            uploadedAt: coverData.uploadedAt,
            
            // Enhanced image metadata
            dimensions: coverData.metadata?.dimensions || coverData.dimensions || {
              width: coverData.width,
              height: coverData.height,
              megapixels: coverData.megapixels,
              aspectRatio: coverData.aspectRatio
            },
            
            // Format information
            format: coverData.metadata?.format || {
              format: coverData.format,
              mimeType: coverData.mimeType || coverData.contentType,
              space: coverData.colorSpace,
              channels: coverData.channels,
              hasAlpha: coverData.hasAlpha,
              fileSize: coverData.size || coverData.fileSize
            },
            
            // Technical details
            technical: coverData.metadata?.technical || coverData.technical,
            
            // Color statistics
            colorStats: coverData.metadata?.colorStats || coverData.colorStats,
            
            // EXIF data
            exif: coverData.metadata?.exif || coverData.exif,
            
            // Quality assessment
            quality: coverData.metadata?.quality || coverData.quality,
            meetsRequirements: coverData.metadata?.quality?.meetsRequirements || {
              coverArt: (coverData.width >= 3000 && coverData.height >= 3000) || false,
              thumbnail: (coverData.width >= 200 && coverData.height >= 200) || false
            },
            qualityBadge: coverData.qualityBadge,
            
            // Fingerprinting
            fingerprint: coverData.fingerprint,
            
            // Metadata extraction info
            metadata: coverData.metadata,
            metadataExtractedAt: coverData.metadata?.extractedAt || new Date().toISOString()
          }
        }
      }
      
      return await this.updateRelease(releaseId, updates)
    } catch (error) {
      console.error('Error updating cover art:', error)
      throw error
    }
  }

  /**
   * Update multiple assets metadata at once
   */
  async updateAssetsMetadata(releaseId, assetsData) {
    try {
      const release = await this.getRelease(releaseId)
      const existingAssets = release.assets || {}
      
      const updates = {
        assets: {
          ...existingAssets,
          ...cleanForFirestore(assetsData)
        }
      }
      
      return await this.updateRelease(releaseId, updates)
    } catch (error) {
      console.error('Error updating assets metadata:', error)
      throw error
    }
  }

  /**
   * Get release statistics including metadata quality
   */
  async getReleaseStats(releaseId) {
    try {
      const release = await this.getRelease(releaseId)
      
      const stats = {
        totalTracks: release.tracks?.length || 0,
        tracksWithAudio: 0,
        tracksWithHighResAudio: 0,
        tracksWithLosslessAudio: 0,
        tracksWithMetadata: 0,
        hasCoverArt: false,
        coverArtMeetsRequirements: false,
        totalFileSize: 0,
        averageBitrate: 0,
        averageSampleRate: 0
      }
      
      // Calculate track statistics
      if (release.tracks) {
        let totalBitrate = 0
        let totalSampleRate = 0
        let bitrateCount = 0
        let sampleRateCount = 0
        
        release.tracks.forEach(track => {
          if (track.audio?.url) {
            stats.tracksWithAudio++
            
            if (track.audio.isHighResolution) {
              stats.tracksWithHighResAudio++
            }
            
            if (track.audio.lossless) {
              stats.tracksWithLosslessAudio++
            }
            
            if (track.audio.metadata) {
              stats.tracksWithMetadata++
            }
            
            if (track.audio.fileSize) {
              stats.totalFileSize += track.audio.fileSize
            }
            
            if (track.audio.bitrate) {
              totalBitrate += track.audio.bitrate
              bitrateCount++
            }
            
            if (track.audio.sampleRate) {
              totalSampleRate += track.audio.sampleRate
              sampleRateCount++
            }
          }
        })
        
        if (bitrateCount > 0) {
          stats.averageBitrate = Math.round(totalBitrate / bitrateCount)
        }
        
        if (sampleRateCount > 0) {
          stats.averageSampleRate = Math.round(totalSampleRate / sampleRateCount)
        }
      }
      
      // Check cover art
      if (release.assets?.coverImage?.url) {
        stats.hasCoverArt = true
        stats.coverArtMeetsRequirements = release.assets.coverImage.meetsRequirements?.coverArt || false
        
        if (release.assets.coverImage.size) {
          stats.totalFileSize += release.assets.coverImage.size
        }
      }
      
      return stats
    } catch (error) {
      console.error('Error getting release stats:', error)
      throw error
    }
  }

  /**
   * Validate release has all required metadata for distribution
   */
  async validateReleaseMetadata(releaseId) {
    try {
      const release = await this.getRelease(releaseId)
      const errors = []
      const warnings = []
      
      // Check basic information
      if (!release.basic?.title) errors.push('Release title is required')
      if (!release.basic?.displayArtist) errors.push('Display artist is required')
      if (!release.basic?.releaseDate) errors.push('Release date is required')
      if (!release.basic?.barcode) errors.push('Barcode (UPC/EAN) is required')
      
      // Check cover art
      if (!release.assets?.coverImage?.url) {
        errors.push('Cover image is required')
      } else if (!release.assets.coverImage.meetsRequirements?.coverArt) {
        warnings.push('Cover image does not meet 3000x3000 minimum resolution')
      }
      
      // Check tracks
      if (!release.tracks || release.tracks.length === 0) {
        errors.push('At least one track is required')
      } else {
        release.tracks.forEach((track, index) => {
          const trackNum = index + 1
          
          if (!track.title) {
            errors.push(`Track ${trackNum}: Title is required`)
          }
          
          if (!track.audio?.url) {
            errors.push(`Track ${trackNum}: Audio file is required`)
          } else {
            // Check audio quality
            if (track.audio.bitrate && track.audio.bitrate < 128000) {
              warnings.push(`Track ${trackNum}: Low bitrate detected (${Math.round(track.audio.bitrate / 1000)} kbps)`)
            }
            
            if (!track.audio.metadata) {
              warnings.push(`Track ${trackNum}: Missing technical metadata`)
            }
          }
          
          if (!track.isrc) {
            warnings.push(`Track ${trackNum}: ISRC code is recommended`)
          }
        })
      }
      
      // Check metadata
      if (!release.metadata?.genre && !release.metadata?.genreCode) {
        warnings.push('Genre classification is recommended')
      }
      
      if (!release.metadata?.copyright) {
        errors.push('Copyright information is required')
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        readyForDistribution: errors.length === 0 && warnings.length === 0
      }
    } catch (error) {
      console.error('Error validating release:', error)
      throw error
    }
  }
}

export default new CatalogService()