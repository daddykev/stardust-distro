<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { loadRelease, deleteRelease, currentRelease, isLoading, error } = useCatalog()

const releaseId = computed(() => route.params.id)
const showDeleteConfirm = ref(false)
const activeTab = ref('overview')

// Load release on mount
onMounted(async () => {
  if (releaseId.value) {
    try {
      await loadRelease(releaseId.value)
    } catch (err) {
      console.error('Failed to load release:', err)
      router.push('/catalog')
    }
  }
})

// Methods
const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A'
  
  let date
  if (dateValue?.toDate) {
    date = dateValue.toDate()
  } else if (dateValue?.seconds) {
    date = new Date(dateValue.seconds * 1000)
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue)
  } else {
    date = dateValue
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

const getStatusClass = (status) => {
  const classes = {
    'draft': 'badge-warning',
    'ready': 'badge-info',
    'delivered': 'badge-success',
    'failed': 'badge-error'
  }
  return classes[status] || 'badge-secondary'
}

const editRelease = () => {
  router.push(`/releases/edit/${releaseId.value}`)
}

const deliverRelease = () => {
  router.push(`/deliveries/new?releaseId=${releaseId.value}`)
}

const confirmDelete = () => {
  showDeleteConfirm.value = true
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
}

const executeDelete = async () => {
  try {
    await deleteRelease(releaseId.value)
    router.push('/catalog')
  } catch (err) {
    console.error('Failed to delete release:', err)
    alert('Failed to delete release. Please try again.')
  }
}

// Computed total duration
const totalDuration = computed(() => {
  if (!currentRelease.value?.tracks) return 0
  return currentRelease.value.tracks.reduce((sum, track) => {
    return sum + (track.duration || track.audio?.duration || 0)
  }, 0)
})
</script>

<template>
  <div class="release-detail">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <router-link to="/catalog" class="back-link">
          <font-awesome-icon icon="chevron-left" />
          Back to Catalog
        </router-link>
        
        <div v-if="currentRelease" class="header-actions">
          <button @click="editRelease" class="btn btn-secondary">
            <font-awesome-icon icon="edit" />
            Edit
          </button>
          <button 
            v-if="currentRelease.status === 'ready'"
            @click="deliverRelease" 
            class="btn btn-primary"
          >
            <font-awesome-icon icon="truck" />
            Deliver
          </button>
          <button @click="confirmDelete" class="btn btn-secondary text-error">
            <font-awesome-icon icon="trash" />
            Delete
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading release details...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-banner">
        <font-awesome-icon icon="exclamation-triangle" />
        <span>{{ error }}</span>
      </div>

      <!-- Release Content -->
      <div v-else-if="currentRelease" class="release-content">
        <!-- Release Header Card -->
        <div class="release-header-card card">
          <div class="release-header-content">
            <div class="release-cover">
              <img 
                v-if="currentRelease.assets?.coverImage?.url"
                :src="currentRelease.assets.coverImage.url" 
                :alt="currentRelease.basic?.title"
              />
              <div v-else class="cover-placeholder">
                <font-awesome-icon icon="music" />
              </div>
            </div>
            
            <div class="release-info">
              <div class="release-title-section">
                <h1 class="release-title">{{ currentRelease.basic?.title || 'Untitled' }}</h1>
                <span class="badge" :class="getStatusClass(currentRelease.status)">
                  {{ currentRelease.status }}
                </span>
              </div>
              
              <p class="release-artist">{{ currentRelease.basic?.displayArtist || 'Unknown Artist' }}</p>
              
              <div class="release-meta">
                <div class="meta-item">
                  <span class="meta-label">Type:</span>
                  <span class="meta-value">{{ currentRelease.basic?.type || 'Album' }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Release Date:</span>
                  <span class="meta-value">{{ formatDate(currentRelease.basic?.releaseDate) }}</span>
                </div>
                <div v-if="currentRelease.basic?.label" class="meta-item">
                  <span class="meta-label">Label:</span>
                  <span class="meta-value">{{ currentRelease.basic.label }}</span>
                </div>
                <div v-if="currentRelease.basic?.catalogNumber" class="meta-item">
                  <span class="meta-label">Catalog #:</span>
                  <span class="meta-value">{{ currentRelease.basic.catalogNumber }}</span>
                </div>
                <div v-if="currentRelease.basic?.barcode" class="meta-item">
                  <span class="meta-label">Barcode:</span>
                  <span class="meta-value">{{ currentRelease.basic.barcode }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button 
            @click="activeTab = 'overview'" 
            class="tab-button"
            :class="{ active: activeTab === 'overview' }"
          >
            Overview
          </button>
          <button 
            @click="activeTab = 'tracks'" 
            class="tab-button"
            :class="{ active: activeTab === 'tracks' }"
          >
            Tracks ({{ currentRelease.tracks?.length || 0 }})
          </button>
          <button 
            @click="activeTab = 'metadata'" 
            class="tab-button"
            :class="{ active: activeTab === 'metadata' }"
          >
            Metadata
          </button>
          <button 
            @click="activeTab = 'assets'" 
            class="tab-button"
            :class="{ active: activeTab === 'assets' }"
          >
            Assets
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Overview Tab -->
          <div v-if="activeTab === 'overview'" class="card">
            <div class="card-body">
              <h2 class="section-title">Release Overview</h2>
              
              <div class="overview-grid">
                <div class="overview-stat">
                  <div class="stat-icon">
                    <font-awesome-icon icon="music" />
                  </div>
                  <div>
                    <div class="stat-value">{{ currentRelease.tracks?.length || 0 }}</div>
                    <div class="stat-label">Tracks</div>
                  </div>
                </div>
                
                <div class="overview-stat">
                  <div class="stat-icon">
                    <font-awesome-icon icon="clock" />
                  </div>
                  <div>
                    <div class="stat-value">{{ formatDuration(totalDuration) }}</div>
                    <div class="stat-label">Total Duration</div>
                  </div>
                </div>
                
                <div class="overview-stat">
                  <div class="stat-icon">
                    <font-awesome-icon icon="globe" />
                  </div>
                  <div>
                    <div class="stat-value">
                      {{ currentRelease.territories?.mode === 'worldwide' ? 'Worldwide' : 'Selected' }}
                    </div>
                    <div class="stat-label">Territories</div>
                  </div>
                </div>
                
                <div class="overview-stat">
                  <div class="stat-icon">
                    <font-awesome-icon icon="file" />
                  </div>
                  <div>
                    <div class="stat-value">ERN {{ currentRelease.ddex?.version || '4.3' }}</div>
                    <div class="stat-label">DDEX Version</div>
                  </div>
                </div>
              </div>

              <div v-if="currentRelease.metadata?.genre" class="info-section">
                <h3>Genre</h3>
                <p>{{ currentRelease.metadata.genre }}<span v-if="currentRelease.metadata.subgenre"> / {{ currentRelease.metadata.subgenre }}</span></p>
              </div>

              <div v-if="currentRelease.metadata?.copyright" class="info-section">
                <h3>Copyright</h3>
                <p>{{ currentRelease.metadata.copyright }}</p>
              </div>
            </div>
          </div>

          <!-- Tracks Tab -->
          <div v-if="activeTab === 'tracks'" class="card">
            <div class="card-body">
              <h2 class="section-title">Track Listing</h2>
              
              <div v-if="currentRelease.tracks?.length === 0" class="empty-state">
                <font-awesome-icon icon="music" />
                <p>No tracks added</p>
              </div>
              
              <div v-else class="tracks-table">
                <table class="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Artist</th>
                      <th>Duration</th>
                      <th>ISRC</th>
                      <th>Audio</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(track, index) in currentRelease.tracks" :key="track.id || index">
                      <td>{{ index + 1 }}</td>
                      <td>{{ track.title }}</td>
                      <td>{{ track.artist || currentRelease.basic?.displayArtist }}</td>
                      <td>{{ formatDuration(track.duration || track.audio?.duration) }}</td>
                      <td>{{ track.isrc || '-' }}</td>
                      <td>
                        <span v-if="track.audio" class="badge badge-success">
                          <font-awesome-icon icon="check" />
                          {{ track.audio.format || 'Uploaded' }}
                        </span>
                        <span v-else class="badge badge-secondary">
                          <font-awesome-icon icon="times" />
                          Not uploaded
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Metadata Tab -->
          <div v-if="activeTab === 'metadata'" class="card">
            <div class="card-body">
              <h2 class="section-title">Metadata</h2>
              
              <div class="metadata-grid">
                <div class="metadata-item">
                  <span class="metadata-label">Genre:</span>
                  <span class="metadata-value">{{ currentRelease.metadata?.genre || '-' }}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Sub-genre:</span>
                  <span class="metadata-value">{{ currentRelease.metadata?.subgenre || '-' }}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Language:</span>
                  <span class="metadata-value">{{ currentRelease.metadata?.language || 'en' }}</span>
                </div>
                <div class="metadata-item">
                  <span class="metadata-label">Copyright Year:</span>
                  <span class="metadata-value">{{ currentRelease.metadata?.copyrightYear || '-' }}</span>
                </div>
                <div class="metadata-item span-2">
                  <span class="metadata-label">Copyright:</span>
                  <span class="metadata-value">{{ currentRelease.metadata?.copyright || '-' }}</span>
                </div>
                <div class="metadata-item span-2">
                  <span class="metadata-label">Created:</span>
                  <span class="metadata-value">{{ formatDate(currentRelease.createdAt) }}</span>
                </div>
                <div class="metadata-item span-2">
                  <span class="metadata-label">Last Updated:</span>
                  <span class="metadata-value">{{ formatDate(currentRelease.updatedAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Assets Tab -->
          <div v-if="activeTab === 'assets'" class="card">
            <div class="card-body">
              <h2 class="section-title">Assets</h2>
              
              <div class="assets-section">
                <h3>Cover Image</h3>
                <div v-if="currentRelease.assets?.coverImage" class="asset-item">
                  <img 
                    :src="currentRelease.assets.coverImage.url" 
                    :alt="currentRelease.basic?.title"
                    class="asset-preview"
                  />
                  <div class="asset-info">
                    <p class="asset-name">{{ currentRelease.assets.coverImage.name || 'Cover Image' }}</p>
                    <p class="asset-meta">
                      {{ formatFileSize(currentRelease.assets.coverImage.size) }}
                      <span v-if="currentRelease.assets.coverImage.dimensions">
                        • {{ currentRelease.assets.coverImage.dimensions.width }}x{{ currentRelease.assets.coverImage.dimensions.height }}px
                      </span>
                    </p>
                  </div>
                </div>
                <div v-else class="empty-asset">
                  <font-awesome-icon icon="image" />
                  <p>No cover image uploaded</p>
                </div>
              </div>
              
              <div class="assets-section">
                <h3>Audio Files</h3>
                <div v-if="currentRelease.tracks?.some(t => t.audio)" class="audio-list">
                  <div 
                    v-for="track in currentRelease.tracks.filter(t => t.audio)" 
                    :key="track.id"
                    class="audio-item"
                  >
                    <font-awesome-icon icon="music" class="audio-icon" />
                    <div class="audio-info">
                      <p class="audio-name">{{ track.title }}</p>
                      <p class="audio-meta">
                        {{ track.audio.format }} • {{ formatFileSize(track.audio.size) }} • {{ formatDuration(track.audio.duration) }}
                      </p>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-asset">
                  <font-awesome-icon icon="music" />
                  <p>No audio files uploaded</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal">
          <div class="modal-header">
            <h3>Confirm Delete</h3>
            <button @click="cancelDelete" class="btn-icon">
              <font-awesome-icon icon="times" />
            </button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this release?</p>
            <div v-if="currentRelease" class="release-info">
              <strong>{{ currentRelease.basic?.title || 'Untitled' }}</strong>
              <span>by {{ currentRelease.basic?.displayArtist || 'Unknown Artist' }}</span>
            </div>
            <p class="warning-text">
              <font-awesome-icon icon="exclamation-triangle" />
              This action cannot be undone. All associated data will be permanently deleted.
            </p>
          </div>
          <div class="modal-footer">
            <button @click="cancelDelete" class="btn btn-secondary">
              Cancel
            </button>
            <button @click="executeDelete" class="btn btn-error">
              <font-awesome-icon icon="trash" />
              Delete Release
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.release-detail {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
  gap: var(--space-lg);
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

/* Loading State */
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

/* Error Banner */
.error-banner {
  background-color: rgba(234, 67, 53, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  color: var(--color-error);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

/* Release Header Card */
.release-header-card {
  margin-bottom: var(--space-xl);
}

.release-header-content {
  display: flex;
  gap: var(--space-xl);
  padding: var(--space-xl);
}

.release-cover {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-lg);
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
  font-size: 3rem;
}

.release-info {
  flex: 1;
}

.release-title-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}

.release-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
}

.release-artist {
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.release-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.meta-label {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-value {
  color: var(--color-text);
  font-weight: var(--font-medium);
}

/* Status Badge */
.badge {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-warning {
  background-color: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

.badge-info {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.badge-error {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

.badge-secondary {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

/* Tabs */
.tabs {
  display: flex;
  gap: var(--space-xs);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-xl);
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
}

.tab-button:hover {
  color: var(--color-text);
}

.tab-button.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

/* Overview Grid */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.overview-stat {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-lg);
  font-size: 1.25rem;
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Info Sections */
.info-section {
  margin-bottom: var(--space-lg);
}

.info-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-sm);
  color: var(--color-heading);
}

.info-section p {
  color: var(--color-text);
}

/* Tables */
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--color-border);
}

.table td {
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

/* Metadata Grid */
.metadata-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.metadata-item.span-2 {
  grid-column: span 2;
}

.metadata-label {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metadata-value {
  color: var(--color-text);
  font-weight: var(--font-medium);
}

/* Assets */
.assets-section {
  margin-bottom: var(--space-xl);
}

.assets-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
  color: var(--color-heading);
}

.asset-item {
  display: flex;
  gap: var(--space-lg);
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.asset-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.asset-info {
  flex: 1;
}

.asset-name {
  font-weight: var(--font-medium);
  margin-bottom: var(--space-xs);
}

.asset-meta {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.empty-asset {
  padding: var(--space-xl);
  text-align: center;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  color: var(--color-text-tertiary);
}

.empty-asset svg {
  font-size: 2rem;
  margin-bottom: var(--space-sm);
}

.audio-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.audio-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.audio-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-full);
}

.audio-info {
  flex: 1;
}

.audio-name {
  font-weight: var(--font-medium);
  margin-bottom: var(--space-xs);
}

.audio-meta {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-tertiary);
}

.empty-state svg {
  font-size: 2rem;
  margin-bottom: var(--space-sm);
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

.release-info {
  background-color: var(--color-bg-secondary);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin: var(--space-md) 0;
}

.release-info strong {
  display: block;
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.release-info span {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.warning-text {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-warning);
  background-color: rgba(251, 188, 4, 0.1);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin-top: var(--space-md);
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

.btn-icon:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
}

.btn-error {
  background-color: var(--color-error);
  color: white;
}

.btn-error:hover:not(:disabled) {
  background-color: var(--color-error);
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.text-error {
  color: var(--color-error);
}

/* Responsive */
@media (max-width: 768px) {
  .release-header-content {
    flex-direction: column;
  }
  
  .release-cover {
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }
  
  .overview-grid,
  .metadata-grid {
    grid-template-columns: 1fr;
  }
  
  .metadata-item.span-2 {
    grid-column: span 1;
  }
  
  .tabs {
    overflow-x: auto;
  }
  
  .table {
    font-size: var(--text-sm);
  }
  
  .table th,
  .table td {
    padding: var(--space-sm);
  }
}
</style>