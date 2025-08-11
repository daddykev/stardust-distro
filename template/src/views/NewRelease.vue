<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'
import { useAuth } from '../composables/useAuth'

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
    subgenre: '',
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

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return releaseData.value.basic.title && releaseData.value.basic.displayArtist
    case 2:
      return releaseData.value.tracks.length > 0
    case 3:
      return releaseData.value.assets.coverImage !== null
    case 4:
      return releaseData.value.metadata.genre && releaseData.value.metadata.copyright
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
  if (currentStep.value < totalSteps) {
    currentStep.value++
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
    if (hasUnsavedChanges.value && releaseId.value) {
      autoSave()
    }
  }, 3000) // Auto-save after 3 seconds of inactivity
}

const autoSave = async () => {
  if (!hasUnsavedChanges.value) return
  
  try {
    await saveDraft(releaseData.value, releaseId.value)
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
    const draft = await saveDraft(releaseData.value, releaseId.value)
    
    if (!releaseId.value) {
      // If new release, update the ID for future saves
      releaseId.value = draft.id
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
    // First, create or update the release
    let release
    if (releaseId.value) {
      release = await updateRelease(releaseId.value, {
        ...releaseData.value,
        status: 'ready'
      })
    } else {
      release = await createRelease({
        ...releaseData.value,
        status: 'ready'
      })
      releaseId.value = release.id
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
    await showErrorToast('Failed to create release')
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

// Validation
const validateERN = async () => {
  // Mock validation for now
  // In production, this would call the DDEX Workbench API
  isSaving.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Check all required fields
    const errors = []
    
    if (!releaseData.value.basic.title) errors.push('Release title is required')
    if (!releaseData.value.basic.displayArtist) errors.push('Display artist is required')
    if (releaseData.value.tracks.length === 0) errors.push('At least one track is required')
    if (!releaseData.value.assets.coverImage) errors.push('Cover image is required')
    
    if (errors.length > 0) {
      validationErrors.value = errors
      await showErrorToast('Validation failed. Please check all required fields.')
      return
    }
    
    releaseData.value.preview.validated = true
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
                <label class="form-label">Barcode (UPC/EAN)</label>
                <input 
                  v-model="releaseData.basic.barcode" 
                  type="text" 
                  class="form-input"
                  placeholder="Enter barcode"
                  pattern="[0-9]{12,14}"
                />
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
                <label>
                  <font-awesome-icon icon="upload" class="upload-icon" />
                  <p>Drag and drop or click to upload</p>
                  <button class="btn btn-primary" type="button">Choose File</button>
                  <input 
                    type="file" 
                    accept="image/*"
                    @change="handleCoverImageUpload"
                    style="display: none"
                  />
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

          <!-- Step 4: Metadata -->
          <div v-if="currentStep === 4" class="wizard-step">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label required">Primary Genre</label>
                <select v-model="releaseData.metadata.genre" class="form-select" required>
                  <option value="">Select genre</option>
                  <option value="Rock">Rock</option>
                  <option value="Pop">Pop</option>
                  <option value="Electronic">Electronic</option>
                  <option value="Hip-Hop">Hip-Hop</option>
                  <option value="R&B">R&B</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Classical">Classical</option>
                  <option value="Country">Country</option>
                  <option value="Folk">Folk</option>
                  <option value="Metal">Metal</option>
                  <option value="Punk">Punk</option>
                  <option value="World">World</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Sub-genre</label>
                <input 
                  v-model="releaseData.metadata.subgenre" 
                  type="text" 
                  class="form-input"
                  placeholder="Enter sub-genre"
                />
              </div>
              
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
                  <span class="summary-label">Release Date:</span>
                  <span class="summary-value">{{ releaseData.basic.releaseDate || 'Not set' }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Tracks:</span>
                  <span class="summary-value">{{ releaseData.tracks.length }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Genre:</span>
                  <span class="summary-value">{{ releaseData.metadata.genre || 'Not set' }}</span>
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
/* Previous styles remain the same, adding these new ones: */

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

/* Responsive adjustments */
@media (max-width: 768px) {
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
  }
}
</style>