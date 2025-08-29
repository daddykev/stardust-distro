<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useArtists } from '../composables/useArtists'

const props = defineProps({
  artist: Object // null for new, object for edit
})

const emit = defineEmits(['close', 'saved'])

const { createArtist, updateArtist, validateExternalId } = useArtists()

// Form state
const formData = ref({
  name: '',
  legalName: '',
  type: 'individual',
  spotifyArtistId: '',
  appleArtistId: '',
  isni: '',
  ipi: '',
  bio: '',
  country: '',
  imageUrl: '',
  roles: [],
  status: 'active'
})

// Available roles
const availableRoles = [
  { value: 'performer', label: 'Performer' },
  { value: 'featured', label: 'Featured Artist' },
  { value: 'producer', label: 'Producer' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'writer', label: 'Writer' },
  { value: 'composer', label: 'Composer' },
  { value: 'remixer', label: 'Remixer' },
  { value: 'arranger', label: 'Arranger' },
  { value: 'mixer', label: 'Mixing Engineer' },
  { value: 'mastering', label: 'Mastering Engineer' }
]

// UI state
const isSubmitting = ref(false)
const errors = ref({})
const spotifyIdValid = ref(true)
const appleIdValid = ref(true)

// Computed
const isEditMode = computed(() => !!props.artist)
const modalTitle = computed(() => isEditMode.value ? 'Edit Artist' : 'Add New Artist')
const submitButtonText = computed(() => {
  if (isSubmitting.value) return isEditMode.value ? 'Updating...' : 'Creating...'
  return isEditMode.value ? 'Update Artist' : 'Create Artist'
})

// Initialize form data
onMounted(() => {
  if (props.artist) {
    formData.value = {
      name: props.artist.name || '',
      legalName: props.artist.legalName || '',
      type: props.artist.type || 'individual',
      spotifyArtistId: props.artist.spotifyArtistId || '',
      appleArtistId: props.artist.appleArtistId || '',
      isni: props.artist.isni || '',
      ipi: props.artist.ipi || '',
      bio: props.artist.bio || '',
      country: props.artist.country || '',
      imageUrl: props.artist.imageUrl || '',
      roles: props.artist.roles || [],
      status: props.artist.status || 'active'
    }
  }
})

// Watch for type changes
watch(() => formData.value.type, (newType) => {
  if (newType === 'group') {
    formData.value.legalName = '' // Groups don't have legal names
  }
})

// Validation
const validateForm = () => {
  errors.value = {}
  
  if (!formData.value.name?.trim()) {
    errors.value.name = 'Artist name is required'
  }
  
  if (formData.value.type === 'individual' && formData.value.roles.includes('writer') && !formData.value.legalName?.trim()) {
    errors.value.legalName = 'Legal name is required for individual writers'
  }
  
  if (!formData.value.roles || formData.value.roles.length === 0) {
    errors.value.roles = 'At least one role is required'
  }
  
  if (!spotifyIdValid.value) {
    errors.value.spotifyArtistId = 'This Spotify ID is already in use'
  }
  
  if (!appleIdValid.value) {
    errors.value.appleArtistId = 'This Apple ID is already in use'
  }
  
  return Object.keys(errors.value).length === 0
}

// Validate external IDs
const validateSpotifyId = async () => {
  if (!formData.value.spotifyArtistId) {
    spotifyIdValid.value = true
    return
  }
  
  spotifyIdValid.value = await validateExternalId(
    'spotify', 
    formData.value.spotifyArtistId, 
    props.artist?.id
  )
}

const validateAppleId = async () => {
  if (!formData.value.appleArtistId) {
    appleIdValid.value = true
    return
  }
  
  appleIdValid.value = await validateExternalId(
    'apple', 
    formData.value.appleArtistId, 
    props.artist?.id
  )
}

// Toggle role selection
const toggleRole = (role) => {
  const index = formData.value.roles.indexOf(role)
  if (index > -1) {
    formData.value.roles.splice(index, 1)
  } else {
    formData.value.roles.push(role)
  }
}

// Submit form
const submitForm = async () => {
  // Validate external IDs first
  await Promise.all([validateSpotifyId(), validateAppleId()])
  
  if (!validateForm()) return
  
  isSubmitting.value = true
  try {
    if (isEditMode.value) {
      await updateArtist(props.artist.id, formData.value)
    } else {
      await createArtist(formData.value)
    }
    
    emit('saved')
  } catch (error) {
    console.error('Error saving artist:', error)
    alert('Failed to save artist. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

// Close modal
const closeModal = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal modal-large">
      <div class="modal-header">
        <h3>{{ modalTitle }}</h3>
        <button @click="closeModal" class="btn-icon" :disabled="isSubmitting">
          <font-awesome-icon icon="times" />
        </button>
      </div>
      
      <form @submit.prevent="submitForm" class="modal-body">
        <!-- Basic Information -->
        <div class="form-section">
          <h4>Basic Information</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Artist Name</label>
              <input 
                v-model="formData.name"
                type="text" 
                class="form-input"
                :class="{ 'error': errors.name }"
                placeholder="e.g., Taylor Swift, The Beatles"
              />
              <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
            </div>
            
            <div class="form-group">
              <label class="form-label">Type</label>
              <select v-model="formData.type" class="form-select">
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>
            </div>
          </div>
          
          <div v-if="formData.type === 'individual'" class="form-group">
            <label class="form-label">Legal Name</label>
            <input 
              v-model="formData.legalName"
              type="text" 
              class="form-input"
              :class="{ 'error': errors.legalName }"
              placeholder="Legal name for writer credits"
            />
            <span v-if="errors.legalName" class="form-error">{{ errors.legalName }}</span>
          </div>
        </div>
        
        <!-- External IDs -->
        <div class="form-section">
          <h4>External Platform IDs</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Spotify Artist ID</label>
              <input 
                v-model="formData.spotifyArtistId"
                type="text" 
                class="form-input"
                :class="{ 'error': errors.spotifyArtistId }"
                placeholder="e.g., 06HL4z0CvFAxyc27GXpf02"
                @blur="validateSpotifyId"
              />
              <span v-if="errors.spotifyArtistId" class="form-error">{{ errors.spotifyArtistId }}</span>
            </div>
            
            <div class="form-group">
              <label class="form-label">Apple Music Artist ID</label>
              <input 
                v-model="formData.appleArtistId"
                type="text" 
                class="form-input"
                :class="{ 'error': errors.appleArtistId }"
                placeholder="e.g., 159260351"
                @blur="validateAppleId"
              />
              <span v-if="errors.appleArtistId" class="form-error">{{ errors.appleArtistId }}</span>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">ISNI</label>
              <input 
                v-model="formData.isni"
                type="text" 
                class="form-input"
                placeholder="International Standard Name Identifier"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">IPI</label>
              <input 
                v-model="formData.ipi"
                type="text" 
                class="form-input"
                placeholder="Interested Parties Information"
              />
            </div>
          </div>
        </div>
        
        <!-- Roles -->
        <div class="form-section">
          <h4>Roles <span class="required">*</span></h4>
          <p class="form-hint">Select all roles this artist/contributor can perform</p>
          
          <div class="roles-grid">
            <label 
              v-for="role in availableRoles" 
              :key="role.value"
              class="role-checkbox"
              :class="{ 'selected': formData.roles.includes(role.value) }"
            >
              <input 
                type="checkbox"
                :value="role.value"
                :checked="formData.roles.includes(role.value)"
                @change="toggleRole(role.value)"
              />
              <span>{{ role.label }}</span>
            </label>
          </div>
          <span v-if="errors.roles" class="form-error">{{ errors.roles }}</span>
        </div>
        
        <!-- Additional Information -->
        <div class="form-section">
          <h4>Additional Information</h4>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Country</label>
              <input 
                v-model="formData.country"
                type="text" 
                class="form-input"
                placeholder="e.g., United States"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Status</label>
              <select v-model="formData.status" class="form-select">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Bio</label>
            <textarea 
              v-model="formData.bio"
              class="form-textarea"
              rows="3"
              placeholder="Brief artist biography..."
            ></textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">Image URL</label>
            <input 
              v-model="formData.imageUrl"
              type="url" 
              class="form-input"
              placeholder="https://example.com/artist-image.jpg"
            />
          </div>
        </div>
      </form>
      
      <div class="modal-footer">
        <button 
          @click="closeModal" 
          class="btn btn-secondary"
          :disabled="isSubmitting"
        >
          Cancel
        </button>
        <button 
          @click="submitForm"
          class="btn btn-primary"
          :disabled="isSubmitting"
        >
          <font-awesome-icon v-if="isSubmitting" icon="spinner" class="fa-spin" />
          <font-awesome-icon v-else icon="save" />
          {{ submitButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-large {
  max-width: 700px;
}

.form-section {
  margin-bottom: var(--space-xl);
}

.form-section h4 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-md);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-label {
  display: block;
  margin-bottom: var(--space-xs);
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.form-label.required::after,
.required {
  content: '*';
  color: var(--color-error);
  margin-left: var(--space-xs);
}

.form-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-base);
  color: var(--color-text);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-input.error,
.form-select.error,
.form-textarea.error {
  border-color: var(--color-error);
}

.form-error {
  display: block;
  margin-top: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-error);
}

/* Roles Grid */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-sm);
}

.role-checkbox {
  display: flex;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.role-checkbox:hover {
  background-color: var(--color-surface);
  border-color: var(--color-primary);
}

.role-checkbox.selected {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.role-checkbox input {
  margin-right: var(--space-xs);
}

/* Modal styles */
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
  width: 100%;
  max-height: 90vh;
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

.btn-icon:hover:not(:disabled) {
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
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
  
  .roles-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  
  .modal {
    margin: var(--space-sm);
    max-height: 100vh;
  }
}

/* Loading animation */
.fa-spin {
  animation: fa-spin 1s linear infinite;
}

@keyframes fa-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>