<template>
  <div class="delivery-target-form">
    <form @submit.prevent="save">
      <!-- Basic Information -->
      <div class="form-section">
        <h3>Basic Information</h3>
        
        <div class="form-group">
          <label for="name">Target Name *</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            class="form-input"
            placeholder="e.g., Spotify, Apple Music"
            required
          >
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="protocol">Protocol *</label>
            <select
              id="protocol"
              v-model="formData.protocol"
              class="form-input"
              required
            >
              <option value="">Select Protocol</option>
              <option value="FTP">FTP</option>
              <option value="SFTP">SFTP</option>
              <option value="S3">Amazon S3</option>
              <option value="API">REST API</option>
              <option value="Azure">Azure Blob</option>
            </select>
          </div>

          <div class="form-group">
            <label for="type">Target Type</label>
            <select
              id="type"
              v-model="formData.type"
              class="form-input"
            >
              <option value="DSP">DSP (Digital Service Provider)</option>
              <option value="Distributor">Distributor</option>
              <option value="Label">Record Label</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="formData.enabled"
            >
            <span>Enabled</span>
          </label>
        </div>
      </div>

      <!-- DDEX Configuration -->
      <div class="form-section">
        <h3>DDEX Configuration</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="partyId">DDEX Party ID</label>
            <input
              id="partyId"
              v-model="formData.partyId"
              type="text"
              class="form-input"
              placeholder="e.g., PADPIDA2014120301W"
            >
          </div>

          <div class="form-group">
            <label for="partyName">DDEX Party Name</label>
            <input
              id="partyName"
              v-model="formData.partyName"
              type="text"
              class="form-input"
              placeholder="e.g., Spotify AB"
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="commercialModel">Commercial Model</label>
            <select
              id="commercialModel"
              v-model="formData.commercialModel"
              class="form-input"
            >
              <option value="">Select Model</option>
              <option value="SubscriptionModel">Subscription</option>
              <option value="PayAsYouGoModel">Pay As You Go</option>
              <option value="AdSupportedModel">Ad Supported</option>
            </select>
          </div>

          <div class="form-group">
            <label for="useType">Use Type</label>
            <select
              id="useType"
              v-model="formData.useType"
              class="form-input"
            >
              <option value="">Select Use Type</option>
              <option value="OnDemandStream">On Demand Stream</option>
              <option value="NonInteractiveStream">Non-Interactive Stream</option>
              <option value="PermanentDownload">Permanent Download</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="territories">Territories</label>
          <input
            id="territories"
            v-model="formData.territories"
            type="text"
            class="form-input"
            placeholder="e.g., Worldwide, US CA GB"
          >
        </div>
      </div>

      <!-- Protocol-Specific Configuration -->
      <div class="form-section" v-if="formData.protocol">
        <h3>{{ formData.protocol }} Configuration</h3>
        
        <!-- FTP/SFTP Config -->
        <template v-if="formData.protocol === 'FTP' || formData.protocol === 'SFTP'">
          <div class="form-row">
            <div class="form-group">
              <label>Host *</label>
              <input
                v-model="formData.connection.host"
                type="text"
                class="form-input"
                placeholder="ftp.example.com"
                required
              >
            </div>
            <div class="form-group">
              <label>Port</label>
              <input
                v-model.number="formData.connection.port"
                type="number"
                class="form-input"
                :placeholder="formData.protocol === 'FTP' ? '21' : '22'"
              >
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Username *</label>
              <input
                v-model="formData.connection.username"
                type="text"
                class="form-input"
                required
              >
            </div>
            <div class="form-group">
              <label>Password *</label>
              <input
                v-model="formData.connection.password"
                type="password"
                class="form-input"
                required
              >
            </div>
          </div>
          <div class="form-group">
            <label>Directory Path</label>
            <input
              v-model="formData.connection.directory"
              type="text"
              class="form-input"
              placeholder="/uploads/music"
            >
          </div>
        </template>

        <!-- S3 Config -->
        <template v-else-if="formData.protocol === 'S3'">
          <div class="form-row">
            <div class="form-group">
              <label>Bucket Name *</label>
              <input
                v-model="formData.connection.bucket"
                type="text"
                class="form-input"
                required
              >
            </div>
            <div class="form-group">
              <label>Region *</label>
              <input
                v-model="formData.connection.region"
                type="text"
                class="form-input"
                placeholder="us-east-1"
                required
              >
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Access Key ID *</label>
              <input
                v-model="formData.connection.accessKeyId"
                type="text"
                class="form-input"
                required
              >
            </div>
            <div class="form-group">
              <label>Secret Access Key *</label>
              <input
                v-model="formData.connection.secretAccessKey"
                type="password"
                class="form-input"
                required
              >
            </div>
          </div>
        </template>

        <!-- API Config -->
        <template v-else-if="formData.protocol === 'API'">
          <div class="form-group">
            <label>Endpoint URL *</label>
            <input
              v-model="formData.connection.endpoint"
              type="url"
              class="form-input"
              placeholder="https://api.example.com/deliveries"
              required
            >
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input
              v-model="formData.connection.apiKey"
              type="password"
              class="form-input"
              placeholder="Bearer token or API key"
            >
          </div>
          <div class="form-group" v-if="formData.type === 'DSP'">
            <label>Distributor ID *</label>
            <input
              v-model="formData.config.distributorId"
              type="text"
              class="form-input"
              placeholder="e.g., stardust-distro"
              required
            >
          </div>
        </template>

        <!-- Azure Config -->
        <template v-else-if="formData.protocol === 'Azure'">
          <div class="form-row">
            <div class="form-group">
              <label>Account Name *</label>
              <input
                v-model="formData.connection.accountName"
                type="text"
                class="form-input"
                required
              >
            </div>
            <div class="form-group">
              <label>Container Name *</label>
              <input
                v-model="formData.connection.containerName"
                type="text"
                class="form-input"
                required
              >
            </div>
          </div>
          <div class="form-group">
            <label>Account Key *</label>
            <input
              v-model="formData.connection.accountKey"
              type="password"
              class="form-input"
              required
            >
          </div>
        </template>
      </div>

      <!-- Test Connection -->
      <div class="form-section" v-if="formData.protocol">
        <button
          type="button"
          @click="testConnection"
          :disabled="isTesting"
          class="btn btn-secondary"
        >
          <font-awesome-icon :icon="isTesting ? 'spinner' : 'plug'" :spin="isTesting" />
          {{ isTesting ? 'Testing...' : 'Test Connection' }}
        </button>
        
        <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
          <font-awesome-icon :icon="testResult.success ? 'check-circle' : 'times-circle'" />
          {{ testResult.message }}
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" @click="$emit('close')" class="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" :disabled="isSaving" class="btn btn-primary">
          <font-awesome-icon :icon="isSaving ? 'spinner' : 'save'" :spin="isSaving" />
          {{ isSaving ? 'Saving...' : 'Save Target' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase'
import { useAuth } from '@/composables/useAuth'

const props = defineProps({
  target: Object
})

const emit = defineEmits(['save', 'close'])

const { user } = useAuth()

// Form data
const formData = ref({
  name: '',
  protocol: '',
  type: 'DSP',
  enabled: true,
  connection: {},
  config: {},
  partyId: '',
  partyName: '',
  commercialModel: '',
  useType: '',
  territories: ''
})

// State
const isSaving = ref(false)
const isTesting = ref(false)
const testResult = ref(null)

// Initialize form data if editing
if (props.target) {
  formData.value = { ...props.target }
}

// Validation
const validateForm = () => {
  if (!formData.value.name || !formData.value.protocol) {
    alert('Please fill in all required fields')
    return false
  }
  
  // Protocol-specific validation
  const conn = formData.value.connection
  switch (formData.value.protocol) {
    case 'FTP':
    case 'SFTP':
      if (!conn.host || !conn.username || !conn.password) {
        alert('Please provide host, username, and password')
        return false
      }
      break
    case 'S3':
      if (!conn.bucket || !conn.region || !conn.accessKeyId || !conn.secretAccessKey) {
        alert('Please provide all S3 configuration')
        return false
      }
      break
    case 'API':
      if (!conn.endpoint) {
        alert('Please provide API endpoint')
        return false
      }
      if (formData.value.type === 'DSP' && !formData.value.config?.distributorId) {
        alert('Please provide Distributor ID for DSP targets')
        return false
      }
      break
    case 'Azure':
      if (!conn.accountName || !conn.containerName || !conn.accountKey) {
        alert('Please provide all Azure configuration')
        return false
      }
      break
  }
  
  return true
}

// Save target with encryption via Cloud Function
const save = async () => {
  if (!validateForm()) return
  
  try {
    isSaving.value = true
    
    // Build the target data
    const targetData = {
      name: formData.value.name,
      protocol: formData.value.protocol,
      type: formData.value.type || 'DSP',
      enabled: formData.value.enabled !== false,
      
      // Connection details (will be encrypted server-side)
      connection: {
        ...formData.value.connection
      },
      
      // Config details (distributor ID will be encrypted)
      config: {
        ...formData.value.config
      },
      
      // DDEX fields
      partyId: formData.value.partyId,
      partyName: formData.value.partyName,
      commercialModel: formData.value.commercialModel,
      useType: formData.value.useType,
      territories: formData.value.territories
    }
    
    // Use Cloud Function to save with encryption
    const saveTargetFn = httpsCallable(functions, 'saveDeliveryTarget')
    const result = await saveTargetFn({
      ...targetData,
      targetId: props.target?.id // Include ID if editing
    })
    
    if (result.data.success) {
      emit('save', {
        id: result.data.id || props.target?.id,
        ...targetData,
        // Mask sensitive fields for display
        connection: {
          ...targetData.connection,
          password: targetData.connection?.password ? '***' : undefined,
          apiKey: targetData.connection?.apiKey ? '***' : undefined,
          secretAccessKey: targetData.connection?.secretAccessKey ? '***' : undefined,
          accountKey: targetData.connection?.accountKey ? '***' : undefined
        }
      })
      emit('close')
    }
  } catch (error) {
    console.error('Error saving target:', error)
    alert('Failed to save delivery target: ' + error.message)
  } finally {
    isSaving.value = false
  }
}

// Load target with decrypted credentials for editing
const loadTargetForEdit = async () => {
  if (!props.target?.id) return
  
  try {
    const getTargetFn = httpsCallable(functions, 'getDeliveryTarget')
    const result = await getTargetFn({ targetId: props.target.id })
    
    if (result.data) {
      // Populate form with decrypted data
      formData.value = {
        name: result.data.name,
        protocol: result.data.protocol,
        type: result.data.type || 'DSP',
        enabled: result.data.enabled !== false,
        connection: result.data.connection || {},
        config: result.data.config || {},
        partyId: result.data.partyId,
        partyName: result.data.partyName,
        commercialModel: result.data.commercialModel,
        useType: result.data.useType,
        territories: result.data.territories
      }
    }
  } catch (error) {
    console.error('Error loading target:', error)
    // Fall back to the props if we can't decrypt
    if (props.target) {
      formData.value = { ...props.target }
    }
  }
}

// Test connection
const testConnection = async () => {
  if (!validateForm()) return
  
  try {
    isTesting.value = true
    testResult.value = null
    
    // Get the current form data (may include decrypted credentials)
    const config = {
      protocol: formData.value.protocol,
      ...formData.value.connection,
      ...formData.value.config,
      testMode: true
    }
    
    // The test function will use the credentials directly
    const testFn = httpsCallable(functions, 'testDeliveryConnection')
    const result = await testFn({ 
      protocol: formData.value.protocol,
      config: config,
      testMode: true
    })
    
    testResult.value = result.data
  } catch (error) {
    console.error('Connection test failed:', error)
    testResult.value = {
      success: false,
      message: error.message || 'Connection test failed'
    }
  } finally {
    isTesting.value = false
  }
}

// Apply DSP preset
const applyPreset = (dsp) => {
  // Implementation for DSP presets if needed
}

// Watch for protocol changes
watch(() => formData.value.protocol, () => {
  testResult.value = null
  formData.value.connection = {}
})

// Load encrypted data when editing
onMounted(() => {
  if (props.target?.id) {
    loadTargetForEdit()
  }
})
</script>

<style scoped>
.delivery-target-form {
  max-width: 800px;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  margin-bottom: 1.5rem;
  color: var(--color-text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.test-result {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.test-result.success {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid var(--color-success-border);
}

.test-result.error {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger-border);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .form-actions button {
    width: 100%;
  }
}
</style>