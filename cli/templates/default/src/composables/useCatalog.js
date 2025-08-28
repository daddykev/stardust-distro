// src/composables/useCatalog.js
import { ref, computed } from 'vue'
import catalogService from '../services/catalog'
import assetService from '../services/assets'
import { useAuth } from './useAuth'

// Global catalog state
const releases = ref([])
const currentRelease = ref(null)
const isLoading = ref(false)
const error = ref(null)

export function useCatalog() {
  const { user } = useAuth()

  /**
   * Load all releases for the current user
   */
  const loadReleases = async (options = {}) => {
    if (!user.value) return
    
    isLoading.value = true
    error.value = null
    
    try {
      const data = await catalogService.getUserReleases(user.value.uid, options)
      releases.value = data
      return data
    } catch (err) {
      error.value = err.message
      console.error('Error loading releases:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new release
   */
  const createRelease = async (releaseData) => {
    if (!user.value) throw new Error('User not authenticated')
    
    isLoading.value = true
    error.value = null
    
    try {
      const release = await catalogService.createRelease(releaseData, user.value.uid)
      releases.value.unshift(release)
      currentRelease.value = release
      return release
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update a release
   */
  const updateRelease = async (releaseId, updates) => {
    isLoading.value = true
    error.value = null
    
    try {
      const updated = await catalogService.updateRelease(releaseId, updates)
      
      // Update in local state
      const index = releases.value.findIndex(r => r.id === releaseId)
      if (index !== -1) {
        releases.value[index] = { ...releases.value[index], ...updated }
      }
      
      if (currentRelease.value?.id === releaseId) {
        currentRelease.value = { ...currentRelease.value, ...updated }
      }
      
      return updated
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Save release as draft
   */
  const saveDraft = async (releaseData, releaseId = null) => {
    if (!user.value) throw new Error('User not authenticated')
    
    isLoading.value = true
    error.value = null
    
    try {
      const draft = await catalogService.saveDraft(releaseData, user.value.uid, releaseId)
      
      if (releaseId) {
        // Update existing
        const index = releases.value.findIndex(r => r.id === releaseId)
        if (index !== -1) {
          releases.value[index] = draft
        }
      } else {
        // Add new
        releases.value.unshift(draft)
      }
      
      currentRelease.value = draft
      return draft
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete a release
   */
  const deleteRelease = async (releaseId) => {
    isLoading.value = true
    error.value = null
    
    try {
      await catalogService.deleteRelease(releaseId)
      releases.value = releases.value.filter(r => r.id !== releaseId)
      
      if (currentRelease.value?.id === releaseId) {
        currentRelease.value = null
      }
      
      return true
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load a single release
   */
  const loadRelease = async (releaseId) => {
    isLoading.value = true
    error.value = null
    
    try {
      const release = await catalogService.getRelease(releaseId)
      currentRelease.value = release
      return release
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Upload cover image
   */
  const uploadCoverImage = async (file, releaseId) => {
    if (!user.value) throw new Error('User not authenticated')
    
    try {
      const result = await assetService.uploadCoverImage(
        file, 
        user.value.uid, 
        releaseId
      )
      
      // Update release with cover image
      await updateRelease(releaseId, {
        'assets.coverImage': result
      })
      
      return result
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  /**
   * Upload audio file for a track
   */
  const uploadTrackAudio = async (file, releaseId, trackId, onProgress = null) => {
    if (!user.value) throw new Error('User not authenticated')
    
    try {
      const result = await assetService.uploadAudioFile(
        file, 
        user.value.uid, 
        releaseId, 
        trackId,
        onProgress
      )
      
      // Update track with audio file info
      await catalogService.updateTrack(releaseId, trackId, {
        audio: {
          fileId: result.path,
          url: result.url,
          format: result.format,
          duration: result.duration,
          size: result.size
        }
      })
      
      return result
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Track management
  const addTrack = async (releaseId, trackData) => {
    try {
      const track = await catalogService.addTrack(releaseId, trackData)
      
      // Update local state
      if (currentRelease.value?.id === releaseId) {
        if (!currentRelease.value.tracks) {
          currentRelease.value.tracks = []
        }
        currentRelease.value.tracks.push(track)
      }
      
      return track
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updateTrack = async (releaseId, trackId, updates) => {
    try {
      const track = await catalogService.updateTrack(releaseId, trackId, updates)
      
      // Update local state
      if (currentRelease.value?.id === releaseId) {
        const index = currentRelease.value.tracks?.findIndex(t => t.id === trackId)
        if (index !== -1) {
          currentRelease.value.tracks[index] = track
        }
      }
      
      return track
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const removeTrack = async (releaseId, trackId) => {
    try {
      await catalogService.removeTrack(releaseId, trackId)
      
      // Update local state
      if (currentRelease.value?.id === releaseId) {
        currentRelease.value.tracks = currentRelease.value.tracks?.filter(t => t.id !== trackId)
      }
      
      return true
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const reorderTracks = async (releaseId, trackIds) => {
    try {
      const tracks = await catalogService.reorderTracks(releaseId, trackIds)
      
      // Update local state
      if (currentRelease.value?.id === releaseId) {
        currentRelease.value.tracks = tracks
      }
      
      return tracks
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // Computed properties
  const draftReleases = computed(() => 
    releases.value.filter(r => r.status === 'draft')
  )
  
  const publishedReleases = computed(() => 
    releases.value.filter(r => r.status === 'ready' || r.status === 'delivered')
  )
  
  const releaseCount = computed(() => releases.value.length)

  return {
    // State
    releases: computed(() => releases.value),
    currentRelease: computed(() => currentRelease.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    
    // Computed
    draftReleases,
    publishedReleases,
    releaseCount,
    
    // Methods
    loadReleases,
    loadRelease,
    createRelease,
    updateRelease,
    saveDraft,
    deleteRelease,
    uploadCoverImage,
    uploadTrackAudio,
    
    // Track management
    addTrack,
    updateTrack,
    removeTrack,
    reorderTracks
  }
}