<!-- src/components/delivery/DeliveryTargetForm.vue -->
<template>
  <div class="delivery-target-form">
    <form @submit.prevent="save">
      <!-- Basic Information -->
      <div class="form-section">
        <h3>Basic Information</h3>
        
        <div class="form-group">
          <label class="form-label required">Target Name</label>
          <input
            v-model="formData.name"
            type="text"
            class="form-input"
            placeholder="e.g., Spotify Production"
            required
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label required">Type</label>
            <select v-model="formData.type" class="form-select" required>
              <option value="">Select Type</option>
              <option value="Spotify">Spotify</option>
              <option value="Apple Music">Apple Music</option>
              <option value="Amazon Music">Amazon Music</option>
              <option value="YouTube Music">YouTube Music</option>
              <option value="Deezer">Deezer</option>
              <option value="Tidal">Tidal</option>
              <option value="Beatport">Beatport</option>
              <option value="SoundCloud">SoundCloud</option>
              <option value="custom">Custom DSP</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">
              <input
                v-model="formData.active"
                type="checkbox"
                class="form-checkbox"
              />
              Active
            </label>
            <small class="text-muted">Enable this delivery target</small>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <input
              v-model="formData.testMode"
              type="checkbox"
              class="form-checkbox"
            />
            Test Mode
          </label>
          <small class="text-muted">Run deliveries in test mode (no actual delivery)</small>
        </div>
      </div>

      <!-- ERN Version Configuration -->
      <div class="form-section">
        <h3>ERN Configuration</h3>
        
        <div class="form-group">
          <label class="form-label required">ERN Version</label>
          <select v-model="formData.ernVersion" class="form-select" required>
            <option value="4.3">ERN 4.3 (Latest - Recommended)</option>
            <option value="4.2">ERN 4.2 (Enhanced Encoding)</option>
            <option value="3.8.2">ERN 3.8.2 (Most Compatible)</option>
          </select>
          
          <!-- Version Compatibility Warning -->
          <div v-if="versionCompatibilityWarning" class="alert alert-warning mt-sm">
            <i class="fas fa-exclamation-triangle"></i>
            {{ versionCompatibilityWarning }}
          </div>
          
          <!-- Version Features Info -->
          <div class="version-features mt-sm">
            <small class="text-muted">
              <strong>{{ ernVersionFeatures[formData.ernVersion].name }}:</strong>
              {{ ernVersionFeatures[formData.ernVersion].description }}
            </small>
          </div>
        </div>

        <!-- Version Recommendation -->
        <div v-if="recommendedVersion && formData.type !== 'custom'" class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          Recommended ERN version for {{ formData.type }}: <strong>{{ recommendedVersion }}</strong>
          <button 
            v-if="formData.ernVersion !== recommendedVersion"
            type="button"
            class="btn btn-sm btn-text ml-sm"
            @click="formData.ernVersion = recommendedVersion"
          >
            Use Recommended
          </button>
        </div>
      </div>

      <!-- DDEX Party Configuration -->
      <div class="form-section">
        <h3>DDEX Party Configuration</h3>
        
        <div class="form-group">
          <label class="form-label required">Party Name (DSP Name)</label>
          <input
            v-model="formData.partyName"
            type="text"
            class="form-input"
            placeholder="e.g., Spotify AB"
            required
          />
          <small class="text-muted">The official company name of the DSP</small>
        </div>

        <div class="form-group">
          <label class="form-label required">Party ID (DPID)</label>
          <input
            v-model="formData.partyId"
            type="text"
            class="form-input"
            placeholder="e.g., PADPIDA2023XXXXXX"
            required
          />
          <small class="text-muted">The DDEX Party ID assigned to this DSP</small>
        </div>

        <div class="form-group">
          <label class="form-label">Distributor ID (Your DPID)</label>
          <input
            v-model="formData.config.distributorId"
            type="text"
            class="form-input"
            placeholder="e.g., PADPIDA2023081501R"
          />
          <small class="text-muted">Your DDEX Party ID as the distributor (optional)</small>
        </div>
      </div>

      <!-- Genre Mapping Configuration -->
      <div v-if="formData.type !== 'custom'" class="form-section">
        <h3>Genre Mapping Configuration</h3>
        
        <div class="form-group">
          <label class="form-label">
            <input
              v-model="formData.genreMapping.enabled"
              type="checkbox"
              class="form-checkbox"
            />
            Enable Genre Mapping
          </label>
          <small class="text-muted">
            Automatically translate genres from our truth source to {{ formData.type || 'DSP' }}-specific genres
          </small>
        </div>
        
        <div v-if="formData.genreMapping.enabled" class="genre-mapping-config">
          <!-- Genre Mapping Selection -->
          <div class="form-group">
            <label class="form-label">Genre Mapping</label>
            <div v-if="loadingMappings" class="loading-message">
              <font-awesome-icon icon="spinner" spin /> Loading available mappings...
            </div>
            <select 
              v-else
              v-model="formData.genreMapping.mappingId" 
              class="form-select"
              @change="onMappingSelected"
            >
              <option value="">Use built-in mapping (default)</option>
              <option 
                v-for="mapping in availableGenreMappings" 
                :key="mapping.id"
                :value="mapping.id"
              >
                {{ mapping.name }} 
                ({{ mapping.stats?.totalMapped || 0 }}/{{ mapping.stats?.total || 0 }} genres mapped)
              </option>
            </select>
            <small class="text-muted">
              Select a custom genre mapping or use the built-in defaults
            </small>
          </div>
          
          <!-- Strict Mode -->
          <div class="form-group">
            <label class="form-label">
              <input
                v-model="formData.genreMapping.strictMode"
                type="checkbox"
                class="form-checkbox"
              />
              Strict Mode
            </label>
            <small class="text-muted">
              Reject deliveries if a genre cannot be mapped (recommended for production)
            </small>
          </div>
          
          <!-- Fallback Genre -->
          <div class="form-group">
            <label class="form-label">Fallback Genre Code</label>
            <input
              v-model="formData.genreMapping.fallbackGenre"
              type="text"
              class="form-input"
              placeholder="e.g., ELECTRONIC-00 or BP-ELECTRONICA-00"
            />
            <small class="text-muted">
              Default genre to use when mapping fails (only used if strict mode is disabled)
            </small>
          </div>
          
          <!-- Mapping Info Display -->
          <div v-if="formData.genreMapping.mappingId && getSelectedMapping()" class="mapping-info">
            <div class="info-card">
              <h4>Selected Mapping Details</h4>
              <div class="info-row">
                <span class="info-label">Coverage:</span>
                <span class="info-value">
                  {{ getSelectedMapping()?.stats?.percentage || 0 }}%
                  ({{ getSelectedMapping()?.stats?.totalMapped || 0 }} genres mapped)
                </span>
              </div>
              <div v-if="getSelectedMapping()?.updatedAt" class="info-row">
                <span class="info-label">Last Updated:</span>
                <span class="info-value">
                  {{ new Date(getSelectedMapping().updatedAt.toDate?.() || getSelectedMapping().updatedAt).toLocaleDateString() }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Link to Genre Maps -->
          <div class="form-group">
            <router-link 
              :to="`/genre-maps?dsp=${getDSPTypeForMapping()}`" 
              class="btn btn-sm btn-secondary"
            >
              <font-awesome-icon icon="edit" /> Manage Genre Mappings
            </router-link>
            <small class="text-muted d-block mt-sm">
              Create or edit custom genre mappings for {{ formData.type || 'this DSP' }}
            </small>
          </div>
        </div>
      </div>

      <!-- ERN 4.3 Specific Features -->
      <div v-if="formData.ernVersion === '4.3'" class="form-section">
        <h3>ERN 4.3 Advanced Features</h3>
        
        <!-- UGC Clip Authorization -->
        <div class="form-group">
          <label class="form-label">
            <input
              v-model="formData.allowUGCClips"
              type="checkbox"
              class="form-checkbox"
            />
            Allow UGC Clips
          </label>
          <small class="text-muted">Enable user-generated content clips (30-second clips for social media)</small>
        </div>

        <!-- Immersive Audio Support -->
        <div class="form-group">
          <label class="form-label">
            <input
              v-model="formData.supportsImmersiveAudio"
              type="checkbox"
              class="form-checkbox"
            />
            Supports Immersive Audio
          </label>
          <small class="text-muted">DSP can receive Dolby Atmos and spatial audio tracks</small>
        </div>

        <!-- MEAD/PIE Hooks -->
        <div class="form-group">
          <label class="form-label">MEAD URL (Media Enrichment)</label>
          <input
            v-model="formData.meadUrl"
            type="url"
            class="form-input"
            placeholder="https://api.dsp.com/mead/v1"
          />
          <small class="text-muted">URL for media enrichment data (lyrics, credits, etc.)</small>
        </div>

        <!-- Enhanced Deal Structures -->
        <div class="form-group">
          <label class="form-label">Deal Type</label>
          <select v-model="formData.dealType" class="form-select">
            <option value="standard">Standard Streaming Deal</option>
            <option value="premium">Premium/Hi-Res Deal</option>
            <option value="exclusive">Exclusive Window Deal</option>
            <option value="promotional">Promotional Deal</option>
          </select>
        </div>
      </div>

      <!-- ERN 3.8.2 Legacy Features -->
      <div v-if="formData.ernVersion === '3.8.2'" class="form-section">
        <h3>ERN 3.8.2 Legacy Configuration</h3>
        
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          ERN 3.8.2 is recommended for maximum compatibility with older systems. 
          Ideal for legacy systems and maximum reach.
        </div>

        <!-- Simplified Deal Structure Notice -->
        <div class="form-group">
          <small class="text-muted">
            <strong>Note:</strong> ERN 3.8.2 uses a simplified deal structure. 
            Some advanced features like immersive audio and UGC clips are not available.
          </small>
        </div>
      </div>

      <!-- Protocol Configuration -->
      <div class="form-section">
        <h3>Delivery Protocol</h3>
        
        <div class="form-group">
          <label class="form-label required">Protocol</label>
          <select v-model="formData.protocol" class="form-select" required>
            <option value="ftp">FTP</option>
            <option value="sftp">SFTP</option>
            <option value="s3">Amazon S3</option>
            <option value="api">REST API</option>
            <option value="azure">Azure Blob Storage</option>
            <option value="storage">Firebase Storage (Testing)</option>
          </select>
        </div>

        <!-- Protocol-specific fields -->
        <!-- FTP Configuration -->
        <div v-if="formData.protocol === 'ftp'" class="protocol-config">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">FTP Host</label>
              <input
                v-model="formData.config.host"
                type="text"
                class="form-input"
                placeholder="ftp.example.com"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Port</label>
              <input
                v-model.number="formData.config.port"
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
                v-model="formData.config.username"
                type="text"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label required">Password</label>
              <input
                v-model="formData.config.password"
                type="password"
                class="form-input"
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Directory</label>
            <input
              v-model="formData.config.directory"
              type="text"
              class="form-input"
              placeholder="/incoming"
            />
          </div>
        </div>

        <!-- SFTP Configuration -->
        <div v-if="formData.protocol === 'sftp'" class="protocol-config">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">SFTP Host</label>
              <input
                v-model="formData.config.host"
                type="text"
                class="form-input"
                placeholder="sftp.example.com"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Port</label>
              <input
                v-model.number="formData.config.port"
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
                v-model="formData.config.username"
                type="text"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Password/Key Passphrase</label>
              <input
                v-model="formData.config.password"
                type="password"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Directory</label>
            <input
              v-model="formData.config.directory"
              type="text"
              class="form-input"
              placeholder="/home/user/incoming"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Private Key (if using key auth)</label>
            <textarea
              v-model="formData.config.privateKey"
              class="form-input"
              rows="4"
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
            ></textarea>
          </div>
        </div>

        <!-- S3 Configuration -->
        <div v-if="formData.protocol === 's3'" class="protocol-config">
          <div class="form-group">
            <label class="form-label required">S3 Bucket</label>
            <input
              v-model="formData.config.bucket"
              type="text"
              class="form-input"
              placeholder="my-delivery-bucket"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Prefix/Path</label>
            <input
              v-model="formData.config.prefix"
              type="text"
              class="form-input"
              placeholder="deliveries/"
            />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Access Key ID</label>
              <input
                v-model="formData.config.accessKeyId"
                type="text"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label required">Secret Access Key</label>
              <input
                v-model="formData.config.secretAccessKey"
                type="password"
                class="form-input"
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Region</label>
            <select v-model="formData.config.region" class="form-select">
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">EU (Ireland)</option>
              <option value="eu-central-1">EU (Frankfurt)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
            </select>
          </div>
        </div>

        <!-- API Configuration -->
        <div v-if="formData.protocol === 'api'" class="protocol-config">
          <div class="form-group">
            <label class="form-label required">API Endpoint</label>
            <input
              v-model="formData.config.endpoint"
              type="url"
              class="form-input"
              placeholder="https://api.dsp.com/v1/deliveries"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Authentication Type</label>
            <select v-model="formData.config.authType" class="form-select">
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key</option>
              <option value="oauth2">OAuth 2.0</option>
            </select>
          </div>
          
          <div v-if="formData.config.authType === 'bearer'" class="form-group">
            <label class="form-label required">Bearer Token</label>
            <input
              v-model="formData.config.bearerToken"
              type="password"
              class="form-input"
              required
            />
          </div>
          
          <div v-if="formData.config.authType === 'apikey'" class="form-group">
            <label class="form-label required">API Key</label>
            <input
              v-model="formData.config.apiKey"
              type="password"
              class="form-input"
              required
            />
          </div>
          
          <div v-if="formData.config.authType === 'basic'" class="form-row">
            <div class="form-group">
              <label class="form-label required">Username</label>
              <input
                v-model="formData.config.username"
                type="text"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label required">Password</label>
              <input
                v-model="formData.config.password"
                type="password"
                class="form-input"
                required
              />
            </div>
          </div>
        </div>

        <!-- Azure Configuration -->
        <div v-if="formData.protocol === 'azure'" class="protocol-config">
          <div class="form-group">
            <label class="form-label required">Storage Account Name</label>
            <input
              v-model="formData.config.accountName"
              type="text"
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Container Name</label>
            <input
              v-model="formData.config.containerName"
              type="text"
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Access Key</label>
            <input
              v-model="formData.config.accessKey"
              type="password"
              class="form-input"
              required
            />
          </div>
        </div>

        <!-- Firebase Storage Configuration -->
        <div v-if="formData.protocol === 'storage'" class="protocol-config">
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            Files will be delivered to Firebase Storage for testing purposes.
            They will be stored in: <code>/deliveries/{targetId}/{timestamp}/</code>
          </div>
        </div>
      </div>

      <!-- Commercial Model Configuration -->
      <div class="form-section">
        <h3>Commercial Models</h3>
        
        <div class="commercial-models">
          <div v-for="(model, index) in formData.commercialModels" :key="index" class="commercial-model">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Model Type</label>
                <select v-model="model.type" class="form-select">
                  <option value="SubscriptionModel">Subscription</option>
                  <option value="PayAsYouGoModel">Pay As You Go</option>
                  <option value="AdvertisementSupportedModel">Ad Supported</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Usage Types</label>
                <div class="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      value="OnDemandStream"
                      v-model="model.usageTypes"
                    />
                    Streaming
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      value="PermanentDownload"
                      v-model="model.usageTypes"
                    />
                    Download
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      value="TetheredDownload"
                      v-model="model.usageTypes"
                    />
                    Tethered
                  </label>
                </div>
              </div>
              
              <button
                type="button"
                @click="removeCommercialModel(index)"
                class="btn btn-sm btn-danger"
              >
                Remove
              </button>
            </div>
          </div>
          
          <button
            type="button"
            @click="addCommercialModel"
            class="btn btn-sm btn-secondary"
          >
            Add Commercial Model
          </button>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" @click="cancel" class="btn btn-secondary">
          Cancel
        </button>
        <button type="button" @click="testConnection" class="btn btn-secondary">
          Test Connection
        </button>
        <button type="submit" class="btn btn-primary">
          {{ mode === 'edit' ? 'Update' : 'Create' }} Target
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import genreMappingService from '@/services/genreMappings'

const props = defineProps({
  target: Object,
  mode: {
    type: String,
    default: 'create'
  }
})

const emit = defineEmits(['save', 'cancel', 'test'])

const { user } = useAuth()

// State
const availableGenreMappings = ref([])
const loadingMappings = ref(false)

const formData = ref({
  name: '',
  type: '',
  protocol: 'ftp',
  active: true,
  testMode: false,
  ernVersion: '4.3',
  partyName: '',
  partyId: '',
  allowUGCClips: false,
  supportsImmersiveAudio: false,
  meadUrl: '',
  dealType: 'standard',
  config: {
    host: '',
    port: null,
    username: '',
    password: '',
    directory: '',
    privateKey: '',
    bucket: '',
    prefix: '',
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    endpoint: '',
    authType: 'bearer',
    bearerToken: '',
    apiKey: '',
    accountName: '',
    containerName: '',
    accessKey: '',
    distributorId: ''
  },
  commercialModels: [
    {
      type: 'SubscriptionModel',
      usageTypes: ['OnDemandStream']
    }
  ],
  genreMapping: {
    enabled: false,
    mappingId: '',
    mappingName: '',
    strictMode: false,
    fallbackGenre: ''
  }
})

// ERN Version Features
const ernVersionFeatures = {
  '4.3': {
    name: 'ERN 4.3',
    description: 'Latest version with UGC clips, immersive audio, and enhanced metadata support'
  },
  '4.2': {
    name: 'ERN 4.2',
    description: 'Stable version with improved encoding and deal structures'
  },
  '3.8.2': {
    name: 'ERN 3.8.2',
    description: 'Legacy version for maximum compatibility with older systems'
  }
}

// Computed
const recommendedVersion = computed(() => {
  const type = formData.value.type
  if (type === 'Spotify' || type === 'Apple Music') return '4.3'
  if (type === 'Amazon Music' || type === 'YouTube Music') return '4.2'
  if (type === 'Beatport' || type === 'SoundCloud') return '4.2'
  if (type === 'Deezer' || type === 'Tidal') return '4.3'
  return null
})

const versionCompatibilityWarning = computed(() => {
  const type = formData.value.type
  const version = formData.value.ernVersion
  
  if (type === 'Spotify' && version === '3.8.2') {
    return 'Spotify recommends ERN 4.3 for full feature support'
  }
  if (type === 'Apple Music' && version !== '4.3') {
    return 'Apple Music requires ERN 4.3 for immersive audio delivery'
  }
  return null
})

// Methods
const loadGenreMappings = async () => {
  if (!user.value) return
  
  loadingMappings.value = true
  try {
    // Determine the DSP type based on the form
    let dspType = 'generic'
    
    if (formData.value.type === 'Spotify' || formData.value.name?.toLowerCase().includes('spotify')) {
      dspType = 'spotify'
    } else if (formData.value.type === 'Apple Music' || formData.value.name?.toLowerCase().includes('apple')) {
      dspType = 'apple'
    } else if (formData.value.type === 'Beatport' || formData.value.name?.toLowerCase().includes('beatport')) {
      dspType = 'beatport'
    } else if (formData.value.type === 'Amazon Music' || formData.value.name?.toLowerCase().includes('amazon')) {
      dspType = 'amazon'
    }
    
    availableGenreMappings.value = await genreMappingService.getTenantMappings(
      user.value.uid,
      dspType
    )
  } catch (error) {
    console.error('Error loading genre mappings:', error)
  } finally {
    loadingMappings.value = false
  }
}

const onMappingSelected = (event) => {
  const selectedMapping = availableGenreMappings.value.find(
    m => m.id === formData.value.genreMapping.mappingId
  )
  if (selectedMapping) {
    formData.value.genreMapping.mappingName = selectedMapping.name
  }
}

const getSelectedMapping = () => {
  return availableGenreMappings.value.find(
    m => m.id === formData.value.genreMapping.mappingId
  )
}

const getDSPTypeForMapping = () => {
  const type = formData.value.type?.toLowerCase() || ''
  if (type.includes('spotify')) return 'spotify'
  if (type.includes('apple')) return 'apple'
  if (type.includes('beatport')) return 'beatport'
  if (type.includes('amazon')) return 'amazon'
  return 'generic'
}

const addCommercialModel = () => {
  formData.value.commercialModels.push({
    type: 'SubscriptionModel',
    usageTypes: ['OnDemandStream']
  })
}

const removeCommercialModel = (index) => {
  formData.value.commercialModels.splice(index, 1)
}

const validateForm = () => {
  // Basic validation
  if (!formData.value.name) {
    alert('Please enter a target name')
    return false
  }
  
  if (!formData.value.type) {
    alert('Please select a target type')
    return false
  }
  
  if (!formData.value.partyName || !formData.value.partyId) {
    alert('Please enter DDEX party information')
    return false
  }
  
  // Protocol-specific validation
  const protocol = formData.value.protocol
  const config = formData.value.config
  
  if (protocol === 'ftp' || protocol === 'sftp') {
    if (!config.host || !config.username) {
      alert('Please enter connection details')
      return false
    }
  }
  
  if (protocol === 's3') {
    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      alert('Please enter S3 credentials')
      return false
    }
  }
  
  if (protocol === 'api') {
    if (!config.endpoint) {
      alert('Please enter API endpoint')
      return false
    }
  }
  
  if (protocol === 'azure') {
    if (!config.accountName || !config.containerName || !config.accessKey) {
      alert('Please enter Azure storage details')
      return false
    }
  }
  
  return true
}

const save = () => {
  if (validateForm()) {
    // Build connection object based on protocol
    const connection = {}
    const config = formData.value.config
    
    switch (formData.value.protocol) {
      case 'ftp':
      case 'sftp':
        connection.host = config.host
        connection.port = config.port || (formData.value.protocol === 'ftp' ? 21 : 22)
        connection.username = config.username
        connection.password = config.password
        connection.directory = config.directory || '/'
        if (formData.value.protocol === 'sftp' && config.privateKey) {
          connection.privateKey = config.privateKey
        }
        break
        
      case 's3':
        connection.bucket = config.bucket
        connection.prefix = config.prefix || ''
        connection.accessKeyId = config.accessKeyId
        connection.secretAccessKey = config.secretAccessKey
        connection.region = config.region || 'us-east-1'
        break
        
      case 'api':
        connection.endpoint = config.endpoint
        connection.authType = config.authType
        if (config.authType === 'bearer') {
          connection.bearerToken = config.bearerToken
        } else if (config.authType === 'apikey') {
          connection.apiKey = config.apiKey
        } else if (config.authType === 'basic') {
          connection.username = config.username
          connection.password = config.password
        }
        break
        
      case 'azure':
        connection.accountName = config.accountName
        connection.containerName = config.containerName
        connection.accessKey = config.accessKey
        break
    }
    
    // Emit save event with formatted data
    emit('save', {
      ...formData.value,
      connection,
      config: {
        distributorId: config.distributorId
      },
      genreMapping: formData.value.genreMapping
    })
  }
}

const cancel = () => {
  emit('cancel')
}

const testConnection = () => {
  if (validateForm()) {
    emit('test', formData.value)
  }
}

// Watch for DSP type changes to reload mappings
watch(() => formData.value.type, () => {
  loadGenreMappings()
})

// Initialize
onMounted(() => {
  if (props.target) {
    // Load existing target data
    formData.value = { 
      ...props.target,
      config: {
        ...formData.value.config,
        ...props.target.config
      },
      genreMapping: props.target.genreMapping || {
        enabled: false,
        mappingId: '',
        mappingName: '',
        strictMode: false,
        fallbackGenre: ''
      }
    }
    
    // Map connection back to config for editing
    if (props.target.connection) {
      Object.assign(formData.value.config, props.target.connection)
    }
  }
  
  // Load available genre mappings
  loadGenreMappings()
})
</script>

<style scoped>
.delivery-target-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-lg);
}

.form-section h3 {
  margin: 0 0 var(--space-lg) 0;
  color: var(--color-text);
  font-size: var(--text-lg);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-label {
  display: block;
  margin-bottom: var(--space-xs);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.form-label.required::after {
  content: ' *';
  color: var(--color-error);
}

.form-input,
.form-select,
textarea.form-input {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-size: var(--text-base);
  transition: all var(--transition-base);
}

.form-input:focus,
.form-select:focus,
textarea.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-checkbox {
  margin-right: var(--space-xs);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.protocol-config {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border-light);
}

.commercial-model {
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-sm);
}

.checkbox-group {
  display: flex;
  gap: var(--space-md);
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  margin-top: var(--space-xl);
}

.alert {
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.alert-info {
  background-color: var(--color-info-light);
  color: var(--color-info-dark);
  border: 1px solid var(--color-info);
}

.alert-warning {
  background-color: var(--color-warning-light);
  color: var(--color-warning-dark);
  border: 1px solid var(--color-warning);
}

.version-features {
  padding: var(--space-sm);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
}

.text-muted {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.btn {
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-primary-dark);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: white;
}

.btn-secondary:hover {
  background-color: var(--color-secondary-dark);
}

.btn-danger {
  background-color: var(--color-error);
  color: white;
}

.btn-danger:hover {
  background-color: var(--color-error-dark);
}

.btn-text {
  background: none;
  color: var(--color-primary);
  padding: var(--space-xs);
}

.btn-text:hover {
  text-decoration: underline;
}

.btn-sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-sm);
}

/* Genre Mapping Styles */
.genre-mapping-config {
  margin-top: var(--space-md);
  padding-left: var(--space-lg);
  border-left: 3px solid var(--color-border);
}

.mapping-info {
  margin-top: var(--space-md);
}

.info-card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}

.info-card h4 {
  margin: 0 0 var(--space-sm) 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  font-size: var(--text-sm);
}

.info-label {
  color: var(--color-text-secondary);
}

.info-value {
  font-weight: var(--font-medium);
}

.loading-message {
  padding: var(--space-sm);
  color: var(--color-text-secondary);
}

.d-block {
  display: block;
}

.mt-sm {
  margin-top: var(--space-sm);
}

.ml-sm {
  margin-left: var(--space-sm);
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .checkbox-group {
    flex-direction: column;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>