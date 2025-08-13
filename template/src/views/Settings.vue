<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { db, auth } from '../firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import DeliveryTargetForm from '../components/delivery/DeliveryTargetForm.vue'
import deliveryTargetService from '../services/deliveryTargets'

const router = useRouter()
const { user, userProfile, logout } = useAuth()

// State
const activeTab = ref('general')
const isSaving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Delivery targets state
const deliveryTargets = ref([])
const showTargetModal = ref(false)
const editingTarget = ref(null)
const targetFormMode = ref('create')
const isLoadingTargets = ref(false)

// Form data
const generalSettings = ref({
  organizationName: '',
  displayName: '',
  email: '',
  timezone: 'America/New_York',
  language: 'en'
})

const notificationSettings = ref({
  emailNotifications: true,
  releaseUpdates: true,
  deliveryStatus: true,
  weeklyReports: false,
  marketingEmails: false
})

const securitySettings = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  twoFactorEnabled: false
})

const appearanceSettings = ref({
  theme: 'auto',
  compactMode: false,
  showTips: true
})

// Load user settings
onMounted(async () => {
  if (userProfile.value) {
    generalSettings.value = {
      organizationName: userProfile.value.organizationName || '',
      displayName: userProfile.value.displayName || '',
      email: userProfile.value.email || '',
      timezone: userProfile.value.timezone || 'America/New_York',
      language: userProfile.value.language || 'en'
    }
    
    notificationSettings.value = {
      ...notificationSettings.value,
      ...(userProfile.value.notifications || {})
    }
    
    appearanceSettings.value = {
      ...appearanceSettings.value,
      ...(userProfile.value.appearance || {})
    }
  }
  
  // Load delivery targets
  loadDeliveryTargets()
})

// Methods
const saveGeneralSettings = async () => {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    // Update Firestore profile
    const userRef = doc(db, 'users', user.value.uid)
    await updateDoc(userRef, {
      organizationName: generalSettings.value.organizationName,
      displayName: generalSettings.value.displayName,
      timezone: generalSettings.value.timezone,
      language: generalSettings.value.language,
      updatedAt: new Date()
    })
    
    // Update email if changed
    if (generalSettings.value.email !== user.value.email) {
      await updateEmail(user.value, generalSettings.value.email)
    }
    
    successMessage.value = 'General settings saved successfully'
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Error saving general settings:', error)
    errorMessage.value = error.message
  } finally {
    isSaving.value = false
  }
}

const saveNotificationSettings = async () => {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    const userRef = doc(db, 'users', user.value.uid)
    await updateDoc(userRef, {
      notifications: notificationSettings.value,
      updatedAt: new Date()
    })
    
    successMessage.value = 'Notification settings saved successfully'
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Error saving notification settings:', error)
    errorMessage.value = error.message
  } finally {
    isSaving.value = false
  }
}

const updateSecuritySettings = async () => {
  if (securitySettings.value.newPassword !== securitySettings.value.confirmPassword) {
    errorMessage.value = 'New passwords do not match'
    return
  }
  
  if (securitySettings.value.newPassword.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters'
    return
  }
  
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    // Re-authenticate user
    const credential = EmailAuthProvider.credential(
      user.value.email,
      securitySettings.value.currentPassword
    )
    await reauthenticateWithCredential(user.value, credential)
    
    // Update password
    await updatePassword(user.value, securitySettings.value.newPassword)
    
    // Clear form
    securitySettings.value.currentPassword = ''
    securitySettings.value.newPassword = ''
    securitySettings.value.confirmPassword = ''
    
    successMessage.value = 'Password updated successfully'
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Error updating password:', error)
    errorMessage.value = error.message
  } finally {
    isSaving.value = false
  }
}

const saveAppearanceSettings = async () => {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    const userRef = doc(db, 'users', user.value.uid)
    await updateDoc(userRef, {
      appearance: appearanceSettings.value,
      updatedAt: new Date()
    })
    
    // Apply theme immediately
    if (appearanceSettings.value.theme !== 'auto') {
      document.documentElement.setAttribute('data-theme', appearanceSettings.value.theme)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    
    successMessage.value = 'Appearance settings saved successfully'
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Error saving appearance settings:', error)
    errorMessage.value = error.message
  } finally {
    isSaving.value = false
  }
}

// Delivery target methods
const loadDeliveryTargets = async () => {
  if (!user.value) return
  
  isLoadingTargets.value = true
  try {
    deliveryTargets.value = await deliveryTargetService.getTenantTargets(user.value.uid)
  } catch (error) {
    console.error('Error loading delivery targets:', error)
    errorMessage.value = 'Failed to load delivery targets'
  } finally {
    isLoadingTargets.value = false
  }
}

const addDeliveryTarget = () => {
  editingTarget.value = null
  targetFormMode.value = 'create'
  showTargetModal.value = true
}

const editDeliveryTarget = (target) => {
  editingTarget.value = target
  targetFormMode.value = 'edit'
  showTargetModal.value = true
}

const saveDeliveryTarget = async (targetData) => {
  try {
    if (targetFormMode.value === 'create') {
      await deliveryTargetService.createTarget(targetData, user.value.uid)
      successMessage.value = 'Delivery target created successfully'
    } else {
      await deliveryTargetService.updateTarget(editingTarget.value.id, targetData)
      successMessage.value = 'Delivery target updated successfully'
    }
    
    showTargetModal.value = false
    await loadDeliveryTargets()
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Error saving delivery target:', error)
    errorMessage.value = `Failed to save delivery target: ${error.message}`
  }
}

const deleteDeliveryTarget = async (target) => {
  if (!confirm(`Are you sure you want to delete the delivery target "${target.name}"? This action cannot be undone.`)) {
    return
  }
  
  try {
    await deliveryTargetService.deleteTarget(target.id)
    await loadDeliveryTargets()
    successMessage.value = 'Delivery target deleted successfully'
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Error deleting delivery target:', error)
    errorMessage.value = `Failed to delete delivery target: ${error.message}`
  }
}

const testTargetConnection = async (target) => {
  try {
    const result = await deliveryTargetService.testConnection(target)
    if (result.success) {
      successMessage.value = `Connection to ${target.name} successful!`
    } else {
      errorMessage.value = `Connection to ${target.name} failed: ${result.message}`
    }
    setTimeout(() => {
      successMessage.value = ''
      errorMessage.value = ''
    }, 5000)
  } catch (error) {
    errorMessage.value = `Connection test failed: ${error.message}`
  }
}

const signOut = async () => {
  if (confirm('Are you sure you want to sign out?')) {
    await logout()
    router.push('/')
  }
}
</script>

<template>
  <div class="settings">
    <div class="container">
      <!-- Header -->
      <div class="settings-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Manage your account and platform preferences</p>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="message success-message">
        <font-awesome-icon icon="check-circle" />
        {{ successMessage }}
      </div>
      
      <div v-if="errorMessage" class="message error-message">
        <font-awesome-icon icon="exclamation-triangle" />
        {{ errorMessage }}
      </div>

      <!-- Settings Tabs -->
      <div class="settings-tabs">
        <button 
          @click="activeTab = 'general'" 
          class="tab-button"
          :class="{ active: activeTab === 'general' }"
        >
          General
        </button>
        <button 
          @click="activeTab = 'delivery'" 
          class="tab-button"
          :class="{ active: activeTab === 'delivery' }"
        >
          Delivery Targets
        </button>
        <button 
          @click="activeTab = 'notifications'" 
          class="tab-button"
          :class="{ active: activeTab === 'notifications' }"
        >
          Notifications
        </button>
        <button 
          @click="activeTab = 'security'" 
          class="tab-button"
          :class="{ active: activeTab === 'security' }"
        >
          Security
        </button>
        <button 
          @click="activeTab = 'appearance'" 
          class="tab-button"
          :class="{ active: activeTab === 'appearance' }"
        >
          Appearance
        </button>
      </div>

      <!-- Tab Content -->
      <div class="settings-content">
        <!-- General Tab -->
        <div v-if="activeTab === 'general'" class="card">
          <div class="card-body">
            <h2 class="section-title">General Settings</h2>
            
            <div class="form-group">
              <label class="form-label">Organization Name</label>
              <input 
                v-model="generalSettings.organizationName" 
                type="text" 
                class="form-input"
                placeholder="Your label or company name"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Display Name</label>
              <input 
                v-model="generalSettings.displayName" 
                type="text" 
                class="form-input"
                placeholder="Your name"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input 
                v-model="generalSettings.email" 
                type="email" 
                class="form-input"
                placeholder="email@example.com"
              />
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Timezone</label>
                <select v-model="generalSettings.timezone" class="form-select">
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Language</label>
                <select v-model="generalSettings.language" class="form-select">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>
            </div>
            
            <div class="form-actions">
              <button 
                @click="saveGeneralSettings" 
                class="btn btn-primary"
                :disabled="isSaving"
              >
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Delivery Targets Tab -->
        <div v-if="activeTab === 'delivery'" class="card">
          <div class="card-header">
            <h2 class="section-title">Delivery Targets</h2>
            <button @click="addDeliveryTarget" class="btn btn-primary btn-sm">
              <font-awesome-icon icon="plus" />
              Add Target
            </button>
          </div>
          <div class="card-body">
            <p class="section-description">
              Configure your DSP and aggregator delivery endpoints. Each target includes DDEX party information, 
              delivery protocol settings, and commercial model configuration.
            </p>
            
            <div v-if="isLoadingTargets" class="loading-container">
              <div class="loading-spinner"></div>
              <p>Loading delivery targets...</p>
            </div>
            
            <div v-else-if="deliveryTargets.length === 0" class="empty-state">
              <font-awesome-icon icon="truck" class="empty-icon" />
              <h3>No delivery targets configured</h3>
              <p>Add your first delivery target to start distributing your music</p>
              <button @click="addDeliveryTarget" class="btn btn-primary">
                Configure Your First Target
              </button>
            </div>
            
            <div v-else class="targets-grid">
              <div 
                v-for="target in deliveryTargets" 
                :key="target.id"
                class="target-card"
                :class="{ inactive: !target.active }"
              >
                <div class="target-header">
                  <h3>{{ target.name }}</h3>
                  <span class="target-status" :class="{ active: target.active }">
                    {{ target.active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                
                <div class="target-info">
                  <div class="info-row">
                    <span class="info-label">Party:</span>
                    <span>{{ target.partyName }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Party ID:</span>
                    <span class="info-value-mono">{{ target.partyId }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Protocol:</span>
                    <span>{{ target.protocol }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">ERN Version:</span>
                    <span>{{ target.ernVersion }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Mode:</span>
                    <span class="badge" :class="target.testMode ? 'badge-warning' : 'badge-success'">
                      {{ target.testMode ? 'Test' : 'Live' }}
                    </span>
                  </div>
                </div>
                
                <div class="target-actions">
                  <button 
                    @click="editDeliveryTarget(target)"
                    class="btn-icon"
                    title="Edit"
                  >
                    <font-awesome-icon icon="edit" />
                  </button>
                  <button 
                    @click="testTargetConnection(target)"
                    class="btn-icon"
                    title="Test Connection"
                  >
                    <font-awesome-icon icon="plug" />
                  </button>
                  <button 
                    @click="deleteDeliveryTarget(target)"
                    class="btn-icon text-error"
                    title="Delete"
                  >
                    <font-awesome-icon icon="trash" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notifications Tab -->
        <div v-if="activeTab === 'notifications'" class="card">
          <div class="card-body">
            <h2 class="section-title">Notification Preferences</h2>
            
            <div class="notification-options">
              <label class="checkbox-option">
                <input 
                  v-model="notificationSettings.emailNotifications" 
                  type="checkbox"
                />
                <div class="option-content">
                  <span class="option-title">Email Notifications</span>
                  <span class="option-description">Receive important updates via email</span>
                </div>
              </label>
              
              <label class="checkbox-option">
                <input 
                  v-model="notificationSettings.releaseUpdates" 
                  type="checkbox"
                />
                <div class="option-content">
                  <span class="option-title">Release Updates</span>
                  <span class="option-description">Get notified when releases are processed</span>
                </div>
              </label>
              
              <label class="checkbox-option">
                <input 
                  v-model="notificationSettings.deliveryStatus" 
                  type="checkbox"
                />
                <div class="option-content">
                  <span class="option-title">Delivery Status</span>
                  <span class="option-description">Receive updates on delivery success or failures</span>
                </div>
              </label>
              
              <label class="checkbox-option">
                <input 
                  v-model="notificationSettings.weeklyReports" 
                  type="checkbox"
                />
                <div class="option-content">
                  <span class="option-title">Weekly Reports</span>
                  <span class="option-description">Get weekly summaries of your distribution activity</span>
                </div>
              </label>
              
              <label class="checkbox-option">
                <input 
                  v-model="notificationSettings.marketingEmails" 
                  type="checkbox"
                />
                <div class="option-content">
                  <span class="option-title">Product Updates</span>
                  <span class="option-description">Learn about new features and updates</span>
                </div>
              </label>
            </div>
            
            <div class="form-actions">
              <button 
                @click="saveNotificationSettings" 
                class="btn btn-primary"
                :disabled="isSaving"
              >
                {{ isSaving ? 'Saving...' : 'Save Preferences' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Security Tab -->
        <div v-if="activeTab === 'security'" class="card">
          <div class="card-body">
            <h2 class="section-title">Security Settings</h2>
            
            <div class="form-section">
              <h3>Change Password</h3>
              
              <div class="form-group">
                <label class="form-label">Current Password</label>
                <input 
                  v-model="securitySettings.currentPassword" 
                  type="password" 
                  class="form-input"
                  placeholder="Enter current password"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">New Password</label>
                <input 
                  v-model="securitySettings.newPassword" 
                  type="password" 
                  class="form-input"
                  placeholder="Enter new password"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <input 
                  v-model="securitySettings.confirmPassword" 
                  type="password" 
                  class="form-input"
                  placeholder="Confirm new password"
                />
              </div>
              
              <button 
                @click="updateSecuritySettings" 
                class="btn btn-primary"
                :disabled="isSaving || !securitySettings.currentPassword || !securitySettings.newPassword"
              >
                {{ isSaving ? 'Updating...' : 'Update Password' }}
              </button>
            </div>
            
            <div class="form-section">
              <h3>Sign Out</h3>
              <p>Sign out of your account on this device.</p>
              <button @click="signOut" class="btn btn-secondary">
                <font-awesome-icon icon="sign-out-alt" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <!-- Appearance Tab -->
        <div v-if="activeTab === 'appearance'" class="card">
          <div class="card-body">
            <h2 class="section-title">Appearance Settings</h2>
            
            <div class="form-group">
              <label class="form-label">Theme</label>
              <select v-model="appearanceSettings.theme" class="form-select">
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            
            <div class="checkbox-options">
              <label class="checkbox-option">
                <input 
                  v-model="appearanceSettings.compactMode" 
                  type="checkbox"
                />
                <div class="option-content">
                  <span class="option-title">Compact Mode</span>
                  <span class="option-description">Reduce spacing for more content</span>
                </div>
              </label>
              
              <label class="checkbox-option">
                <input 
                  v-model="appearanceSettings.showTips" 
                  type="checkbox"
                />
                <div class="option-content">
                  <span class="option-title">Show Tips</span>
                  <span class="option-description">Display helpful tips and hints</span>
                </div>
              </label>
            </div>
            
            <div class="form-actions">
              <button 
                @click="saveAppearanceSettings" 
                class="btn btn-primary"
                :disabled="isSaving"
              >
                {{ isSaving ? 'Saving...' : 'Save Preferences' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Delivery Target Modal -->
  <div v-if="showTargetModal" class="modal-overlay" @click.self="showTargetModal = false">
    <div class="modal modal-large">
      <div class="modal-header">
        <h3>{{ targetFormMode === 'create' ? 'Add Delivery Target' : 'Edit Delivery Target' }}</h3>
        <button @click="showTargetModal = false" class="btn-icon">
          <font-awesome-icon icon="times" />
        </button>
      </div>
      <div class="modal-body">
        <DeliveryTargetForm
          :modelValue="editingTarget || {}"
          :mode="targetFormMode"
          @save="saveDeliveryTarget"
          @cancel="showTargetModal = false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

.settings-header {
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

/* Tabs */
.settings-tabs {
  display: flex;
  gap: var(--space-xs);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-xl);
  overflow-x: auto;
}

.tab-button {
  padding: var(--space-sm) var(--space-lg);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
}

.tab-button:hover {
  color: var(--color-text);
}

.tab-button.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

/* Content */
.settings-content {
  max-width: 800px;
}

.section-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-lg);
}

.section-description {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

/* Forms */
.form-section {
  margin-bottom: var(--space-2xl);
  padding-bottom: var(--space-2xl);
  border-bottom: 1px solid var(--color-border);
}

.form-section:last-child {
  border-bottom: none;
}

.form-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-label {
  display: block;
  font-weight: var(--font-medium);
  margin-bottom: var(--space-xs);
  color: var(--color-text);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.form-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

/* Checkbox Options */
.notification-options,
.checkbox-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
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

.checkbox-option input[type="checkbox"] {
  margin-top: var(--space-xs);
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.option-title {
  font-weight: var(--font-medium);
  color: var(--color-heading);
}

.option-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Delivery Targets */
.targets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-lg);
}

.target-card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: all var(--transition-base);
}

.target-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.target-card.inactive {
  opacity: 0.6;
}

.target-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.target-header h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.target-status {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
}

.target-status.active {
  background-color: var(--color-success);
  color: white;
}

.target-info {
  margin-bottom: var(--space-md);
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

.info-value-mono {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.target-actions {
  display: flex;
  gap: var(--space-xs);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
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

.badge-warning {
  background-color: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

.badge-success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
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

.empty-icon {
  font-size: 4rem;
  color: var(--color-border);
  margin-bottom: var(--space-lg);
}

.empty-state h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-sm);
}

.empty-state p {
  margin-bottom: var(--space-xl);
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

.modal-body {
  padding: var(--space-lg);
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

.btn-icon.text-error:hover {
  color: var(--color-error);
}

/* Responsive */
@media (max-width: 768px) {
  .settings-tabs {
    overflow-x: auto;
    padding-bottom: var(--space-xs);
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .targets-grid {
    grid-template-columns: 1fr;
  }
}
</style>