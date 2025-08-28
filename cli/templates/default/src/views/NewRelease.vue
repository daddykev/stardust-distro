<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'
import { useAuth } from '../composables/useAuth'
import GenreSelector from '../components/GenreSelector.vue'
import { getGenreByCode } from '../dictionaries/genres'

const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const { 
  createRelease, 
  updateRelease, 
  saveDraft, 
  loadRelease,
  uploadCoverImage,
  uploadTrackAudio,
  addTrack,
  updateTrack,
  removeTrack,
  currentRelease,
  isLoading,
  error 
} = useCatalog()

// Check if editing existing release
const releaseId = ref(route.params.id || null)
const isEditMode = computed(() => !!releaseId.value)

// Wizard state
const currentStep = ref(1)
const totalSteps = 6
const isSaving = ref(false)
const uploadProgress = ref({})
const validationErrors = ref({})

// Form data
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
    genreCode: '',  // Genre code
    genreName: '', // Human-readable name
    subgenre: '',
    subgenreCode: '', // Subgenre code
    subgenreName: '', // Human-readable subgenre name
    language: 'en',
    copyright: '',
    copyrightYear: new Date().getFullYear(),
    productionYear: new Date().getFullYear()
  },
  territories: {
    mode: 'worldwide',
    included: [],
    excluded: []
  },
  preview: {
    ernVersion: '4.3',
    profile: 'AudioAlbum',
    validated: false
  }
})

// Auto-save draft functionality
const autoSaveTimer = ref(null)
const lastSavedAt = ref(null)
const hasUnsavedChanges = ref(false)

// Step titles
const stepTitles = [
  'Basic Information',
  'Track Management',
  'Asset Upload',
  'Metadata',
  'Territories & Rights',
  'Review & Generate'
]

// Computed
const currentStepTitle = computed(() => stepTitles[currentStep.value - 1])

// Add computed property for display genre name - USE CONSISTENT DSP
const displayGenreName = computed(() => {
  // If we have a subgenre, show it (it's more specific)
  if (releaseData.value.metadata.subgenreName) {
    return releaseData.value.metadata.subgenreName
  } else if (releaseData.value.metadata.subgenre) {
    return releaseData.value.metadata.subgenre
  }
  
  // Otherwise show parent genre
  if (releaseData.value.metadata.genreName) {
    return releaseData.value.metadata.genreName
  } else if (releaseData.value.metadata.genre) {
    return releaseData.value.metadata.genre
  }
  
  // Fallback to looking up codes
  if (releaseData.value.metadata.subgenreCode) {
    const subgenre = getGenreByCode(releaseData.value.metadata.subgenreCode, 'genre-truth')
    return subgenre?.name || 'Not set'
  } else if (releaseData.value.metadata.genreCode) {
    const genre = getGenreByCode(releaseData.value.metadata.genreCode, 'genre-truth')
    return genre?.name || 'Not set'
  }
  
  return 'Not set'
})

// Watch genre code changes to sync human-readable names - USE GENRE-TRUTH
watch(() => releaseData.value.metadata.genreCode, (newCode) => {
  console.log('Genre code changed:', newCode) // Debug log
  if (newCode) {
    const genre = getGenreByCode(newCode, 'genre-truth')
    if (genre) {
      releaseData.value.metadata.genreName = genre.name
      releaseData.value.metadata.genre = genre.name // For backward compatibility
      console.log('Genre name set to:', genre.name) // Debug log
    }
  } else {
    releaseData.value.metadata.genreName = ''
    releaseData.value.metadata.genre = ''
  }
}, { immediate: true })

watch(() => releaseData.value.metadata.subgenreCode, (newCode) => {
  console.log('Subgenre code changed:', newCode) // Debug log
  if (newCode) {
    const subgenre = getGenreByCode(newCode, 'genre-truth')
    if (subgenre) {
      releaseData.value.metadata.subgenreName = subgenre.name
      releaseData.value.metadata.subgenre = subgenre.name // For backward compatibility
      console.log('Subgenre name set to:', subgenre.name) // Debug log
    }
  } else {
    releaseData.value.metadata.subgenreName = ''
    releaseData.value.metadata.subgenre = ''
  }
}, { immediate: true })

// Validation methods
const validateBasicInfo = () => {
  const errors = []
  const basic = releaseData.value.basic
  
  // Title validation
  if (!basic.title || basic.title.trim() === '') {
    errors.push('Release title is required')
  } else if (basic.title.length > 200) {
    errors.push('Release title must be less than 200 characters')
  }
  
  // Display artist validation
  if (!basic.displayArtist || basic.displayArtist.trim() === '') {
    errors.push('Display artist is required')
  } else if (basic.displayArtist.length > 200) {
    errors.push('Display artist must be less than 200 characters')
  }
  
  // Release type validation
  if (!basic.type) {
    errors.push('Release type is required')
  } else if (!['Single', 'EP', 'Album', 'Compilation'].includes(basic.type)) {
    errors.push('Invalid release type selected')
  }
  
  // Label validation (optional but recommended)
  if (basic.label && basic.label.length > 100) {
    errors.push('Label name must be less than 100 characters')
  }
  
  // Release date validation
  if (!basic.releaseDate) {
    errors.push('Release date is required')
  } else {
    const releaseDate = new Date(basic.releaseDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (isNaN(releaseDate.getTime())) {
      errors.push('Invalid release date')
    } else if (releaseDate < new Date('1900-01-01')) {
      errors.push('Release date cannot be before 1900')
    } else if (releaseDate > new Date('2100-01-01')) {
      errors.push('Release date cannot be after 2100')
    }
  }
  
  // Original release date validation (if provided)
  if (basic.originalReleaseDate) {
    const originalDate = new Date(basic.originalReleaseDate)
    const releaseDate = new Date(basic.releaseDate)
    
    if (isNaN(originalDate.getTime())) {
      errors.push('Invalid original release date')
    } else if (originalDate > releaseDate) {
      errors.push('Original release date cannot be after the release date')
    }
  }
  
  // UPC/EAN barcode validation for DDEX compliance
  if (!basic.barcode || basic.barcode.trim() === '') {
    errors.push('UPC/EAN barcode is required for DDEX delivery')
  } else {
    const barcode = basic.barcode.trim()
    
    // Remove any spaces or hyphens
    const cleanBarcode = barcode.replace(/[\s-]/g, '')
    
    // Check if it's all digits
    if (!/^\d+$/.test(cleanBarcode)) {
      errors.push('Barcode must contain only numbers')
    } 
    // Check length (UPC-A is 12 digits, EAN-13 is 13 digits, EAN-14 is 14 digits)
    else if (cleanBarcode.length !== 12 && cleanBarcode.length !== 13 && cleanBarcode.length !== 14) {
      errors.push('Barcode must be 12 digits (UPC-A), 13 digits (EAN-13), or 14 digits (EAN-14)')
    }
    // Validate checksum
    else if (cleanBarcode.length === 12 && !validateUPCChecksum(cleanBarcode)) {
      errors.push('Invalid UPC barcode - checksum validation failed')
    }
    else if (cleanBarcode.length === 13 && !validateEANChecksum(cleanBarcode)) {
      errors.push('Invalid EAN-13 barcode - checksum validation failed')
    }
  }
  
  // Catalog number validation (optional but recommended)
  if (basic.catalogNumber && basic.catalogNumber.trim() !== '') {
    const catalogNumber = basic.catalogNumber.trim()
    
    if (catalogNumber.length > 50) {
      errors.push('Catalog number must be less than 50 characters')
    }
    // Allow alphanumeric, hyphens, and underscores
    if (!/^[A-Za-z0-9\-_]+$/.test(catalogNumber)) {
      errors.push('Catalog number can only contain letters, numbers, hyphens, and underscores')
    }
  }
  
  return errors
}

// Helper function to validate UPC-A checksum (12 digits)
const validateUPCChecksum = (upc) => {
  if (upc.length !== 12) return false
  
  let sum = 0
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(upc[i])
    sum += (i % 2 === 0) ? digit * 3 : digit
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(upc[11])
}

// Helper function to validate EAN-13 checksum
const validateEANChecksum = (ean) => {
  if (ean.length !== 13) return false
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(ean[i])
    sum += (i % 2 === 0) ? digit : digit * 3
  }
  
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === parseInt(ean[12])
}

// Helper function to clean File objects and undefined values from data
const cleanDataForFirestore = (data) => {
  // Deep clean function to remove undefined values and File objects
  const deepClean = (obj) => {
    if (obj === null || obj === undefined) {
      return null
    }
    
    if (obj instanceof Date) {
      return obj
    }
    
    if (obj instanceof File) {
      return null // Don't send File objects to Firestore
    }
    
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
  
  // Clean the entire data object
  const cleanedData = deepClean(data)
  
  // Ensure required structure exists
  return {
    basic: cleanedData.basic || {},
    tracks: cleanedData.tracks || [],
    assets: {
      coverImage: cleanedData.assets?.coverImage?.url ? {
        url: cleanedData.assets.coverImage.url,
        name: cleanedData.assets.coverImage.name || '',
        size: cleanedData.assets.coverImage.size || 0,
        dimensions: cleanedData.assets.coverImage.dimensions || null
      } : null,
      additionalImages: []
    },
    metadata: {
      genre: cleanedData.metadata?.genre || '',
      genreCode: cleanedData.metadata?.genreCode || '',
      genreName: cleanedData.metadata?.genreName || '',
      subgenre: cleanedData.metadata?.subgenre || '',
      subgenreCode: cleanedData.metadata?.subgenreCode || '',
      subgenreName: cleanedData.metadata?.subgenreName || '',
      language: cleanedData.metadata?.language || 'en',
      copyright: cleanedData.metadata?.copyright || '',
      copyrightYear: cleanedData.metadata?.copyrightYear || new Date().getFullYear(),
      productionYear: cleanedData.metadata?.productionYear || new Date().getFullYear()
    },
    territories: {
      mode: cleanedData.territories?.mode || 'worldwide',
      included: cleanedData.territories?.included || [],
      excluded: cleanedData.territories?.excluded || []
    },
    preview: {
      ernVersion: cleanedData.preview?.ernVersion || '4.3',
      profile: cleanedData.preview?.profile || 'AudioAlbum',
      validated: cleanedData.preview?.validated || false
    }
  }
}

// Helper function to upload pending files
const uploadPendingFiles = async () => {
  if (!releaseId.value) return
  
  // Upload cover image if it's a File object
  if (releaseData.value.assets.coverImage?.file) {
    try {
      const coverResult = await uploadCoverImage(
        releaseData.value.assets.coverImage.file, 
        releaseId.value
      )
      releaseData.value.assets.coverImage = coverResult
    } catch (err) {
      console.error('Error uploading cover:', err)
    }
  }
  
  // Upload track audio files
  for (let i = 0; i < releaseData.value.tracks.length; i++) {
    const track = releaseData.value.tracks[i]
    if (track.audio?.file) {
      try {
        // First ensure the track has been created in Firestore
        if (!track.id) {
          const newTrack = await addTrack(releaseId.value, {
            title: track.title,
            artist: track.artist,
            duration: track.duration || 0,
            isrc: track.isrc || '',
            sequenceNumber: i + 1
          })
          releaseData.value.tracks[i].id = newTrack.id
        }
        
        const audioResult = await uploadTrackAudio(
          track.audio.file,
          releaseId.value,
          releaseData.value.tracks[i].id,
          (progress) => {
            uploadProgress.value[`track_${releaseData.value.tracks[i].id}`] = progress
          }
        )
        releaseData.value.tracks[i].audio = audioResult
      } catch (err) {
        console.error(`Error uploading audio for track ${i + 1}:`, err)
      }
    }
  }
}

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      // Run validation and check if there are no errors
      const basicErrors = validateBasicInfo()
      return basicErrors.length === 0
    case 2:
      return releaseData.value.tracks.length > 0
    case 3:
      return releaseData.value.assets.coverImage !== null
    case 4:
      // Check for genreCode OR subgenreCode OR genre OR subgenre (any genre selection is valid)
      const hasGenre = !!(
        releaseData.value.metadata.genreCode || 
        releaseData.value.metadata.subgenreCode ||
        releaseData.value.metadata.genre ||
        releaseData.value.metadata.subgenre
      )
      const hasCopyright = !!releaseData.value.metadata.copyright
      console.log('Step 4 validation - hasGenre:', hasGenre, {
        genreCode: releaseData.value.metadata.genreCode,
        subgenreCode: releaseData.value.metadata.subgenreCode,
        genre: releaseData.value.metadata.genre,
        subgenre: releaseData.value.metadata.subgenre
      })
      return hasGenre && hasCopyright
    case 5:
      return true // Territories are optional
    case 6:
      return releaseData.value.preview.validated
    default:
      return false
  }
})

// Load existing release if in edit mode
onMounted(async () => {
  if (isEditMode.value) {
    try {
      await loadRelease(releaseId.value)
      if (currentRelease.value) {
        // Populate form with existing data
        releaseData.value = {
          basic: currentRelease.value.basic || releaseData.value.basic,
          tracks: currentRelease.value.tracks || [],
          assets: currentRelease.value.assets || releaseData.value.assets,
          metadata: currentRelease.value.metadata || releaseData.value.metadata,
          territories: currentRelease.value.territories || releaseData.value.territories,
          preview: currentRelease.value.preview || releaseData.value.preview
        }
      }
    } catch (err) {
      console.error('Error loading release:', err)
      await showErrorToast('Failed to load release')
      router.push('/catalog')
    }
  }
})

// Watch for changes to enable auto-save
watch(releaseData, () => {
  hasUnsavedChanges.value = true
  scheduleAutoSave()
}, { deep: true })

// Methods
const nextStep = () => {
  // Validate current step before moving forward
  if (currentStep.value === 1) {
    const errors = validateBasicInfo()
    if (errors.length > 0) {
      validationErrors.value = errors
      showErrorToast('Please fix the errors before proceeding')
      return
    }
  }
  
  if (currentStep.value < totalSteps) {
    currentStep.value++
    validationErrors.value = [] // Clear errors when moving to next step
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const goToStep = (step) => {
  currentStep.value = step
}

// Auto-save functionality
const scheduleAutoSave = () => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  
  autoSaveTimer.value = setTimeout(() => {
    // Only auto-save if we have a release ID (existing release)
    // For new releases, wait until the user explicitly saves
    if (hasUnsavedChanges.value && releaseId.value) {
      autoSave()
    }
  }, 3000) // Auto-save after 3 seconds of inactivity
}

const autoSave = async () => {
  if (!hasUnsavedChanges.value) return
  
  try {
    // Clean the data before saving - remove File objects
    const cleanedData = cleanDataForFirestore(releaseData.value)
    
    await saveDraft(cleanedData, releaseId.value)
    lastSavedAt.value = new Date()
    hasUnsavedChanges.value = false
  } catch (err) {
    console.error('Auto-save failed:', err)
  }
}

// Save as draft
const saveAsDraft = async () => {
  if (isSaving.value) return
  
  isSaving.value = true
  try {
    // Clean the data before saving - remove File objects
    const cleanedData = cleanDataForFirestore(releaseData.value)
    
    const draft = await saveDraft(cleanedData, releaseId.value)
    
    if (!releaseId.value) {
      // If new release, update the ID for future saves
      releaseId.value = draft.id
      
      // Now upload any pending files
      await uploadPendingFiles()
    }
    
    lastSavedAt.value = new Date()
    hasUnsavedChanges.value = false
    
    // Show success message
    await showSuccessToast('Draft saved successfully')
    
    // Redirect to catalog after a short delay
    setTimeout(() => {
      router.push('/catalog')
    }, 1500)
  } catch (err) {
    console.error('Error saving draft:', err)
    await showErrorToast('Failed to save draft')
  } finally {
    isSaving.value = false
  }
}

// Generate ERN and save release
const generateERN = async () => {
  if (isSaving.value) return
  
  isSaving.value = true
  try {
    let release
    
    // First, we need to handle file uploads if this is a new release
    if (!releaseId.value) {
      // Clean the data first
      const cleanedData = cleanDataForFirestore(releaseData.value)
      
      // Create a draft release first to get an ID
      release = await createRelease({
        ...cleanedData,
        status: 'draft'
      })
      
      releaseId.value = release.id
      
      // Now upload any pending files
      await uploadPendingFiles()
      
      // Update the release to ready status
      const finalData = cleanDataForFirestore(releaseData.value)
      release = await updateRelease(releaseId.value, {
        ...finalData,
        status: 'ready'
      })
    } else {
      // Existing release - just update it
      const cleanedData = cleanDataForFirestore(releaseData.value)
      release = await updateRelease(releaseId.value, {
        ...cleanedData,
        status: 'ready'
      })
    }
    
    // TODO: In the future, this will call the ERN generation service
    console.log('Generating ERN for release:', release)
    
    await showSuccessToast('Release created successfully!')
    
    // Navigate to the catalog or release detail page
    setTimeout(() => {
      router.push(`/catalog/${release.id}`)
    }, 1500)
  } catch (err) {
    console.error('Error generating ERN:', err)
    await showErrorToast(err.message || 'Failed to create release')
  } finally {
    isSaving.value = false
  }
}

// Cancel creation
const cancelCreation = async () => {
  if (hasUnsavedChanges.value) {
    const confirmed = confirm('You have unsaved changes. Are you sure you want to leave?')
    if (!confirmed) return
  }
  
  router.push('/catalog')
}

// Track management
const handleAddTrack = async () => {
  const newTrack = {
    title: `Track ${releaseData.value.tracks.length + 1}`,
    artist: releaseData.value.basic.displayArtist,
    duration: 0,
    isrc: '',
    audio: null
  }
  
  if (releaseId.value) {
    // If release exists, add to database
    try {
      const track = await addTrack(releaseId.value, newTrack)
      releaseData.value.tracks.push(track)
    } catch (err) {
      console.error('Error adding track:', err)
      await showErrorToast('Failed to add track')
    }
  } else {
    // If new release, just add to local state
    releaseData.value.tracks.push({
      ...newTrack,
      id: Date.now().toString(),
      sequenceNumber: releaseData.value.tracks.length + 1
    })
  }
}

const handleUpdateTrack = async (index, updates) => {
  const track = releaseData.value.tracks[index]
  
  if (releaseId.value && track.id) {
    // Update in database
    try {
      await updateTrack(releaseId.value, track.id, updates)
      releaseData.value.tracks[index] = { ...track, ...updates }
    } catch (err) {
      console.error('Error updating track:', err)
      await showErrorToast('Failed to update track')
    }
  } else {
    // Update local state only
    releaseData.value.tracks[index] = { ...track, ...updates }
  }
}

const handleRemoveTrack = async (index) => {
  const track = releaseData.value.tracks[index]
  
  if (!confirm(`Remove "${track.title}"?`)) return
  
  if (releaseId.value && track.id) {
    // Remove from database
    try {
      await removeTrack(releaseId.value, track.id)
      releaseData.value.tracks.splice(index, 1)
    } catch (err) {
      console.error('Error removing track:', err)
      await showErrorToast('Failed to remove track')
    }
  } else {
    // Remove from local state only
    releaseData.value.tracks.splice(index, 1)
  }
}

// File upload handlers
const handleCoverImageUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // Validate image
  if (!file.type.startsWith('image/')) {
    await showErrorToast('Please select an image file')
    return
  }
  
  // Check dimensions
  const img = new Image()
  img.src = URL.createObjectURL(file)
  await new Promise(resolve => img.onload = resolve)
  
  if (img.width < 3000 || img.height < 3000) {
    const proceed = confirm('Cover image should be at least 3000x3000px. Continue anyway?')
    if (!proceed) return
  }
  
  // Upload if release exists, otherwise store locally
  if (releaseId.value) {
    try {
      uploadProgress.value.cover = 0
      const result = await uploadCoverImage(file, releaseId.value)
      releaseData.value.assets.coverImage = result
      await showSuccessToast('Cover image uploaded successfully')
    } catch (err) {
      console.error('Error uploading cover:', err)
      await showErrorToast('Failed to upload cover image')
    } finally {
      delete uploadProgress.value.cover
    }
  } else {
    // Store file locally for upload after release creation
    releaseData.value.assets.coverImage = {
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }
  }
}

const handleAudioUpload = async (event, trackIndex) => {
  const file = event.target.files[0]
  if (!file) return
  
  const track = releaseData.value.tracks[trackIndex]
  
  // Validate audio file
  const validFormats = ['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mpeg', 'audio/mp3']
  if (!validFormats.includes(file.type)) {
    await showErrorToast('Please upload WAV, FLAC, or MP3 files')
    return
  }
  
  if (releaseId.value && track.id) {
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
      await showSuccessToast(`Audio uploaded for "${track.title}"`)
    } catch (err) {
      console.error('Error uploading audio:', err)
      await showErrorToast('Failed to upload audio file')
    } finally {
      delete uploadProgress.value[`track_${track.id}`]
    }
  } else {
    // Store file locally for upload after release creation
    track.audio = {
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file)
    }
  }
}

// Validation - FIXED TO CHECK BOTH genreCode AND genre
const validateERN = async () => {
  // Mock validation for now
  // In production, this would call the DDEX Workbench API
  isSaving.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Check all required fields across all steps
    const errors = []
    
    // Validate basic info
    const basicErrors = validateBasicInfo()
    errors.push(...basicErrors)
    
    // Validate tracks
    if (releaseData.value.tracks.length === 0) {
      errors.push('At least one track is required')
    } else {
      releaseData.value.tracks.forEach((track, index) => {
        if (!track.title || track.title.trim() === '') {
          errors.push(`Track ${index + 1}: Title is required`)
        }
        if (!track.artist || track.artist.trim() === '') {
          errors.push(`Track ${index + 1}: Artist is required`)
        }
        if (!track.audio) {
          errors.push(`Track ${index + 1}: Audio file is required`)
        }
      })
    }
    
    // Validate assets
    if (!releaseData.value.assets.coverImage) {
      errors.push('Cover image is required')
    }
    
    // Validate metadata - check for ANY genre selection (parent or sub)
    const hasGenre = !!(
      releaseData.value.metadata.genreCode || 
      releaseData.value.metadata.subgenreCode ||
      releaseData.value.metadata.genre ||
      releaseData.value.metadata.subgenre
    )
    
    console.log('Validation - checking genre:', {
      genreCode: releaseData.value.metadata.genreCode,
      subgenreCode: releaseData.value.metadata.subgenreCode,
      genre: releaseData.value.metadata.genre,
      subgenre: releaseData.value.metadata.subgenre,
      hasGenre
    })
    
    if (!hasGenre) {
      errors.push('Genre is required')
    }
    if (!releaseData.value.metadata.copyright) {
      errors.push('Copyright information is required')
    }
    
    if (errors.length > 0) {
      validationErrors.value = errors
      await showErrorToast('Validation failed. Please check all required fields.')
      return
    }
    
    releaseData.value.preview.validated = true
    validationErrors.value = []
    await showSuccessToast('Validation successful!')
  } catch (err) {
    console.error('Validation error:', err)
    await showErrorToast('Validation failed')
  } finally {
    isSaving.value = false
  }
}

// Toast notifications (simple implementation)
const showSuccessToast = (message) => {
  // In production, use a proper toast library
  console.log('✅', message)
  return Promise.resolve()
}

const showErrorToast = (message) => {
  // In production, use a proper toast library
  console.error('❌', message)
  return Promise.resolve()
}

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// Format duration
const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="new-release">
    <div class="container">
      <!-- Keep all existing template exactly as before -->
      <!-- Header -->
      <div class="wizard-header">
        <h1 class="page-title">
          {{ isEditMode ? 'Edit Release' : 'Create New Release' }}
        </h1>
        <div class="wizard-actions">
          <div v-if="lastSavedAt" class="save-status">
            <font-awesome-icon icon="check-circle" class="text-success" />
            <span>Saved {{ new Date(lastSavedAt).toLocaleTimeString() }}</span>
          </div>
          <button 
            @click="saveAsDraft" 
            class="btn btn-secondary"
            :disabled="isSaving"
          >
            <font-awesome-icon icon="save" />
            {{ isSaving ? 'Saving...' : 'Save as Draft' }}
          </button>
          <button @click="cancelCreation" class="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>

      <!-- Error display -->
      <div v-if="error" class="error-banner">
        <font-awesome-icon icon="exclamation-triangle" />
        {{ error }}
      </div>

      <!-- Progress Bar -->
      <div class="wizard-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
          ></div>
        </div>
        <div class="progress-steps">
          <div 
            v-for="step in totalSteps" 
            :key="step"
            class="progress-step"
            :class="{ 
              active: step === currentStep, 
              completed: step < currentStep 
            }"
            @click="goToStep(step)"
          >
            <div class="step-number">
              <font-awesome-icon v-if="step < currentStep" icon="check" />
              <span v-else>{{ step }}</span>
            </div>
            <span class="step-title">{{ stepTitles[step - 1] }}</span>
          </div>
        </div>
      </div>

      <!-- Wizard Content -->
      <div class="wizard-content card">
        <div class="card-header">
          <h2 class="step-heading">Step {{ currentStep }}: {{ currentStepTitle }}</h2>
          <div v-if="hasUnsavedChanges" class="unsaved-indicator">
            <font-awesome-icon icon="circle" />
            Unsaved changes
          </div>
        </div>
        <div class="card-body">
          <!-- Step 1: Basic Information -->
          <div v-if="currentStep === 1" class="wizard-step">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label required">Release Title</label>
                <input 
                  v-model="releaseData.basic.title" 
                  type="text" 
                  class="form-input"
                  placeholder="Enter release title"
                  required
                />
              </div>
              
              <div class="form-group">
                <label class="form-label required">Display Artist</label>
                <input 
                  v-model="releaseData.basic.displayArtist" 
                  type="text" 
                  class="form-input"
                  placeholder="Enter artist name"
                  required
                />
              </div>
              
              <div class="form-group">
                <label class="form-label required">Release Type</label>
                <select v-model="releaseData.basic.type" class="form-select">
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
                  placeholder="Enter label name"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Catalog Number</label>
                <input 
                  v-model="releaseData.basic.catalogNumber" 
                  type="text" 
                  class="form-input"
                  placeholder="e.g., CAT001"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label required">Barcode (UPC/EAN)</label>
                <input 
                  v-model="releaseData.basic.barcode" 
                  type="text" 
                  class="form-input"
                  placeholder="e.g., 669158581085"
                  pattern="[0-9]{12,14}"
                  maxlength="14"
                  required
                />
                <span class="form-hint">Required for DDEX-compliant delivery</span>
              </div>
              
              <div class="form-group">
                <label class="form-label required">Release Date</label>
                <input 
                  v-model="releaseData.basic.releaseDate" 
                  type="date" 
                  class="form-input"
                  required
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Original Release Date</label>
                <input 
                  v-model="releaseData.basic.originalReleaseDate" 
                  type="date" 
                  class="form-input"
                />
              </div>
            </div>
            
            <!-- Validation errors for Step 1 -->
            <div v-if="validationErrors.length > 0" class="validation-errors">
              <h4>Please fix the following errors:</h4>
              <ul>
                <li v-for="(error, index) in validationErrors" :key="index">
                  {{ error }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Step 2: Track Management -->
          <div v-if="currentStep === 2" class="wizard-step">
            <div class="tracks-header">
              <p class="step-description">Add and organize the tracks for your release</p>
              <button @click="handleAddTrack" class="btn btn-primary">
                <font-awesome-icon icon="plus" />
                Add Track
              </button>
            </div>
            
            <div v-if="releaseData.tracks.length === 0" class="empty-tracks">
              <font-awesome-icon icon="music" class="empty-icon" />
              <p>No tracks added yet</p>
              <button @click="handleAddTrack" class="btn btn-primary">
                Add Your First Track
              </button>
            </div>
            
            <div v-else class="tracks-list">
              <div 
                v-for="(track, index) in releaseData.tracks" 
                :key="track.id || index"
                class="track-item"
              >
                <div class="track-number">{{ index + 1 }}</div>
                <div class="track-info">
                  <input 
                    :value="track.title"
                    @input="handleUpdateTrack(index, { title: $event.target.value })"
                    type="text" 
                    class="form-input"
                    placeholder="Track title"
                  />
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
                    pattern="[A-Z]{2}[A-Z0-9]{3}[0-9]{7}"
                  />
                </div>
                <div class="track-audio">
                  <label class="btn btn-secondary btn-sm">
                    <font-awesome-icon icon="upload" />
                    {{ track.audio ? 'Replace' : 'Upload' }} Audio
                    <input 
                      type="file" 
                      accept="audio/*"
                      @change="handleAudioUpload($event, index)"
                      style="display: none"
                    />
                  </label>
                  <div v-if="track.audio" class="audio-info">
                    <font-awesome-icon icon="music" />
                    <span>{{ track.audio.name || 'Audio uploaded' }}</span>
                    <span v-if="track.audio.duration">
                      ({{ formatDuration(track.audio.duration) }})
                    </span>
                  </div>
                  <div v-if="uploadProgress[`track_${track.id}`] !== undefined" class="upload-progress">
                    <div class="progress-bar">
                      <div 
                        class="progress-fill" 
                        :style="{ width: `${uploadProgress[`track_${track.id}`]}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
                <button 
                  @click="handleRemoveTrack(index)" 
                  class="btn-icon"
                  title="Remove track"
                >
                  <font-awesome-icon icon="trash" />
                </button>
              </div>
            </div>
          </div>

          <!-- Step 3: Asset Upload -->
          <div v-if="currentStep === 3" class="wizard-step">
            <div class="asset-section">
              <h3>Cover Image</h3>
              <p class="step-description">Upload the main cover image for your release (minimum 3000x3000px)</p>
              
              <div v-if="!releaseData.assets.coverImage" class="upload-area">
                <label class="upload-label">
                  <input 
                    type="file" 
                    accept="image/*"
                    @change="handleCoverImageUpload"
                    style="display: none"
                  />
                  <font-awesome-icon icon="upload" class="upload-icon" />
                  <p>Drag and drop or click to upload</p>
                  <span class="btn btn-primary">Choose File</span>
                </label>
              </div>
              
              <div v-else class="uploaded-asset">
                <img 
                  :src="releaseData.assets.coverImage.url || releaseData.assets.coverImage.preview" 
                  :alt="releaseData.assets.coverImage.name"
                  class="cover-preview"
                />
                <div class="asset-details">
                  <h4>{{ releaseData.assets.coverImage.name }}</h4>
                  <p>{{ formatFileSize(releaseData.assets.coverImage.size) }}</p>
                  <button @click="releaseData.assets.coverImage = null" class="btn btn-secondary btn-sm">
                    Replace Image
                  </button>
                </div>
              </div>
              
              <div v-if="uploadProgress.cover !== undefined" class="upload-progress">
                <p>Uploading cover image...</p>
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: `${uploadProgress.cover}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Metadata - USING GENRE-TRUTH DSP -->
          <div v-if="currentStep === 4" class="wizard-step">
            <div class="form-section">
              <h3>Genre Classification</h3>
              <GenreSelector
                v-model="releaseData.metadata.genreCode"
                v-model:subgenre-value="releaseData.metadata.subgenreCode"
                dsp="genre-truth"
              />
            </div>
            
            <div class="form-grid" style="margin-top: var(--space-xl);">
              <div class="form-group">
                <label class="form-label required">Language</label>
                <select v-model="releaseData.metadata.language" class="form-select">
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
                />
              </div>
              
              <div class="form-group span-2">
                <label class="form-label required">Copyright</label>
                <input 
                  v-model="releaseData.metadata.copyright" 
                  type="text" 
                  class="form-input"
                  :placeholder="`© ${releaseData.metadata.copyrightYear} ${releaseData.basic.label || 'Label Name'}`"
                  required
                />
              </div>
            </div>
          </div>

          <!-- Step 5: Territories & Rights -->
          <div v-if="currentStep === 5" class="wizard-step">
            <div class="territory-options">
              <label class="radio-option">
                <input 
                  v-model="releaseData.territories.mode" 
                  type="radio" 
                  value="worldwide"
                />
                <div class="radio-content">
                  <span class="radio-title">Worldwide</span>
                  <span class="radio-description">Distribute to all territories</span>
                </div>
              </label>
              
              <label class="radio-option">
                <input 
                  v-model="releaseData.territories.mode" 
                  type="radio" 
                  value="selected"
                />
                <div class="radio-content">
                  <span class="radio-title">Selected Territories</span>
                  <span class="radio-description">Choose specific territories</span>
                </div>
              </label>
            </div>
            
            <div v-if="releaseData.territories.mode === 'selected'" class="territory-selector">
              <p class="info-message">
                <font-awesome-icon icon="info-circle" />
                Territory selection will be available in the next update
              </p>
            </div>
          </div>

          <!-- Step 6: Review & Generate -->
          <div v-if="currentStep === 6" class="wizard-step">
            <div class="review-section">
              <h3>Release Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Title:</span>
                  <span class="summary-value">{{ releaseData.basic.title || 'Not set' }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Artist:</span>
                  <span class="summary-value">{{ releaseData.basic.displayArtist || 'Not set' }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Type:</span>
                  <span class="summary-value">{{ releaseData.basic.type }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Barcode:</span>
                  <span class="summary-value">{{ releaseData.basic.barcode || 'Not set' }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Release Date:</span>
                  <span class="summary-value">{{ releaseData.basic.releaseDate || 'Not set' }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Tracks:</span>
                  <span class="summary-value">{{ releaseData.tracks.length }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Genre:</span>
                  <span class="summary-value">{{ displayGenreName }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Cover Image:</span>
                  <span class="summary-value">
                    {{ releaseData.assets.coverImage ? 'Uploaded' : 'Not uploaded' }}
                  </span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Territories:</span>
                  <span class="summary-value">
                    {{ releaseData.territories.mode === 'worldwide' ? 'Worldwide' : 'Selected' }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="ern-section">
              <h3>ERN Configuration</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">ERN Version</label>
                  <select v-model="releaseData.preview.ernVersion" class="form-select">
                    <option value="3.8.2">ERN 3.8.2</option>
                    <option value="4.2">ERN 4.2</option>
                    <option value="4.3">ERN 4.3 (Recommended)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Profile</label>
                  <select v-model="releaseData.preview.profile" class="form-select">
                    <option value="AudioAlbum">Audio Album</option>
                    <option value="AudioSingle">Audio Single</option>
                    <option value="VideoAlbum">Video Album</option>
                  </select>
                </div>
              </div>
              
              <div v-if="validationErrors.length > 0" class="validation-errors">
                <h4>Validation Errors:</h4>
                <ul>
                  <li v-for="(error, index) in validationErrors" :key="index">
                    {{ error }}
                  </li>
                </ul>
              </div>
              
              <button 
                @click="validateERN" 
                class="btn btn-secondary"
                :disabled="isSaving"
              >
                <font-awesome-icon icon="check" />
                {{ isSaving ? 'Validating...' : 'Validate ERN' }}
              </button>
              
              <div v-if="releaseData.preview.validated" class="validation-success">
                <font-awesome-icon icon="check-circle" />
                ERN validated successfully
              </div>
            </div>
          </div>
        </div>
        
        <!-- Navigation Footer -->
        <div class="card-footer wizard-footer">
          <button 
            @click="previousStep" 
            class="btn btn-secondary"
            :disabled="currentStep === 1"
          >
            <font-awesome-icon icon="chevron-left" />
            Previous
          </button>
          
          <button 
            v-if="currentStep < totalSteps"
            @click="nextStep" 
            class="btn btn-primary"
            :disabled="!canProceed"
          >
            Next
            <font-awesome-icon icon="chevron-right" />
          </button>
          
          <button 
            v-else
            @click="generateERN" 
            class="btn btn-success"
            :disabled="!canProceed || isSaving"
          >
            <font-awesome-icon icon="check" />
            {{ isSaving ? 'Creating Release...' : 'Generate ERN & Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-release {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

.wizard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
}

.wizard-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.save-status {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.unsaved-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-warning);
  font-size: var(--text-sm);
}

.unsaved-indicator svg {
  font-size: 0.5rem;
}

.error-banner {
  background-color: rgba(234, 67, 53, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  color: var(--color-error);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

/* Progress Bar */
.wizard-progress {
  margin-bottom: var(--space-xl);
  position: relative;
}

.progress-bar {
  height: 4px;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
  margin-bottom: var(--space-xl);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
  z-index: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
  transition: all var(--transition-base);
  font-size: var(--text-sm);
}

.progress-step:hover .step-number {
  transform: scale(1.1);
}

.progress-step.active .step-number {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.1);
}

.progress-step.completed .step-number {
  background-color: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.step-title {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  max-width: 120px;
  line-height: 1.3;
}

.progress-step.active .step-title {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.progress-step.completed .step-title {
  color: var(--color-text);
}

/* Connecting lines between steps */
.progress-steps::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 10%;
  right: 10%;
  height: 2px;
  background-color: var(--color-border);
  z-index: 0;
}

/* Wizard Content */
.wizard-content {
  margin-bottom: var(--space-xl);
}

.step-heading {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.wizard-step {
  min-height: 400px;
}

.step-description {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

/* Form Elements */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.span-2 {
  grid-column: span 2;
}

.form-label {
  font-weight: var(--font-medium);
  margin-bottom: var(--space-xs);
  color: var(--color-text);
}

.form-label.required::after {
  content: ' *';
  color: var(--color-error);
}

.form-hint {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-top: var(--space-xs);
  display: block;
}

.form-input,
.form-select,
.form-textarea {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: all var(--transition-base);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

/* Tracks Section */
.tracks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.empty-tracks {
  text-align: center;
  padding: var(--space-3xl);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
  color: var(--color-border);
  margin-bottom: var(--space-md);
}

.tracks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.track-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

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
  flex-shrink: 0;
}

.track-info {
  flex: 1;
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.track-info .form-input {
  flex: 1;
  min-width: 200px;
}

.track-audio {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.audio-info {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.upload-progress {
  margin-top: var(--space-sm);
}

.upload-progress p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.progress-bar {
  height: 4px;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--color-primary);
  transition: width var(--transition-base);
}

/* Asset Upload */
.asset-section {
  margin-bottom: var(--space-xl);
}

.asset-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
}

/* Asset Upload */
.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3xl);
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
  gap: var(--space-md);
  cursor: pointer;
}

.upload-icon {
  font-size: 3rem;
  color: var(--color-text-tertiary);
}

.upload-label .btn {
  pointer-events: none; /* Prevent the button from capturing clicks */
}

.uploaded-asset {
  display: flex;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.cover-preview {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.asset-details h4 {
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-xs);
}

.asset-details p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
}

/* Territory Options */
.territory-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.radio-option {
  display: flex;
  align-items: center;
  padding: var(--space-lg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
}

.radio-option:hover {
  border-color: var(--color-primary);
  background-color: var(--color-bg-secondary);
}

.radio-option input[type="radio"] {
  margin-right: var(--space-md);
}

.radio-option input[type="radio"]:checked + .radio-content {
  color: var(--color-primary);
}

.radio-content {
  display: flex;
  flex-direction: column;
}

.radio-title {
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-xs);
}

.radio-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.info-message {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background-color: var(--color-info);
  color: white;
  border-radius: var(--radius-md);
  margin-top: var(--space-lg);
}

/* Review Section */
.review-section {
  margin-bottom: var(--space-xl);
}

.review-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-lg);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-lg);
}

.summary-item {
  display: flex;
  gap: var(--space-sm);
}

.summary-label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.summary-value {
  color: var(--color-text);
}

/* ERN Section */
.ern-section {
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.ern-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-lg);
}

.validation-errors {
  background-color: rgba(234, 67, 53, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin: var(--space-lg) 0;
}

.validation-errors h4 {
  color: var(--color-error);
  margin-bottom: var(--space-sm);
}

.validation-errors ul {
  list-style: disc;
  padding-left: var(--space-lg);
  color: var(--color-error);
}

.validation-success {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-success);
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background-color: rgba(52, 168, 83, 0.1);
  border-radius: var(--radius-md);
}

/* Footer */
.wizard-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.btn-success {
  background-color: var(--color-success);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: var(--color-success);
  filter: brightness(1.1);
  transform: translateY(-1px);
}

/* Button variations */
.btn-sm {
  padding: var(--space-xs) var(--space-md);
  font-size: var(--text-sm);
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .wizard-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .wizard-actions {
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .wizard-actions .btn {
    width: 100%;
  }
  
  .progress-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-md);
  }
  
  .progress-steps::before {
    display: none;
  }
  
  .step-title {
    font-size: var(--text-xs);
    max-width: 80px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.span-2 {
    grid-column: span 1;
  }
  
  .track-item {
    flex-direction: column;
    align-items: stretch;
  }
  
  .track-info {
    flex-direction: column;
  }
  
  .uploaded-asset {
    flex-direction: column;
  }
  
  .cover-preview {
    width: 100%;
    height: auto;
    max-width: 300px;
    margin: 0 auto;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .progress-steps {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .step-number {
    width: 36px;
    height: 36px;
    font-size: var(--text-xs);
  }
}
</style>