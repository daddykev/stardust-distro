<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import deliveryTargetService from '../../services/deliveryTargets'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  mode: {
    type: String,
    default: 'create' // 'create' or 'edit'
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const localTarget = ref({
  name: '',
  type: 'DSP',
  partyName: '',
  partyId: '',
  protocol: 'SFTP',
  ernVersion: '4.3',
  testMode: true,
  active: true,
  
  // Connection details
  connection: {
    host: '',
    port: 22,
    username: '',
    password: '',
    path: '/',
    
    // S3 specific
    bucket: '',
    region: 'us-east-1',
    accessKey: '',
    secretKey: '',
    
    // API specific
    endpoint: '',
    authType: 'Bearer',
    apiKey: '',
    
    // Firebase Storage specific (for Stardust DSP)
    distributorId: '',
    projectId: ''
  },
  
  // DDEX Deal configuration
  commercialModels: [
    {
      type: 'PayAsYouGoModel',
      usageTypes: ['PermanentDownload'],
      territories: ['Worldwide'],
      price: null,
      currency: 'USD'
    }
  ],
  
  // Advanced settings
  settings: {
    autoDeliver: false,
    validateBeforeDelivery: true,
    requireAcknowledgment: false,
    retryAttempts: 3,
    retryDelay: 60 // minutes
  },
  
  ...props.modelValue
})

// JSON import state
const showJsonImport = ref(false)
const jsonInput = ref('')
const jsonError = ref('')

// Common DSP presets
const dspPresets = [
  { value: 'custom', label: 'Custom Configuration' },
  { value: 'stardust-dsp', label: 'Stardust DSP (JSON Import)' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'apple', label: 'Apple Music' },
  { value: 'amazon', label: 'Amazon Music' },
  { value: 'youtube', label: 'YouTube Music' },
  { value: 'deezer', label: 'Deezer' },
  { value: 'tidal', label: 'Tidal' }
]

const selectedPreset = ref('custom')

// Testing connection
const isTestingConnection = ref(false)
const connectionTestResult = ref(null)

// Available options
const protocolOptions = [
  { value: 'FTP', label: 'FTP' },
  { value: 'SFTP', label: 'SFTP (Recommended)' },
  { value: 'S3', label: 'Amazon S3' },
  { value: 'storage', label: 'Firebase Storage (Stardust DSP)' },
  { value: 'API', label: 'REST API' }
]

const ernVersionOptions = [
  { value: '4.3', label: 'ERN 4.3 (Latest)' },
  { value: '4.2', label: 'ERN 4.2' },
  { value: '3.8.2', label: 'ERN 3.8.2' }
]

const commercialModelOptions = [
  { value: 'PayAsYouGoModel', label: 'Pay As You Go' },
  { value: 'SubscriptionModel', label: 'Subscription' },
  { value: 'AdvertisementSupportedModel', label: 'Ad Supported' },
  { value: 'FreeOfChargeModel', label: 'Free of Charge' }
]

// Computed
const getUsageTypesForModel = (modelType) => {
  const usageTypesByModel = {
    'PayAsYouGoModel': [
      { value: 'PermanentDownload', label: 'Permanent Download' },
      { value: 'ConditionalDownload', label: 'Conditional Download' },
      { value: 'TetheredDownload', label: 'Tethered Download' },
      { value: 'PayPerView', label: 'Pay Per View' }
    ],
    'SubscriptionModel': [
      { value: 'OnDemandStream', label: 'On-Demand Stream' },
      { value: 'ConditionalDownload', label: 'Conditional Download' },
      { value: 'TetheredDownload', label: 'Tethered Download' },
      { value: 'SubscriptionDownload', label: 'Subscription Download' },
      { value: 'NonInteractiveStream', label: 'Non-Interactive Stream' }
    ],
    'AdvertisementSupportedModel': [
      { value: 'OnDemandStream', label: 'On-Demand Stream' },
      { value: 'NonInteractiveStream', label: 'Non-Interactive Stream' },
      { value: 'WebcastStream', label: 'Webcast Stream' },
      { value: 'FreePreview', label: 'Free Preview' }
    ],
    'FreeOfChargeModel': [
      { value: 'FreePreview', label: 'Free Preview' },
      { value: 'OnDemandStream', label: 'On-Demand Stream' },
      { value: 'PermanentDownload', label: 'Permanent Download (Free)' },
      { value: 'ConditionalDownload', label: 'Conditional Download' }
    ]
  }
  
  return usageTypesByModel[modelType] || []
}

const defaultPort = computed(() => {
  switch (localTarget.value.protocol) {
    case 'FTP': return 21
    case 'SFTP': return 22
    default: return null
  }
})

// Methods
const parseJsonConfig = () => {
  jsonError.value = ''
  
  try {
    const config = JSON.parse(jsonInput.value)
    
    // Validate required fields
    if (!config.name || !config.type || !config.protocol || !config.config) {
      throw new Error('Invalid configuration format. Missing required fields.')
    }
    
    // Map the configuration to our form structure
    localTarget.value.name = config.name
    localTarget.value.type = config.type
    localTarget.value.protocol = config.protocol
    
    // Handle different protocol configurations
    if (config.protocol === 'storage') {
      // Firebase Storage configuration from Stardust DSP
      localTarget.value.connection.bucket = config.config.bucket || ''
      localTarget.value.connection.path = config.config.path || '/'
      localTarget.value.connection.distributorId = config.config.distributorId || ''
      
      // Extract project ID from bucket URL if it's a Firebase Storage URL
      if (config.config.bucket && config.config.bucket.includes('.firebasestorage.app')) {
        const projectId = config.config.bucket.split('.firebasestorage.app')[0]
        localTarget.value.connection.projectId = projectId
      }
      
      // Set default DDEX info for Stardust DSP
      localTarget.value.partyName = config.name
      localTarget.value.partyId = `PADPIDA${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}01T`
      
      // Set test mode by default for Stardust DSP
      localTarget.value.testMode = true
      
      // Configure commercial models for testing
      localTarget.value.commercialModels = [
        {
          type: 'SubscriptionModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        },
        {
          type: 'AdvertisementSupportedModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        }
      ]
    } else if (config.protocol === 'S3') {
      localTarget.value.connection.bucket = config.config.bucket || ''
      localTarget.value.connection.region = config.config.region || 'us-east-1'
      localTarget.value.connection.path = config.config.path || '/'
      localTarget.value.connection.accessKey = config.config.accessKey || ''
      localTarget.value.connection.secretKey = config.config.secretKey || ''
    } else if (config.protocol === 'API') {
      localTarget.value.connection.endpoint = config.config.endpoint || ''
      localTarget.value.connection.authType = config.config.authType || 'Bearer'
      localTarget.value.connection.apiKey = config.config.apiKey || ''
    } else if (config.protocol === 'FTP' || config.protocol === 'SFTP') {
      localTarget.value.connection.host = config.config.host || ''
      localTarget.value.connection.port = config.config.port || defaultPort.value
      localTarget.value.connection.username = config.config.username || ''
      localTarget.value.connection.password = config.config.password || ''
      localTarget.value.connection.path = config.config.path || '/'
    }
    
    // Additional metadata if provided
    if (config.partyName) localTarget.value.partyName = config.partyName
    if (config.partyId) localTarget.value.partyId = config.partyId
    if (config.ernVersion) localTarget.value.ernVersion = config.ernVersion
    if (config.testMode !== undefined) localTarget.value.testMode = config.testMode
    if (config.commercialModels) localTarget.value.commercialModels = config.commercialModels
    
    // Close the JSON import modal
    showJsonImport.value = false
    jsonInput.value = ''
    
    // Show success message
    connectionTestResult.value = {
      success: true,
      message: 'Configuration imported successfully!'
    }
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      connectionTestResult.value = null
    }, 3000)
    
  } catch (error) {
    jsonError.value = error.message || 'Invalid JSON configuration'
  }
}

const applyPreset = () => {
  if (selectedPreset.value === 'stardust-dsp') {
    showJsonImport.value = true
    return
  }
  
  const presets = {
    spotify: {
      name: 'Spotify',
      partyName: 'Spotify AB',
      partyId: 'PADPIDA2014120301E',
      protocol: 'SFTP',
      ernVersion: '4.3',
      commercialModels: [
        {
          type: 'SubscriptionModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        },
        {
          type: 'AdvertisementSupportedModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        }
      ]
    },
    apple: {
      name: 'Apple Music',
      partyName: 'Apple Inc.',
      partyId: 'PADPIDA2013111801U',
      protocol: 'API',
      ernVersion: '4.3',
      commercialModels: [
        {
          type: 'SubscriptionModel',
          usageTypes: ['OnDemandStream', 'TetheredDownload'],
          territories: ['Worldwide']
        }
      ]
    },
    amazon: {
      name: 'Amazon Music',
      partyName: 'Amazon.com Services LLC',
      partyId: 'PADPIDA2015010801B',
      protocol: 'S3',
      ernVersion: '4.3',
      commercialModels: [
        {
          type: 'SubscriptionModel',
          usageTypes: ['OnDemandStream'],
          territories: ['Worldwide']
        },
        {
          type: 'PayAsYouGoModel',
          usageTypes: ['PermanentDownload'],
          territories: ['Worldwide']
        }
      ]
    }
  }
  
  if (presets[selectedPreset.value]) {
    Object.assign(localTarget.value, presets[selectedPreset.value])
  }
}

const addCommercialModel = () => {
  localTarget.value.commercialModels.push({
    type: 'SubscriptionModel',
    usageTypes: ['OnDemandStream'],
    territories: ['Worldwide'],
    price: null,
    currency: 'USD'
  })
}

const removeCommercialModel = (index) => {
  if (localTarget.value.commercialModels.length > 1) {
    localTarget.value.commercialModels.splice(index, 1)
  }
}

const updateCommercialModel = (index) => {
  // Clear usage types when model changes
  localTarget.value.commercialModels[index].usageTypes = []
  
  // Set default usage type
  const availableTypes = getUsageTypesForModel(localTarget.value.commercialModels[index].type)
  if (availableTypes.length > 0) {
    localTarget.value.commercialModels[index].usageTypes = [availableTypes[0].value]
  }
}

const testConnection = async () => {
  isTestingConnection.value = true
  connectionTestResult.value = null
  
  try {
    const result = await deliveryTargetService.testConnection(localTarget.value)
    connectionTestResult.value = result
  } catch (error) {
    connectionTestResult.value = {
      success: false,
      message: error.message
    }
  } finally {
    isTestingConnection.value = false
  }
}

const handleSave = () => {
  emit('update:modelValue', localTarget.value)
  emit('save', localTarget.value)
}

const handleCancel = () => {
  emit('cancel')
}

// Watch for preset changes
watch(selectedPreset, (newPreset) => {
  if (newPreset !== 'custom') {
    applyPreset()
  }
})

// Watch for protocol changes to update port
watch(() => localTarget.value.protocol, (newProtocol) => {
  if (defaultPort.value) {
    localTarget.value.connection.port = defaultPort.value
  }
})

onMounted(() => {
  if (props.modelValue && Object.keys(props.modelValue).length > 0) {
    localTarget.value = { ...localTarget.value, ...props.modelValue }
  }
})
</script>

<template>
  <div class="delivery-target-form">
    <!-- DSP Preset Selection -->
    <div v-if="mode === 'create'" class="form-section">
      <h3 class="section-title">Quick Setup</h3>
      <div class="form-group">
        <label class="form-label">Select DSP Preset</label>
        <select v-model="selectedPreset" class="form-select">
          <option v-for="preset in dspPresets" :key="preset.value" :value="preset.value">
            {{ preset.label }}
          </option>
        </select>
        <p class="form-help">Select a preset to auto-fill common DSP configurations or import from Stardust DSP</p>
      </div>
    </div>

    <!-- JSON Import Modal -->
    <div v-if="showJsonImport" class="modal-overlay" @click.self="showJsonImport = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Import Stardust DSP Configuration</h3>
          <button @click="showJsonImport = false" class="btn-icon">
            <font-awesome-icon icon="times" />
          </button>
        </div>
        <div class="modal-body">
          <div class="import-instructions">
            <h4>How to import from Stardust DSP:</h4>
            <ol>
              <li>Go to Settings → Delivery Targets in Stardust DSP</li>
              <li>Click "Add Target" and configure your distributor</li>
              <li>Copy the configuration JSON</li>
              <li>Paste it below</li>
            </ol>
          </div>
          
          <div class="form-group">
            <label class="form-label">Configuration JSON</label>
            <textarea 
              v-model="jsonInput" 
              class="form-textarea"
              placeholder='Paste your Stardust DSP configuration JSON here...

Example:
{
  "name": "Stardust DSP",
  "type": "DSP",
  "protocol": "storage",
  "config": {
    "distributorId": "SDT",
    "bucket": "stardust-dsp.firebasestorage.app",
    "path": "/deliveries/SDT/{timestamp}/"
  }
}'
              rows="12"
            ></textarea>
            <div v-if="jsonError" class="form-error">
              <font-awesome-icon icon="exclamation-triangle" />
              {{ jsonError }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showJsonImport = false" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="parseJsonConfig" class="btn btn-primary">
            <font-awesome-icon icon="upload" />
            Import Configuration
          </button>
        </div>
      </div>
    </div>

    <!-- Basic Information -->
    <div class="form-section">
      <h3 class="section-title">Basic Information</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label required">Target Name</label>
          <input 
            v-model="localTarget.name" 
            type="text" 
            class="form-input"
            placeholder="e.g., Spotify Production"
            required
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Target Type</label>
          <select v-model="localTarget.type" class="form-select">
            <option value="DSP">DSP (Digital Service Provider)</option>
            <option value="Aggregator">Aggregator</option>
            <option value="Test">Test Environment</option>
          </select>
        </div>
      </div>
    </div>

    <!-- DDEX Configuration -->
    <div class="form-section">
      <h3 class="section-title">DDEX Configuration</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label required">DDEX Party Name</label>
          <input 
            v-model="localTarget.partyName" 
            type="text" 
            class="form-input"
            placeholder="e.g., Spotify AB"
            required
          />
        </div>
        
        <div class="form-group">
          <label class="form-label required">DDEX Party ID</label>
          <input 
            v-model="localTarget.partyId" 
            type="text" 
            class="form-input"
            placeholder="e.g., PADPIDA2014120301E"
            required
          />
          <p class="form-help">DPID format: PADPIDA + date + unique identifier</p>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">ERN Version</label>
          <select v-model="localTarget.ernVersion" class="form-select">
            <option v-for="version in ernVersionOptions" :key="version.value" :value="version.value">
              {{ version.label }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">Mode</label>
          <div class="radio-group">
            <label class="radio-label">
              <input 
                v-model="localTarget.testMode" 
                type="radio" 
                :value="true"
              />
              Test Mode
            </label>
            <label class="radio-label">
              <input 
                v-model="localTarget.testMode" 
                type="radio" 
                :value="false"
              />
              Live Mode
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Delivery Protocol -->
    <div class="form-section">
      <h3 class="section-title">Delivery Protocol</h3>
      
      <div class="form-group">
        <label class="form-label">Protocol</label>
        <select v-model="localTarget.protocol" class="form-select">
          <option v-for="protocol in protocolOptions" :key="protocol.value" :value="protocol.value">
            {{ protocol.label }}
          </option>
        </select>
      </div>
      
      <!-- FTP/SFTP Configuration -->
      <div v-if="localTarget.protocol === 'FTP' || localTarget.protocol === 'SFTP'" class="protocol-config">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Host/IP Address</label>
            <input 
              v-model="localTarget.connection.host" 
              type="text" 
              class="form-input"
              placeholder="ftp.example.com or 192.168.1.1"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Port</label>
            <input 
              v-model.number="localTarget.connection.port" 
              type="number" 
              class="form-input"
              :placeholder="defaultPort"
              required
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Username</label>
            <input 
              v-model="localTarget.connection.username" 
              type="text" 
              class="form-input"
              placeholder="FTP username"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Password</label>
            <input 
              v-model="localTarget.connection.password" 
              type="password" 
              class="form-input"
              placeholder="FTP password"
              required
            />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Remote Path</label>
          <input 
            v-model="localTarget.connection.path" 
            type="text" 
            class="form-input"
            placeholder="/incoming/releases/"
          />
        </div>
      </div>
      
      <!-- Firebase Storage Configuration (Stardust DSP) -->
      <div v-else-if="localTarget.protocol === 'storage'" class="protocol-config">
        <div class="info-banner">
          <font-awesome-icon icon="info-circle" />
          <div>
            <strong>Stardust DSP Integration</strong>
            <p>This configuration is for integration with Stardust DSP test instances.</p>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Distributor ID</label>
            <input 
              v-model="localTarget.connection.distributorId" 
              type="text" 
              class="form-input"
              placeholder="e.g., SDT"
              required
            />
            <p class="form-help">Your unique distributor identifier in Stardust DSP</p>
          </div>
          
          <div class="form-group">
            <label class="form-label required">Storage Bucket</label>
            <input 
              v-model="localTarget.connection.bucket" 
              type="text" 
              class="form-input"
              placeholder="stardust-dsp.firebasestorage.app"
              required
            />
            <p class="form-help">Firebase Storage bucket URL</p>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Delivery Path</label>
          <input 
            v-model="localTarget.connection.path" 
            type="text" 
            class="form-input"
            placeholder="/deliveries/{distributorId}/{timestamp}/"
          />
          <p class="form-help">Path pattern for deliveries. {timestamp} will be replaced with actual timestamp.</p>
        </div>
      </div>
      
      <!-- S3 Configuration -->
      <div v-else-if="localTarget.protocol === 'S3'" class="protocol-config">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Bucket Name</label>
            <input 
              v-model="localTarget.connection.bucket" 
              type="text" 
              class="form-input"
              placeholder="my-music-bucket"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Region</label>
            <select v-model="localTarget.connection.region" class="form-select">
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">EU (Ireland)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Access Key ID</label>
            <input 
              v-model="localTarget.connection.accessKey" 
              type="text" 
              class="form-input"
              placeholder="AKIA..."
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Secret Access Key</label>
            <input 
              v-model="localTarget.connection.secretKey" 
              type="password" 
              class="form-input"
              required
            />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Path Prefix</label>
          <input 
            v-model="localTarget.connection.path" 
            type="text" 
            class="form-input"
            placeholder="releases/"
          />
        </div>
      </div>
      
      <!-- API Configuration -->
      <div v-else-if="localTarget.protocol === 'API'" class="protocol-config">
        <div class="form-group">
          <label class="form-label required">API Endpoint</label>
          <input 
            v-model="localTarget.connection.endpoint" 
            type="url" 
            class="form-input"
            placeholder="https://api.dsp.com/v1/releases"
            required
          />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Authentication Type</label>
            <select v-model="localTarget.connection.authType" class="form-select">
              <option value="Bearer">Bearer Token</option>
              <option value="Basic">Basic Auth</option>
              <option value="OAuth2">OAuth 2.0</option>
              <option value="ApiKey">API Key</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label required">API Key/Token</label>
            <input 
              v-model="localTarget.connection.apiKey" 
              type="password" 
              class="form-input"
              placeholder="Your API key or token"
              required
            />
          </div>
        </div>
      </div>
      
      <!-- Test Connection Button -->
      <div class="test-connection">
        <button 
          @click="testConnection" 
          class="btn btn-secondary"
          :disabled="isTestingConnection"
        >
          <font-awesome-icon :icon="isTestingConnection ? 'spinner' : 'plug'" :spin="isTestingConnection" />
          {{ isTestingConnection ? 'Testing...' : 'Test Connection' }}
        </button>
        
        <div v-if="connectionTestResult" class="test-result" :class="{ success: connectionTestResult.success, error: !connectionTestResult.success }">
          <font-awesome-icon :icon="connectionTestResult.success ? 'check-circle' : 'times-circle'" />
          {{ connectionTestResult.message }}
        </div>
      </div>
    </div>

    <!-- Commercial Models -->
    <div class="form-section">
      <div class="section-header">
        <h3 class="section-title">Commercial Models</h3>
        <button 
          type="button"
          @click="addCommercialModel"
          class="btn btn-sm btn-secondary"
        >
          <font-awesome-icon icon="plus" /> Add Model
        </button>
      </div>
      
      <div 
        v-for="(model, index) in localTarget.commercialModels" 
        :key="`model-${index}`"
        class="commercial-model-card"
      >
        <div class="model-header">
          <select 
            v-model="model.type" 
            class="form-select"
            @change="() => updateCommercialModel(index)"
          >
            <option v-for="option in commercialModelOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <button 
            type="button"
            @click="removeCommercialModel(index)"
            class="btn-icon"
            :disabled="localTarget.commercialModels.length === 1"
          >
            <font-awesome-icon icon="trash" />
          </button>
        </div>
        
        <div class="model-usage-types">
          <label class="form-label">Usage Types</label>
          <div class="checkbox-group">
            <label 
              v-for="usageType in getUsageTypesForModel(model.type)"
              :key="`${index}-${usageType.value}`"
              class="checkbox-label"
            >
              <input 
                type="checkbox"
                :value="usageType.value"
                v-model="model.usageTypes"
              />
              {{ usageType.label }}
            </label>
          </div>
        </div>
        
        <!-- Price for Pay As You Go -->
        <div v-if="model.type === 'PayAsYouGoModel'" class="price-section">
          <label class="form-label">Price Information (Optional)</label>
          <div class="form-row">
            <div class="form-group">
              <input 
                v-model.number="model.price"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.99"
              />
            </div>
            <div class="form-group">
              <select v-model="model.currency" class="form-select">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Advanced Settings -->
    <div class="form-section">
      <h3 class="section-title">Advanced Settings</h3>
      
      <div class="settings-grid">
        <label class="checkbox-label">
          <input 
            v-model="localTarget.settings.autoDeliver" 
            type="checkbox"
          />
          Auto-deliver when releases are ready
        </label>
        
        <label class="checkbox-label">
          <input 
            v-model="localTarget.settings.validateBeforeDelivery" 
            type="checkbox"
          />
          Validate ERN before delivery
        </label>
        
        <label class="checkbox-label">
          <input 
            v-model="localTarget.settings.requireAcknowledgment" 
            type="checkbox"
          />
          Require DSP acknowledgment
        </label>
        
        <label class="checkbox-label">
          <input 
            v-model="localTarget.active" 
            type="checkbox"
          />
          Target is active
        </label>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Retry Attempts</label>
          <input 
            v-model.number="localTarget.settings.retryAttempts" 
            type="number"
            min="0"
            max="10"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Retry Delay (minutes)</label>
          <input 
            v-model.number="localTarget.settings.retryDelay" 
            type="number"
            min="1"
            max="1440"
            class="form-input"
          />
        </div>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="form-actions">
      <button @click="handleCancel" class="btn btn-secondary">
        Cancel
      </button>
      <button @click="handleSave" class="btn btn-primary">
        <font-awesome-icon icon="save" />
        {{ mode === 'create' ? 'Create Target' : 'Save Changes' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.delivery-target-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.form-section {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-lg);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
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

.form-label.required::after {
  content: ' *';
  color: var(--color-error);
}

.form-help {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.form-textarea {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-family: var(--font-mono);
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: all var(--transition-base);
  resize: vertical;
  min-height: 200px;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-error {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-error);
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
}

.radio-group {
  display: flex;
  gap: var(--space-lg);
  align-items: center;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.protocol-config {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

/* Info Banner */
.info-banner {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background-color: var(--color-primary-light);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
}

.info-banner svg {
  color: var(--color-primary);
  font-size: 1.25rem;
  flex-shrink: 0;
}

.info-banner strong {
  display: block;
  margin-bottom: var(--space-xs);
}

.info-banner p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

/* Import Instructions */
.import-instructions {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  margin-bottom: var(--space-lg);
}

.import-instructions h4 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
  color: var(--color-heading);
}

.import-instructions ol {
  margin: 0;
  padding-left: var(--space-lg);
  color: var(--color-text-secondary);
}

.import-instructions li {
  margin-bottom: var(--space-xs);
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
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
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

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

/* Test Connection */
.test-connection {
  margin-top: var(--space-lg);
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.test-result {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.test-result.success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.test-result.error {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

/* Commercial Models */
.commercial-model-card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}

.model-header {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.model-header .form-select {
  flex: 1;
}

.model-usage-types {
  margin-bottom: var(--space-md);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.price-section {
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

/* Settings */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--space-xs);
  transition: color var(--transition-base);
}

.btn-icon:hover {
  color: var(--color-error);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>