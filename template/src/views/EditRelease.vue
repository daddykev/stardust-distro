<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'
import { useAuth } from '../composables/useAuth'
import GenreSelector from '../components/GenreSelector.vue'
import { getGenreByCode } from '../dictionaries/genres'

const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const { 
  updateRelease,
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

// Release ID from route
const releaseId = ref(route.params.id)

// UI State
const expandedSections = ref({
  basic: true, // Start with basic info expanded
  tracks: false,
  assets: false,
  metadata: false,
  territories: false
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
  territories: {
    mode: 'worldwide',
    included: [],
    excluded: []
  }
})

// Original data for comparison
const originalData = ref(null)

// Auto-save functionality
const autoSaveTimer = ref(null)
const lastSavedAt = ref(null)
const isSaving = ref(false)
const saveError = ref(null)

// Validation
const validationErrors = ref({
  basic: [],
  tracks: [],
  assets: [],
  metadata: [],
  territories: []
})

// Upload progress tracking
const uploadProgress = ref({})

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

// Section completion status
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
    territories: {
      complete: true, // Territories are optional
      summary: releaseData.value.territories.mode === 'worldwide' ? 'Worldwide' : 'Selected territories',
      errors: validationErrors.value.territories.length
    }
  }
})

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
        territories: { ...releaseData.value.territories, ...(currentRelease.value.territories || {}) }
      }
      
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
    audio: null
  }
  
  releaseData.value.tracks.push(newTrack)
  modifiedSections.value.add('tracks')
}

const handleUpdateTrack = (index, updates) => {
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

// Helper functions
const formatDate = (dateValue) => {
  if (!dateValue) return 'No date set'
  
  let date
  if (dateValue?.toDate) {
    date = dateValue.toDate()
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue)
  } else {
    date = dateValue
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
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <div class="header-info">
            <h1 class="page-title">{{ releaseData.basic.title || 'Untitled Release' }}</h1>
            <p class="page-subtitle">{{ releaseData.basic.displayArtist ? `${releaseData.basic.type} by ${releaseData.basic.displayArtist}` : 'Edit Release' }}</p>
          </div>
          
          <div class="header-actions">
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
        <div v-if="lastSavedAt || saveError" class="save-status">
          <div v-if="saveError" class="save-error">
            <font-awesome-icon icon="exclamation-triangle" />
            {{ saveError }}
          </div>
          <div v-else-if="lastSavedAt" class="save-success">
            <font-awesome-icon icon="check-circle" />
            Last saved {{ new Date(lastSavedAt).toLocaleTimeString() }}
          </div>
        </div>
        
        <!-- Quick actions bar -->
        <div class="quick-actions">
          <button @click="expandAll" class="btn btn-ghost btn-sm">
            <font-awesome-icon icon="expand" />
            Expand All
          </button>
          <button @click="collapseAll" class="btn btn-ghost btn-sm">
            <font-awesome-icon icon="compress" />
            Collapse All
          </button>
        </div>
      </div>
    </div>

    <!-- Main content with collapsible sections -->
    <div class="container">
      <!-- Loading state -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading release data...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error && !releaseData.basic.title" class="error-container card">
        <font-awesome-icon icon="exclamation-triangle" />
        <h2>Failed to load release</h2>
        <p>{{ error }}</p>
        <button @click="router.push('/catalog')" class="btn btn-primary">
          Back to Catalog
        </button>
      </div>

      <!-- Edit sections -->
      <div v-else class="edit-sections">
        <!-- Basic Information Section -->
        <div class="collapsible-section" :class="{ expanded: expandedSections.basic, modified: modifiedSections.has('basic') }">
          <div class="section-header" @click="toggleSection('basic')">
            <div class="section-icon">
              <font-awesome-icon :icon="expandedSections.basic ? 'chevron-down' : 'chevron-right'" />
            </div>
            <div class="section-info">
              <h2 class="section-title">
                Basic Information
                <span v-if="sectionStatus.basic.complete" class="status-badge complete">
                  <font-awesome-icon icon="check" />
                </span>
                <span v-else-if="sectionStatus.basic.errors" class="status-badge error">
                  {{ sectionStatus.basic.errors }}
                </span>
              </h2>
              <p class="section-summary">{{ sectionStatus.basic.summary }}</p>
            </div>
          </div>
          
          <div v-if="expandedSections.basic" class="section-content">
            <div class="form-grid">
              <div class="form-group span-2">
                <label class="form-label required">Release Title</label>
                <input 
                  v-model="releaseData.basic.title" 
                  type="text" 
                  class="form-input"
                  placeholder="Enter release title"
                  @input="modifiedSections.add('basic')"
                />
              </div>
              
              <div class="form-group span-2">
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
        <div class="collapsible-section" :class="{ expanded: expandedSections.tracks, modified: modifiedSections.has('tracks') }">
          <div class="section-header" @click="toggleSection('tracks')">
            <div class="section-icon">
              <font-awesome-icon :icon="expandedSections.tracks ? 'chevron-down' : 'chevron-right'" />
            </div>
            <div class="section-info">
              <h2 class="section-title">
                Tracks
                <span v-if="sectionStatus.tracks.complete" class="status-badge complete">
                  <font-awesome-icon icon="check" />
                </span>
                <span v-else-if="sectionStatus.tracks.warnings" class="status-badge warning">
                  {{ sectionStatus.tracks.warnings }} missing audio
                </span>
              </h2>
              <p class="section-summary">{{ sectionStatus.tracks.summary }}</p>
            </div>
          </div>
          
          <div v-if="expandedSections.tracks" class="section-content">
            <div class="tracks-header">
              <button @click="handleAddTrack" class="btn btn-primary btn-sm">
                <font-awesome-icon icon="plus" />
                Add Track
              </button>
            </div>
            
            <div v-if="releaseData.tracks.length === 0" class="empty-tracks">
              <font-awesome-icon icon="music" />
              <p>No tracks yet</p>
            </div>
            
            <div v-else class="tracks-list">
              <div v-for="(track, index) in releaseData.tracks" :key="track.id" class="track-item">
                <div class="track-number">{{ index + 1 }}</div>
                
                <div class="track-details">
                  <input 
                    :value="track.title"
                    @input="handleUpdateTrack(index, { title: $event.target.value })"
                    type="text" 
                    class="form-input"
                    placeholder="Track title"
                  />
                  
                  <div class="track-meta">
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
                  
                  <div class="track-audio">
                    <label class="btn btn-secondary btn-sm">
                      <font-awesome-icon icon="upload" />
                      {{ track.audio ? 'Replace Audio' : 'Upload Audio' }}
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
        <div class="collapsible-section" :class="{ expanded: expandedSections.assets, modified: modifiedSections.has('assets') }">
          <div class="section-header" @click="toggleSection('assets')">
            <div class="section-icon">
              <font-awesome-icon :icon="expandedSections.assets ? 'chevron-down' : 'chevron-right'" />
            </div>
            <div class="section-info">
              <h2 class="section-title">
                Assets
                <span v-if="sectionStatus.assets.complete" class="status-badge complete">
                  <font-awesome-icon icon="check" />
                </span>
              </h2>
              <p class="section-summary">{{ sectionStatus.assets.summary }}</p>
            </div>
          </div>
          
          <div v-if="expandedSections.assets" class="section-content">
            <div class="asset-section">
              <h3>Cover Image</h3>
              
              <div v-if="!releaseData.assets.coverImage" class="upload-area">
                <label class="upload-label">
                  <input 
                    type="file" 
                    accept="image/*"
                    @change="handleCoverImageUpload"
                    style="display: none"
                  />
                  <font-awesome-icon icon="upload" class="upload-icon" />
                  <p>Click to upload cover image</p>
                  <span class="upload-hint">Minimum 3000x3000px</span>
                </label>
              </div>
              
              <div v-else class="uploaded-asset">
                <img 
                  :src="releaseData.assets.coverImage.url || releaseData.assets.coverImage.preview" 
                  :alt="releaseData.assets.coverImage.name"
                  class="cover-preview"
                />
                <div class="asset-info">
                  <h4>{{ releaseData.assets.coverImage.name }}</h4>
                  <p>{{ formatFileSize(releaseData.assets.coverImage.size) }}</p>
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
              
              <div v-if="uploadProgress.cover" class="progress-bar">
                <div class="progress-fill" :style="{ width: `${uploadProgress.cover}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Metadata Section -->
        <div class="collapsible-section" :class="{ expanded: expandedSections.metadata, modified: modifiedSections.has('metadata') }">
          <div class="section-header" @click="toggleSection('metadata')">
            <div class="section-icon">
              <font-awesome-icon :icon="expandedSections.metadata ? 'chevron-down' : 'chevron-right'" />
            </div>
            <div class="section-info">
              <h2 class="section-title">
                Metadata
                <span v-if="sectionStatus.metadata.complete" class="status-badge complete">
                  <font-awesome-icon icon="check" />
                </span>
              </h2>
              <p class="section-summary">{{ sectionStatus.metadata.summary }}</p>
            </div>
          </div>
          
          <div v-if="expandedSections.metadata" class="section-content">
            <div class="form-section">
              <h3>Genre Classification</h3>
              <GenreSelector
                v-model="releaseData.metadata.genreCode"
                v-model:subgenre-value="releaseData.metadata.subgenreCode"
                dsp="genre-truth"
                @update:model-value="handleGenreUpdate"
                @update:subgenre-value="handleSubgenreUpdate"
              />
            </div>
            
            <div class="form-grid">
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
              
              <div class="form-group span-2">
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

        <!-- Territories Section -->
        <div class="collapsible-section" :class="{ expanded: expandedSections.territories, modified: modifiedSections.has('territories') }">
          <div class="section-header" @click="toggleSection('territories')">
            <div class="section-icon">
              <font-awesome-icon :icon="expandedSections.territories ? 'chevron-down' : 'chevron-right'" />
            </div>
            <div class="section-info">
              <h2 class="section-title">
                Territories & Rights
                <span v-if="sectionStatus.territories.complete" class="status-badge complete">
                  <font-awesome-icon icon="check" />
                </span>
              </h2>
              <p class="section-summary">{{ sectionStatus.territories.summary }}</p>
            </div>
          </div>
          
          <div v-if="expandedSections.territories" class="section-content">
            <div class="territory-options">
              <label class="radio-option">
                <input 
                  v-model="releaseData.territories.mode" 
                  type="radio" 
                  value="worldwide"
                  @change="modifiedSections.add('territories')"
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
                  @change="modifiedSections.add('territories')"
                />
                <div class="radio-content">
                  <span class="radio-title">Selected Territories</span>
                  <span class="radio-description">Choose specific territories</span>
                </div>
              </label>
            </div>
            
            <div v-if="releaseData.territories.mode === 'selected'" class="info-message">
              <font-awesome-icon icon="info-circle" />
              Territory selection will be available in the next update
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating save button for mobile (shows only when scrolled) -->
    <button 
      v-if="hasChanges"
      @click="saveChanges" 
      class="floating-save-btn mobile-only"
      :disabled="!canSave"
    >
      <font-awesome-icon v-if="isSaving" icon="spinner" class="fa-spin" />
      <font-awesome-icon v-else icon="save" />
    </button>
  </div>
</template>

<style scoped>
.edit-release {
  min-height: calc(100vh - 64px);
  padding-bottom: var(--space-3xl);
  background-color: var(--color-bg);
}

/* Page Header */
.page-header {
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-lg) 0;
  margin-bottom: var(--space-xl);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.header-info {
  flex: 1;
  min-width: 0;
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin: 0;
  margin-bottom: var(--space-xs);
}

.page-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
}

/* Save Status Bar */
.save-status {
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.save-error {
  color: var(--color-error);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.save-success {
  color: var(--color-success);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

/* Quick Actions */
.quick-actions {
  margin-top: var(--space-md);
  display: flex;
  gap: var(--space-sm);
}

.btn-ghost {
  background-color: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-ghost:hover {
  background-color: var(--color-bg-secondary);
}

/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

/* Edit Sections */
.edit-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* Collapsible Sections */
.collapsible-section {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-base);
}

.collapsible-section.expanded {
  box-shadow: var(--shadow-md);
}

.collapsible-section.modified {
  border-left: 3px solid var(--color-warning);
}

.section-header {
  display: flex;
  align-items: center;
  padding: var(--space-lg);
  cursor: pointer;
  user-select: none;
  transition: background-color var(--transition-base);
}

.section-header:hover {
  background-color: var(--color-bg-secondary);
}

.section-icon {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: transform var(--transition-base);
}

.section-info {
  flex: 1;
  margin-left: var(--space-md);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

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

.section-summary {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: var(--space-xs) 0 0 0;
}

.section-content {
  padding: 0 var(--space-lg) var(--space-lg) var(--space-lg);
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

/* Form Elements */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.span-2 {
  grid-column: span 2;
}

.form-section {
  margin-bottom: var(--space-xl);
}

.form-section h3 {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
  color: var(--color-heading);
}

.form-label {
  font-weight: var(--font-medium);
  margin-bottom: var(--space-xs);
  color: var(--color-text);
  font-size: var(--text-sm);
}

.form-label.required::after {
  content: ' *';
  color: var(--color-error);
}

/* Tracks Section */
.tracks-header {
  margin-bottom: var(--space-md);
}

.tracks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.track-item {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  align-items: flex-start;
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
  font-size: var(--text-sm);
  flex-shrink: 0;
}

.track-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.track-meta {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-sm);
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

.empty-tracks {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
}

.empty-tracks svg {
  font-size: 2rem;
  margin-bottom: var(--space-sm);
  color: var(--color-border);
}

/* Assets Section */
.asset-section {
  margin-bottom: var(--space-lg);
}

.asset-section h3 {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
  color: var(--color-heading);
}

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

.upload-icon {
  font-size: 2rem;
  color: var(--color-text-tertiary);
}

.upload-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.uploaded-asset {
  display: flex;
  gap: var(--space-lg);
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.cover-preview {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.asset-info h4 {
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-xs);
}

.asset-info p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
  font-size: var(--text-sm);
}

/* Territory Options */
.territory-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.radio-option {
  display: flex;
  align-items: center;
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

.radio-option input[type="radio"] {
  margin-right: var(--space-md);
}

.radio-content {
  display: flex;
  flex-direction: column;
}

.radio-title {
  font-weight: var(--font-medium);
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
  margin-top: var(--space-md);
}

/* Progress Bar */
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

/* Loading & Error States */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-3xl);
  text-align: center;
}

.error-container {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-md);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-container svg {
  font-size: 3rem;
  color: var(--color-error);
  margin-bottom: var(--space-md);
}

.error-container h2 {
  color: var(--color-heading);
  margin-bottom: var(--space-sm);
}

.error-container p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

/* Floating Save Button */
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

/* Utility Classes */
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

.text-error {
  color: var(--color-error);
}

/* Responsive Design */
@media (max-width: 768px) {
  .edit-release {
    padding-bottom: calc(var(--space-3xl) + 80px); /* Account for floating button */
  }
  
  .page-header {
    padding: var(--space-md) 0;
  }
  
  .page-title {
    font-size: var(--text-xl);
  }
  
  .page-subtitle {
    font-size: var(--text-sm);
  }
  
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: stretch;
  }
  
  .header-actions .btn {
    flex: 1;
  }
  
  .quick-actions {
    display: none;
  }
  
  .container {
    padding: 0 var(--space-md);
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.span-2 {
    grid-column: span 1;
  }
  
  .track-meta {
    grid-template-columns: 1fr;
  }
  
  .uploaded-asset {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .cover-preview {
    width: 200px;
    height: 200px;
  }
  
  .floating-save-btn.mobile-only {
    display: flex;
  }
}

/* Animation for saving spinner */
.fa-spin {
  animation: fa-spin 1s linear infinite;
}

@keyframes fa-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>