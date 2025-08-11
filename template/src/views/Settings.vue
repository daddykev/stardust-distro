<script setup>
import { ref } from 'vue'

// Settings state
const settings = ref({
  profile: {
    name: 'My Label',
    email: 'admin@mylabel.com',
    timezone: 'America/New_York'
  },
  platform: {
    defaultERNVersion: '4.3',
    autoValidate: true,
    requireApproval: false
  },
  notifications: {
    emailDeliverySuccess: true,
    emailDeliveryFailed: true,
    emailNewRelease: false
  }
})

const handleSave = (section) => {
  // TODO: Save to Firebase
  console.log(`Saving ${section}:`, settings.value[section])
}
</script>

<template>
  <div class="settings">
    <div class="container">
      <div class="settings-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Manage your distribution platform configuration</p>
      </div>

      <!-- Profile Settings -->
      <div class="settings-section">
        <div class="card">
          <div class="card-header">
            <h2 class="section-title">Profile Settings</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Organization Name</label>
              <input 
                v-model="settings.profile.name" 
                type="text" 
                class="form-input"
                placeholder="Enter organization name"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input 
                v-model="settings.profile.email" 
                type="email" 
                class="form-input"
                placeholder="admin@example.com"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Timezone</label>
              <select v-model="settings.profile.timezone" class="form-select">
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
              </select>
            </div>
            <button @click="handleSave('profile')" class="btn btn-primary">
              Save Profile
            </button>
          </div>
        </div>
      </div>

      <!-- Platform Settings -->
      <div class="settings-section">
        <div class="card">
          <div class="card-header">
            <h2 class="section-title">Platform Settings</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Default ERN Version</label>
              <select v-model="settings.platform.defaultERNVersion" class="form-select">
                <option value="3.8.2">ERN 3.8.2</option>
                <option value="4.2">ERN 4.2</option>
                <option value="4.3">ERN 4.3</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-checkbox">
                <input 
                  v-model="settings.platform.autoValidate" 
                  type="checkbox"
                />
                <span>Automatically validate ERN messages</span>
              </label>
            </div>
            <div class="form-group">
              <label class="form-checkbox">
                <input 
                  v-model="settings.platform.requireApproval" 
                  type="checkbox"
                />
                <span>Require approval before delivery</span>
              </label>
            </div>
            <button @click="handleSave('platform')" class="btn btn-primary">
              Save Platform Settings
            </button>
          </div>
        </div>
      </div>

      <!-- Notification Settings -->
      <div class="settings-section">
        <div class="card">
          <div class="card-header">
            <h2 class="section-title">Notification Settings</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-checkbox">
                <input 
                  v-model="settings.notifications.emailDeliverySuccess" 
                  type="checkbox"
                />
                <span>Email on successful delivery</span>
              </label>
            </div>
            <div class="form-group">
              <label class="form-checkbox">
                <input 
                  v-model="settings.notifications.emailDeliveryFailed" 
                  type="checkbox"
                />
                <span>Email on failed delivery</span>
              </label>
            </div>
            <div class="form-group">
              <label class="form-checkbox">
                <input 
                  v-model="settings.notifications.emailNewRelease" 
                  type="checkbox"
                />
                <span>Email on new release creation</span>
              </label>
            </div>
            <button @click="handleSave('notifications')" class="btn btn-primary">
              Save Notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  padding: var(--space-xl) 0;
}

.settings-header {
  margin-bottom: var(--space-xl);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-sm);
}

.page-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

.settings-section {
  margin-bottom: var(--space-xl);
}

.section-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.form-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-checkbox span {
  color: var(--color-text);
  user-select: none;
}
</style>