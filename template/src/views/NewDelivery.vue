<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useCatalog } from '../composables/useCatalog'
import deliveryTargetService from '../services/deliveryTargets'
import ernService from '../services/ern'
import { db } from '../firebase'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { releases, loadReleases } = useCatalog()

// State
const currentStep = ref(1)
const totalSteps = 4

// Form data
const deliveryData = ref({
  releaseId: route.query.releaseId || '',
  selectedTargets: [],
  scheduledAt: new Date().toISOString().split('T')[0],
  scheduledTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
  priority: 'normal',
  testMode: true,
  notes: ''
})

// Data loading
const availableTargets = ref([])
const selectedRelease = ref(null)
const isLoading = ref(false)
const error = ref(null)
const successMessage = ref(null)

// ERN Generation
const generatedERNs = ref({})
const isGeneratingERN = ref(false)
const ernErrors = ref({})
const showERNPreview = ref(false)
const previewERN = ref(null)
const previewTargetName = ref('')

// Delivery queue
const isQueuingDelivery = ref(false)
const deliveryResult = ref(null)

// Step titles
const stepTitles = [
  'Select Release',
  'Choose Delivery Targets',
  'Generate & Review ERN',
  'Schedule Delivery'
]

// Computed
const currentStepTitle = computed(() => stepTitles[currentStep.value - 1])

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return deliveryData.value.releaseId !== ''
    case 2:
      return deliveryData.value.selectedTargets.length > 0
    case 3:
      return Object.keys(generatedERNs.value).length === deliveryData.value.selectedTargets.length
    case 4:
      return true
    default:
      return false
  }
})

const readyReleases = computed(() => 
  releases.value.filter(r => r.status === 'ready' || r.status === 'delivered')
)

const activeTargets = computed(() => 
  availableTargets.value.filter(t => t.active)
)

const selectedTargetDetails = computed(() => 
  availableTargets.value.filter(t => deliveryData.value.selectedTargets.includes(t.id))
)

const scheduledDateTime = computed(() => {
  const date = new Date(deliveryData.value.scheduledAt + 'T' + deliveryData.value.scheduledTime)
  return date.toISOString()
})

// Methods
const loadData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    // Load releases if not already loaded
    if (releases.value.length === 0) {
      await loadReleases()
    }
    
    // Load delivery targets
    availableTargets.value = await deliveryTargetService.getTenantTargets(user.value.uid, { active: true })
    
    // If releaseId in query, select it
    if (route.query.releaseId) {
      selectRelease(route.query.releaseId)
    }
    
    // If releaseIds (multiple) in query, handle bulk delivery
    if (route.query.releaseIds) {
      // For now, just select the first one
      const releaseIds = route.query.releaseIds.split(',')
      selectRelease(releaseIds[0])
    }
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = 'Failed to load data. Please try again.'
  } finally {
    isLoading.value = false
  }
}

const selectRelease = (releaseId) => {
  deliveryData.value.releaseId = releaseId
  selectedRelease.value = releases.value.find(r => r.id === releaseId)
}

const toggleTarget = (targetId) => {
  const index = deliveryData.value.selectedTargets.indexOf(targetId)
  if (index > -1) {
    deliveryData.value.selectedTargets.splice(index, 1)
    // Remove generated ERN if exists
    delete generatedERNs.value[targetId]
  } else {
    deliveryData.value.selectedTargets.push(targetId)
  }
}

const selectAllTargets = () => {
  deliveryData.value.selectedTargets = activeTargets.value.map(t => t.id)
}

const deselectAllTargets = () => {
  deliveryData.value.selectedTargets = []
  generatedERNs.value = {}
}

const generateERNs = async () => {
  isGeneratingERN.value = true
  ernErrors.value = {}
  generatedERNs.value = {}
  
  try {
    for (const targetId of deliveryData.value.selectedTargets) {
      const target = availableTargets.value.find(t => t.id === targetId)
      if (!target) continue
      
      try {
        // Generate ERN for this target
        const result = await ernService.generateERN(deliveryData.value.releaseId, {
          id: target.id,
          name: target.name,
          partyName: target.partyName,
          partyId: target.partyId,
          senderName: user.value.organizationName || user.value.displayName,
          senderPartyId: user.value.partyId, // You might want to add this to user profile
          testMode: target.testMode || deliveryData.value.testMode,
          ernVersion: target.ernVersion,
          territoryCode: target.territoryCode || 'Worldwide',
          commercialModels: target.commercialModels || [{
            type: 'PayAsYouGoModel',
            usageTypes: ['PermanentDownload']
          }]
        })
        
        generatedERNs.value[targetId] = result
      } catch (err) {
        console.error(`Error generating ERN for ${target.name}:`, err)
        ernErrors.value[targetId] = err.message
      }
    }
    
    if (Object.keys(ernErrors.value).length === 0) {
      successMessage.value = 'ERN messages generated successfully!'
      setTimeout(() => successMessage.value = null, 3000)
    }
  } catch (err) {
    console.error('Error generating ERNs:', err)
    error.value = 'Failed to generate ERN messages. Please try again.'
  } finally {
    isGeneratingERN.value = false
  }
}

const validateERN = async (targetId) => {
  // TODO: Integrate with DDEX Workbench API for validation
  console.log('Validating ERN for target:', targetId)
  alert('ERN validation will be integrated with DDEX Workbench API')
}

const previewERNForTarget = (targetId) => {
  const ern = generatedERNs.value[targetId]
  const target = availableTargets.value.find(t => t.id === targetId)
  
  if (ern && target) {
    previewERN.value = ern.ern
    previewTargetName.value = target.name
    showERNPreview.value = true
  }
}

const downloadERN = (targetId) => {
  const ern = generatedERNs.value[targetId]
  const target = availableTargets.value.find(t => t.id === targetId)
  
  if (ern && target) {
    const blob = new Blob([ern.ern], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedRelease.value.basic?.title}_${target.name}_ERN.xml`.replace(/[^a-z0-9]/gi, '_')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

const queueDelivery = async () => {
  isQueuingDelivery.value = true
  error.value = null
  
  try {
    const deliveries = []
    
    for (const targetId of deliveryData.value.selectedTargets) {
      const target = availableTargets.value.find(t => t.id === targetId)
      const ern = generatedERNs.value[targetId]
      
      if (!target || !ern) continue
      
      // Create delivery record
      const delivery = {
        releaseId: deliveryData.value.releaseId,
        releaseTitle: selectedRelease.value.basic?.title,
        releaseArtist: selectedRelease.value.basic?.displayArtist,
        targetId: target.id,
        targetName: target.name,
        targetProtocol: target.protocol,
        tenantId: user.value.uid,
        status: 'queued',
        priority: deliveryData.value.priority,
        scheduledAt: new Date(scheduledDateTime.value),
        testMode: deliveryData.value.testMode,
        notes: deliveryData.value.notes,
        
        // ERN data
        ernVersion: target.ernVersion,
        ernMessageId: ern.messageId,
        ernXml: ern.ern,
        
        // Package info
        package: {
          ernFile: `${ern.messageId}.xml`,
          audioFiles: selectedRelease.value.tracks?.map(t => t.audio?.url).filter(Boolean) || [],
          imageFiles: [selectedRelease.value.assets?.coverImage?.url].filter(Boolean),
          totalSize: calculatePackageSize()
        },
        
        // Connection info (encrypted in production)
        connection: target.connection,
        
        createdAt: new Date(),
        attempts: []
      }
      
      const docRef = await addDoc(collection(db, 'deliveries'), delivery)
      deliveries.push({ id: docRef.id, ...delivery })
    }
    
    // Update release status
    await updateDoc(doc(db, 'releases', deliveryData.value.releaseId), {
      lastDeliveryAt: new Date(),
      'ddex.lastDeliveryTargets': deliveryData.value.selectedTargets
    })
    
    deliveryResult.value = {
      success: true,
      count: deliveries.length,
      deliveries
    }
    
    // Redirect to deliveries page after a short delay
    successMessage.value = `Successfully queued ${deliveries.length} ${deliveries.length === 1 ? 'delivery' : 'deliveries'}!`
    
    setTimeout(() => {
      router.push('/deliveries')
    }, 2000)
  } catch (err) {
    console.error('Error queuing delivery:', err)
    error.value = 'Failed to queue delivery. Please try again.'
  } finally {
    isQueuingDelivery.value = false
  }
}

const calculatePackageSize = () => {
  // Rough estimation - in production, calculate actual sizes
  let size = 0
  
  // ERN file (roughly 10-50KB)
  size += 50 * 1024
  
  // Audio files (roughly 30-50MB per track for WAV)
  const trackCount = selectedRelease.value?.tracks?.length || 0
  size += trackCount * 40 * 1024 * 1024
  
  // Cover image (roughly 1-5MB)
  size += 3 * 1024 * 1024
  
  return formatFileSize(size)
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Navigation
const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++
    
    // Auto-generate ERNs when reaching step 3
    if (currentStep.value === 3 && Object.keys(generatedERNs.value).length === 0) {
      generateERNs()
    }
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const goToStep = (step) => {
  if (step <= currentStep.value || (step === currentStep.value + 1 && canProceed.value)) {
    currentStep.value = step
  }
}

const cancelDelivery = () => {
  if (confirm('Are you sure you want to cancel? All progress will be lost.')) {
    router.push('/deliveries')
  }
}

// Copy ERN to clipboard
const copyERNToClipboard = () => {
  if (previewERN.value) {
    navigator.clipboard.writeText(previewERN.value)
    alert('ERN copied to clipboard!')
  }
}

// Load data on mount
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="new-delivery">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <router-link to="/deliveries" class="back-link">
          <font-awesome-icon icon="chevron-left" />
          Back to Deliveries
        </router-link>
        
        <div class="header-actions">
          <button @click="cancelDelivery" class="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
      
      <!-- Page Title -->
      <div class="page-header">
        <h1 class="page-title">Create New Delivery</h1>
        <p class="page-subtitle">Select a release and delivery targets to distribute your music</p>
      </div>
      
      <!-- Messages -->
      <div v-if="successMessage" class="message success-message">
        <font-awesome-icon icon="check-circle" />
        {{ successMessage }}
      </div>
      
      <div v-if="error" class="message error-message">
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
        </div>
        <div class="card-body">
          <!-- Loading State -->
          <div v-if="isLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading...</p>
          </div>
          
          <!-- Step 1: Select Release -->
          <div v-else-if="currentStep === 1" class="wizard-step">
            <p class="step-description">Choose the release you want to deliver to DSPs</p>
            
            <div v-if="readyReleases.length === 0" class="empty-state">
              <font-awesome-icon icon="music" />
              <p>No releases are ready for delivery</p>
              <router-link to="/releases/new" class="btn btn-primary">
                Create a Release
              </router-link>
            </div>
            
            <div v-else class="releases-grid">
              <label 
                v-for="release in readyReleases" 
                :key="release.id"
                class="release-card"
                :class="{ selected: deliveryData.releaseId === release.id }"
              >
                <input 
                  type="radio"
                  :value="release.id"
                  v-model="deliveryData.releaseId"
                  @change="selectRelease(release.id)"
                  class="release-radio"
                />
                
                <div class="release-content">
                  <div class="release-cover">
                    <img 
                      v-if="release.assets?.coverImage?.url"
                      :src="release.assets.coverImage.url"
                      :alt="release.basic?.title"
                    />
                    <div v-else class="cover-placeholder">
                      <font-awesome-icon icon="music" />
                    </div>
                  </div>
                  
                  <div class="release-info">
                    <h3>{{ release.basic?.title || 'Untitled' }}</h3>
                    <p>{{ release.basic?.displayArtist || 'Unknown Artist' }}</p>
                    <div class="release-meta">
                      <span class="badge" :class="release.status === 'ready' ? 'badge-info' : 'badge-success'">
                        {{ release.status }}
                      </span>
                      <span>{{ release.tracks?.length || 0 }} tracks</span>
                      <span>{{ formatDate(release.basic?.releaseDate) }}</span>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          <!-- Step 2: Choose Delivery Targets -->
          <div v-else-if="currentStep === 2" class="wizard-step">
            <div class="step-header">
              <p class="step-description">Select one or more delivery targets</p>
              <div class="step-actions">
                <button @click="selectAllTargets" class="btn btn-sm btn-secondary">
                  Select All
                </button>
                <button @click="deselectAllTargets" class="btn btn-sm btn-secondary">
                  Clear All
                </button>
              </div>
            </div>
            
            <div v-if="activeTargets.length === 0" class="empty-state">
              <font-awesome-icon icon="truck" />
              <p>No active delivery targets configured</p>
              <router-link to="/settings?tab=delivery" class="btn btn-primary">
                Configure Delivery Targets
              </router-link>
            </div>
            
            <div v-else class="targets-grid">
              <label 
                v-for="target in activeTargets" 
                :key="target.id"
                class="target-card"
                :class="{ selected: deliveryData.selectedTargets.includes(target.id) }"
              >
                <input 
                  type="checkbox"
                  :value="target.id"
                  :checked="deliveryData.selectedTargets.includes(target.id)"
                  @change="toggleTarget(target.id)"
                  class="target-checkbox"
                />
                
                <div class="target-content">
                  <div class="target-header">
                    <h3>{{ target.name }}</h3>
                    <span class="badge" :class="target.testMode ? 'badge-warning' : 'badge-success'">
                      {{ target.testMode ? 'Test' : 'Live' }}
                    </span>
                  </div>
                  
                  <div class="target-details">
                    <div class="detail-row">
                      <span class="detail-label">Party:</span>
                      <span>{{ target.partyName }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Protocol:</span>
                      <span>{{ target.protocol }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">ERN:</span>
                      <span>{{ target.ernVersion }}</span>
                    </div>
                  </div>
                  
                  <div class="target-models">
                    <span class="models-label">Commercial Models:</span>
                    <div class="models-list">
                      <span 
                        v-for="(model, index) in target.commercialModels" 
                        :key="index"
                        class="model-badge"
                      >
                        {{ model.type.replace('Model', '') }}
                      </span>
                    </div>
                  </div>
                </div>
              </label>
            </div>
            
            <div v-if="deliveryData.selectedTargets.length > 0" class="selection-summary">
              <font-awesome-icon icon="info-circle" />
              {{ deliveryData.selectedTargets.length }} target{{ deliveryData.selectedTargets.length !== 1 ? 's' : '' }} selected
            </div>
          </div>
          
          <!-- Step 3: Generate & Review ERN -->
          <div v-else-if="currentStep === 3" class="wizard-step">
            <p class="step-description">Generate and review ERN messages for each target</p>
            
            <div v-if="isGeneratingERN" class="generating-status">
              <div class="loading-spinner"></div>
              <p>Generating ERN messages...</p>
            </div>
            
            <div v-else-if="Object.keys(generatedERNs).length === 0" class="empty-state">
              <font-awesome-icon icon="file-code" />
              <p>No ERN messages generated yet</p>
              <button @click="generateERNs" class="btn btn-primary">
                Generate ERN Messages
              </button>
            </div>
            
            <div v-else class="ern-results">
              <div 
                v-for="target in selectedTargetDetails" 
                :key="target.id"
                class="ern-result-card"
              >
                <div class="ern-header">
                  <h3>{{ target.name }}</h3>
                  <div class="ern-status">
                    <span v-if="generatedERNs[target.id]" class="badge badge-success">
                      <font-awesome-icon icon="check" />
                      Generated
                    </span>
                    <span v-else-if="ernErrors[target.id]" class="badge badge-error">
                      <font-awesome-icon icon="times" />
                      Failed
                    </span>
                  </div>
                </div>
                
                <div v-if="generatedERNs[target.id]" class="ern-details">
                  <div class="detail-row">
                    <span class="detail-label">Message ID:</span>
                    <span class="mono-text">{{ generatedERNs[target.id].messageId }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Version:</span>
                    <span>ERN {{ generatedERNs[target.id].version }}</span>
                  </div>
                  
                  <div class="ern-actions">
                    <button 
                      @click="previewERNForTarget(target.id)"
                      class="btn btn-sm btn-secondary"
                    >
                      <font-awesome-icon icon="eye" />
                      Preview
                    </button>
                    <button 
                      @click="validateERN(target.id)"
                      class="btn btn-sm btn-secondary"
                    >
                      <font-awesome-icon icon="check-circle" />
                      Validate
                    </button>
                    <button 
                      @click="downloadERN(target.id)"
                      class="btn btn-sm btn-secondary"
                    >
                      <font-awesome-icon icon="download" />
                      Download
                    </button>
                  </div>
                </div>
                
                <div v-else-if="ernErrors[target.id]" class="ern-error">
                  <font-awesome-icon icon="exclamation-triangle" />
                  {{ ernErrors[target.id] }}
                </div>
              </div>
              
              <button 
                v-if="Object.keys(ernErrors).length > 0"
                @click="generateERNs" 
                class="btn btn-secondary"
              >
                <font-awesome-icon icon="redo" />
                Regenerate Failed ERNs
              </button>
            </div>
          </div>
          
          <!-- Step 4: Schedule Delivery -->
          <div v-else-if="currentStep === 4" class="wizard-step">
            <p class="step-description">Configure delivery schedule and options</p>
            
            <div class="form-section">
              <h3>Delivery Schedule</h3>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Date</label>
                  <input 
                    v-model="deliveryData.scheduledAt" 
                    type="date"
                    class="form-input"
                    :min="new Date().toISOString().split('T')[0]"
                  />
                </div>
                
                <div class="form-group">
                  <label class="form-label">Time</label>
                  <input 
                    v-model="deliveryData.scheduledTime" 
                    type="time"
                    class="form-input"
                  />
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Priority</label>
                <select v-model="deliveryData.priority" class="form-select">
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            
            <div class="form-section">
              <h3>Delivery Options</h3>
              <label class="checkbox-option">
                <input 
                  v-model="deliveryData.testMode" 
                  type="checkbox"
                />
                <div class="option-content">
                  <span class="option-title">Test Mode</span>
                  <span class="option-description">Mark this delivery as a test (won't affect live catalog)</span>
                </div>
              </label>
            </div>
            
            <div class="form-section">
              <h3>Notes</h3>
              <div class="form-group">
                <label class="form-label">Internal Notes (Optional)</label>
                <textarea 
                  v-model="deliveryData.notes"
                  class="form-textarea"
                  rows="4"
                  placeholder="Add any notes about this delivery..."
                ></textarea>
              </div>
            </div>
            
            <!-- Delivery Summary -->
            <div class="delivery-summary">
              <h3>Delivery Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Release:</span>
                  <span>{{ selectedRelease?.basic?.title }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Targets:</span>
                  <span>{{ deliveryData.selectedTargets.length }} selected</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Scheduled:</span>
                  <span>{{ new Date(scheduledDateTime).toLocaleString() }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Priority:</span>
                  <span>{{ deliveryData.priority }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Mode:</span>
                  <span>{{ deliveryData.testMode ? 'Test' : 'Live' }}</span>
                </div>
              </div>
            </div>
            
            <!-- Queue Delivery Button -->
            <div class="queue-section">
              <button 
                @click="queueDelivery"
                class="btn btn-success btn-lg"
                :disabled="isQueuingDelivery"
              >
                <font-awesome-icon :icon="isQueuingDelivery ? 'spinner' : 'truck'" :spin="isQueuingDelivery" />
                {{ isQueuingDelivery ? 'Queuing Delivery...' : 'Queue Delivery' }}
              </button>
              
              <p class="queue-info">
                <font-awesome-icon icon="info-circle" />
                Your delivery will be processed at the scheduled time. You can monitor progress in the Deliveries page.
              </p>
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
        </div>
      </div>
    </div>
    
    <!-- ERN Preview Modal -->
    <div v-if="showERNPreview" class="modal-overlay" @click.self="showERNPreview = false">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>ERN Preview - {{ previewTargetName }}</h3>
          <div class="modal-actions">
            <button @click="copyERNToClipboard" class="btn btn-sm btn-secondary">
              <font-awesome-icon icon="copy" />
              Copy
            </button>
            <button @click="showERNPreview = false" class="btn-icon">
              <font-awesome-icon icon="times" />
            </button>
          </div>
        </div>
        <div class="modal-body">
          <pre class="ern-preview">{{ previewERN }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-delivery {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-medium);
}

.back-link:hover {
  text-decoration: underline;
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
}

.page-header {
  margin-bottom: var(--space-xl);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.page-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

/* Messages */
.message {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-lg);
}

.success-message {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.error-message {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

/* Progress Bar */
.wizard-progress {
  margin-bottom: var(--space-xl);
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
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  cursor: pointer;
  transition: all var(--transition-base);
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

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.step-actions {
  display: flex;
  gap: var(--space-sm);
}

/* Step 1: Release Selection */
.releases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--space-lg);
}

.release-card {
  display: block;
  cursor: pointer;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  transition: all var(--transition-base);
}

.release-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.release-card.selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.release-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.release-content {
  display: flex;
  gap: var(--space-md);
}

.release-cover {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--color-bg-secondary);
}

.release-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 2rem;
}

.release-info {
  flex: 1;
}

.release-info h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-xs);
}

.release-info p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.release-meta {
  display: flex;
  gap: var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Step 2: Target Selection */
.targets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-lg);
}

.target-card {
  display: block;
  cursor: pointer;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: all var(--transition-base);
}

.target-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.target-card.selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.target-checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.target-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.target-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.target-header h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.target-details,
.detail-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.detail-row {
  flex-direction: row;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.detail-label {
  color: var(--color-text-secondary);
}

.target-models {
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border);
}

.models-label {
  display: block;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.models-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.model-badge {
  padding: 2px 8px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.selection-summary {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  margin-top: var(--space-lg);
}

/* Step 3: ERN Generation */
.generating-status {
  text-align: center;
  padding: var(--space-3xl);
  color: var(--color-text-secondary);
}

.ern-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.ern-result-card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.ern-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.ern-header h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.ern-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.mono-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.ern-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.ern-error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-error);
  padding: var(--space-sm);
  background-color: rgba(234, 67, 53, 0.1);
  border-radius: var(--radius-md);
}

/* Step 4: Schedule */
.form-section {
  margin-bottom: var(--space-xl);
}

.form-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.form-label {
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.form-textarea {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  background-color: var(--color-surface);
  color: var(--color-text);
  resize: vertical;
  transition: all var(--transition-base);
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.checkbox-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
}

.checkbox-option:hover {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-primary);
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.option-title {
  font-weight: var(--font-medium);
}

.option-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.delivery-summary {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.delivery-summary h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-md);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.summary-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.queue-section {
  text-align: center;
  padding: var(--space-xl);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.btn-lg {
  padding: var(--space-md) var(--space-2xl);
  font-size: var(--text-lg);
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

.queue-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* Badge */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
}

.badge-info {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.badge-warning {
  background-color: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

.badge-error {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-3xl);
  color: var(--color-text-secondary);
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

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-3xl);
  color: var(--color-text-secondary);
}

.empty-state svg {
  font-size: 3rem;
  color: var(--color-border);
  margin-bottom: var(--space-md);
}

.empty-state p {
  margin-bottom: var(--space-lg);
}

/* Footer */
.wizard-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

/* Modal */
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
  padding: var(--space-lg);
}

.modal {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  max-width: 500px;
  width: 100%;
  box-shadow: var(--shadow-lg);
}

.modal-large {
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.modal-actions {
  display: flex;
  gap: var(--space-sm);
}

.modal-body {
  padding: var(--space-lg);
}

.ern-preview {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

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

/* Responsive */
@media (max-width: 768px) {
  .releases-grid {
    grid-template-columns: 1fr;
  }
  
  .targets-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .progress-steps {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
  }
  
  .step-title {
    font-size: var(--text-xs);
  }
}
</style>