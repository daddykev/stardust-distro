<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'
import { useAuth } from '../composables/useAuth'
import GenreSelector from '../components/GenreSelector.vue'
import { getGenreByCode } from '../dictionaries/genres'
import ernService from '../services/ern'
import meadService from '../services/mead'
import { 
  ContributorCategories,
  searchContributorRoles,
  categorizeRole
} from '../dictionaries/contributors'
import {
  MoodCategories,
  MusicalKeys,
  TimeSignatures,
  VocalRegisters,
  VocalCharacteristics,
  InstrumentCategories,
  TempoDescriptions,
  PlaylistSuitability,
  Seasonality,
  RecordingTechniques,
  AudioCharacteristics,
  defaultMeadData
} from '../dictionaries/mead'

const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const { 
  updateRelease,
  loadRelease,
  uploadCoverImage,
  uploadTrackAudio,
  currentRelease,
  isLoading,
  error 
} = useCatalog()

// Release ID from route
const releaseId = ref(route.params.id)

// UI State
const expandedSections = ref({
  basic: true, // Start with basic info expanded
  tracks: false,
  assets: false,
  metadata: false,
  mead: false,
  territories: false,
  ern: false  // Add ERN section
})

// Track which sections have been modified
const modifiedSections = ref(new Set())

// Form data - will be populated from existing release
const releaseData = ref({
  basic: {
    title: '',
    displayArtist: '',
    type: 'Album',
    label: '',
    catalogNumber: '',
    barcode: '',
    releaseDate: '',
    originalReleaseDate: ''
  },
  tracks: [],
  assets: {
    coverImage: null,
    additionalImages: []
  },
  metadata: {
    genre: '',
    genreCode: '',
    genreName: '',
    subgenre: '',
    subgenreCode: '',
    subgenreName: '',
    language: 'en',
    copyright: '',
    copyrightYear: new Date().getFullYear(),
    productionYear: new Date().getFullYear()
  },
  // Enhanced MEAD section with complete structure
  mead: { ...defaultMeadData },
  territories: {
    mode: 'worldwide',
    included: [],
    excluded: []
  },
  // Add ERN section
  ern: {
    version: '4.3',
    profile: 'AudioAlbum',
    validated: false,
    lastGeneratedAt: null,
    lastMessageId: null
  }
})

// Original data for comparison
const originalData = ref(null)

// Auto-save functionality
const autoSaveTimer = ref(null)
const lastSavedAt = ref(null)
const isSaving = ref(false)
const saveError = ref(null)

const generatedMEAD = ref(null)
const showMEADPreview = ref(false)

// Validation
const validationErrors = ref({
  basic: [],
  tracks: [],
  assets: [],
  metadata: [],
  mead: [],
  territories: [],
  ern: []  // Add ERN validation errors
})

// Upload progress tracking
const uploadProgress = ref({})

// Contributor modal state
const contributorModal = ref({
  show: false,
  trackIndex: null,
  name: '',
  role: '',
  category: ContributorCategories.PERFORMER,
  roleSearch: '',
  searchResults: [],
  error: null
})

// ERN generation state
const isGeneratingERN = ref(false)
const isValidatingERN = ref(false)
const ernError = ref(null)
const generatedERN = ref(null)
const showERNPreview = ref(false)

// Category labels for UI
const contributorCategories = {
  [ContributorCategories.PERFORMER]: 'Performer',
  [ContributorCategories.PRODUCER_ENGINEER]: 'Producer/Engineer',
  [ContributorCategories.COMPOSER_LYRICIST]: 'Composer/Lyricist'
}

// Computed properties
const hasChanges = computed(() => {
  if (!originalData.value) return false
  return JSON.stringify(releaseData.value) !== JSON.stringify(originalData.value)
})

const canSave = computed(() => {
  return hasChanges.value && !isSaving.value && releaseData.value.basic.title
})

// Computed property for display genre name
const displayGenreName = computed(() => {
  // Check for subgenre first (more specific)
  if (releaseData.value.metadata.subgenreName) {
    return releaseData.value.metadata.subgenreName
  }
  if (releaseData.value.metadata.subgenreCode) {
    const subgenre = getGenreByCode(releaseData.value.metadata.subgenreCode, 'genre-truth')
    return subgenre?.name || releaseData.value.metadata.subgenre
  }
  
  // Then check parent genre
  if (releaseData.value.metadata.genreName) {
    return releaseData.value.metadata.genreName
  }
  if (releaseData.value.metadata.genreCode) {
    const genre = getGenreByCode(releaseData.value.metadata.genreCode, 'genre-truth')
    return genre?.name || releaseData.value.metadata.genre
  }
  
  // Fallback to old fields
  return releaseData.value.metadata.subgenre || releaseData.value.metadata.genre || 'No genre set'
})

// Section completion status - Updated to include ERN
const sectionStatus = computed(() => {
  return {
    basic: {
      complete: !!(releaseData.value.basic.title && releaseData.value.basic.displayArtist && releaseData.value.basic.barcode),
      summary: `${releaseData.value.basic.type} • ${formatDate(releaseData.value.basic.releaseDate)}`,
      errors: validationErrors.value.basic.length
    },
    tracks: {
      complete: releaseData.value.tracks.length > 0 && releaseData.value.tracks.every(t => t.audio),
      summary: `${releaseData.value.tracks.length} tracks`,
      errors: validationErrors.value.tracks.length,
      warnings: releaseData.value.tracks.filter(t => !t.audio).length
    },
    assets: {
      complete: !!releaseData.value.assets.coverImage,
      summary: releaseData.value.assets.coverImage ? 'Cover uploaded' : 'No cover',
      errors: validationErrors.value.assets.length
    },
    metadata: {
      complete: !!(
        (releaseData.value.metadata.genreCode || releaseData.value.metadata.subgenreCode || 
         releaseData.value.metadata.genre || releaseData.value.metadata.subgenre) && 
        releaseData.value.metadata.copyright
      ),
      summary: displayGenreName.value,
      errors: validationErrors.value.metadata.length
    },
    mead: {
      complete: !!(
        releaseData.value.mead.moods.length > 0 || 
        releaseData.value.mead.tempo || 
        releaseData.value.mead.instrumentation.length > 0 ||
        releaseData.value.mead.playlistSuitability.length > 0
      ),
      summary: getMeadSummary(),
      errors: validationErrors.value.mead?.length || 0,
      hasData: !!(
        releaseData.value.mead.moods?.length > 0 ||
        releaseData.value.mead.tempo ||
        releaseData.value.mead.instrumentation?.length > 0
      )
    },
    territories: {
      complete: true, // Territories are optional
      summary: releaseData.value.territories.mode === 'worldwide' ? 'Worldwide' : 'Selected territories',
      errors: validationErrors.value.territories.length
    },
    // Add ERN status with MEAD info
    ern: {
      complete: releaseData.value.ern.validated,
      summary: releaseData.value.ern.lastGeneratedAt 
        ? `Generated ${formatDate(releaseData.value.ern.lastGeneratedAt)}${generatedMEAD.value ? ' (with MEAD)' : ''}` 
        : 'Not generated',
      errors: ernError.value ? 1 : 0,
      hasMEAD: !!generatedMEAD.value
    }
  }
})

// Check if release is ready for delivery
const isReadyForDelivery = computed(() => {
  return sectionStatus.value.basic.complete && 
         sectionStatus.value.tracks.complete && 
         sectionStatus.value.assets.complete && 
         sectionStatus.value.metadata.complete &&
         releaseData.value.ern.validated
})

// MEAD summary helper
const getMeadSummary = () => {
  const parts = []
  if (releaseData.value.mead.moods.length > 0) {
    parts.push(`${releaseData.value.mead.moods.length} mood${releaseData.value.mead.moods.length === 1 ? '' : 's'}`)
  }
  if (releaseData.value.mead.tempo) {
    parts.push(`${releaseData.value.mead.tempo} BPM`)
  }
  if (releaseData.value.mead.instrumentation.length > 0) {
    parts.push(`${releaseData.value.mead.instrumentation.length} instrument${releaseData.value.mead.instrumentation.length === 1 ? '' : 's'}`)
  }
  if (releaseData.value.mead.playlistSuitability.length > 0) {
    parts.push(`${releaseData.value.mead.playlistSuitability.length} playlist${releaseData.value.mead.playlistSuitability.length === 1 ? '' : 's'}`)
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Rich metadata for DSP curation and discovery'
}

// Watch for changes to enable auto-save
watch(releaseData, (newValue) => {
  if (originalData.value && JSON.stringify(newValue) !== JSON.stringify(originalData.value)) {
    scheduleAutoSave()
  }
}, { deep: true })

// Watch genre code changes and update names
watch(() => releaseData.value.metadata.genreCode, (newCode) => {
  console.log('Genre code changed:', newCode)
  if (newCode) {
    const genre = getGenreByCode(newCode, 'genre-truth')
    if (genre) {
      releaseData.value.metadata.genreName = genre.name
      releaseData.value.metadata.genre = genre.name // For backward compatibility
      modifiedSections.value.add('metadata')
    }
  } else {
    releaseData.value.metadata.genreName = ''
    releaseData.value.metadata.genre = ''
  }
}, { immediate: true })

watch(() => releaseData.value.metadata.subgenreCode, (newCode) => {
  console.log('Subgenre code changed:', newCode)
  if (newCode) {
    const subgenre = getGenreByCode(newCode, 'genre-truth')
    if (subgenre) {
      releaseData.value.metadata.subgenreName = subgenre.name
      releaseData.value.metadata.subgenre = subgenre.name // For backward compatibility
      modifiedSections.value.add('metadata')
    }
  } else {
    releaseData.value.metadata.subgenreName = ''
    releaseData.value.metadata.subgenre = ''
  }
}, { immediate: true })

// Load release data on mount
onMounted(async () => {
  try {
    isLoading.value = true
    await loadRelease(releaseId.value)
    
    if (currentRelease.value) {
      // Populate form with existing data
      releaseData.value = {
        basic: { ...releaseData.value.basic, ...(currentRelease.value.basic || {}) },
        tracks: currentRelease.value.tracks || [],
        assets: { ...releaseData.value.assets, ...(currentRelease.value.assets || {}) },
        metadata: { ...releaseData.value.metadata, ...(currentRelease.value.metadata || {}) },
        mead: { ...defaultMeadData, ...(currentRelease.value.mead || {}) },
        territories: { ...releaseData.value.territories, ...(currentRelease.value.territories || {}) },
        ern: { ...releaseData.value.ern, ...(currentRelease.value.ern || {}) }
      }
      
      // ADD THIS DEBUG CODE:
      console.log('🎵 === EditRelease: Loaded Release Data ===')
      console.log('Release ID:', releaseId.value)
      console.log('Tracks loaded:', releaseData.value.tracks.length)
      releaseData.value.tracks.forEach((track, index) => {
        console.log(`Track ${index + 1}:`, {
          title: track.title,
          isrc: track.isrc || 'NO ISRC',
          artist: track.artist,
          sequenceNumber: track.sequenceNumber
        })
      })
      console.log('Full tracks data:', JSON.stringify(releaseData.value.tracks, null, 2))
      // END DEBUG CODE
      
      // Ensure all tracks have contributors array
      releaseData.value.tracks.forEach(track => {
        if (!track.contributors) {
          track.contributors = []
        }
      })
      
      // Store original data for comparison
      originalData.value = JSON.parse(JSON.stringify(releaseData.value))
    } else {
      throw new Error('Release not found')
    }
  } catch (err) {
    console.error('Error loading release:', err)
    error.value = err.message || 'Failed to load release'
  } finally {
    isLoading.value = false
  }
})

// Clean up on unmount
onBeforeUnmount(() => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
})

// Methods
const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section]
}

const expandAll = () => {
  Object.keys(expandedSections.value).forEach(key => {
    expandedSections.value[key] = true
  })
}

const collapseAll = () => {
  Object.keys(expandedSections.value).forEach(key => {
    expandedSections.value[key] = false
  })
}

const scheduleAutoSave = () => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  
  autoSaveTimer.value = setTimeout(() => {
    autoSave()
  }, 2000) // Auto-save after 2 seconds of inactivity
}

const autoSave = async () => {
  if (!hasChanges.value || isSaving.value) return
  
  try {
    isSaving.value = true
    saveError.value = null
    
    // Clean the data for Firestore
    const cleanedData = cleanDataForFirestore(releaseData.value)
    await updateRelease(releaseId.value, cleanedData)
    
    originalData.value = JSON.parse(JSON.stringify(releaseData.value))
    lastSavedAt.value = new Date()
    modifiedSections.value.clear()
  } catch (err) {
    console.error('Auto-save failed:', err)
    saveError.value = 'Auto-save failed. Your changes are preserved locally.'
  } finally {
    isSaving.value = false
  }
}

const saveChanges = async () => {
  if (!canSave.value) return
  
  try {
    isSaving.value = true
    saveError.value = null
    
    // ADD THIS DEBUG:
    console.log('🔄 === Saving Release Changes ===')
    console.log('Tracks being saved:')
    releaseData.value.tracks.forEach((track, index) => {
      console.log(`  Track ${index + 1}: ISRC = ${track.isrc || 'NONE'}`)
    })
    // END DEBUG
    
    const cleanedData = cleanDataForFirestore(releaseData.value)
    await updateRelease(releaseId.value, cleanedData)
    
    originalData.value = JSON.parse(JSON.stringify(releaseData.value))
    lastSavedAt.value = new Date()
    modifiedSections.value.clear()
    
    showToast('Changes saved successfully', 'success')
  } catch (err) {
    console.error('Error saving changes:', err)
    saveError.value = err.message || 'Failed to save changes'
    showToast('Failed to save changes', 'error')
  } finally {
    isSaving.value = false
  }
}

const discardChanges = () => {
  if (!hasChanges.value) return
  
  if (confirm('Are you sure you want to discard all unsaved changes?')) {
    releaseData.value = JSON.parse(JSON.stringify(originalData.value))
    modifiedSections.value.clear()
    showToast('Changes discarded', 'info')
  }
}

const cleanDataForFirestore = (data) => {
  const deepClean = (obj) => {
    if (obj === null || obj === undefined) return null
    if (obj instanceof Date) return obj
    if (obj instanceof File) return null
    if (Array.isArray(obj)) {
      return obj.map(item => deepClean(item)).filter(item => item !== undefined)
    }
    if (typeof obj === 'object') {
      const cleaned = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          const cleanedValue = deepClean(value)
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue
          }
        }
      }
      return cleaned
    }
    return obj
  }
  
  return deepClean(data)
}

// Track management
const handleAddTrack = () => {
  const newTrack = {
    id: Date.now().toString(),
    sequenceNumber: releaseData.value.tracks.length + 1,
    title: `Track ${releaseData.value.tracks.length + 1}`,
    artist: releaseData.value.basic.displayArtist,
    duration: 0,
    isrc: '',
    audio: null,
    contributors: [] // Add empty contributors array
  }
  
  releaseData.value.tracks.push(newTrack)
  modifiedSections.value.add('tracks')
}

const handleUpdateTrack = (index, updates) => {
  // ADD THIS DEBUG:
  console.log(`Updating track ${index}:`, updates)
  if (updates.isrc !== undefined) {
    console.log(`  ISRC update: "${releaseData.value.tracks[index].isrc}" -> "${updates.isrc}"`)
  }
  // END DEBUG
  
  Object.assign(releaseData.value.tracks[index], updates)
  modifiedSections.value.add('tracks')
}

const handleRemoveTrack = (index) => {
  if (confirm(`Remove "${releaseData.value.tracks[index].title}"?`)) {
    releaseData.value.tracks.splice(index, 1)
    // Resequence remaining tracks
    releaseData.value.tracks.forEach((track, i) => {
      track.sequenceNumber = i + 1
    })
    modifiedSections.value.add('tracks')
  }
}

// MEAD Methods
const addMood = (mood) => {
  if (!releaseData.value.mead.moods.includes(mood)) {
    releaseData.value.mead.moods.push(mood)
    modifiedSections.value.add('mead')
  }
}

const removeMood = (mood) => {
  const index = releaseData.value.mead.moods.indexOf(mood)
  if (index > -1) {
    releaseData.value.mead.moods.splice(index, 1)
    modifiedSections.value.add('mead')
  }
}

const addInstrument = (instrument) => {
  if (!releaseData.value.mead.instrumentation.includes(instrument)) {
    releaseData.value.mead.instrumentation.push(instrument)
    modifiedSections.value.add('mead')
  }
}

const removeInstrument = (instrument) => {
  const index = releaseData.value.mead.instrumentation.indexOf(instrument)
  if (index > -1) {
    releaseData.value.mead.instrumentation.splice(index, 1)
    modifiedSections.value.add('mead')
  }
}

const togglePlaylistSuitability = (playlist) => {
  const index = releaseData.value.mead.playlistSuitability.indexOf(playlist)
  if (index > -1) {
    releaseData.value.mead.playlistSuitability.splice(index, 1)
  } else {
    releaseData.value.mead.playlistSuitability.push(playlist)
  }
  modifiedSections.value.add('mead')
}

const toggleVocalCharacteristic = (characteristic) => {
  const index = releaseData.value.mead.vocalCharacteristics.indexOf(characteristic)
  if (index > -1) {
    releaseData.value.mead.vocalCharacteristics.splice(index, 1)
  } else {
    releaseData.value.mead.vocalCharacteristics.push(characteristic)
  }
  modifiedSections.value.add('mead')
}

const setFocusTrack = (trackId) => {
  releaseData.value.mead.focusTrack = trackId
  modifiedSections.value.add('mead')
}

// Track-level MEAD methods
const setTrackMead = (trackIndex, meadData) => {
  const track = releaseData.value.tracks[trackIndex]
  if (!releaseData.value.mead.trackMead[track.id]) {
    releaseData.value.mead.trackMead[track.id] = {}
  }
  Object.assign(releaseData.value.mead.trackMead[track.id], meadData)
  modifiedSections.value.add('mead')
}

const getTrackMead = (trackId) => {
  return releaseData.value.mead.trackMead[trackId] || {}
}

const toggleTrackMood = (trackIndex, mood) => {
  const track = releaseData.value.tracks[trackIndex]
  const trackMoods = getTrackMead(track.id).moods || []
  
  if (trackMoods.includes(mood)) {
    setTrackMead(trackIndex, { moods: trackMoods.filter(m => m !== mood) })
  } else {
    setTrackMead(trackIndex, { moods: [...trackMoods, mood] })
  }
}

// Contributor management
const showContributorModal = (trackIndex) => {
  contributorModal.value = {
    show: true,
    trackIndex,
    name: '',
    role: '',
    category: ContributorCategories.PERFORMER,
    roleSearch: '',
    searchResults: [],
    error: null
  }
}

const closeContributorModal = () => {
  contributorModal.value.show = false
}

const searchRoles = () => {
  const query = contributorModal.value.roleSearch
  if (query.length < 2) {
    contributorModal.value.searchResults = []
    return
  }
  
  contributorModal.value.searchResults = searchContributorRoles(
    query,
    contributorModal.value.category
  )
}

const selectRole = (role) => {
  contributorModal.value.role = role
  contributorModal.value.roleSearch = ''
  contributorModal.value.searchResults = []
}

const getCommonRoles = (category) => {
  switch (category) {
    case ContributorCategories.PERFORMER:
      return ['Vocals', 'Guitar', 'Bass Guitar', 'Drums', 'Keyboard', 'Piano']
    case ContributorCategories.PRODUCER_ENGINEER:
      return ['Producer', 'Mix Engineer', 'Mastering Engineer', 'Recording Engineer']
    case ContributorCategories.COMPOSER_LYRICIST:
      return ['Composer', 'Lyricist', 'Songwriter', 'Arranger']
    default:
      return []
  }
}

const addContributor = () => {
  const { trackIndex, name, role } = contributorModal.value
  
  if (!name || !role) {
    contributorModal.value.error = 'Please enter both name and role'
    return
  }
  
  const track = releaseData.value.tracks[trackIndex]
  if (!track.contributors) {
    track.contributors = []
  }
  
  // Check for duplicates
  const exists = track.contributors.some(c => 
    c.name === name && c.role === role
  )
  
  if (exists) {
    contributorModal.value.error = 'This contributor has already been added'
    return
  }
  
  track.contributors.push({
    name: name.trim(),
    role: role,
    category: categorizeRole(role)
  })
  
  modifiedSections.value.add('tracks')
  closeContributorModal()
}

const removeContributor = (trackIndex, contributorIndex) => {
  const track = releaseData.value.tracks[trackIndex]
  if (track.contributors) {
    track.contributors.splice(contributorIndex, 1)
    modifiedSections.value.add('tracks')
  }
}

const getCategoryClass = (role) => {
  const category = categorizeRole(role)
  switch (category) {
    case ContributorCategories.PERFORMER:
      return 'performer'
    case ContributorCategories.PRODUCER_ENGINEER:
      return 'producer'
    case ContributorCategories.COMPOSER_LYRICIST:
      return 'composer'
    default:
      return 'unknown'
  }
}

const formatCategoryName = (category) => {
  return contributorCategories[category] || 'Unknown'
}

const clearContributorError = () => {
  contributorModal.value.error = null
}

// File upload handlers
const handleCoverImageUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file', 'error')
    return
  }
  
  try {
    uploadProgress.value.cover = 0
    const result = await uploadCoverImage(file, releaseId.value)
    releaseData.value.assets.coverImage = result
    modifiedSections.value.add('assets')
    showToast('Cover image uploaded successfully', 'success')
  } catch (err) {
    console.error('Error uploading cover:', err)
    showToast('Failed to upload cover image', 'error')
  } finally {
    delete uploadProgress.value.cover
  }
}

const handleAudioUpload = async (event, trackIndex) => {
  const file = event.target.files[0]
  if (!file) return
  
  const track = releaseData.value.tracks[trackIndex]
  
  const validFormats = ['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mpeg', 'audio/mp3']
  if (!validFormats.includes(file.type)) {
    showToast('Please upload WAV, FLAC, or MP3 files', 'error')
    return
  }
  
  try {
    uploadProgress.value[`track_${track.id}`] = 0
    
    const result = await uploadTrackAudio(
      file,
      releaseId.value,
      track.id,
      (progress) => {
        uploadProgress.value[`track_${track.id}`] = progress
      }
    )
    
    track.audio = result
    modifiedSections.value.add('tracks')
    showToast(`Audio uploaded for "${track.title}"`, 'success')
  } catch (err) {
    console.error('Error uploading audio:', err)
    showToast('Failed to upload audio file', 'error')
  } finally {
    delete uploadProgress.value[`track_${track.id}`]
  }
}

// ERN Methods
const validateERN = async () => {
  isValidatingERN.value = true
  ernError.value = null
  
  try {
    // Validate all required fields
    const errors = []
    
    // Basic validation
    if (!releaseData.value.basic.title) errors.push('Release title is required')
    if (!releaseData.value.basic.displayArtist) errors.push('Display artist is required')
    if (!releaseData.value.basic.barcode) errors.push('Barcode is required')
    if (!releaseData.value.basic.releaseDate) errors.push('Release date is required')
    
    // Tracks validation
    if (releaseData.value.tracks.length === 0) {
      errors.push('At least one track is required')
    } else {
      releaseData.value.tracks.forEach((track, index) => {
        if (!track.title) errors.push(`Track ${index + 1}: Title is required`)
        if (!track.audio) errors.push(`Track ${index + 1}: Audio file is required`)
      })
    }
    
    // Assets validation
    if (!releaseData.value.assets.coverImage) {
      errors.push('Cover image is required')
    }
    
    // Metadata validation
    const hasGenre = !!(
      releaseData.value.metadata.genreCode || 
      releaseData.value.metadata.subgenreCode ||
      releaseData.value.metadata.genre ||
      releaseData.value.metadata.subgenre
    )
    if (!hasGenre) errors.push('Genre is required')
    if (!releaseData.value.metadata.copyright) errors.push('Copyright information is required')
    
    // MEAD validation (warnings only, not blocking)
    const meadWarnings = []
    if (!releaseData.value.mead.moods || releaseData.value.mead.moods.length === 0) {
      meadWarnings.push('Consider adding moods for better discovery')
    }
    if (!releaseData.value.mead.tempo) {
      meadWarnings.push('Consider adding tempo (BPM) for DJ and workout playlists')
    }
    if (!releaseData.value.mead.instrumentation || releaseData.value.mead.instrumentation.length === 0) {
      meadWarnings.push('Consider adding instrumentation for music analysis')
    }
    
    // Show MEAD warnings if any
    if (meadWarnings.length > 0 && errors.length === 0) {
      console.log('MEAD enhancement suggestions:', meadWarnings)
      // Don't block generation, just log suggestions
    }
    
    if (errors.length > 0) {
      ernError.value = errors.join(', ')
      showToast('Validation failed. Please check all required fields.', 'error')
      return false
    }
    
    // In production, this would call DDEX Workbench API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    releaseData.value.ern.validated = true
    showToast('Validation successful!', 'success')
    return true
    
  } catch (err) {
    console.error('Validation error:', err)
    ernError.value = err.message || 'Validation failed'
    showToast('Validation failed', 'error')
    return false
  } finally {
    isValidatingERN.value = false
  }
}

// Complete generateERN function with MEAD integration
const generateERN = async () => {
  // First validate
  const isValid = await validateERN()
  if (!isValid) return
  
  isGeneratingERN.value = true
  ernError.value = null
  
  try {
    // Save any pending changes first
    if (hasChanges.value) {
      await saveChanges()
    }
    
    // Generate ERN using the service
    const result = await ernService.generateERN(releaseId.value, {
      ernVersion: releaseData.value.ern.version,
      profile: releaseData.value.ern.profile,
      testMode: false,
      senderName: user.value?.organizationName || user.value?.displayName,
      senderPartyId: import.meta.env.VITE_DISTRIBUTOR_ID || 'default-sender'
    })
    
    generatedERN.value = result
    releaseData.value.ern.lastGeneratedAt = new Date()
    releaseData.value.ern.lastMessageId = result.messageId
    releaseData.value.ern.validated = true
    
    // Generate MEAD if we have enrichment data
    const hasMeadData = releaseData.value.mead && (
      releaseData.value.mead.moods?.length > 0 ||
      releaseData.value.mead.tempo ||
      releaseData.value.mead.instrumentation?.length > 0 ||
      releaseData.value.mead.playlistSuitability?.length > 0 ||
      releaseData.value.mead.vocalCharacteristics?.length > 0 ||
      releaseData.value.mead.marketingDescription ||
      Object.keys(releaseData.value.mead.trackMead || {}).length > 0
    )
    
    if (hasMeadData) {
      try {
        console.log('Generating MEAD with data:', releaseData.value.mead)
        
        // Prepare release data for MEAD generation
        const releaseForMead = {
          id: releaseId.value,
          basic: releaseData.value.basic,
          tracks: releaseData.value.tracks,
          metadata: releaseData.value.metadata,
          mead: releaseData.value.mead
        }
        
        // Generate MEAD message
        const meadResult = await meadService.generateMEAD(releaseForMead, {
          senderName: user.value?.organizationName || user.value?.displayName,
          senderPartyId: 'stardust-distro',
          recipientName: 'DSP',
          recipientPartyId: 'DSP'
        })
        
        generatedMEAD.value = meadResult
        
        // Store MEAD generation info
        releaseData.value.mead.lastGeneratedAt = new Date()
        releaseData.value.mead.lastMessageId = meadResult.messageId
        releaseData.value.mead.validated = true
        
        console.log('MEAD generated successfully:', meadResult.messageId)
        
        // Show success with MEAD info
        showToast('ERN and MEAD generated successfully! Release is now ready for delivery.', 'success')
      } catch (meadError) {
        console.error('MEAD generation error:', meadError)
        // MEAD generation failure shouldn't block ERN success
        showToast('ERN generated successfully! MEAD generation failed but delivery can proceed.', 'warning')
      }
    } else {
      console.log('No MEAD data available, skipping MEAD generation')
      showToast('ERN generated successfully! Release is now ready for delivery.', 'success')
    }
    
    // Always update release status to 'ready' when ERN is generated successfully
    // This ensures the release is deliverable regardless of previous status
    const updateData = { 
      status: 'ready',
      ern: {
        version: releaseData.value.ern.version,
        profile: releaseData.value.ern.profile,
        validated: true,
        lastGeneratedAt: releaseData.value.ern.lastGeneratedAt,
        lastMessageId: result.messageId
      }
    }
    
    // Add MEAD info if generated
    if (generatedMEAD.value) {
      updateData.mead = {
        ...releaseData.value.mead,
        lastGeneratedAt: releaseData.value.mead.lastGeneratedAt,
        lastMessageId: releaseData.value.mead.lastMessageId,
        validated: true
      }
    }
    
    await updateRelease(releaseId.value, updateData)
    
    // Update the local currentRelease to reflect the new status
    if (currentRelease.value) {
      currentRelease.value.status = 'ready'
      currentRelease.value.ern = updateData.ern
      if (updateData.mead) {
        currentRelease.value.mead = updateData.mead
      }
    }
    
    // Update original data to include the new ERN and MEAD data
    originalData.value = JSON.parse(JSON.stringify(releaseData.value))
    
    modifiedSections.value.add('ern')
    if (generatedMEAD.value) {
      modifiedSections.value.add('mead')
    }
    
    // Log summary
    console.log('Generation complete:', {
      ernMessageId: result.messageId,
      meadMessageId: generatedMEAD.value?.messageId,
      releaseStatus: 'ready',
      hasMEAD: !!generatedMEAD.value
    })
    
  } catch (err) {
    console.error('Error generating ERN:', err)
    ernError.value = err.message || 'Failed to generate ERN'
    showToast('Failed to generate ERN', 'error')
  } finally {
    isGeneratingERN.value = false
  }
}

// Helper functions for MEAD preview/download
const previewMEAD = () => {
  if (generatedMEAD.value) {
    showMEADPreview.value = true
  }
}

const downloadMEAD = () => {
  if (!generatedMEAD.value) return
  
  const blob = new Blob([generatedMEAD.value.mead], { type: 'text/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${releaseData.value.basic.title}_MEAD_${generatedMEAD.value.messageId}.xml`
    .replace(/[^a-z0-9]/gi, '_')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const copyMEADToClipboard = () => {
  if (!generatedMEAD.value) return
  
  navigator.clipboard.writeText(generatedMEAD.value.mead)
    .then(() => {
      showToast('MEAD copied to clipboard!', 'success')
    })
    .catch(err => {
      console.error('Failed to copy:', err)
      showToast('Failed to copy to clipboard', 'error')
    })
}

const previewERN = () => {
  if (generatedERN.value) {
    showERNPreview.value = true
  }
}

const downloadERN = () => {
  if (!generatedERN.value) return
  
  const blob = new Blob([generatedERN.value.ern], { type: 'text/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${releaseData.value.basic.title}_ERN_${generatedERN.value.messageId}.xml`.replace(/[^a-z0-9]/gi, '_')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const copyERNToClipboard = () => {
  if (!generatedERN.value) return
  
  navigator.clipboard.writeText(generatedERN.value.ern)
    .then(() => {
      showToast('ERN copied to clipboard!', 'success')
    })
    .catch(err => {
      console.error('Failed to copy:', err)
      showToast('Failed to copy to clipboard', 'error')
    })
}

const initiateDelivery = () => {
  // Navigate to new delivery with this release pre-selected
  router.push({
    path: '/deliveries/new',
    query: { releaseId: releaseId.value }
  })
}

// Helper functions
const formatDate = (dateValue) => {
  if (!dateValue) return 'No date set'
  
  let date
  
  // Handle Firebase Timestamp
  if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
    date = dateValue.toDate()
  } 
  // Handle string dates
  else if (typeof dateValue === 'string') {
    date = new Date(dateValue)
  } 
  // Handle Date objects
  else if (dateValue instanceof Date) {
    date = dateValue
  }
  // Handle timestamp numbers
  else if (typeof dateValue === 'number') {
    date = new Date(dateValue)
  }
  // Unknown format
  else {
    return 'Invalid date'
  }
  
  // Validate the date is valid
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid date'
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// Toast notification (simple implementation)
const showToast = (message, type = 'info') => {
  // You could integrate with a toast library here
  console.log(`[${type.toUpperCase()}] ${message}`)
}

// Genre handler for GenreSelector updates
const handleGenreUpdate = (value) => {
  console.log('Genre updated:', value)
  releaseData.value.metadata.genreCode = value
  modifiedSections.value.add('metadata')
}

const handleSubgenreUpdate = (value) => {
  console.log('Subgenre updated:', value)
  releaseData.value.metadata.subgenreCode = value
  modifiedSections.value.add('metadata')
}
</script>

<template>
  <div class="edit-release">
    <!-- Simple page header without navigation -->
    <div class="card border-b rounded-none mb-xl">
      <div class="container">
        <div class="flex justify-between items-center flex-wrap gap-lg">
          <div class="flex-1">
            <h1 class="text-2xl font-bold mb-xs">{{ releaseData.basic.title || 'Untitled Release' }}</h1>
            <p class="text-lg text-secondary">{{ releaseData.basic.displayArtist ? `${releaseData.basic.type} by ${releaseData.basic.displayArtist}` : 'Edit Release' }}</p>
          </div>
          
          <div class="flex gap-sm">
            <button 
              v-if="hasChanges"
              @click="discardChanges" 
              class="btn btn-secondary"
            >
              <font-awesome-icon icon="undo" />
              Discard
            </button>
            
            <button 
              @click="saveChanges" 
              class="btn btn-primary"
              :disabled="!canSave"
            >
              <font-awesome-icon v-if="isSaving" icon="spinner" class="fa-spin" />
              <font-awesome-icon v-else icon="save" />
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
        
        <!-- Save status bar -->
        <div v-if="lastSavedAt || saveError" class="mt-md p-sm bg-secondary rounded-md">
          <div v-if="saveError" class="text-error flex items-center gap-xs">
            <font-awesome-icon icon="exclamation-triangle" />
            {{ saveError }}
          </div>
          <div v-else-if="lastSavedAt" class="text-success flex items-center gap-xs">
            <font-awesome-icon icon="check-circle" />
            Last saved {{ new Date(lastSavedAt).toLocaleTimeString() }}
          </div>
        </div>
        
        <!-- Quick actions bar -->
        <div class="flex gap-sm mt-md quick-actions">
          <button @click="expandAll" class="btn btn-secondary btn-sm">
            <font-awesome-icon icon="expand" />
            Expand All
          </button>
          <button @click="collapseAll" class="btn btn-secondary btn-sm">
            <font-awesome-icon icon="compress" />
            Collapse All
          </button>
        </div>
      </div>
    </div>

    <!-- Main content with collapsible sections -->
    <div class="container">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center p-3xl text-center">
        <div class="loading-spinner mb-md"></div>
        <p>Loading release data...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error && !releaseData.basic.title" class="card p-xl text-center">
        <font-awesome-icon icon="exclamation-triangle" class="text-3xl text-error mb-md" />
        <h2 class="mb-sm">Failed to load release</h2>
        <p class="text-secondary mb-lg">{{ error }}</p>
        <button @click="router.push('/catalog')" class="btn btn-primary">
          Back to Catalog
        </button>
      </div>

      <!-- Edit sections -->
      <div v-else class="flex flex-col gap-lg">
        <!-- Basic Information Section -->
        <div class="card collapsible-section" :class="{ expanded: expandedSections.basic, modified: modifiedSections.has('basic') }">
          <div class="section-header p-lg" @click="toggleSection('basic')">
            <div class="flex items-center gap-md">
              <font-awesome-icon :icon="expandedSections.basic ? 'chevron-down' : 'chevron-right'" class="text-secondary section-icon" />
              <div class="flex-1">
                <h2 class="text-lg font-semibold flex items-center gap-sm">
                  Basic Information
                  <span v-if="sectionStatus.basic.complete" class="status-badge complete">
                    <font-awesome-icon icon="check" />
                  </span>
                  <span v-else-if="sectionStatus.basic.errors" class="status-badge error">
                    {{ sectionStatus.basic.errors }}
                  </span>
                </h2>
                <p class="text-sm text-secondary mt-xs">{{ sectionStatus.basic.summary }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="expandedSections.basic" class="section-content p-lg pt-0">
            <div class="grid grid-cols-2 gap-md grid-cols-sm-1">
              <div class="form-group col-span-2">
                <label class="form-label required">Release Title</label>
                <input 
                  v-model="releaseData.basic.title" 
                  type="text" 
                  class="form-input"
                  placeholder="Enter release title"
                  @input="modifiedSections.add('basic')"
                />
              </div>
              
              <div class="form-group col-span-2">
                <label class="form-label required">Display Artist</label>
                <input 
                  v-model="releaseData.basic.displayArtist" 
                  type="text" 
                  class="form-input"
                  placeholder="Enter artist name"
                  @input="modifiedSections.add('basic')"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Release Type</label>
                <select v-model="releaseData.basic.type" class="form-select" @change="modifiedSections.add('basic')">
                  <option value="Single">Single</option>
                  <option value="EP">EP</option>
                  <option value="Album">Album</option>
                  <option value="Compilation">Compilation</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Label</label>
                <input 
                  v-model="releaseData.basic.label" 
                  type="text" 
                  class="form-input"
                  placeholder="Label name"
                  @input="modifiedSections.add('basic')"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Catalog Number</label>
                <input 
                  v-model="releaseData.basic.catalogNumber" 
                  type="text" 
                  class="form-input"
                  placeholder="e.g., CAT001"
                  @input="modifiedSections.add('basic')"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label required">Barcode (UPC/EAN)</label>
                <input 
                  v-model="releaseData.basic.barcode" 
                  type="text" 
                  class="form-input"
                  placeholder="e.g., 123456789012"
                  pattern="[0-9]{12,14}"
                  @input="modifiedSections.add('basic')"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Release Date</label>
                <input 
                  v-model="releaseData.basic.releaseDate" 
                  type="date" 
                  class="form-input"
                  @input="modifiedSections.add('basic')"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Original Release Date</label>
                <input 
                  v-model="releaseData.basic.originalReleaseDate" 
                  type="date" 
                  class="form-input"
                  @input="modifiedSections.add('basic')"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Tracks Section -->
        <div class="card collapsible-section" :class="{ expanded: expandedSections.tracks, modified: modifiedSections.has('tracks') }">
          <div class="section-header p-lg" @click="toggleSection('tracks')">
            <div class="flex items-center gap-md">
              <font-awesome-icon :icon="expandedSections.tracks ? 'chevron-down' : 'chevron-right'" class="text-secondary section-icon" />
              <div class="flex-1">
                <h2 class="text-lg font-semibold flex items-center gap-sm">
                  Tracks
                  <span v-if="sectionStatus.tracks.complete" class="status-badge complete">
                    <font-awesome-icon icon="check" />
                  </span>
                  <span v-else-if="sectionStatus.tracks.warnings" class="status-badge warning">
                    {{ sectionStatus.tracks.warnings }} missing audio
                  </span>
                </h2>
                <p class="text-sm text-secondary mt-xs">{{ sectionStatus.tracks.summary }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="expandedSections.tracks" class="section-content p-lg pt-0">
            <div class="mb-md">
              <button @click="handleAddTrack" class="btn btn-primary btn-sm">
                <font-awesome-icon icon="plus" />
                Add Track
              </button>
            </div>
            
            <div v-if="releaseData.tracks.length === 0" class="text-center p-xl text-secondary">
              <font-awesome-icon icon="music" class="text-2xl mb-sm block text-tertiary" />
              <p>No tracks yet</p>
            </div>
            
            <div v-else class="flex flex-col gap-md">
              <div v-for="(track, index) in releaseData.tracks" :key="track.id" class="track-item bg-secondary rounded-md p-md flex gap-md items-start">
                <div class="track-number">{{ index + 1 }}</div>
                
                <div class="flex-1 flex flex-col gap-sm">
                  <input 
                    :value="track.title"
                    @input="handleUpdateTrack(index, { title: $event.target.value })"
                    type="text" 
                    class="form-input"
                    placeholder="Track title"
                  />
                  
                  <div class="grid grid-cols-2 gap-sm grid-cols-sm-1">
                    <input 
                      :value="track.artist"
                      @input="handleUpdateTrack(index, { artist: $event.target.value })"
                      type="text" 
                      class="form-input"
                      placeholder="Track artist"
                    />
                    
                    <input 
                      :value="track.isrc"
                      @input="handleUpdateTrack(index, { isrc: $event.target.value })"
                      type="text" 
                      class="form-input"
                      placeholder="ISRC (optional)"
                    />
                  </div>

                  <!-- ADD THIS DEBUG DISPLAY right after the ISRC input: -->
                  <div v-if="track.isrc" class="text-xs text-success mt-xs">
                    ISRC: {{ track.isrc }}
                  </div>
                  <div v-else class="text-xs text-warning mt-xs">
                    No ISRC
                  </div>
                  
                  <!-- Contributors Section -->
                  <div class="track-contributors mt-md pt-md border-t">
                    <div class="flex justify-between items-center mb-sm">
                      <span class="font-medium text-sm text-secondary">Contributors</span>
                      <button 
                        @click="showContributorModal(index)" 
                        class="btn btn-secondary btn-sm"
                        type="button"
                      >
                        <font-awesome-icon icon="plus" />
                        Add Contributor
                      </button>
                    </div>
                    
                    <div v-if="track.contributors && track.contributors.length > 0" class="flex flex-wrap gap-xs mt-sm">
                      <div 
                        v-for="(contributor, cIndex) in track.contributors" 
                        :key="`${track.id}-contributor-${cIndex}`"
                        class="contributor-tag"
                        :class="`contributor-${getCategoryClass(contributor.role)}`"
                      >
                        <span class="font-medium">{{ contributor.name }}</span>
                        <span class="text-xs text-secondary">{{ contributor.role }}</span>
                        <button 
                          @click="removeContributor(index, cIndex)" 
                          class="contributor-remove"
                          type="button"
                        >
                          <font-awesome-icon icon="times" />
                        </button>
                      </div>
                    </div>
                    
                    <div v-else class="text-tertiary text-sm italic p-sm">
                      No contributors added yet
                    </div>
                  </div>
                  
                  <div class="flex flex-col gap-xs">
                    <label class="btn btn-secondary btn-sm inline-block">
                      <font-awesome-icon icon="upload" />
                      {{ track.audio ? 'Replace Audio' : 'Upload Audio' }}
                      <input 
                        type="file" 
                        accept="audio/*"
                        @change="handleAudioUpload($event, index)"
                        style="display: none"
                      />
                    </label>
                    
                    <div v-if="track.audio" class="flex items-center gap-xs text-sm text-secondary">
                      <font-awesome-icon icon="music" />
                      <span>{{ track.audio.name || 'Audio uploaded' }}</span>
                      <span v-if="track.audio.duration">({{ formatDuration(track.audio.duration) }})</span>
                    </div>
                    
                    <div v-if="uploadProgress[`track_${track.id}`]" class="progress-bar">
                      <div class="progress-fill" :style="{ width: `${uploadProgress[`track_${track.id}`]}%` }"></div>
                    </div>
                  </div>
                </div>
                
                <button @click="handleRemoveTrack(index)" class="btn-icon text-error" title="Remove track">
                  <font-awesome-icon icon="trash" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Assets Section -->
        <div class="card collapsible-section" :class="{ expanded: expandedSections.assets, modified: modifiedSections.has('assets') }">
          <div class="section-header p-lg" @click="toggleSection('assets')">
            <div class="flex items-center gap-md">
              <font-awesome-icon :icon="expandedSections.assets ? 'chevron-down' : 'chevron-right'" class="text-secondary section-icon" />
              <div class="flex-1">
                <h2 class="text-lg font-semibold flex items-center gap-sm">
                  Assets
                  <span v-if="sectionStatus.assets.complete" class="status-badge complete">
                    <font-awesome-icon icon="check" />
                  </span>
                </h2>
                <p class="text-sm text-secondary mt-xs">{{ sectionStatus.assets.summary }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="expandedSections.assets" class="section-content p-lg pt-0">
            <div class="mb-lg">
              <h3 class="text-md font-semibold mb-md">Cover Image</h3>
              
              <div v-if="!releaseData.assets.coverImage" class="upload-area">
                <label class="upload-label">
                  <input 
                    type="file" 
                    accept="image/*"
                    @change="handleCoverImageUpload"
                    style="display: none"
                  />
                  <font-awesome-icon icon="upload" class="text-2xl text-tertiary" />
                  <p>Click to upload cover image</p>
                  <span class="text-sm text-secondary">Minimum 3000x3000px</span>
                </label>
              </div>
              
              <div v-else class="flex gap-lg p-md bg-secondary rounded-lg flex-col-sm items-center-sm text-center-sm">
                <img 
                  :src="releaseData.assets.coverImage.url || releaseData.assets.coverImage.preview" 
                  :alt="releaseData.assets.coverImage.name"
                  class="cover-preview"
                />
                <div class="asset-info">
                  <h4 class="font-semibold mb-xs">{{ releaseData.assets.coverImage.name }}</h4>
                  <p class="text-secondary mb-md text-sm">{{ formatFileSize(releaseData.assets.coverImage.size) }}</p>
                  <label class="btn btn-secondary btn-sm">
                    Replace Image
                    <input 
                      type="file" 
                      accept="image/*"
                      @change="handleCoverImageUpload"
                      style="display: none"
                    />
                  </label>
                </div>
              </div>
              
              <div v-if="uploadProgress.cover" class="progress-bar mt-sm">
                <div class="progress-fill" :style="{ width: `${uploadProgress.cover}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Metadata Section -->
        <div class="card collapsible-section" :class="{ expanded: expandedSections.metadata, modified: modifiedSections.has('metadata') }">
          <div class="section-header p-lg" @click="toggleSection('metadata')">
            <div class="flex items-center gap-md">
              <font-awesome-icon :icon="expandedSections.metadata ? 'chevron-down' : 'chevron-right'" class="text-secondary section-icon" />
              <div class="flex-1">
                <h2 class="text-lg font-semibold flex items-center gap-sm">
                  Metadata
                  <span v-if="sectionStatus.metadata.complete" class="status-badge complete">
                    <font-awesome-icon icon="check" />
                  </span>
                </h2>
                <p class="text-sm text-secondary mt-xs">{{ sectionStatus.metadata.summary }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="expandedSections.metadata" class="section-content p-lg pt-0">
            <div class="mb-xl">
              <h3 class="text-md font-semibold mb-md">Genre Classification</h3>
              <GenreSelector
                v-model="releaseData.metadata.genreCode"
                v-model:subgenre-value="releaseData.metadata.subgenreCode"
                dsp="genre-truth"
                @update:model-value="handleGenreUpdate"
                @update:subgenre-value="handleSubgenreUpdate"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-md grid-cols-sm-1">
              <div class="form-group">
                <label class="form-label">Language</label>
                <select v-model="releaseData.metadata.language" class="form-select" @change="modifiedSections.add('metadata')">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Copyright Year</label>
                <input 
                  v-model.number="releaseData.metadata.copyrightYear" 
                  type="number" 
                  class="form-input"
                  :min="1900"
                  :max="new Date().getFullYear() + 1"
                  @input="modifiedSections.add('metadata')"
                />
              </div>
              
              <div class="form-group col-span-2">
                <label class="form-label required">Copyright</label>
                <input 
                  v-model="releaseData.metadata.copyright" 
                  type="text" 
                  class="form-input"
                  :placeholder="`© ${releaseData.metadata.copyrightYear} ${releaseData.basic.label || 'Label Name'}`"
                  @input="modifiedSections.add('metadata')"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- MEAD Section (COMPLETE) -->
        <div class="card collapsible-section" :class="{ expanded: expandedSections.mead, modified: modifiedSections.has('mead') }">
          <div class="section-header p-lg" @click="toggleSection('mead')">
            <div class="flex items-center gap-md">
              <font-awesome-icon :icon="expandedSections.mead ? 'chevron-down' : 'chevron-right'" class="text-secondary section-icon" />
              <div class="flex-1">
                <h2 class="text-lg font-semibold flex items-center gap-sm">
                  MEAD - Media Enrichment
                  <span v-if="sectionStatus.mead.complete" class="status-badge complete">
                    <font-awesome-icon icon="check" />
                  </span>
                  <span class="mead-badge">Enhances Discovery</span>
                </h2>
                <p class="text-sm text-secondary mt-xs">{{ sectionStatus.mead.summary }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="expandedSections.mead" class="section-content p-lg pt-0">
            <!-- MEAD Information Panel -->
            <div class="mead-info-panel rounded-lg p-lg mb-xl">
              <div class="mead-benefits">
                <h4 class="text-primary mb-sm flex items-center gap-sm">
                  <font-awesome-icon icon="chart-line" /> 
                  Boost Your Music's Performance
                </h4>
                <p class="text-secondary mb-md">MEAD (Media Enrichment and Description) metadata can increase streams by up to 10% and reduce skip rates by 7.5% on major DSPs.</p>
                <div class="flex flex-wrap gap-sm">
                  <span class="benefit-tag">
                    <font-awesome-icon icon="search" /> Better Discovery
                  </span>
                  <span class="benefit-tag">
                    <font-awesome-icon icon="list-music" /> Playlist Curation
                  </span>
                  <span class="benefit-tag">
                    <font-awesome-icon icon="microphone" /> Voice Search
                  </span>
                  <span class="benefit-tag">
                    <font-awesome-icon icon="robot" /> AI Recommendations
                  </span>
                </div>
              </div>
            </div>

            <!-- Mood & Theme Classification -->
            <div class="mb-xl">
              <h3 class="text-md font-semibold mb-md flex items-center gap-sm">
                <font-awesome-icon icon="heart" /> Mood & Theme
              </h3>
              <p class="text-sm text-secondary italic mb-md">Help DSPs categorize your music for mood-based playlists and recommendations.</p>
              
              <div class="mood-selector mb-lg">
                <div class="grid grid-cols-3 gap-lg grid-cols-md-2 grid-cols-sm-1 mb-lg">
                  <div v-for="(category, categoryKey) in MoodCategories" :key="categoryKey" class="mood-category">
                    <h4 class="text-sm font-semibold text-secondary mb-xs uppercase">{{ category.name }}</h4>
                    <p class="text-xs text-tertiary mb-sm">{{ category.description }}</p>
                    <div class="flex flex-wrap gap-xs">
                      <button 
                        v-for="mood in category.moods" 
                        :key="mood"
                        @click="releaseData.mead.moods.includes(mood) ? removeMood(mood) : addMood(mood)"
                        :class="{ active: releaseData.mead.moods.includes(mood) }"
                        class="mood-chip"
                        type="button"
                      >
                        {{ mood }}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div v-if="releaseData.mead.moods.length > 0" class="p-md bg-secondary rounded-md border">
                  <h4 class="text-sm text-secondary mb-sm">Selected Moods:</h4>
                  <div class="flex flex-wrap gap-xs">
                    <span v-for="mood in releaseData.mead.moods" :key="mood" class="selected-mood-tag">
                      {{ mood }}
                      <button @click="removeMood(mood)" class="remove-mood" type="button">
                        <font-awesome-icon icon="times" />
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Content Advisory</label>
                <label class="checkbox-option">
                  <input 
                    v-model="releaseData.mead.isExplicit" 
                    type="checkbox"
                    @change="modifiedSections.add('mead')"
                  />
                  <span class="text-sm">Contains explicit content</span>
                </label>
                <input 
                  v-model="releaseData.mead.contentAdvisory" 
                  type="text" 
                  class="form-input mt-sm"
                  placeholder="Additional content warnings (optional)"
                  @input="modifiedSections.add('mead')"
                />
              </div>
            </div>

            <!-- Musical Characteristics -->
            <div class="mb-xl">
              <h3 class="text-md font-semibold mb-md flex items-center gap-sm">
                <font-awesome-icon icon="music" /> Musical Characteristics
              </h3>
              <p class="text-sm text-secondary italic mb-md">Technical details that help with music analysis and matching.</p>
              
              <div class="grid grid-cols-2 gap-md grid-cols-sm-1">
                <div class="form-group">
                  <label class="form-label">Tempo (BPM)</label>
                  <input 
                    v-model.number="releaseData.mead.tempo" 
                    type="number" 
                    class="form-input"
                    placeholder="e.g., 120"
                    min="40"
                    max="200"
                    @input="modifiedSections.add('mead')"
                  />
                  <small class="text-xs text-tertiary italic mt-xs block">Beats per minute for DJ mixing and workout playlists</small>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Tempo Description</label>
                  <select v-model="releaseData.mead.tempoDescription" class="form-select" @change="modifiedSections.add('mead')">
                    <option value="">Select tempo feel</option>
                    <option v-for="tempo in TempoDescriptions" :key="tempo.code" :value="tempo.code">
                      {{ tempo.name }} ({{ tempo.range }})
                    </option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Time Signature</label>
                  <select v-model="releaseData.mead.timeSignature" class="form-select" @change="modifiedSections.add('mead')">
                    <option value="">Select time signature</option>
                    <option v-for="sig in TimeSignatures" :key="sig.code" :value="sig.code">
                      {{ sig.name }} - {{ sig.description }}
                    </option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Musical Key</label>
                  <select v-model="releaseData.mead.harmonicStructure" class="form-select" @change="modifiedSections.add('mead')">
                    <option value="">Select key</option>
                    <option v-for="key in MusicalKeys" :key="key.code" :value="key.code">{{ key.display }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Instrumentation -->
            <div class="mb-xl">
              <h3 class="text-md font-semibold mb-md flex items-center gap-sm">
                <font-awesome-icon icon="guitar" /> Instrumentation
              </h3>
              <p class="text-sm text-secondary italic mb-md">Primary instruments featured in this release.</p>
              
              <div class="instrumentation-selector mb-lg">
                <div class="grid grid-cols-4 gap-lg grid-cols-md-2 grid-cols-sm-1 mb-lg">
                  <div v-for="(category, categoryKey) in InstrumentCategories" :key="categoryKey" class="instrument-category">
                    <h4 class="text-sm font-semibold text-secondary mb-xs uppercase">{{ category.name }}</h4>
                    <p class="text-xs text-tertiary mb-sm">{{ category.description }}</p>
                    <div class="flex flex-wrap gap-xs">
                      <button 
                        v-for="instrument in category.instruments" 
                        :key="instrument.code"
                        @click="releaseData.mead.instrumentation.includes(instrument.name) ? removeInstrument(instrument.name) : addInstrument(instrument.name)"
                        :class="{ active: releaseData.mead.instrumentation.includes(instrument.name) }"
                        class="instrument-chip"
                        type="button"
                      >
                        {{ instrument.name }}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div v-if="releaseData.mead.instrumentation.length > 0" class="p-md bg-secondary rounded-md border">
                  <h4 class="text-sm text-secondary mb-sm">Primary Instruments:</h4>
                  <div class="flex flex-wrap gap-xs">
                    <span v-for="instrument in releaseData.mead.instrumentation" :key="instrument" class="selected-instrument-tag">
                      {{ instrument }}
                      <button @click="removeInstrument(instrument)" class="remove-instrument" type="button">
                        <font-awesome-icon icon="times" />
                      </button>
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Instrumentation Details</label>
                <textarea 
                  v-model="releaseData.mead.instrumentationDetails" 
                  class="form-textarea"
                  placeholder="Additional details about the instrumentation or unique instruments used..."
                  rows="3"
                  @input="modifiedSections.add('mead')"
                ></textarea>
              </div>
            </div>

            <!-- Vocal Information -->
            <div class="mb-xl">
              <h3 class="text-md font-semibold mb-md flex items-center gap-sm">
                <font-awesome-icon icon="microphone" /> Vocal Information
              </h3>
              
              <div class="grid grid-cols-2 gap-md grid-cols-sm-1">
                <div class="form-group">
                  <label class="form-label">Vocal Register</label>
                  <select v-model="releaseData.mead.vocalRegister" class="form-select" @change="modifiedSections.add('mead')">
                    <option value="">Select vocal register</option>
                    <option v-for="register in VocalRegisters" :key="register.code" :value="register.code">
                      {{ register.name }} - {{ register.description }}
                    </option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Vocal Characteristics</label>
                  <div class="grid grid-cols-2 gap-sm grid-cols-sm-1">
                    <label v-for="characteristic in VocalCharacteristics" 
                          :key="characteristic.code" 
                          class="checkbox-option p-sm rounded-sm">
                      <input 
                        :value="characteristic.code"
                        :checked="releaseData.mead.vocalCharacteristics.includes(characteristic.code)"
                        @change="toggleVocalCharacteristic(characteristic.code)"
                        type="checkbox"
                      />
                      <span class="text-sm">{{ characteristic.name }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Production Information -->
            <div class="mb-xl">
              <h3 class="text-md font-semibold mb-md flex items-center gap-sm">
                <font-awesome-icon icon="cog" /> Production Information
              </h3>
              
              <div class="grid grid-cols-2 gap-md grid-cols-sm-1">
                <div class="form-group">
                  <label class="form-label">Recording Technique</label>
                  <select v-model="releaseData.mead.recordingTechnique" class="form-select" @change="modifiedSections.add('mead')">
                    <option value="">Select recording technique</option>
                    <option v-for="technique in RecordingTechniques" :key="technique.code" :value="technique.code">
                      {{ technique.name }} - {{ technique.description }}
                    </option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Audio Characteristics</label>
                  <select v-model="releaseData.mead.audioCharacteristics" class="form-select" @change="modifiedSections.add('mead')">
                    <option value="">Select audio characteristics</option>
                    <option v-for="characteristic in AudioCharacteristics" :key="characteristic.code" :value="characteristic.code">
                      {{ characteristic.name }} - {{ characteristic.description }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Discovery & Marketing -->
            <div class="mb-xl">
              <h3 class="text-md font-semibold mb-md flex items-center gap-sm">
                <font-awesome-icon icon="bullhorn" /> Discovery & Marketing
              </h3>
              
              <div class="form-group mb-md">
                <label class="form-label">Focus Track</label>
                <select v-model="releaseData.mead.focusTrack" class="form-select" @change="modifiedSections.add('mead')">
                  <option value="">Select focus track for voice search</option>
                  <option v-for="(track, index) in releaseData.tracks" :key="track.id" :value="track.id">
                    {{ index + 1 }}. {{ track.title }}
                  </option>
                </select>
                <small class="text-xs text-tertiary italic mt-xs block">Track played when users ask for "the latest {{ releaseData.basic.displayArtist }} track"</small>
              </div>
              
              <div class="form-group mb-md">
                <label class="form-label">Marketing Description</label>
                <textarea 
                  v-model="releaseData.mead.marketingDescription" 
                  class="form-textarea"
                  placeholder="Brief marketing copy describing this release..."
                  rows="3"
                  @input="modifiedSections.add('mead')"
                ></textarea>
              </div>
              
              <div class="grid grid-cols-2 gap-md grid-cols-sm-1">
                <div class="form-group">
                  <label class="form-label">Playlist Suitability</label>
                  <div class="flex flex-wrap gap-sm flex-col-sm">
                    <button v-for="playlist in PlaylistSuitability" 
                            :key="playlist.code"
                            @click="togglePlaylistSuitability(playlist.code)"
                            :class="{ active: releaseData.mead.playlistSuitability.includes(playlist.code) }"
                            class="playlist-chip text-center-sm"
                            type="button">
                      {{ playlist.name }}
                    </button>
                  </div>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Seasonality</label>
                  <select v-model="releaseData.mead.seasonality" class="form-select" @change="modifiedSections.add('mead')">
                    <option value="">No specific season</option>
                    <option v-for="season in Seasonality" :key="season.code" :value="season.code">
                      {{ season.name }} - {{ season.description }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Track-Level MEAD Override -->
            <div v-if="releaseData.tracks.length > 0" class="mb-xl">
              <h3 class="text-md font-semibold mb-md flex items-center gap-sm">
                <font-awesome-icon icon="sliders-h" /> Track-Level MEAD
              </h3>
              <p class="text-sm text-secondary italic mb-md">Override release-level MEAD data for individual tracks with unique characteristics.</p>
              
              <div class="flex flex-col gap-md">
                <div v-for="(track, index) in releaseData.tracks" :key="track.id" class="border rounded-md overflow-hidden">
                  <div class="flex items-center justify-between p-md bg-secondary">
                    <div class="flex items-center gap-md">
                      <span class="track-number">{{ index + 1 }}</span>
                      <span class="font-medium">{{ track.title }}</span>
                    </div>
                    <button 
                      @click="track.showMead = !track.showMead" 
                      class="btn btn-secondary btn-sm"
                      type="button"
                    >
                      <font-awesome-icon :icon="track.showMead ? 'chevron-up' : 'chevron-down'" />
                      {{ track.showMead ? 'Hide' : 'Customize' }}
                    </button>
                  </div>
                  
                  <div v-if="track.showMead" class="p-md">
                    <div class="grid grid-cols-2 gap-md grid-cols-sm-1 mb-md">
                      <div class="form-group">
                        <label class="form-label">Track BPM</label>
                        <input 
                          :value="getTrackMead(track.id).tempo || ''"
                          @input="setTrackMead(index, { tempo: $event.target.value ? parseInt($event.target.value) : null })"
                          type="number" 
                          class="form-input"
                          placeholder="Override release BPM"
                          min="40"
                          max="200"
                        />
                      </div>
                      
                      <div class="form-group">
                        <label class="form-label">Track Key</label>
                        <select 
                          :value="getTrackMead(track.id).key || ''"
                          @change="setTrackMead(index, { key: $event.target.value })"
                          class="form-select"
                        >
                          <option value="">Use release key</option>
                          <option v-for="key in MusicalKeys" :key="key.code" :value="key.code">{{ key.display }}</option>
                        </select>
                      </div>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">Track-Specific Moods</label>
                      <div class="flex flex-wrap gap-xs">
                        <button v-for="mood in ['Happy', 'Sad', 'Energetic', 'Calm', 'Dark', 'Uplifting', 'Romantic', 'Aggressive']" 
                                :key="mood"
                                @click="toggleTrackMood(index, mood)"
                                :class="{ active: (getTrackMead(track.id).moods || []).includes(mood) }"
                                class="mood-chip text-xs p-xs"
                                type="button">
                          {{ mood }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Territories Section -->
        <div class="card collapsible-section" :class="{ expanded: expandedSections.territories, modified: modifiedSections.has('territories') }">
          <div class="section-header p-lg" @click="toggleSection('territories')">
            <div class="flex items-center gap-md">
              <font-awesome-icon :icon="expandedSections.territories ? 'chevron-down' : 'chevron-right'" class="text-secondary section-icon" />
              <div class="flex-1">
                <h2 class="text-lg font-semibold flex items-center gap-sm">
                  Territories & Rights
                  <span v-if="sectionStatus.territories.complete" class="status-badge complete">
                    <font-awesome-icon icon="check" />
                  </span>
                </h2>
                <p class="text-sm text-secondary mt-xs">{{ sectionStatus.territories.summary }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="expandedSections.territories" class="section-content p-lg pt-0">
            <div class="flex flex-col gap-sm">
              <label class="radio-option">
                <input 
                  v-model="releaseData.territories.mode" 
                  type="radio" 
                  value="worldwide"
                  @change="modifiedSections.add('territories')"
                />
                <div class="flex flex-col">
                  <span class="font-medium mb-xs">Worldwide</span>
                  <span class="text-sm text-secondary">Distribute to all territories</span>
                </div>
              </label>
              
              <label class="radio-option">
                <input 
                  v-model="releaseData.territories.mode" 
                  type="radio" 
                  value="selected"
                  @change="modifiedSections.add('territories')"
                />
                <div class="flex flex-col">
                  <span class="font-medium mb-xs">Selected Territories</span>
                  <span class="text-sm text-secondary">Choose specific territories</span>
                </div>
              </label>
            </div>
            
            <div v-if="releaseData.territories.mode === 'selected'" class="flex items-center gap-sm p-md bg-info text-white rounded-md mt-md">
              <font-awesome-icon icon="info-circle" />
              Territory selection will be available in the next update
            </div>
          </div>
        </div>

        <!-- ERN & Delivery Section -->
        <div class="card collapsible-section" :class="{ expanded: expandedSections.ern, modified: modifiedSections.has('ern') }">
          <div class="section-header p-lg" @click="toggleSection('ern')">
            <div class="flex items-center gap-md">
              <font-awesome-icon :icon="expandedSections.ern ? 'chevron-down' : 'chevron-right'" class="text-secondary section-icon" />
              <div class="flex-1">
                <h2 class="text-lg font-semibold flex items-center gap-sm">
                  ERN & Delivery
                  <span v-if="sectionStatus.ern.complete" class="status-badge complete">
                    <font-awesome-icon icon="check" />
                  </span>
                  <span v-else-if="sectionStatus.ern.errors" class="status-badge error">
                    <font-awesome-icon icon="exclamation-triangle" />
                  </span>
                  <span v-if="isReadyForDelivery" class="ready-badge">
                    <font-awesome-icon icon="rocket" />
                    Ready for Delivery
                  </span>
                </h2>
                <p class="text-sm text-secondary mt-xs">{{ sectionStatus.ern.summary }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="expandedSections.ern" class="section-content p-lg pt-0">
            <!-- ERN Configuration -->
            <div class="mb-xl pb-xl border-b">
              <h3 class="text-md font-semibold mb-md flex items-center gap-sm">
                <font-awesome-icon icon="file-code" /> ERN Configuration
              </h3>
              <p class="text-sm text-secondary italic mb-md">Configure and generate the DDEX ERN message for this release.</p>
              
              <div class="grid grid-cols-2 gap-md grid-cols-sm-1">
                <div class="form-group">
                  <label class="form-label">ERN Version</label>
                  <select v-model="releaseData.ern.version" class="form-select" @change="modifiedSections.add('ern')">
                    <option value="3.8.2">ERN 3.8.2</option>
                    <option value="4.2">ERN 4.2</option>
                    <option value="4.3">ERN 4.3 (Recommended)</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label">Profile</label>
                  <select v-model="releaseData.ern.profile" class="form-select" @change="modifiedSections.add('ern')">
                    <option value="AudioAlbum">Audio Album</option>
                    <option value="AudioSingle">Audio Single</option>
                    <option value="VideoAlbum">Video Album</option>
                  </select>
                </div>
              </div>
              
              <!-- Release Readiness Check -->
              <div class="bg-secondary rounded-lg p-lg mt-lg mb-lg">
                <h4 class="text-md font-semibold mb-md flex items-center gap-sm">
                  <font-awesome-icon icon="check-circle" /> Release Readiness
                </h4>
                <div class="grid grid-cols-2 gap-md grid-cols-sm-1">
                  <div class="readiness-item" :class="{ complete: sectionStatus.basic.complete }">
                    <font-awesome-icon :icon="sectionStatus.basic.complete ? 'check-circle' : 'circle'" />
                    <span>Basic Information</span>
                  </div>
                  <div class="readiness-item" :class="{ complete: sectionStatus.tracks.complete }">
                    <font-awesome-icon :icon="sectionStatus.tracks.complete ? 'check-circle' : 'circle'" />
                    <span>Tracks & Audio</span>
                  </div>
                  <div class="readiness-item" :class="{ complete: sectionStatus.assets.complete }">
                    <font-awesome-icon :icon="sectionStatus.assets.complete ? 'check-circle' : 'circle'" />
                    <span>Cover Image</span>
                  </div>
                  <div class="readiness-item" :class="{ complete: sectionStatus.metadata.complete }">
                    <font-awesome-icon :icon="sectionStatus.metadata.complete ? 'check-circle' : 'circle'" />
                    <span>Metadata</span>
                  </div>
                </div>
              </div>
              
              <!-- ERN Actions -->
              <div class="flex gap-md flex-col-sm">
                <button 
                  @click="validateERN" 
                  class="btn btn-secondary"
                  :disabled="isValidatingERN"
                >
                  <font-awesome-icon v-if="isValidatingERN" icon="spinner" class="fa-spin" />
                  <font-awesome-icon v-else icon="check" />
                  {{ isValidatingERN ? 'Validating...' : 'Validate Release' }}
                </button>
                
                <button 
                  @click="generateERN" 
                  class="btn btn-primary"
                  :disabled="isGeneratingERN"
                >
                  <font-awesome-icon v-if="isGeneratingERN" icon="spinner" class="fa-spin" />
                  <font-awesome-icon v-else icon="file-code" />
                  {{ isGeneratingERN ? 'Generating...' : 'Generate ERN' }}
                </button>
              </div>
              
              <!-- ERN Error Display -->
              <div v-if="ernError" class="ern-error">
                <font-awesome-icon icon="exclamation-triangle" />
                <div>
                  <h4 class="text-md font-semibold mb-xs">Validation Errors</h4>
                  <p class="text-sm">{{ ernError }}</p>
                </div>
              </div>
              
              <!-- ERN Success Display -->
              <div v-if="releaseData.ern.validated && generatedERN" class="ern-success">
                <font-awesome-icon icon="check-circle" />
                <div>
                  <h4 class="text-md font-semibold mb-xs">ERN Generated Successfully</h4>
                  <p class="text-sm mb-xs">Message ID: <code class="bg-surface p-xs rounded-sm">{{ generatedERN.messageId }}</code></p>
                  <p class="text-sm">Generated: {{ formatDate(releaseData.ern.lastGeneratedAt) }}</p>
                </div>
                <div class="flex gap-sm ml-auto flex-col-sm ml-0-sm mt-md-sm">
                  <button @click="previewERN" class="btn btn-secondary btn-sm">
                    <font-awesome-icon icon="eye" />
                    Preview
                  </button>
                  <button @click="downloadERN" class="btn btn-secondary btn-sm">
                    <font-awesome-icon icon="download" />
                    Download
                  </button>
                </div>
              </div>

              <!-- Add after ERN Success Display in EditRelease.vue -->
              <div v-if="releaseData.ern.validated && generatedMEAD" class="mead-success mt-lg">
                <font-awesome-icon icon="chart-line" />
                <div>
                  <h4 class="text-md font-semibold mb-xs">MEAD Generated Successfully</h4>
                  <p class="text-sm mb-xs">Message ID: <code class="bg-surface p-xs rounded-sm">{{ generatedMEAD.messageId }}</code></p>
                  <p class="text-sm">Enhanced metadata for discovery and recommendations</p>
                </div>
                <div class="flex gap-sm ml-auto flex-col-sm ml-0-sm mt-md-sm">
                  <button @click="previewMEAD" class="btn btn-secondary btn-sm">
                    <font-awesome-icon icon="eye" />
                    Preview MEAD
                  </button>
                  <button @click="downloadMEAD" class="btn btn-secondary btn-sm">
                    <font-awesome-icon icon="download" />
                    Download
                  </button>
                </div>
              </div>

            </div>
            
            <!-- Delivery Section -->
            <div>
              <h3 class="text-md font-semibold mb-md flex items-center gap-sm">
                <font-awesome-icon icon="truck" /> Delivery
              </h3>
              <p class="text-sm text-secondary italic mb-md">Once your ERN is generated and validated, you can initiate delivery to DSPs.</p>
              
              <div v-if="!isReadyForDelivery" class="bg-secondary rounded-lg p-lg flex gap-md text-secondary flex-col-sm">
                <font-awesome-icon icon="info-circle" />
                <div>
                  <h4 class="text-md font-semibold mb-xs">Requirements for Delivery</h4>
                  <p class="text-sm">Please ensure all sections are complete and the ERN is validated before initiating delivery.</p>
                </div>
              </div>
              
              <div v-else class="bg-secondary rounded-lg p-lg">
                <div class="flex gap-md mb-lg items-center flex-col-sm">
                  <font-awesome-icon icon="check-circle" class="text-success text-2xl" />
                  <div>
                    <h4 class="text-md font-semibold mb-xs text-success">Ready for Delivery</h4>
                    <p class="text-sm text-secondary">This release meets all requirements and can be delivered to DSPs.</p>
                  </div>
                </div>
                
                <button 
                  @click="initiateDelivery" 
                  class="btn btn-success btn-lg"
                >
                  <font-awesome-icon icon="paper-plane" />
                  Initiate Delivery
                </button>
                
                <p class="text-sm text-secondary italic mt-md">
                  This will take you to the delivery wizard where you can select DSP targets and schedule the delivery.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Contributor Modal -->
    <div v-if="contributorModal.show" class="modal-overlay" @click="closeContributorModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="text-xl">Add Contributor to Track {{ contributorModal.trackIndex + 1 }}</h2>
          <button @click="closeContributorModal" class="btn-icon">
            <font-awesome-icon icon="times" />
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label required">Contributor Name</label>
            <input 
              v-model="contributorModal.name"
              type="text" 
              class="form-input"
              placeholder="e.g., John Smith"
              @input="clearContributorError"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Role Category</label>
            <div class="category-tabs">
              <button 
                v-for="(label, key) in contributorCategories"
                :key="key"
                @click="contributorModal.category = key"
                :class="{ active: contributorModal.category === key }"
                class="category-tab"
                type="button"
              >
                {{ label }}
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label required">Role</label>
            <div class="mb-md">
              <input 
                v-model="contributorModal.roleSearch"
                type="text" 
                class="form-input"
                placeholder="Search for a role..."
                @input="searchRoles"
              />
            </div>
            
            <div class="mb-md" v-if="!contributorModal.roleSearch">
              <span class="block text-sm text-secondary mb-sm">Common roles:</span>
              <button 
                v-for="role in getCommonRoles(contributorModal.category)"
                :key="role"
                @click="selectRole(role)"
                class="role-chip"
                :class="{ selected: contributorModal.role === role }"
                type="button"
              >
                {{ role }}
              </button>
            </div>
            
            <div v-if="contributorModal.searchResults.length > 0" class="role-results">
              <button 
                v-for="result in contributorModal.searchResults"
                :key="result.role || result"
                @click="selectRole(result.role || result)"
                class="role-option"
                :class="{ selected: contributorModal.role === (result.role || result) }"
                type="button"
              >
                <span class="font-medium">{{ result.role || result }}</span>
                <span v-if="result.category" class="text-xs text-secondary">
                  {{ formatCategoryName(result.category) }}
                </span>
              </button>
            </div>
            
            <div v-if="contributorModal.role" class="flex items-center gap-sm p-sm bg-success-light border rounded-md text-success text-sm">
              <font-awesome-icon icon="check-circle" />
              Selected: <strong>{{ contributorModal.role }}</strong>
            </div>
          </div>
          
          <div v-if="contributorModal.error" class="form-error flex items-center gap-sm">
            <font-awesome-icon icon="exclamation-triangle" />
            {{ contributorModal.error }}
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeContributorModal" class="btn btn-secondary">
            Cancel
          </button>
          <button 
            @click="addContributor"
            class="btn btn-primary"
            :disabled="!contributorModal.name || !contributorModal.role"
          >
            <font-awesome-icon icon="plus" />
            Add Contributor
          </button>
        </div>
      </div>
    </div>

    <!-- ERN Preview Modal -->
    <div v-if="showERNPreview" class="modal-overlay" @click="showERNPreview = false">
      <div class="modal-content modal-wide" @click.stop>
        <div class="modal-header">
          <h2 class="text-xl">ERN Preview</h2>
          <button @click="showERNPreview = false" class="btn-icon">
            <font-awesome-icon icon="times" />
          </button>
        </div>
        
        <div class="modal-body">
          <div class="p-md bg-secondary rounded-md mb-md">
            <p class="text-sm mb-xs"><strong>Message ID:</strong> {{ generatedERN?.messageId }}</p>
            <p class="text-sm mb-xs"><strong>Version:</strong> ERN {{ releaseData.ern.version }}</p>
            <p class="text-sm"><strong>Profile:</strong> {{ releaseData.ern.profile }}</p>
          </div>
          <pre class="ern-preview-content">{{ generatedERN?.ern }}</pre>
        </div>
        
        <div class="modal-footer">
          <button @click="copyERNToClipboard" class="btn btn-secondary">
            <font-awesome-icon icon="copy" />
            Copy to Clipboard
          </button>
          <button @click="downloadERN" class="btn btn-primary">
            <font-awesome-icon icon="download" />
            Download ERN
          </button>
          <button @click="showERNPreview = false" class="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- MEAD Preview Modal -->
    <div v-if="showMEADPreview" class="modal-overlay" @click="showMEADPreview = false">
      <div class="modal-content modal-wide" @click.stop>
        <div class="modal-header">
          <h2 class="text-xl">MEAD Preview - Media Enrichment Data</h2>
          <button @click="showMEADPreview = false" class="btn-icon">
            <font-awesome-icon icon="times" />
          </button>
        </div>
        
        <div class="modal-body">
          <div class="p-md bg-secondary rounded-md mb-md">
            <p class="text-sm mb-xs"><strong>Message ID:</strong> {{ generatedMEAD?.messageId }}</p>
            <p class="text-sm mb-xs"><strong>Version:</strong> MEAD {{ generatedMEAD?.version }}</p>
            <p class="text-sm mb-xs"><strong>Purpose:</strong> Enhanced metadata for discovery and recommendations</p>
            <p class="text-sm"><strong>Data Points:</strong> 
              {{ releaseData.mead.moods.length }} moods, 
              {{ releaseData.mead.instrumentation.length }} instruments,
              {{ releaseData.mead.playlistSuitability.length }} playlists
            </p>
          </div>
          <pre class="ern-preview-content">{{ generatedMEAD?.mead }}</pre>
        </div>
        
        <div class="modal-footer">
          <button @click="copyMEADToClipboard" class="btn btn-secondary">
            <font-awesome-icon icon="copy" />
            Copy to Clipboard
          </button>
          <button @click="downloadMEAD" class="btn btn-primary">
            <font-awesome-icon icon="download" />
            Download MEAD
          </button>
          <button @click="showMEADPreview = false" class="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Floating save button for mobile -->
    <button 
      v-if="hasChanges"
      @click="saveChanges" 
      class="floating-save-btn"
      :disabled="!canSave"
    >
      <font-awesome-icon v-if="isSaving" icon="spinner" class="fa-spin" />
      <font-awesome-icon v-else icon="save" />
    </button>
  </div>
</template>

<style scoped>
/* Base container */
.edit-release {
  min-height: calc(100vh - 64px);
  padding-bottom: var(--space-3xl);
  background-color: var(--color-bg);
}

/* Collapsible sections enhancement */
.collapsible-section {
  transition: all var(--transition-base);
}

.collapsible-section.expanded {
  box-shadow: var(--shadow-md);
}

.collapsible-section.modified {
  border-left: 3px solid var(--color-warning);
}

.section-header {
  cursor: pointer;
  user-select: none;
  transition: background-color var(--transition-base);
}

.section-header:hover {
  background-color: var(--color-bg-secondary);
}

.section-icon {
  width: 24px;
  transition: transform var(--transition-base);
}

.section-content {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Status badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  min-width: 20px;
}

.status-badge.complete {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.status-badge.warning {
  background-color: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

.status-badge.error {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

/* Form enhancements */
.form-label.required::after {
  content: ' *';
  color: var(--color-error);
}

.col-span-2 {
  grid-column: span 2;
}

/* Track styles */
.track-number {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  flex-shrink: 0;
}

.track-contributors {
  border-top: 1px solid var(--color-border-light);
}

/* Contributor tags */
.contributor-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
}

.contributor-tag.contributor-performer {
  background-color: rgba(66, 133, 244, 0.1);
  border-color: rgba(66, 133, 244, 0.3);
}

.contributor-tag.contributor-producer {
  background-color: rgba(52, 168, 83, 0.1);
  border-color: rgba(52, 168, 83, 0.3);
}

.contributor-tag.contributor-composer {
  background-color: rgba(251, 188, 4, 0.1);
  border-color: rgba(251, 188, 4, 0.3);
}

.contributor-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.contributor-remove:hover {
  color: var(--color-error);
}

/* Upload area */
.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  text-align: center;
  background-color: var(--color-bg-secondary);
  transition: all var(--transition-base);
}

.upload-area:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.cover-preview {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: var(--radius-md);
}

/* MEAD specific styles */
.mead-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-xs) var(--space-sm);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  margin-left: var(--space-sm);
}

.mead-info-panel {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.benefit-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background-color: rgba(102, 126, 234, 0.1);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.mood-chip,
.instrument-chip,
.playlist-chip {
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.mood-chip:hover,
.instrument-chip:hover,
.playlist-chip:hover {
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.mood-chip.active,
.instrument-chip.active,
.playlist-chip.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.selected-mood-tag,
.selected-instrument-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
}

.remove-mood,
.remove-instrument {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: var(--text-xs);
  transition: background-color var(--transition-base);
}

.remove-mood:hover,
.remove-instrument:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Territory options */
.radio-option {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.radio-option:hover {
  border-color: var(--color-primary);
  background-color: var(--color-bg-secondary);
}

/* ERN styles */
.ready-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: linear-gradient(135deg, #34a853 0%, #4285f4 100%);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  margin-left: var(--space-sm);
}

.readiness-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.readiness-item.complete {
  color: var(--color-success);
  background-color: rgba(52, 168, 83, 0.1);
}

.readiness-item:not(.complete) {
  color: var(--color-text-secondary);
}

.ern-error {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-lg);
  background-color: rgba(234, 67, 53, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-lg);
  margin-top: var(--space-lg);
  color: var(--color-error);
}

.ern-success {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-lg);
  background-color: rgba(52, 168, 83, 0.1);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-lg);
  margin-top: var(--space-lg);
  color: var(--color-success);
  align-items: center;
}

.ern-preview-content {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow-y: auto;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.modal-content {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 650px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-wide {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
}

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  padding: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

/* Category tabs */
.category-tabs {
  display: flex;
  gap: var(--space-xs);
  padding: var(--space-xs);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.category-tab {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.category-tab:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.category-tab.active {
  background-color: var(--color-primary);
  color: white;
}

/* Role selection */
.role-chip {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  margin: var(--space-xs);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.role-chip:hover {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
}

.role-chip.selected {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.role-results {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.role-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--transition-base);
}

.role-option:hover {
  background-color: var(--color-bg-secondary);
}

.role-option.selected {
  background-color: var(--color-primary-light);
}

/* Progress bar */
.progress-bar {
  height: 4px;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-top: var(--space-sm);
}

.progress-fill {
  height: 100%;
  background-color: var(--color-primary);
  transition: width var(--transition-base);
}

/* Loading spinner */
.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Utility button */
.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.btn-icon:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
}

.btn-icon.text-error:hover {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

/* Floating save button */
.floating-save-btn {
  position: fixed;
  bottom: var(--space-lg);
  right: var(--space-lg);
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
  color: white;
  border: none;
  box-shadow: var(--shadow-lg);
  display: none;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  cursor: pointer;
  z-index: 90;
  transition: all var(--transition-base);
}

.floating-save-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.floating-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Animation for saving spinner */
.fa-spin {
  animation: fa-spin 1s linear infinite;
}

@keyframes fa-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive adjustments */
.quick-actions {
  display: flex;
}

@media (max-width: 768px) {
  .edit-release {
    padding-bottom: calc(var(--space-3xl) + 80px);
  }
  
  .quick-actions {
    display: none;
  }
  
  .col-span-2 {
    grid-column: span 1;
  }
  
  .grid-cols-sm-1 {
    grid-template-columns: 1fr !important;
  }
  
  .flex-col-sm {
    flex-direction: column !important;
  }
  
  .ml-0-sm {
    margin-left: 0 !important;
  }
  
  .mt-md-sm {
    margin-top: var(--space-md) !important;
  }
  
  .items-center-sm {
    align-items: center !important;
  }
  
  .text-center-sm {
    text-align: center !important;
  }
  
  .floating-save-btn {
    display: flex;
  }
  
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .category-tabs {
    flex-direction: column;
  }
  
  .cover-preview {
    width: 200px;
    height: 200px;
  }
}
</style>