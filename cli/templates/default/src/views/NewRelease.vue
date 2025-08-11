<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Wizard state
const currentStep = ref(1)
const totalSteps = 6

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

const saveAsDraft = () => {
  console.log('Saving as draft...', releaseData.value)
  // TODO: Save to Firestore
  router.push('/catalog')
}

const generateERN = () => {
  console.log('Generating ERN...', releaseData.value)
  // TODO: Generate ERN and save release
  router.push('/catalog')
}

const cancelCreation = () => {
  if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
    router.push('/catalog')
  }
}

// Mock methods for demo
const addTrack = () => {
  releaseData.value.tracks.push({
    id: Date.now(),
    title: `Track ${releaseData.value.tracks.length + 1}`,
    artist: releaseData.value.basic.displayArtist,
    duration: 180,
    isrc: ''
  })
}

const validateERN = () => {
  // Mock validation
  setTimeout(() => {
    releaseData.value.preview.validated = true
  }, 1000)
}
</script>

<template>
  <div class="new-release">
    <div class="container">
      <!-- Header -->
      <div class="wizard-header">
        <h1 class="page-title">Create New Release</h1>
        <div class="wizard-actions">
          <button @click="saveAsDraft" class="btn btn-secondary">
            <font-awesome-icon icon="save" />
            Save as Draft
          </button>
          <button @click="cancelCreation" class="btn btn-secondary">
            Cancel
          </button>
        </div>
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
                />
              </div>
              
              <div class="form-group">
                <label class="form-label required">Display Artist</label>
                <input 
                  v-model="releaseData.basic.displayArtist" 
                  type="text" 
                  class="form-input"
                  placeholder="Enter artist name"
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
                />
              </div>
              
              <div class="form-group">
                <label class="form-label required">Release Date</label>
                <input 
                  v-model="releaseData.basic.releaseDate" 
                  type="date" 
                  class="form-input"
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
              <button @click="addTrack" class="btn btn-primary">
                <font-awesome-icon icon="plus" />
                Add Track
              </button>
            </div>
            
            <div v-if="releaseData.tracks.length === 0" class="empty-tracks">
              <font-awesome-icon icon="music" class="empty-icon" />
              <p>No tracks added yet</p>
              <button @click="addTrack" class="btn btn-primary">
                Add Your First Track
              </button>
            </div>
            
            <div v-else class="tracks-list">
              <div 
                v-for="(track, index) in releaseData.tracks" 
                :key="track.id"
                class="track-item"
              >
                <div class="track-number">{{ index + 1 }}</div>
                <div class="track-info">
                  <input 
                    v-model="track.title" 
                    type="text" 
                    class="form-input"
                    placeholder="Track title"
                  />
                  <input 
                    v-model="track.artist" 
                    type="text" 
                    class="form-input"
                    placeholder="Track artist"
                  />
                </div>
                <button class="btn-icon">
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
              <div class="upload-area">
                <font-awesome-icon icon="upload" class="upload-icon" />
                <p>Drag and drop or click to upload</p>
                <button class="btn btn-primary">Choose File</button>
              </div>
            </div>
            
            <div class="asset-section">
              <h3>Audio Files</h3>
              <p class="step-description">Upload audio files for each track (WAV or FLAC recommended)</p>
              <div class="upload-area">
                <font-awesome-icon icon="music" class="upload-icon" />
                <p>Drag and drop or click to upload</p>
                <button class="btn btn-secondary">Choose Files</button>
              </div>
            </div>
          </div>

          <!-- Step 4: Metadata -->
          <div v-if="currentStep === 4" class="wizard-step">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label required">Primary Genre</label>
                <select v-model="releaseData.metadata.genre" class="form-select">
                  <option value="">Select genre</option>
                  <option value="Rock">Rock</option>
                  <option value="Pop">Pop</option>
                  <option value="Electronic">Electronic</option>
                  <option value="Hip-Hop">Hip-Hop</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Classical">Classical</option>
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
                  <option value="ja">Japanese</option>
                </select>
              </div>
              
              <div class="form-group span-2">
                <label class="form-label required">Copyright</label>
                <input 
                  v-model="releaseData.metadata.copyright" 
                  type="text" 
                  class="form-input"
                  placeholder="© 2024 Label Name"
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
              <p>Territory selection interface would go here</p>
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
                  <span class="summary-label">Tracks:</span>
                  <span class="summary-value">{{ releaseData.tracks.length }}</span>
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
                    <option value="4.3">ERN 4.3</option>
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
              
              <button @click="validateERN" class="btn btn-secondary">
                <font-awesome-icon icon="check" />
                Validate ERN
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
            :disabled="!canProceed"
          >
            <font-awesome-icon icon="check" />
            Generate ERN & Save
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
  gap: var(--space-sm);
}

/* Progress Bar */
.wizard-progress {
  margin-bottom: var(--space-xl);
}

.progress-bar {
  height: 4px;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-lg);
}

.progress-fill {
  height: 100%;
  background-color: var(--color-primary);
  transition: width var(--transition-slow);
}

.progress-steps {
  display: flex;
  justify-content: space-between;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
  opacity: 0.5;
  transition: opacity var(--transition-base);
}

.progress-step.active,
.progress-step.completed {
  opacity: 1;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background-color: var(--color-border);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  transition: all var(--transition-base);
}

.progress-step.active .step-number {
  background-color: var(--color-primary);
  color: white;
}

.progress-step.completed .step-number {
  background-color: var(--color-success);
  color: white;
}

.step-title {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
}

@media (max-width: 768px) {
  .step-title {
    display: none;
  }
}

/* Wizard Content */
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

/* Form Grid */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-lg);
}

.form-grid .span-2 {
  grid-column: span 2;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-grid .span-2 {
    grid-column: span 1;
  }
}

.form-label.required::after {
  content: ' *';
  color: var(--color-error);
}

/* Track Management */
.tracks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.empty-tracks {
  text-align: center;
  padding: var(--space-2xl);
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
  gap: var(--space-md);
  align-items: center;
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.track-number {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-surface);
  border-radius: var(--radius-full);
  font-weight: var(--font-semibold);
  flex-shrink: 0;
}

.track-info {
  flex: 1;
  display: flex;
  gap: var(--space-md);
}

.track-info input {
  flex: 1;
}

/* Asset Upload */
.asset-section {
  margin-bottom: var(--space-xl);
}

.asset-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-sm);
}

.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  text-align: center;
  background-color: var(--color-bg-secondary);
  transition: all var(--transition-base);
}

.upload-area:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.upload-icon {
  font-size: 3rem;
  color: var(--color-border);
  margin-bottom: var(--space-md);
}

/* Territory Options */
.territory-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
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
}

.radio-option input[type="radio"] {
  margin-right: var(--space-md);
}

.radio-content {
  display: flex;
  flex-direction: column;
}

.radio-title {
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.radio-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Review Section */
.review-section,
.ern-section {
  margin-bottom: var(--space-xl);
}

.review-section h3,
.ern-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-lg);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.summary-item {
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.summary-value {
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.validation-success {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-success);
  margin-top: var(--space-md);
  padding: var(--space-md);
  background-color: rgba(52, 168, 83, 0.1);
  border-radius: var(--radius-md);
}

/* Footer */
.wizard-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
</style>