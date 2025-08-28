<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useCatalog } from '../composables/useCatalog'
import { db } from '../firebase'
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import ernService from '../services/ern'
import deliveryTargetService from '../services/deliveryTargets'
import deliveryService from '../services/delivery'
import genreMappingService from '../services/genreMappings'
import { validateXmlUrls } from '../utils/urlUtils'

const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const { releases, fetchReleases } = useCatalog()

// State
const currentStep = ref(1)
const isLoading = ref(false)
const isGeneratingERN = ref(false)
const isQueuingDelivery = ref(false)
const error = ref(null)
const successMessage = ref('')
const showERNPreview = ref(false)
const previewERN = ref('')
const previewTargetName = ref('')

// Wizard data
const deliveryData = ref({
  releaseId: null,
  selectedTargets: [],
  priority: 'normal',
  scheduleType: 'immediate',
  testMode: false,
  notes: ''
})

// Additional state
const availableTargets = ref([])
const selectedRelease = ref(null)
const generatedERNs = ref({})
const ernErrors = ref({})
const messageTypes = ref({})
const takedownDates = ref({})
const deliveryHistory = ref({})
const scheduledDateTime = ref(new Date(Date.now() + 3600000).toISOString().slice(0, 16))
const genreMappingCache = ref({})

// Step titles
const stepTitles = [
  'Select Release',
  'Choose Targets',
  'Generate ERN',
  'Schedule & Confirm'
]

// Computed
const currentStepTitle = computed(() => stepTitles[currentStep.value - 1])

const progressPercentage = computed(() => {
  return (currentStep.value / 4) * 100
})

const readyReleases = computed(() => {
  return releases.value.filter(r => r.status === 'ready')
})

const activeTargets = computed(() => {
  return availableTargets.value.filter(t => t.active)
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return deliveryData.value.releaseId !== null
    case 2:
      return deliveryData.value.selectedTargets.length > 0
    case 3:
      return Object.keys(generatedERNs.value).length > 0
    case 4:
      return true
    default:
      return false
  }
})

const canQueueDelivery = computed(() => {
  return (
    deliveryData.value.releaseId &&
    deliveryData.value.selectedTargets.length > 0 &&
    Object.keys(generatedERNs.value).length > 0
  )
})

// Methods
const formatDate = (date) => {
  if (!date) return 'N/A'
  try {
    if (date.toDate) {
      return date.toDate().toLocaleDateString()
    }
    return new Date(date).toLocaleDateString()
  } catch (error) {
    return 'N/A'
  }
}

const goToStep = (step) => {
  if (step < currentStep.value || (step === currentStep.value + 1 && canProceed.value)) {
    currentStep.value = step
  }
}

const nextStep = () => {
  if (canProceed.value && currentStep.value < 4) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const loadReleases = async () => {
  try {
    await fetchReleases()
  } catch (error) {
    console.error('Error loading releases:', error)
  }
}

const loadData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    // Load releases if not already loaded
    if (releases.value.length === 0) {
      await loadReleases()
    }
    
    // Load delivery targets
    const targets = await deliveryTargetService.getTenantTargets(user.value.uid, { active: true })
    
    // Validate and enhance target configurations
    availableTargets.value = targets.map(target => {
      // Ensure DSP targets have proper configuration
      if (target.type === 'DSP' || target.protocol === 'API') {
        if (!target.config?.distributorId) {
          console.warn(`Target ${target.name} missing distributorId, using default`)
          target.config = {
            ...target.config,
            distributorId: 'stardust-distro'
          }
        }
        
        // Ensure endpoint is properly configured
        if (!target.connection?.endpoint) {
          console.warn(`Target ${target.name} missing endpoint configuration`)
        }
      }
      
      return target
    })
    
    console.log('Loaded targets:', availableTargets.value.length)
    
    // If releaseId in query, select it
    if (route.query.releaseId) {
      selectRelease(route.query.releaseId)
    }
    
    // If releaseIds (multiple) in query, handle bulk delivery
    if (route.query.releaseIds) {
      const releaseIds = route.query.releaseIds.split(',')
      selectRelease(releaseIds[0])
      // TODO: Handle multiple releases
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
    delete messageTypes.value[targetId]
    delete takedownDates.value[targetId]
    delete deliveryHistory.value[targetId]
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
  messageTypes.value = {}
  takedownDates.value = {}
  deliveryHistory.value = {}
}

const getTarget = (targetId) => {
  return availableTargets.value.find(t => t.id === targetId)
}

const getTargetName = (targetId) => {
  const target = getTarget(targetId)
  return target?.name || 'Unknown Target'
}

// Genre mapping preview
const getMappedGenrePreview = (genreCode, target) => {
  if (!genreCode || !target?.genreMapping?.enabled) {
    return genreCode || 'N/A'
  }
  
  // Check cache first
  const cacheKey = `${genreCode}_${target.id}`
  if (genreMappingCache.value[cacheKey]) {
    return genreMappingCache.value[cacheKey]
  }
  
  // For preview, show what will be mapped
  if (target.genreMapping.mappingId) {
    // This is a simplified preview - actual mapping happens during ERN generation
    return 'Will be mapped'
  }
  
  // If using built-in mapping
  return 'Auto-mapped'
}

// Check delivery history for a release/target combination
const checkDeliveryHistory = async () => {
  for (const targetId of deliveryData.value.selectedTargets) {
    try {
      // Query delivery history
      const q = query(
        collection(db, 'deliveryHistory'),
        where('releaseId', '==', deliveryData.value.releaseId),
        where('targetId', '==', targetId),
        where('status', '==', 'completed'),
        where('messageSubType', 'in', ['Initial', 'Update']),
        orderBy('deliveredAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      const hasBeenDelivered = !snapshot.empty
      
      let lastDelivery = null
      if (hasBeenDelivered && snapshot.docs.length > 0) {
        lastDelivery = snapshot.docs[0].data()
      }
      
      deliveryHistory.value[targetId] = {
        hasBeenDelivered,
        lastDelivery: lastDelivery?.deliveredAt
      }
      
      // Set default message type based on history
      messageTypes.value[targetId] = hasBeenDelivered ? 'Update' : 'Initial'
    } catch (error) {
      console.error(`Error checking delivery history for target ${targetId}:`, error)
      // Default to Initial if we can't check history
      messageTypes.value[targetId] = 'Initial'
      deliveryHistory.value[targetId] = {
        hasBeenDelivered: false,
        lastDelivery: null
      }
    }
  }
}

const generateERNs = async () => {
  isGeneratingERN.value = true
  error.value = null
  generatedERNs.value = {}
  ernErrors.value = {}
  
  // Check delivery history first
  await checkDeliveryHistory()
  
  try {
    // Generate ERN for each selected target
    for (const targetId of deliveryData.value.selectedTargets) {
      const target = availableTargets.value.find(t => t.id === targetId)
      if (!target) continue
      
      const messageType = messageTypes.value[targetId] || 'Initial'
      
      try {
        const result = await ernService.generateERNWithType(
          deliveryData.value.releaseId,
          {
            ...target,
            testMode: deliveryData.value.testMode,
            senderName: user.value?.organizationName || user.value?.displayName,
            senderPartyId: target.config?.distributorId,
            partyId: target.partyId,
            partyName: target.partyName,
            dealStartDate: target.dealStartDate,
            dealEndDate: target.dealEndDate,
            commercialModels: target.commercialModels || [{
              type: target.commercialModelType || 'PayAsYouGoModel',
              usageTypes: target.usageTypes || ['PermanentDownload', 'OnDemandStream']
            }]
          },
          {
            messageType: 'NewReleaseMessage',
            messageSubType: messageType,
            includeDeals: messageType !== 'Takedown',
            takedownDate: takedownDates.value[targetId]
          }
        )
        
        // Validate URLs in generated ERN
        const validation = validateXmlUrls(result.ern)
        if (!validation.valid) {
          console.warn(`URL validation issues in ERN for ${target.name}:`, validation.issues)
        }
        
        generatedERNs.value[targetId] = {
          ...result,
          messageSubType: messageType
        }
      } catch (err) {
        console.error(`Error generating ERN for ${target.name}:`, err)
        ernErrors.value[targetId] = err.message
        
        // If it's a genre mapping error in strict mode, provide helpful context
        if (err.message.includes('genre') && err.message.includes('strict')) {
          ernErrors.value[targetId] = `Genre mapping failed: ${err.message}`
        }
      }
    }
    
    // Check if any ERNs were generated
    if (Object.keys(generatedERNs.value).length === 0) {
      error.value = 'No ERNs were generated. Please check your configuration.'
    } else {
      successMessage.value = `Generated ${Object.keys(generatedERNs.value).length} ERN(s) successfully!`
      
      // Save ERN generation metadata
      for (const [targetId, ernResult] of Object.entries(generatedERNs.value)) {
        const target = availableTargets.value.find(t => t.id === targetId)
        if (target) {
          console.log(`ERN generated for ${target.name}: Message ID ${ernResult.messageId}, Type: ${ernResult.messageSubType}`)
          if (ernResult.genreMapping) {
            console.log(`Genre mapped: ${ernResult.genreMapping.original} → ${ernResult.genreMapping.mapped}`)
          }
        }
      }
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
    a.download = `${selectedRelease.value.basic?.title}_${target.name}_${ern.messageSubType}_ERN.xml`.replace(/[^a-z0-9]/gi, '_')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

const copyERNToClipboard = () => {
  navigator.clipboard.writeText(previewERN.value)
    .then(() => {
      successMessage.value = 'ERN copied to clipboard!'
      setTimeout(() => successMessage.value = '', 3000)
    })
    .catch(err => {
      console.error('Failed to copy:', err)
      error.value = 'Failed to copy to clipboard'
    })
}

const queueDelivery = async () => {
  isQueuingDelivery.value = true
  error.value = null
  
  try {
    const deliveries = []
    const duplicateDeliveries = []
    
    for (const targetId of deliveryData.value.selectedTargets) {
      const target = availableTargets.value.find(t => t.id === targetId)
      const ern = generatedERNs.value[targetId]
      
      if (!target || !ern) continue
      
      // Clean up genreMapping to avoid undefined values
      let cleanGenreMapping = null
      if (ern.genreMapping) {
        cleanGenreMapping = {
          enabled: ern.genreMapping.enabled === true,  // Ensure boolean
          original: ern.genreMapping.original || null,
          mapped: ern.genreMapping.mapped || null
        }
        // Only add mappingId if it exists
        if (ern.genreMapping.mappingId) {
          cleanGenreMapping.mappingId = ern.genreMapping.mappingId
        }
      }
      
      // Generate idempotency key using the service method
      const idempotencyKey = deliveryService.generateIdempotencyKey(
        deliveryData.value.releaseId,
        target.id,
        'NewReleaseMessage',
        messageTypes.value[target.id] || 'Initial',
        ern.messageId
      )
      
      console.log(`Generated idempotency key for ${target.name}: ${idempotencyKey}`)
      
      // Create delivery record with proper DSP configuration and message type
      const delivery = {
        releaseId: deliveryData.value.releaseId,
        releaseTitle: selectedRelease.value.basic?.title,
        releaseArtist: selectedRelease.value.basic?.displayArtist,
        upc: selectedRelease.value.basic?.barcode,
        targetId: target.id,
        targetName: target.name,
        targetProtocol: target.protocol,
        targetType: target.type || 'DSP',
        tenantId: user.value.uid,
        status: 'queued',
        priority: deliveryData.value.priority,
        scheduledAt: deliveryData.value.scheduleType === 'scheduled' 
          ? new Date(scheduledDateTime.value)
          : new Date(),
        testMode: deliveryData.value.testMode,
        notes: deliveryData.value.notes,
        
        // Idempotency key
        idempotencyKey: idempotencyKey,
        
        // Message type information
        messageType: 'NewReleaseMessage',
        messageSubType: messageTypes.value[target.id] || 'Initial',
        
        // Genre mapping information - cleaned up
        genreMapping: cleanGenreMapping,
        
        // ERN data
        ernVersion: target.ernVersion || '4.3',
        ernMessageId: ern.messageId,
        ernXml: ern.ern,
        
        // Package info
        package: {
          ernFile: `${ern.messageId}.xml`,
          audioFiles: selectedRelease.value.tracks?.map(t => t.audio?.url).filter(Boolean) || [],
          imageFiles: [selectedRelease.value.assets?.coverImage?.url].filter(Boolean),
          totalSize: calculatePackageSize()
        },
        
        // Connection info with proper structure
        connection: target.connection || {},
        
        // DSP-specific configuration
        config: {
          distributorId: target.config?.distributorId || target.distributorId || 'stardust-distro',
          partyId: target.partyId,
          partyName: target.partyName,
          apiKey: target.config?.apiKey || target.apiKey,
          ...target.config
        },
        
        createdAt: new Date(),
        createdBy: user.value.uid
      }
      
      // Use the delivery service to create the delivery (with idempotency check)
      const createdDelivery = await deliveryService.createDelivery(delivery)
      
      // Check if it was a duplicate
      if (createdDelivery.isDuplicate) {
        console.log(`Duplicate delivery detected for ${target.name} - using existing delivery`)
        duplicateDeliveries.push({
          ...createdDelivery,
          targetName: target.name
        })
        
        // Still add to deliveries array for tracking, but mark as duplicate
        deliveries.push(createdDelivery)
      } else {
        console.log(`New delivery created for ${target.name}: ${createdDelivery.id}`)
        deliveries.push(createdDelivery)
        
        // Only save to delivery history for new deliveries
        await addDoc(collection(db, 'deliveryHistory'), {
          deliveryId: createdDelivery.id,
          releaseId: deliveryData.value.releaseId,
          targetId: target.id,
          tenantId: user.value.uid,
          messageType: 'NewReleaseMessage',
          messageSubType: messageTypes.value[target.id] || 'Initial',
          status: 'queued',
          idempotencyKey: idempotencyKey,  // Include idempotency key in history
          createdAt: new Date()
        })
      }
    }
    
    // Provide detailed feedback about new vs duplicate deliveries
    const newDeliveries = deliveries.filter(d => !d.isDuplicate)
    const totalDeliveries = deliveries.length
    const duplicateCount = duplicateDeliveries.length
    
    if (duplicateCount > 0) {
      // Show which targets had duplicates
      const duplicateTargets = duplicateDeliveries.map(d => d.targetName).join(', ')
      
      if (newDeliveries.length > 0) {
        successMessage.value = `Successfully queued ${newDeliveries.length} new delivery(ies)! ` +
          `${duplicateCount} delivery(ies) to [${duplicateTargets}] already existed and were skipped.`
      } else {
        successMessage.value = `All ${duplicateCount} delivery(ies) already exist for [${duplicateTargets}]. ` +
          `No new deliveries were created to prevent duplicates.`
      }
      
      console.log('Duplicate deliveries detected:', duplicateDeliveries)
    } else {
      successMessage.value = `Successfully queued ${totalDeliveries} delivery(ies)!`
    }
    
    // Log summary
    console.log(`Delivery queue summary:`, {
      total: totalDeliveries,
      new: newDeliveries.length,
      duplicates: duplicateCount,
      targets: deliveries.map(d => ({
        target: d.targetName,
        id: d.id,
        isDuplicate: d.isDuplicate || false
      }))
    })
    
    // Redirect to deliveries page after a short delay
    setTimeout(() => {
      router.push('/deliveries')
    }, duplicateCount > 0 ? 3000 : 2000) // Give more time to read duplicate message
    
  } catch (err) {
    console.error('Error queuing delivery:', err)
    error.value = 'Failed to queue delivery. Please try again.'
  } finally {
    isQueuingDelivery.value = false
  }
}

const calculatePackageSize = () => {
  // Estimate package size (this is simplified)
  let size = 10240 // ERN XML ~10KB
  
  // Add audio file sizes (estimate 10MB per track)
  const trackCount = selectedRelease.value?.tracks?.length || 0
  size += trackCount * 10485760 // 10MB per track
  
  // Add cover image (estimate 500KB)
  if (selectedRelease.value?.assets?.coverImage) {
    size += 512000
  }
  
  return size
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="new-delivery">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <router-link to="/deliveries" class="back-link">
            <font-awesome-icon icon="chevron-left" />
            <span>Back to Deliveries</span>
          </router-link>
          <h1>New Delivery</h1>
          <p class="text-lg text-secondary">Create and schedule a new release delivery to DSPs</p>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="alert alert-success flex items-center gap-sm p-md rounded-lg mb-lg">
        <font-awesome-icon icon="check-circle" />
        {{ successMessage }}
      </div>
      
      <div v-if="error" class="alert alert-error flex items-center gap-sm p-md rounded-lg mb-lg">
        <font-awesome-icon icon="exclamation-triangle" />
        {{ error }}
      </div>

      <!-- Wizard Progress -->
      <div class="wizard-progress mb-xl">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <div class="progress-steps flex justify-between items-start">
          <div 
            v-for="step in 4" 
            :key="step"
            class="progress-step flex flex-col items-center"
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
            <span class="step-title text-sm">{{ stepTitles[step - 1] }}</span>
          </div>
        </div>
      </div>
      
      <!-- Wizard Content -->
      <div class="wizard-content card mb-xl">
        <div class="card-header">
          <h2 class="text-xl font-semibold">Step {{ currentStep }}: {{ currentStepTitle }}</h2>
        </div>
        <div class="card-body">
          <!-- Loading State -->
          <div v-if="isLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading...</p>
          </div>
          
          <!-- Step 1: Select Release -->
          <div v-else-if="currentStep === 1" class="wizard-step">
            <p class="text-secondary mb-lg">Choose the release you want to deliver to DSPs</p>
            
            <div v-if="readyReleases.length === 0" class="empty-state">
              <font-awesome-icon icon="music" />
              <p>No releases are ready for delivery</p>
              <router-link to="/releases/new" class="btn btn-primary">
                Create a Release
              </router-link>
            </div>
            
            <div v-else class="grid grid-cols-1 grid-cols-md-2 gap-lg">
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
                
                <div class="flex gap-md">
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
                  
                  <div class="flex flex-col gap-sm">
                    <h3 class="text-lg font-semibold">{{ release.basic?.title }}</h3>
                    <p class="text-secondary">{{ release.basic?.displayArtist }}</p>
                    
                    <!-- Genre Display with Badge -->
                    <div v-if="release.metadata?.genreCode || release.metadata?.genre" class="flex gap-sm flex-wrap">
                      <span class="genre-badge">
                        <font-awesome-icon icon="music" />
                        {{ release.metadata?.genreName || release.metadata?.genre || 'No Genre' }}
                      </span>
                      <span v-if="release.metadata?.subgenreName" class="subgenre-badge">
                        {{ release.metadata.subgenreName }}
                      </span>
                    </div>
                    
                    <div class="flex gap-md items-center text-sm text-tertiary">
                      <span class="badge" :class="release.status === 'ready' ? 'badge-success' : 'badge-info'">
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
            <div class="flex justify-between items-center mb-lg">
              <p class="text-secondary">Select one or more delivery targets</p>
              <div class="flex gap-sm">
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
            
            <div v-else class="grid grid-cols-1 grid-cols-md-2 grid-cols-md-3 gap-lg">
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
                
                <div class="flex flex-col gap-md">
                  <div class="flex justify-between items-center">
                    <h3 class="text-lg font-semibold">{{ target.name }}</h3>
                    <span class="badge" :class="target.testMode ? 'badge-warning' : 'badge-success'">
                      {{ target.testMode ? 'Test' : 'Production' }}
                    </span>
                  </div>
                  
                  <!-- Genre Mapping Indicator -->
                  <div v-if="target.genreMapping?.enabled" class="genre-mapping-indicator">
                    <div class="mapping-badge">
                      <font-awesome-icon icon="music" />
                      <span>Genre Mapping Enabled</span>
                      <span v-if="target.genreMapping.strictMode" class="strict-badge">
                        Strict
                      </span>
                    </div>
                    <div v-if="target.genreMapping.mappingName" class="text-xs text-secondary mt-xs">
                      {{ target.genreMapping.mappingName }}
                    </div>
                    <div v-if="selectedRelease && selectedRelease.metadata?.genreCode" class="genre-preview">
                      <span class="text-secondary">
                        {{ selectedRelease.metadata.genreName || selectedRelease.metadata.genre }}
                      </span>
                      <font-awesome-icon icon="arrow-right" class="text-primary text-xs" />
                      <span class="text-primary font-medium">
                        {{ getMappedGenrePreview(selectedRelease.metadata.genreCode, target) }}
                      </span>
                    </div>
                  </div>
                  
                  <div class="target-details text-sm">
                    <div class="flex justify-between">
                      <span class="text-secondary">Type:</span>
                      <span>{{ target.type }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-secondary">Protocol:</span>
                      <span>{{ target.protocol?.toUpperCase() }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-secondary">ERN Version:</span>
                      <span>{{ target.ernVersion || '4.3' }}</span>
                    </div>
                    <div v-if="target.partyName" class="flex justify-between">
                      <span class="text-secondary">Party:</span>
                      <span>{{ target.partyName }}</span>
                    </div>
                    <div v-if="deliveryHistory[target.id]?.hasBeenDelivered" class="flex justify-between">
                      <span class="text-secondary">Status:</span>
                      <span class="badge badge-info">Previously Delivered</span>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          <!-- Step 3: Generate ERN -->
          <div v-else-if="currentStep === 3" class="wizard-step">
            <p class="text-secondary mb-lg">Configure and generate ERN messages for each target</p>
            
            <!-- Message Type Configuration -->
            <div class="message-config-section mb-xl p-lg bg-secondary rounded-lg">
              <h3 class="text-lg font-semibold mb-lg">Message Configuration</h3>
              <div class="grid grid-cols-1 grid-cols-md-2 grid-cols-md-3 gap-lg">
                <div v-for="targetId in deliveryData.selectedTargets" :key="targetId" class="card">
                  <div class="card-body">
                    <div class="flex justify-between items-center mb-md">
                      <h4 class="font-semibold">{{ getTargetName(targetId) }}</h4>
                      <span v-if="deliveryHistory[targetId]?.hasBeenDelivered" class="badge badge-info">
                        Previously Delivered
                      </span>
                    </div>
                    
                    <!-- Genre Mapping Display -->
                    <div v-if="getTarget(targetId)?.genreMapping?.enabled" class="genre-mapping-display">
                      <div class="mapping-info-card">
                        <div class="mapping-title">
                          <font-awesome-icon icon="music" />
                          Genre Mapping Active
                        </div>
                        <div class="mapping-details text-sm">
                          <div class="mapping-row">
                            <span class="text-secondary">Original:</span>
                            <span>{{ selectedRelease?.metadata?.genreName || 'Unknown' }}</span>
                          </div>
                          <div class="mapping-row">
                            <span class="text-secondary">Mapped to:</span>
                            <span class="text-primary font-medium">
                              {{ getMappedGenrePreview(selectedRelease?.metadata?.genreCode, getTarget(targetId)) }}
                            </span>
                          </div>
                          <div v-if="getTarget(targetId)?.genreMapping?.strictMode" class="mapping-warning">
                            <font-awesome-icon icon="exclamation-triangle" />
                            Strict mode enabled - delivery will fail if genre cannot be mapped
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">Message Type</label>
                      <select v-model="messageTypes[targetId]" class="form-select">
                        <option value="Initial">Initial Delivery</option>
                        <option value="Update">Update Existing</option>
                        <option value="Takedown">Takedown</option>
                      </select>
                    </div>
                    
                    <div v-if="messageTypes[targetId] === 'Takedown'" class="form-group">
                      <label class="form-label">Takedown Date</label>
                      <input 
                        v-model="takedownDates[targetId]"
                        type="date"
                        class="form-input"
                        :min="new Date().toISOString().split('T')[0]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Generate ERN Button -->
            <div class="text-center mb-xl">
              <button 
                @click="generateERNs"
                class="btn btn-primary btn-lg"
                :disabled="isGeneratingERN || deliveryData.selectedTargets.length === 0"
              >
                <font-awesome-icon v-if="isGeneratingERN" icon="spinner" spin />
                <font-awesome-icon v-else icon="file-code" />
                {{ isGeneratingERN ? 'Generating...' : 'Generate ERN Messages' }}
              </button>
            </div>
            
            <!-- Generated ERNs Display -->
            <div v-if="Object.keys(generatedERNs).length > 0" class="generated-erns">
              <h3 class="text-lg font-semibold mb-md">Generated ERN Messages</h3>
              <div class="grid grid-cols-1 grid-cols-md-2 gap-lg">
                <div v-for="(ern, targetId) in generatedERNs" :key="targetId" class="card">
                  <div class="card-body">
                    <div class="flex justify-between items-center mb-md">
                      <h4 class="font-semibold">{{ getTargetName(targetId) }}</h4>
                      <span class="badge badge-success">
                        <font-awesome-icon icon="check-circle" />
                        Generated
                      </span>
                    </div>
                    
                    <!-- Show Genre Mapping Result -->
                    <div v-if="ern.genreMapping" class="genre-mapping-result">
                      <div class="result-badge">
                        <font-awesome-icon icon="music" />
                        Genre Mapped: {{ ern.genreMapping.original }} → {{ ern.genreMapping.mapped }}
                      </div>
                    </div>
                    
                    <div class="ern-details text-sm">
                      <div class="flex justify-between">
                        <span>Message ID:</span>
                        <code class="text-xs">{{ ern.messageId }}</code>
                      </div>
                      <div class="flex justify-between">
                        <span>Version:</span>
                        <span>ERN {{ ern.version || '4.3' }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>Type:</span>
                        <span>{{ ern.messageSubType || messageTypes[targetId] }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span>Profile:</span>
                        <span>{{ ern.profile }}</span>
                      </div>
                    </div>
                    
                    <div class="flex gap-sm mt-md pt-md border-t">
                      <button @click="previewERNForTarget(targetId)" class="btn btn-sm btn-secondary">
                        <font-awesome-icon icon="eye" />
                        Preview
                      </button>
                      <button @click="validateERN(targetId)" class="btn btn-sm btn-secondary">
                        <font-awesome-icon icon="check-circle" />
                        Validate
                      </button>
                      <button @click="downloadERN(targetId)" class="btn btn-sm btn-primary">
                        <font-awesome-icon icon="download" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- ERN Errors Display -->
            <div v-if="Object.keys(ernErrors).length > 0" class="ern-errors mt-xl">
              <h3 class="text-lg font-semibold mb-md">Generation Errors</h3>
              <div v-for="(error, targetId) in ernErrors" :key="targetId" class="error-card card mb-md">
                <div class="card-body">
                  <div class="flex justify-between items-center mb-md">
                    <h4 class="font-semibold">{{ getTargetName(targetId) }}</h4>
                    <span class="badge badge-error">Failed</span>
                  </div>
                  <div class="error-message">
                    <font-awesome-icon icon="exclamation-triangle" />
                    {{ error }}
                  </div>
                  <div v-if="error.includes('genre') && error.includes('strict')" class="error-hint">
                    <strong>Hint:</strong> This target has strict genre mapping enabled. 
                    Either disable strict mode or ensure the genre can be mapped.
                    <router-link :to="`/genre-maps?dsp=${getTarget(targetId)?.type?.toLowerCase()}`" class="text-primary">
                      Manage Genre Mappings
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Step 4: Schedule & Confirm -->
          <div v-else-if="currentStep === 4" class="wizard-step">
            <p class="text-secondary mb-lg">Review and schedule your delivery</p>
            
            <!-- Delivery Summary -->
            <div class="delivery-summary bg-secondary rounded-lg p-lg mb-xl">
              <h3 class="text-lg font-semibold mb-md">Delivery Summary</h3>
              
              <div class="mb-lg">
                <h4 class="font-semibold mb-md">Release</h4>
                <div class="card">
                  <div class="card-body">
                    <div class="flex gap-md">
                      <div class="summary-cover">
                        <img 
                          v-if="selectedRelease?.assets?.coverImage?.url" 
                          :src="selectedRelease.assets.coverImage.url" 
                          :alt="selectedRelease.basic?.title"
                        />
                        <div v-else class="cover-placeholder">
                          <font-awesome-icon icon="music" />
                        </div>
                      </div>
                      <div class="flex flex-col gap-xs">
                        <h5 class="text-lg font-semibold">{{ selectedRelease?.basic?.title }}</h5>
                        <p class="text-secondary">{{ selectedRelease?.basic?.displayArtist }}</p>
                        <div class="flex gap-md items-center text-sm text-tertiary">
                          <span>{{ selectedRelease?.tracks?.length || 0 }} tracks</span>
                          <span>UPC: {{ selectedRelease?.basic?.barcode || 'N/A' }}</span>
                          <span v-if="selectedRelease?.metadata?.genreName" class="genre-badge">
                            <font-awesome-icon icon="music" />
                            {{ selectedRelease.metadata.genreName }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mb-lg">
                <h4 class="font-semibold mb-md">Targets ({{ deliveryData.selectedTargets.length }})</h4>
                <div class="grid grid-cols-1 grid-cols-md-2 gap-md">
                  <div v-for="targetId in deliveryData.selectedTargets" :key="targetId" class="card">
                    <div class="card-body">
                      <div class="flex justify-between items-center mb-sm">
                        <h5 class="font-semibold">{{ getTargetName(targetId) }}</h5>
                        <span v-if="generatedERNs[targetId]" class="badge badge-success">
                          <font-awesome-icon icon="check-circle" />
                          ERN Ready
                        </span>
                      </div>
                      
                      <!-- Genre Mapping Summary -->
                      <div v-if="getTarget(targetId)?.genreMapping?.enabled" class="genre-mapping-summary">
                        <div class="mapping-summary-badge">
                          <font-awesome-icon icon="music" />
                          <span>Genre will be mapped</span>
                        </div>
                        <div v-if="generatedERNs[targetId]?.genreMapping" class="mapping-result-summary">
                          {{ generatedERNs[targetId].genreMapping.original }} → 
                          {{ generatedERNs[targetId].genreMapping.mapped }}
                        </div>
                      </div>
                      
                      <div class="flex gap-md text-sm text-secondary">
                        <span>{{ getTarget(targetId)?.protocol?.toUpperCase() }}</span>
                        <span>{{ messageTypes[targetId] || 'Initial' }}</span>
                        <span v-if="getTarget(targetId)?.testMode" class="badge badge-warning">Test Mode</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 class="font-semibold mb-md">Delivery Options</h4>
                <div class="card">
                  <div class="card-body">
                    <div class="grid grid-cols-1 grid-cols-md-2 gap-md">
                      <div class="form-group">
                        <label class="form-label">Delivery Priority</label>
                        <select v-model="deliveryData.priority" class="form-select">
                          <option value="low">Low Priority</option>
                          <option value="normal">Normal Priority</option>
                          <option value="high">High Priority</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      
                      <div class="form-group">
                        <label class="form-label">Schedule Delivery</label>
                        <div class="schedule-options">
                          <label class="radio-option">
                            <input 
                              type="radio" 
                              value="immediate" 
                              v-model="deliveryData.scheduleType"
                            />
                            <span>Deliver Immediately</span>
                          </label>
                          <label class="radio-option">
                            <input 
                              type="radio" 
                              value="scheduled" 
                              v-model="deliveryData.scheduleType"
                            />
                            <span>Schedule for Later</span>
                          </label>
                        </div>
                        
                        <div v-if="deliveryData.scheduleType === 'scheduled'" class="mt-sm">
                          <input 
                            v-model="scheduledDateTime"
                            type="datetime-local"
                            class="form-input"
                            :min="new Date().toISOString().slice(0, 16)"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div class="form-group">
                      <label class="checkbox-option">
                        <input 
                          type="checkbox"
                          v-model="deliveryData.testMode"
                        />
                        <span>Run in Test Mode (no actual delivery)</span>
                      </label>
                    </div>
                    
                    <div class="form-group">
                      <label class="form-label">Delivery Notes (Optional)</label>
                      <textarea 
                        v-model="deliveryData.notes"
                        class="form-textarea"
                        rows="3"
                        placeholder="Add any notes about this delivery..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Wizard Navigation -->
      <div class="wizard-navigation">
        <button 
          @click="previousStep"
          class="btn btn-secondary"
          :disabled="currentStep === 1"
        >
          <font-awesome-icon icon="chevron-left" />
          Previous
        </button>
        
        <button 
          v-if="currentStep < 4"
          @click="nextStep"
          class="btn btn-primary"
          :disabled="!canProceed"
        >
          Next
          <font-awesome-icon icon="chevron-right" />
        </button>
        
        <button 
          v-else
          @click="queueDelivery"
          class="btn btn-success btn-lg"
          :disabled="!canQueueDelivery || isQueuingDelivery"
        >
          <font-awesome-icon v-if="isQueuingDelivery" icon="spinner" spin />
          <font-awesome-icon v-else icon="paper-plane" />
          {{ isQueuingDelivery ? 'Queuing...' : 'Queue Delivery' }}
        </button>
      </div>
    </div>
    
    <!-- ERN Preview Modal -->
    <div v-if="showERNPreview" class="modal-overlay" @click="showERNPreview = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="text-xl font-semibold">ERN Preview - {{ previewTargetName }}</h2>
          <button @click="showERNPreview = false" class="modal-close">
            <font-awesome-icon icon="times" />
          </button>
        </div>
        <div class="modal-body">
          <pre class="ern-preview">{{ previewERN }}</pre>
        </div>
        <div class="modal-footer">
          <button @click="copyERNToClipboard" class="btn btn-secondary">
            <font-awesome-icon icon="copy" />
            Copy to Clipboard
          </button>
          <button @click="showERNPreview = false" class="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Component-specific styles only for unique elements */
.new-delivery {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

/* Page Header */
.page-header {
  margin-bottom: var(--space-xl);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-medium);
  margin-bottom: var(--space-sm);
}

.back-link:hover {
  text-decoration: underline;
}

/* Alerts */
.alert-success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.alert-error {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

/* Progress Bar */
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

.progress-step {
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

/* Wizard */
.wizard-step {
  min-height: 400px;
}

/* Release/Target Cards */
.release-card,
.target-card {
  display: block;
  cursor: pointer;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  transition: all var(--transition-base);
}

.release-card:hover,
.target-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.release-card.selected,
.target-card.selected {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.release-radio,
.target-checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.release-cover,
.summary-cover {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--color-bg-secondary);
}

.release-cover img,
.summary-cover img {
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

.target-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

/* Badges */
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

/* Genre specific */
.genre-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 4px 10px;
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.subgenre-badge {
  padding: 4px 10px;
  background-color: var(--color-secondary-light);
  color: var(--color-secondary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.genre-mapping-indicator {
  margin-top: var(--space-md);
  padding: var(--space-sm);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.mapping-badge {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.strict-badge {
  padding: 2px 6px;
  background-color: var(--color-warning);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  margin-left: var(--space-xs);
}

.genre-preview {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
  padding: var(--space-xs);
  background-color: var(--color-bg);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.genre-mapping-display {
  margin-top: var(--space-md);
}

.mapping-info-card {
  padding: var(--space-md);
  background-color: rgba(66, 133, 244, 0.1);
  border: 1px solid var(--color-info);
  border-radius: var(--radius-md);
}

.mapping-title {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-weight: var(--font-medium);
  color: var(--color-info);
  margin-bottom: var(--space-sm);
}

.mapping-row {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
}

.mapping-warning {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  padding: var(--space-xs);
  background-color: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.genre-mapping-result {
  margin-top: var(--space-sm);
  padding: var(--space-sm);
  background-color: rgba(52, 168, 83, 0.1);
  border-radius: var(--radius-md);
}

.result-badge {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-success);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.genre-mapping-summary {
  margin-top: var(--space-sm);
  padding: var(--space-sm);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
}

.mapping-summary-badge {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-primary);
}

.mapping-result-summary {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-xs);
  padding-left: var(--space-lg);
}

/* ERN Details */
.ern-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

/* Error Cards */
.error-card {
  border-color: var(--color-error) !important;
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-error);
  padding: var(--space-sm);
  background-color: rgba(234, 67, 53, 0.1);
  border-radius: var(--radius-md);
}

.error-hint {
  margin-top: var(--space-sm);
  padding: var(--space-sm);
  background-color: rgba(66, 133, 244, 0.1);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

/* Schedule Options */
.schedule-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.radio-option,
.checkbox-option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
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

/* Navigation */
.wizard-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-xl);
  margin-top: var(--space-xl);
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

.modal-content {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-close {
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

.modal-close:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
}

.modal-body {
  padding: var(--space-lg);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-top: 1px solid var(--color-border);
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

/* Responsive */
@media (max-width: 768px) {
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