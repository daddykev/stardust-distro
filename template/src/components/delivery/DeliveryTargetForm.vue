<template>
  <div class="delivery-target-form">
    <form @submit.prevent="handleSubmit">
      <!-- Basic Information -->
      <div class="form-section">
        <h3>Basic Information</h3>
        
        <div class="form-group">
          <label class="form-label required">Target Name</label>
          <input
            v-model="formData.name"
            type="text"
            class="form-input"
            placeholder="e.g., Spotify, Apple Music"
            required
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Target Type</label>
            <select v-model="formData.type" class="form-select" @change="handleTypeChange">
              <option value="custom">Custom</option>
              <option value="spotify">Spotify</option>
              <option value="apple">Apple Music</option>
              <option value="amazon">Amazon Music</option>
              <option value="youtube">YouTube Music</option>
              <option value="tidal">TIDAL</option>
              <option value="deezer">Deezer</option>
              <option value="soundcloud">SoundCloud</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Status</label>
            <select v-model="formData.enabled" class="form-select">
              <option :value="true">Enabled</option>
              <option :value="false">Disabled</option>
            </select>
          </div>
        </div>

        <!-- ERN Version Selection -->
        <div class="form-group">
          <label class="form-label required">ERN Version</label>
          <select 
            v-model="formData.ernVersion" 
            class="form-select"
            @change="handleVersionChange"
          >
            <option value="4.3">ERN 4.3 (Latest - Immersive Audio, UGC)</option>
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
            placeholder="https://example.com/mead/{messageId}"
          />
          <small class="text-muted">URL template for Media Enrichment and Description messages</small>
        </div>

        <div class="form-group">
          <label class="form-label">PIE URL (Party Enrichment)</label>
          <input
            v-model="formData.pieUrl"
            type="url"
            class="form-input"
            placeholder="https://example.com/pie/{partyId}"
          />
          <small class="text-muted">URL template for Party Identification and Enrichment messages</small>
        </div>

        <!-- Exclusivity Settings -->
        <div class="form-group">
          <label class="form-label">Exclusivity Type</label>
          <select v-model="formData.exclusivity" class="form-select">
            <option value="">None</option>
            <option value="Exclusive">Exclusive</option>
            <option value="NonExclusive">Non-Exclusive</option>
          </select>
          <small class="text-muted">Territory exclusivity for this DSP</small>
        </div>

        <!-- Pre-order Support -->
        <div class="form-group">
          <label class="form-label">
            <input
              v-model="formData.supportsPreOrder"
              type="checkbox"
              class="form-checkbox"
            />
            Supports Pre-orders
          </label>
          <small class="text-muted">DSP can handle pre-order release dates</small>
        </div>
      </div>

      <!-- ERN 4.2 Specific Features -->
      <div v-if="formData.ernVersion === '4.2'" class="form-section">
        <h3>ERN 4.2 Features</h3>
        
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <strong>Important:</strong> ERN 4.2 requires the <code>IsProvidedInDelivery</code> flag for all resources.
          This is handled automatically by the system.
        </div>

        <!-- Enhanced Audio Encoding -->
        <div class="form-group">
          <label class="form-label">Supported Audio Formats</label>
          <div class="checkbox-group">
            <label>
              <input type="checkbox" v-model="formData.audioFormats" value="WAV" />
              WAV
            </label>
            <label>
              <input type="checkbox" v-model="formData.audioFormats" value="FLAC" />
              FLAC (Lossless)
            </label>
            <label>
              <input type="checkbox" v-model="formData.audioFormats" value="MP3" />
              MP3
            </label>
            <label>
              <input type="checkbox" v-model="formData.audioFormats" value="AAC" />
              AAC
            </label>
          </div>
          <small class="text-muted">Audio formats this DSP can receive</small>
        </div>
      </div>

      <!-- ERN 3.8.2 Specific Information -->
      <div v-if="formData.ernVersion === '3.8.2'" class="form-section">
        <h3>ERN 3.8.2 Configuration</h3>
        
        <div class="alert alert-success">
          <i class="fas fa-check-circle"></i>
          <strong>Maximum Compatibility:</strong> ERN 3.8.2 is supported by 80%+ of DSPs worldwide.
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
              placeholder="/uploads"
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
            <label class="form-label">Authentication Method</label>
            <select v-model="formData.config.authMethod" class="form-select">
              <option value="password">Password</option>
              <option value="privateKey">Private Key</option>
            </select>
          </div>
          
          <div v-if="formData.config.authMethod === 'password'" class="form-group">
            <label class="form-label required">Password</label>
            <input
              v-model="formData.config.password"
              type="password"
              class="form-input"
              required
            />
          </div>
          
          <div v-if="formData.config.authMethod === 'privateKey'" class="form-group">
            <label class="form-label required">Private Key</label>
            <textarea
              v-model="formData.config.privateKey"
              class="form-textarea"
              rows="4"
              placeholder="-----BEGIN RSA PRIVATE KEY-----"
              required
            ></textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">Directory</label>
            <input
              v-model="formData.config.directory"
              type="text"
              class="form-input"
              placeholder="/home/user/uploads"
            />
          </div>
        </div>

        <!-- S3 Configuration -->
        <div v-if="formData.protocol === 's3'" class="protocol-config">
          <div class="form-group">
            <label class="form-label required">Bucket Name</label>
            <input
              v-model="formData.config.bucket"
              type="text"
              class="form-input"
              placeholder="my-music-bucket"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">AWS Region</label>
            <select v-model="formData.config.region" class="form-select" required>
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">EU (Ireland)</option>
              <option value="eu-central-1">EU (Frankfurt)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
            </select>
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
            <label class="form-label">Prefix/Path</label>
            <input
              v-model="formData.config.prefix"
              type="text"
              class="form-input"
              placeholder="releases/"
            />
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
              placeholder="https://api.example.com/v1/releases"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Authentication Type</label>
            <select v-model="formData.config.authType" class="form-select">
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apiKey">API Key</option>
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
          
          <div v-if="formData.config.authType === 'apiKey'" class="form-group">
            <label class="form-label required">API Key</label>
            <input
              v-model="formData.config.apiKey"
              type="password"
              class="form-input"
              required
            />
          </div>
        </div>

        <!-- Azure Configuration -->
        <div v-if="formData.protocol === 'azure'" class="protocol-config">
          <div class="form-group">
            <label class="form-label required">Account Name</label>
            <input
              v-model="formData.config.accountName"
              type="text"
              class="form-input"
              placeholder="mystorageaccount"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label required">Account Key</label>
            <input
              v-model="formData.config.accountKey"
              type="password"
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
              placeholder="releases"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Prefix/Path</label>
            <input
              v-model="formData.config.prefix"
              type="text"
              class="form-input"
              placeholder="music/"
            />
          </div>
        </div>
      </div>

      <!-- Commercial Configuration -->
      <div class="form-section">
        <h3>Commercial Configuration</h3>
        
        <!-- Commercial Models -->
        <div class="form-group">
          <label class="form-label">Commercial Models</label>
          <div class="commercial-models">
            <div
              v-for="(model, index) in formData.commercialModels"
              :key="index"
              class="commercial-model"
            >
              <select v-model="model.type" class="form-select">
                <option value="SubscriptionModel">Subscription</option>
                <option value="PayAsYouGoModel">Pay As You Go</option>
                <option value="AdvertisementSupportedModel">Ad-Supported</option>
                <option value="FreeOfChargeModel">Free</option>
              </select>
              
              <div class="usage-types">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="model.usageTypes.includes('PermanentDownload')"
                    @change="toggleUsageType(index, 'PermanentDownload')"
                  />
                  Download
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="model.usageTypes.includes('OnDemandStream')"
                    @change="toggleUsageType(index, 'OnDemandStream')"
                  />
                  Stream
                </label>
                <label v-if="formData.ernVersion !== '3.8.2'" class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="model.usageTypes.includes('ConditionalDownload')"
                    @change="toggleUsageType(index, 'ConditionalDownload')"
                  />
                  Offline
                </label>
              </div>
              
              <!-- Quality Tier for ERN 4.3 -->
              <div v-if="formData.ernVersion === '4.3' && model.usageTypes.includes('OnDemandStream')" class="form-group mt-sm">
                <select v-model="model.qualityTier" class="form-select form-select-sm">
                  <option value="">Standard Quality</option>
                  <option value="HighQuality">High Quality</option>
                  <option value="Lossless">Lossless</option>
                </select>
              </div>
              
              <button
                v-if="formData.commercialModels.length > 1"
                type="button"
                class="btn-icon"
                @click="removeCommercialModel(index)"
                title="Remove model"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <button
              type="button"
              class="btn btn-sm btn-secondary"
              @click="addCommercialModel"
            >
              <i class="fas fa-plus mr-sm"></i>
              Add Model
            </button>
          </div>
        </div>

        <!-- Territories -->
        <div class="form-group">
          <label class="form-label">Territories</label>
          <select v-model="formData.territories" class="form-select" multiple>
            <option value="Worldwide">Worldwide</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="JP">Japan</option>
            <option value="AU">Australia</option>
          </select>
          <small class="text-muted">Hold Ctrl/Cmd to select multiple territories</small>
        </div>

        <!-- Deal Dates -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Deal Start Date</label>
            <input
              v-model="formData.dealStartDate"
              type="date"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Deal End Date</label>
            <input
              v-model="formData.dealEndDate"
              type="date"
              class="form-input"
            />
          </div>
        </div>

        <!-- Display Start Date for ERN 4.3 -->
        <div v-if="formData.ernVersion === '4.3'" class="form-group">
          <label class="form-label">Display Start Date</label>
          <input
            v-model="formData.displayStartDate"
            type="datetime-local"
            class="form-input"
          />
          <small class="text-muted">When the release should become visible (separate from availability)</small>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="handleCancel">
          Cancel
        </button>
        <button 
          v-if="!isNew" 
          type="button" 
          class="btn btn-outline"
          @click="testConnection"
          :disabled="testing"
        >
          <i v-if="testing" class="fas fa-spinner fa-spin mr-sm"></i>
          <i v-else class="fas fa-bolt mr-sm"></i>
          Test Connection
        </button>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <i v-if="saving" class="fas fa-spinner fa-spin mr-sm"></i>
          <span>{{ isNew ? 'Create' : 'Update' }} Target</span>
        </button>
      </div>
    </form>

    <!-- Test Results -->
    <div v-if="testResult" class="test-result mt-lg">
      <div :class="['alert', testResult.success ? 'alert-success' : 'alert-error']">
        <i :class="['fas', testResult.success ? 'fa-check-circle' : 'fa-times-circle', 'mr-sm']"></i>
        <div>
          <strong>{{ testResult.success ? 'Connection Successful' : 'Connection Failed' }}</strong>
          <p>{{ testResult.message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import deliveryTargetService from '../../services/deliveryTargets'
import ernService from '../../services/ern'

const props = defineProps({
  target: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

const router = useRouter()
const saving = ref(false)
const testing = ref(false)
const testResult = ref(null)

const isNew = computed(() => !props.target?.id)

// Form data with ERN version support
const formData = ref({
  name: '',
  type: 'custom',
  enabled: true,
  ernVersion: '4.3', // Default to latest
  protocol: 'ftp',
  partyName: '',
  partyId: '',
  config: {
    distributorId: '',
    host: '',
    port: null,
    username: '',
    password: '',
    directory: '',
    authMethod: 'password',
    privateKey: '',
    bucket: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    prefix: '',
    endpoint: '',
    authType: 'bearer',
    bearerToken: '',
    apiKey: '',
    accountName: '',
    accountKey: '',
    containerName: ''
  },
  commercialModels: [
    {
      type: 'SubscriptionModel',
      usageTypes: ['OnDemandStream'],
      qualityTier: ''
    }
  ],
  territories: ['Worldwide'],
  dealStartDate: '',
  dealEndDate: '',
  // ERN 4.3 specific fields
  allowUGCClips: false,
  supportsImmersiveAudio: false,
  meadUrl: '',
  pieUrl: '',
  exclusivity: '',
  supportsPreOrder: false,
  displayStartDate: '',
  // ERN 4.2 specific fields
  audioFormats: ['WAV', 'FLAC']
})

// ERN version features
const ernVersionFeatures = {
  '4.3': {
    name: 'ERN 4.3',
    description: 'Latest standard with immersive audio, UGC clips, MEAD/PIE hooks, and enhanced metadata support.'
  },
  '4.2': {
    name: 'ERN 4.2',
    description: 'Enhanced encoding support with mandatory IsProvidedInDelivery flag for all resources.'
  },
  '3.8.2': {
    name: 'ERN 3.8.2',
    description: 'Industry standard with 80%+ DSP support. Simplified structure, maximum compatibility.'
  }
}

// Version compatibility warnings
const versionCompatibilityWarning = computed(() => {
  if (!formData.value.type || formData.value.type === 'custom') return null
  
  const compatibility = ernService.isVersionCompatible(
    formData.value.ernVersion,
    formData.value.type
  )
  
  if (!compatibility) {
    return `${formData.value.type} may not fully support ERN ${formData.value.ernVersion}. Consider using the recommended version.`
  }
  
  return null
})

// Recommended version based on DSP type
const recommendedVersion = computed(() => {
  if (!formData.value.type || formData.value.type === 'custom') return null
  return ernService.getRecommendedVersion(formData.value.type)
})

// DSP Presets with ERN version recommendations
const dspPresets = {
  spotify: {
    name: 'Spotify',
    partyName: 'Spotify AB',
    partyId: 'PADPIDA20230615SPO',
    ernVersion: '4.3',
    protocol: 'api',
    commercialModels: [
      {
        type: 'SubscriptionModel',
        usageTypes: ['OnDemandStream', 'ConditionalDownload'],
        qualityTier: 'Lossless'
      },
      {
        type: 'AdvertisementSupportedModel',
        usageTypes: ['OnDemandStream']
      }
    ],
    supportsImmersiveAudio: true,
    allowUGCClips: true
  },
  apple: {
    name: 'Apple Music',
    partyName: 'Apple Inc.',
    partyId: 'PADPIDA20230615APL',
    ernVersion: '4.3',
    protocol: 's3',
    commercialModels: [
      {
        type: 'SubscriptionModel',
        usageTypes: ['OnDemandStream', 'ConditionalDownload'],
        qualityTier: 'Lossless'
      },
      {
        type: 'PayAsYouGoModel',
        usageTypes: ['PermanentDownload']
      }
    ],
    supportsImmersiveAudio: true,
    supportsPreOrder: true
  },
  amazon: {
    name: 'Amazon Music',
    partyName: 'Amazon.com Inc.',
    partyId: 'PADPIDA20230615AMZ',
    ernVersion: '3.8.2', // Amazon still prefers 3.8.2
    protocol: 's3',
    commercialModels: [
      {
        type: 'SubscriptionModel',
        usageTypes: ['OnDemandStream', 'ConditionalDownload']
      }
    ]
  },
  deezer: {
    name: 'Deezer',
    partyName: 'Deezer SA',
    partyId: 'PADPIDA20230615DEE',
    ernVersion: '3.8.2', // Deezer prefers 3.8.2
    protocol: 'ftp',
    commercialModels: [
      {
        type: 'SubscriptionModel',
        usageTypes: ['OnDemandStream', 'ConditionalDownload']
      }
    ]
  }
}

// Handle DSP type change
const handleTypeChange = () => {
  if (formData.value.type !== 'custom') {
    const preset = dspPresets[formData.value.type]
    if (preset) {
      // Apply preset values
      formData.value.name = preset.name
      formData.value.partyName = preset.partyName
      formData.value.partyId = preset.partyId
      formData.value.ernVersion = preset.ernVersion
      formData.value.protocol = preset.protocol
      formData.value.commercialModels = [...preset.commercialModels]
      
      // Apply version-specific features
      if (preset.ernVersion === '4.3') {
        formData.value.supportsImmersiveAudio = preset.supportsImmersiveAudio || false
        formData.value.allowUGCClips = preset.allowUGCClips || false
        formData.value.supportsPreOrder = preset.supportsPreOrder || false
      }
    }
  }
}

// Handle ERN version change
const handleVersionChange = () => {
  // Reset version-specific fields when changing versions
  if (formData.value.ernVersion !== '4.3') {
    formData.value.allowUGCClips = false
    formData.value.supportsImmersiveAudio = false
    formData.value.meadUrl = ''
    formData.value.pieUrl = ''
    formData.value.exclusivity = ''
    formData.value.supportsPreOrder = false
    formData.value.displayStartDate = ''
    
    // Remove quality tiers from commercial models
    formData.value.commercialModels.forEach(model => {
      delete model.qualityTier
    })
  }
  
  if (formData.value.ernVersion === '3.8.2') {
    // Remove ConditionalDownload from usage types (not in 3.8.2)
    formData.value.commercialModels.forEach(model => {
      model.usageTypes = model.usageTypes.filter(type => type !== 'ConditionalDownload')
    })
  }
}

// Commercial model management
const addCommercialModel = () => {
  formData.value.commercialModels.push({
    type: 'PayAsYouGoModel',
    usageTypes: ['PermanentDownload'],
    qualityTier: ''
  })
}

const removeCommercialModel = (index) => {
  formData.value.commercialModels.splice(index, 1)
}

const toggleUsageType = (modelIndex, usageType) => {
  const model = formData.value.commercialModels[modelIndex]
  const index = model.usageTypes.indexOf(usageType)
  if (index > -1) {
    model.usageTypes.splice(index, 1)
  } else {
    model.usageTypes.push(usageType)
  }
}

// Test connection
const testConnection = async () => {
  testing.value = true
  testResult.value = null
  
  try {
    const result = await deliveryTargetService.testConnection(formData.value)
    testResult.value = result
  } catch (error) {
    testResult.value = {
      success: false,
      message: error.message
    }
  } finally {
    testing.value = false
  }
}

// Handle form submission
const handleSubmit = async () => {
  saving.value = true
  try {
    if (isNew.value) {
      await deliveryTargetService.create(formData.value)
    } else {
      await deliveryTargetService.update(props.target.id, formData.value)
    }
    emit('save')
  } catch (error) {
    console.error('Error saving target:', error)
    alert('Failed to save delivery target. Please try again.')
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

// Initialize form with existing data
onMounted(() => {
  if (props.target) {
    // Merge existing target data with defaults
    formData.value = {
      ...formData.value,
      ...props.target,
      config: {
        ...formData.value.config,
        ...props.target.config
      },
      // Ensure ERN version is set
      ernVersion: props.target.ernVersion || '4.3'
    }
  }
})
</script>

<style scoped>
.delivery-target-form {
  max-width: 800px;
}

.form-section {
  margin-bottom: var(--space-2xl);
  padding-bottom: var(--space-xl);
  border-bottom: 1px solid var(--color-border);
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  margin-bottom: var(--space-lg);
  color: var(--color-text);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

.protocol-config {
  padding: var(--space-lg);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  margin-top: var(--space-lg);
}

.commercial-models {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.commercial-model {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.usage-types {
  display: flex;
  gap: var(--space-md);
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: var(--space-2xl);
  padding-top: var(--space-xl);
  border-top: 1px solid var(--color-border);
}

.test-result {
  animation: slideIn 0.3s ease;
}

.test-result .alert {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.test-result .alert i {
  font-size: 1.25rem;
  margin-top: 2px;
}

.version-features {
  padding: var(--space-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
}

.form-checkbox {
  margin-right: var(--space-xs);
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.form-select-sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-sm);
}

.btn-icon {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.btn-icon:hover {
  color: var(--color-danger);
  background: var(--color-bg-tertiary);
}

/* Font Awesome specific styles */
.fa-spin {
  animation: fa-spin 1s infinite linear;
}

@keyframes fa-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.mr-sm {
  margin-right: var(--space-sm);
}

.ml-sm {
  margin-left: var(--space-sm);
}

.mt-sm {
  margin-top: var(--space-sm);
}

.mt-lg {
  margin-top: var(--space-lg);
}

/* Alert styles from CSS architecture */
.alert {
  padding: var(--space-md);
  border-radius: var(--radius-md);
  border: 1px solid;
  margin-bottom: var(--space-lg);
}

.alert-info {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  color: var(--color-primary);
}

.alert-success {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: var(--color-success);
}

.alert-warning {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: var(--color-warning);
}

.alert-error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--color-danger);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .commercial-model {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>