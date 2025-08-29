// src/composables/useArtists.js
import { ref, computed } from 'vue'
import artistsService from '../services/artists'
import { useAuth } from './useAuth'

// Global artists state
const artists = ref([])
const currentArtist = ref(null)
const isLoading = ref(false)
const error = ref(null)

export function useArtists() {
  const { user } = useAuth()

  /**
   * Load all artists for the current user
   */
  const loadArtists = async (options = {}) => {
    if (!user.value) return
    
    isLoading.value = true
    error.value = null
    
    try {
      const data = await artistsService.getUserArtists(user.value.uid, options)
      artists.value = data
      return data
    } catch (err) {
      error.value = err.message
      console.error('Error loading artists:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new artist
   */
  const createArtist = async (artistData) => {
    if (!user.value) throw new Error('User not authenticated')
    
    isLoading.value = true
    error.value = null
    
    try {
      const artist = await artistsService.createArtist(artistData, user.value.uid)
      artists.value.unshift(artist)
      currentArtist.value = artist
      return artist
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update an artist
   */
  const updateArtist = async (artistId, updates) => {
    isLoading.value = true
    error.value = null
    
    try {
      const updated = await artistsService.updateArtist(artistId, updates)
      
      // Update in local state
      const index = artists.value.findIndex(a => a.id === artistId)
      if (index !== -1) {
        artists.value[index] = { ...artists.value[index], ...updated }
      }
      
      if (currentArtist.value?.id === artistId) {
        currentArtist.value = { ...currentArtist.value, ...updated }
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
   * Delete an artist
   */
  const deleteArtist = async (artistId) => {
    isLoading.value = true
    error.value = null
    
    try {
      await artistsService.deleteArtist(artistId)
      artists.value = artists.value.filter(a => a.id !== artistId)
      
      if (currentArtist.value?.id === artistId) {
        currentArtist.value = null
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
   * Load a single artist
   */
  const loadArtist = async (artistId) => {
    isLoading.value = true
    error.value = null
    
    try {
      const artist = await artistsService.getArtist(artistId)
      currentArtist.value = artist
      return artist
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Search artists
   */
  const searchArtists = async (searchTerm) => {
    if (!user.value) return []
    
    try {
      return await artistsService.searchArtists(searchTerm, user.value.uid)
    } catch (err) {
      console.error('Error searching artists:', err)
      return []
    }
  }

  /**
   * Validate external IDs
   */
  const validateExternalId = async (platform, externalId, excludeArtistId = null) => {
    if (!externalId) return true
    
    try {
      const exists = await artistsService.checkExternalIdExists(platform, externalId, excludeArtistId)
      return !exists
    } catch (err) {
      console.error('Error validating external ID:', err)
      return false
    }
  }

  // Computed properties
  const individualArtists = computed(() => 
    artists.value.filter(a => a.type === 'individual')
  )
  
  const groupArtists = computed(() => 
    artists.value.filter(a => a.type === 'group')
  )
  
  const activeArtists = computed(() => 
    artists.value.filter(a => a.status === 'active')
  )
  
  const artistCount = computed(() => artists.value.length)

  return {
    // State
    artists: computed(() => artists.value),
    currentArtist: computed(() => currentArtist.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    
    // Computed
    individualArtists,
    groupArtists,
    activeArtists,
    artistCount,
    
    // Methods
    loadArtists,
    loadArtist,
    createArtist,
    updateArtist,
    deleteArtist,
    searchArtists,
    validateExternalId
  }
}