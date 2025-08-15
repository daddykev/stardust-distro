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
  
  // DSP-specific configuration
  config: {
    distributorId: '',
    apiKey: ''
  },
  
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
    
    // Firebase Storage specific
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
const showApiKey = ref(false)

// Common DSP presets
const dspPresets = [
  { 
    value: 'custom', 
    label: 'Custom Configuration' 
  },
  { 
    value: 'stardust-dsp', 
    label: 'Import from Stardust DSP...' 
  },
  { 
    value: 'spotify', 
    label: 'Spotify' 
  },
  { 
    value: 'apple', 
    label: 'Apple Music' 
  },
  { 
    value: 'amazon', 
    label: 'Amazon Music' 
  }
]

const selectedPreset = ref('custom')

// ERN version options
const ernVersionOptions = [
  { value: '4.3', label: 'ERN 4.3 (Latest)' },
  { value: '4.2', label: 'ERN 4.2' },
  { value: '4.1', label: 'ERN 4.1' },
  { value: '3.8.2', label: 'ERN 3.8.2' }
]

// Protocol options
const protocolOptions = [
  { value: 'SFTP', label: 'SFTP' },
  { value: 'FTP', label: 'FTP' },
  { value: 'S3', label: 'AWS S3' },
  { value: 'API', label: 'REST API' },
  { value: 'storage', label: 'Firebase Storage' }
]

// Test connection state
const isTestingConnection = ref(false)
const connectionTestResult = ref(null)

// Computed properties
const defaultPort = computed(() => {
  switch (localTarget.value.protocol) {
    case 'FTP': return 21
    case 'SFTP': return 22
    case 'API': return 443
    default: return null
  }
})

// Apply preset configuration
const applyPreset = () => {
  if (selectedPreset.value === 'stardust-dsp') {
    showJsonImport.value = true
    return
  }
  
  const presets = {
    spotify: {
      name: 'Spotify Production',
      partyName: 'Spotify AB',
      partyId: 'PADPIDA2014120301E',
      protocol: 'SFTP',
      connection: {
        host: 'sftp.spotify.com',
        port: 22,
        path: '/incoming/'
      }
    },
    apple: {
      name: 'Apple Music',
      partyName: 'Apple Inc.',
      partyId: 'PADPIDA2003060301A',
      protocol: 'API',
      connection: {
        endpoint: 'https://api.music.apple.com/v1/catalog'
      }
    },
    amazon: {
      name: 'Amazon Music',
      partyName: 'Amazon.com Inc.',
      partyId: 'PADPIDA2010070701A',
      protocol: 'S3',
      connection: {
        bucket: 'amazon-music-deliveries',
        region: 'us-east-1'
      }
    }
  }
  
  if (presets[selectedPreset.value]) {
    Object.assign(localTarget.value, presets[selectedPreset.value])
  }
}

// Parse JSON configuration from Stardust DSP
const parseJsonConfig = () => {
  try {
    const config = JSON.parse(jsonInput.value)
    
    // Map the imported config to our target structure
    localTarget.value.name = config.name || localTarget.value.name
    localTarget.value.type = config.type || localTarget.value.type
    localTarget.value.protocol = config.protocol || localTarget.value.protocol
    
    // Map DSP-specific config
    if (config.config) {
      localTarget.value.config = {
        distributorId: config.config.distributorId || '',
        apiKey: config.config.apiKey || ''
      }
      
      // Map connection settings based on protocol
      if (config.protocol === 'storage') {
        localTarget.value.connection.bucket = config.config.bucket || ''
        localTarget.value.connection.path = config.config.path || ''
      } else if (config.protocol === 'api' || config.protocol === 'API') {
        localTarget.value.protocol = 'API' // Normalize to uppercase
        localTarget.value.connection.endpoint = config.config.endpoint || ''
        if (config.config.apiKey) {
          localTarget.value.connection.authType = 'Bearer'
          localTarget.value.connection.apiKey = config.config.apiKey
        }
      }
    }
    
    // Copy other config properties as needed
    if (config.requirements) {
      localTarget.value.ernVersion = config.requirements.ernVersion || '4.3'
    }
    
    if (config.commercialModel) {
      localTarget.value.commercialModels = [{
        type: config.commercialModel.type || 'PayAsYouGoModel',
        usageTypes: config.commercialModel.usageTypes || ['PermanentDownload'],
        territories: ['Worldwide']
      }]
    }
    
    jsonError.value = ''
    showJsonImport.value = false
    jsonInput.value = ''
  } catch (error) {
    jsonError.value = 'Invalid JSON format. Please check your configuration.'
    console.error('JSON parse error:', error)
  }
}

// Commercial model management
const addCommercialModel = () => {
  localTarget.value.commercialModels.push({
    type: 'PayAsYouGoModel',
    usageTypes: ['PermanentDownload'],
    territories: ['Worldwide'],
    price: null,
    currency: 'USD'
  })
}

const removeCommercialModel = (index) => {
  localTarget.value.commercialModels.splice(index, 1)
}

// Test connection
const testConnection = async () => {
  isTestingConnection.value = true
  connectionTestResult.value = null
  
  try {
    // TODO: Implement actual connection test
    // For now, just simulate
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    connectionTestResult.value = {
      success: true,
      message: 'Connection successful!'
    }
  } catch (error) {
    connectionTestResult.value = {
      success: false,
      message: error.message || 'Connection failed'
    }
  } finally {
    isTestingConnection.value = false
  }
}

const handleSave = () => {
  // If DSP with API protocol, sync the API key to connection for backward compatibility
  if (localTarget.value.type === 'DSP' && localTarget.value.protocol === 'API' && localTarget.value.config.apiKey) {
    localTarget.value.connection.authType = 'Bearer'
    localTarget.value.connection.apiKey = localTarget.value.config.apiKey
  }
  
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
              <li>Go to Ingestion → Distributors in Stardust DSP</li>
              <li>Click "View Integration" on your distributor</li>
              <li>Go to the "Stardust Distro" tab</li>
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
  "protocol": "api",
  "config": {
    "distributorId": "dist_abc123xyz",
    "endpoint": "https://us-central1-stardust-dsp.cloudfunctions.net/receiveDelivery",
    "apiKey": "sk_live_..."
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

    <!-- DSP Authentication (NEW SECTION) -->
    <div v-if="localTarget.type === 'DSP'" class="form-section">
      <h3 class="section-title">DSP Authentication</h3>
      
      <div class="form-group">
        <label class="form-label required">Distributor ID</label>
        <input 
          v-model="localTarget.config.distributorId" 
          type="text" 
          class="form-input"
          placeholder="e.g., dist_abc123xyz"
          required
        />
        <p class="form-help">Get this from your DSP's Distributor settings (Ingestion → Distributors)</p>
      </div>

      <div v-if="localTarget.protocol === 'API'" class="form-group">
        <label class="form-label required">API Key</label>
        <div class="input-group">
          <input 
            v-model="localTarget.config.apiKey" 
            :type="showApiKey ? 'text' : 'password'"
            class="form-input"
            placeholder="sk_live_..."
            required
          />
          <button 
            type="button" 
            @click="showApiKey = !showApiKey"
            class="btn-icon"
          >
            <font-awesome-icon :icon="showApiKey ? 'eye-slash' : 'eye'" />
          </button>
        </div>
        <p class="form-help">Your secret API key from the DSP (keep this secure!)</p>
      </div>

      <div v-if="localTarget.protocol === 'storage'" class="info-banner">
        <font-awesome-icon icon="info-circle" />
        <div>
          <strong>Storage Authentication</strong>
          <p>Files will be uploaded to: <code>/deliveries/{{ localTarget.config.distributorId || '{DISTRIBUTOR_ID}' }}/{timestamp}/</code></p>
          <p>The DSP will automatically detect and process files uploaded to this path.</p>
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
      
      <!-- SFTP Configuration -->
      <div v-if="localTarget.protocol === 'SFTP'" class="protocol-config">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Host</label>
            <input 
              v-model="localTarget.connection.host" 
              type="text" 
              class="form-input"
              placeholder="sftp.example.com"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Port</label>
            <input 
              v-model.number="localTarget.connection.port" 
              type="number" 
              class="form-input"
              placeholder="22"
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
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Password</label>
            <input 
              v-model="localTarget.connection.password" 
              type="password" 
              class="form-input"
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
      
      <!-- FTP Configuration -->
      <div v-else-if="localTarget.protocol === 'FTP'" class="protocol-config">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Host</label>
            <input 
              v-model="localTarget.connection.host" 
              type="text" 
              class="form-input"
              placeholder="ftp.example.com"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Port</label>
            <input 
              v-model.number="localTarget.connection.port" 
              type="number" 
              class="form-input"
              placeholder="21"
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
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Password</label>
            <input 
              v-model="localTarget.connection.password" 
              type="password" 
              class="form-input"
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
      
      <!-- S3 Configuration -->
      <div v-else-if="localTarget.protocol === 'S3'" class="protocol-config">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Bucket Name</label>
            <input 
              v-model="localTarget.connection.bucket" 
              type="text" 
              class="form-input"
              placeholder="my-delivery-bucket"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Region</label>
            <select v-model="localTarget.connection.region" class="form-select" required>
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">EU West (Ireland)</option>
              <option value="eu-central-1">EU Central (Frankfurt)</option>
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
          
          <div class="form-group">
            <label class="form-label">Project ID</label>
            <input 
              v-model="localTarget.connection.projectId" 
              type="text" 
              class="form-input"
              placeholder="stardust-dsp"
            />
            <p class="form-help">Firebase project ID (optional)</p>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Delivery Path Template</label>
          <code class="path-display">
            /deliveries/{{ localTarget.config.distributorId || '{DISTRIBUTOR_ID}' }}/{timestamp}/
          </code>
          <p class="form-help">Files will be uploaded to this path pattern. {timestamp} will be replaced with the delivery timestamp.</p>
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
            :placeholder="localTarget.type === 'DSP' ? 'https://us-central1-stardust-dsp.cloudfunctions.net/receiveDelivery' : 'https://api.dsp.com/v1/releases'"
            required
          />
          <p v-if="localTarget.type === 'DSP'" class="form-help">
            For Stardust DSP, use the receiveDelivery endpoint
          </p>
        </div>
        
        <div v-if="localTarget.type !== 'DSP'" class="form-row">
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
        
        <!-- For DSP, authentication is handled in the DSP Authentication section -->
        <div v-if="localTarget.type === 'DSP'" class="info-banner">
          <font-awesome-icon icon="info-circle" />
          <p>Authentication is configured in the DSP Authentication section above.</p>
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
        <button @click="addCommercialModel" class="btn btn-sm btn-secondary">
          <font-awesome-icon icon="plus" /> Add Model
        </button>
      </div>
      
      <div v-for="(model, index) in localTarget.commercialModels" :key="index" class="commercial-model-card">
        <div class="model-header">
          <select v-model="model.type" class="form-select">
            <option value="PayAsYouGoModel">Pay As You Go</option>
            <option value="SubscriptionModel">Subscription</option>
            <option value="AdvertisementSupportedModel">Advertisement Supported</option>
            <option value="FreeOfChargeModel">Free of Charge</option>
          </select>
          
          <button @click="removeCommercialModel(index)" class="btn-icon" :disabled="localTarget.commercialModels.length === 1">
            <font-awesome-icon icon="trash" />
          </button>
        </div>
        
        <div class="model-usage-types">
          <label class="form-label">Usage Types</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" value="PermanentDownload" v-model="model.usageTypes" />
              Permanent Download
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="OnDemandStream" v-model="model.usageTypes" />
              On-Demand Stream
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="NonInteractiveStream" v-model="model.usageTypes" />
              Non-Interactive Stream
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="Subscription" v-model="model.usageTypes" />
              Subscription
            </label>
          </div>
        </div>
        
        <div v-if="model.type === 'PayAsYouGoModel'" class="price-section">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Price (optional)</label>
              <input 
                v-model.number="model.price" 
                type="number" 
                step="0.01" 
                class="form-input"
                placeholder="0.99"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Currency</label>
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
          <input type="checkbox" v-model="localTarget.settings.autoDeliver" />
          Auto-deliver new releases
        </label>
        
        <label class="checkbox-label">
          <input type="checkbox" v-model="localTarget.settings.validateBeforeDelivery" />
          Validate ERN before delivery
        </label>
        
        <label class="checkbox-label">
          <input type="checkbox" v-model="localTarget.settings.requireAcknowledgment" />
          Require delivery acknowledgment
        </label>
        
        <label class="checkbox-label">
          <input type="checkbox" v-model="localTarget.active" />
          Target is active
        </label>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Retry Attempts</label>
          <input 
            v-model.number="localTarget.settings.retryAttempts" 
            type="number" 
            class="form-input"
            min="0"
            max="10"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Retry Delay (minutes)</label>
          <input 
            v-model.number="localTarget.settings.retryDelay" 
            type="number" 
            class="form-input"
            min="1"
            max="1440"
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

/* Info Banner */
.info-banner {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background-color: var(--color-info-light);
  border: 1px solid var(--color-info);
  border-radius: var(--radius-md);
  color: var(--color-info-dark);
}

.info-banner svg {
  flex-shrink: 0;
  margin-top: 2px;
}

/* Protocol Configuration */
.protocol-config {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

/* Test Connection */
.test-connection {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.test-result {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.test-result.success {
  background-color: var(--color-success-light);
  color: var(--color-success-dark);
  border: 1px solid var(--color-success);
}

.test-result.error {
  background-color: var(--color-error-light);
  color: var(--color-error-dark);
  border: 1px solid var(--color-error);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--text-xl);
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

.import-instructions {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
}

.import-instructions h4 {
  margin: 0 0 var(--space-sm) 0;
  color: var(--color-heading);
}

.import-instructions ol {
  margin: 0;
  padding-left: var(--space-lg);
}

.import-instructions li {
  margin-bottom: var(--space-xs);
  color: var(--color-text-secondary);
}

/* Radio and Checkbox Groups */
.radio-group {
  display: flex;
  gap: var(--space-lg);
}

.radio-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
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

/* Input Group */
.input-group {
  display: flex;
  gap: var(--space-sm);
}

.input-group .form-input {
  flex: 1;
}

.input-group .btn-icon {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text-secondary);
}

.input-group .btn-icon:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

/* Path Display */
.path-display {
  display: block;
  padding: var(--space-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
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