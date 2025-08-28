<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { user } = useAuth()
const { 
  releases, 
  loadReleases, 
  deleteRelease,
  updateRelease,
  isLoading,
  error,
  draftReleases,
  publishedReleases,
  releaseCount
} = useCatalog()

// UI state
const searchQuery = ref('')
const selectedStatus = ref('all')
const selectedType = ref('all')
const showDeleteConfirm = ref(false)
const releaseToDelete = ref(null)
const isDeleting = ref(false)

// Bulk operations state
const selectedReleases = ref([])
const showBulkStatusModal = ref(false)
const bulkNewStatus = ref('ready')
const showBulkDeleteConfirm = ref(false)
const isBulkProcessing = ref(false)

// Filtered releases
const filteredReleases = computed(() => {
  let filtered = releases.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(release => 
      release.basic?.title?.toLowerCase().includes(query) ||
      release.basic?.displayArtist?.toLowerCase().includes(query) ||
      release.basic?.label?.toLowerCase().includes(query) ||
      release.basic?.catalogNumber?.toLowerCase().includes(query)
    )
  }

  // Filter by status
  if (selectedStatus.value !== 'all') {
    filtered = filtered.filter(release => release.status === selectedStatus.value)
  }

  // Filter by type
  if (selectedType.value !== 'all') {
    filtered = filtered.filter(release => release.basic?.type === selectedType.value)
  }

  return filtered
})

// Statistics
const stats = computed(() => {
  const total = releases.value.length
  const drafts = releases.value.filter(r => r.status === 'draft').length
  const ready = releases.value.filter(r => r.status === 'ready').length
  const delivered = releases.value.filter(r => r.status === 'delivered').length
  
  return {
    total,
    drafts,
    ready,
    delivered
  }
})

// Bulk operations computed
const isAllSelected = computed(() => {
  return filteredReleases.value.length > 0 && 
         selectedReleases.value.length === filteredReleases.value.length
})

const canBulkDeliver = computed(() => {
  return selectedReleases.value.every(id => {
    const release = releases.value.find(r => r.id === id)
    return release?.status === 'ready'
  })
})

const selectedReleasesData = computed(() => {
  return releases.value.filter(r => selectedReleases.value.includes(r.id))
})

// Load releases on mount
onMounted(async () => {
  await loadReleases()
})

// Reload when user changes
watch(user, async (newUser) => {
  if (newUser) {
    await loadReleases()
  }
})

// Clear selection when filters change
watch([searchQuery, selectedStatus, selectedType], () => {
  selectedReleases.value = []
})

// Methods
const getStatusClass = (status) => {
  const classes = {
    'draft': 'badge-warning',
    'ready': 'badge-info',
    'delivered': 'badge-success',
    'failed': 'badge-error'
  }
  return classes[status] || 'badge-secondary'
}

const getStatusLabel = (status) => {
  const labels = {
    'draft': 'Draft',
    'ready': 'Ready',
    'delivered': 'Delivered',
    'failed': 'Failed'
  }
  return labels[status] || status
}

const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A'
  
  // Handle Firestore Timestamp
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
    month: 'short',
    day: 'numeric'
  })
}

const navigateToNewRelease = () => {
  router.push('/releases/new')
}

const editRelease = (release) => {
  router.push(`/releases/edit/${release.id}`)
}

const viewRelease = (release) => {
  router.push(`/catalog/${release.id}`)
}

const deliverRelease = (release) => {
  // Navigate to delivery page
  router.push(`/deliveries/new?releaseId=${release.id}`)
}

const confirmDelete = (release) => {
  releaseToDelete.value = release
  showDeleteConfirm.value = true
}

const cancelDelete = () => {
  releaseToDelete.value = null
  showDeleteConfirm.value = false
}

const executeDelete = async () => {
  if (!releaseToDelete.value) return
  
  isDeleting.value = true
  try {
    await deleteRelease(releaseToDelete.value.id)
    showDeleteConfirm.value = false
    releaseToDelete.value = null
    
    // Show success message
    console.log('✅ Release deleted successfully')
  } catch (err) {
    console.error('❌ Failed to delete release:', err)
    alert('Failed to delete release. Please try again.')
  } finally {
    isDeleting.value = false
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = 'all'
  selectedType.value = 'all'
}

const hasActiveFilters = computed(() => {
  return searchQuery.value || selectedStatus.value !== 'all' || selectedType.value !== 'all'
})

// Refresh releases
const refreshReleases = async () => {
  selectedReleases.value = []
  await loadReleases()
}

// Bulk operations methods
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedReleases.value = []
  } else {
    selectedReleases.value = filteredReleases.value.map(r => r.id)
  }
}

const clearSelection = () => {
  selectedReleases.value = []
}

const toggleReleaseSelection = (releaseId) => {
  const index = selectedReleases.value.indexOf(releaseId)
  if (index > -1) {
    selectedReleases.value.splice(index, 1)
  } else {
    selectedReleases.value.push(releaseId)
  }
}

const bulkUpdateStatus = () => {
  showBulkStatusModal.value = true
}

const cancelBulkStatus = () => {
  showBulkStatusModal.value = false
  bulkNewStatus.value = 'ready'
}

const executeBulkStatusUpdate = async () => {
  isBulkProcessing.value = true
  try {
    for (const id of selectedReleases.value) {
      await updateRelease(id, { status: bulkNewStatus.value })
    }
    selectedReleases.value = []
    showBulkStatusModal.value = false
    await loadReleases()
    console.log('✅ Status updated for all selected releases')
  } catch (err) {
    console.error('❌ Failed to update status:', err)
    alert('Failed to update some releases. Please try again.')
  } finally {
    isBulkProcessing.value = false
  }
}

const bulkDeliver = () => {
  // Navigate to delivery with multiple releases
  const releaseIds = selectedReleases.value.join(',')
  router.push(`/deliveries/new?releaseIds=${releaseIds}`)
}

const bulkExport = () => {
  // Export selected releases as JSON
  const releasesToExport = releases.value.filter(r => selectedReleases.value.includes(r.id))
  const json = JSON.stringify(releasesToExport, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `releases_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  console.log('✅ Exported', releasesToExport.length, 'releases')
}

const confirmBulkDelete = () => {
  showBulkDeleteConfirm.value = true
}

const cancelBulkDelete = () => {
  showBulkDeleteConfirm.value = false
}

const executeBulkDelete = async () => {
  isBulkProcessing.value = true
  try {
    for (const id of selectedReleases.value) {
      await deleteRelease(id)
    }
    selectedReleases.value = []
    showBulkDeleteConfirm.value = false
    await loadReleases()
    console.log('✅ Deleted all selected releases')
  } catch (err) {
    console.error('❌ Failed to delete releases:', err)
    alert('Failed to delete some releases. Please try again.')
  } finally {
    isBulkProcessing.value = false
  }
}
</script>

<template>
  <div class="catalog">
    <div class="container">
      <!-- Header -->
      <div class="catalog-header">
        <div>
          <h1 class="page-title">Music Catalog</h1>
          <p class="page-subtitle">Manage your releases and track deliveries</p>
        </div>
        <button @click="navigateToNewRelease" class="btn btn-primary">
          <font-awesome-icon icon="plus" />
          New Release
        </button>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">Total Releases</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.drafts }}</div>
          <div class="stat-label">Drafts</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.ready }}</div>
          <div class="stat-label">Ready</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.delivered }}</div>
          <div class="stat-label">Delivered</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section card">
        <div class="card-body">
          <div class="filters-row">
            <div class="search-box">
              <font-awesome-icon icon="search" class="search-icon" />
              <input 
                v-model="searchQuery"
                type="text" 
                class="form-input" 
                placeholder="Search releases..."
              />
            </div>
            
            <select v-model="selectedStatus" class="form-select">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
            </select>
            
            <select v-model="selectedType" class="form-select">
              <option value="all">All Types</option>
              <option value="Single">Single</option>
              <option value="EP">EP</option>
              <option value="Album">Album</option>
              <option value="Compilation">Compilation</option>
            </select>
            
            <button 
              v-if="hasActiveFilters"
              @click="clearFilters" 
              class="btn btn-secondary"
            >
              Clear Filters
            </button>
            
            <button 
              @click="refreshReleases" 
              class="btn btn-secondary"
              :disabled="isLoading"
            >
              <font-awesome-icon icon="sync" :class="{ 'fa-spin': isLoading }" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- Bulk Actions Bar -->
      <div v-if="selectedReleases.length > 0" class="bulk-actions-bar card">
        <div class="card-body">
          <div class="bulk-content">
            <div class="bulk-info">
              <span class="bulk-count">
                <font-awesome-icon icon="check-square" />
                {{ selectedReleases.length }} {{ selectedReleases.length === 1 ? 'release' : 'releases' }} selected
              </span>
              <button @click="clearSelection" class="btn-link">Clear selection</button>
            </div>
            <div class="bulk-actions">
              <button @click="bulkUpdateStatus" class="btn btn-secondary btn-sm">
                <font-awesome-icon icon="edit" />
                Update Status
              </button>
              <button @click="bulkDeliver" class="btn btn-secondary btn-sm" :disabled="!canBulkDeliver">
                <font-awesome-icon icon="truck" />
                Deliver
              </button>
              <button @click="bulkExport" class="btn btn-secondary btn-sm">
                <font-awesome-icon icon="download" />
                Export
              </button>
              <button @click="confirmBulkDelete" class="btn btn-secondary btn-sm text-error">
                <font-awesome-icon icon="trash" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-banner">
        <font-awesome-icon icon="exclamation-triangle" />
        <span>{{ error }}</span>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && releases.length === 0" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading your catalog...</p>
      </div>

      <!-- Releases Table -->
      <div v-else-if="filteredReleases.length > 0" class="releases-table card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th class="checkbox-column">
                  <input 
                    type="checkbox" 
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                    class="checkbox"
                  />
                </th>
                <th>Cover</th>
                <th>Title</th>
                <th>Artist</th>
                <th>Type</th>
                <th>Release Date</th>
                <th>Status</th>
                <th>Tracks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="release in filteredReleases" :key="release.id">
                <td class="checkbox-column">
                  <input 
                    type="checkbox"
                    :value="release.id"
                    :checked="selectedReleases.includes(release.id)"
                    @change="toggleReleaseSelection(release.id)"
                    class="checkbox"
                  />
                </td>
                <td>
                  <div class="cover-thumbnail">
                    <img 
                      v-if="release.assets?.coverImage?.url || release.assets?.coverImage?.preview"
                      :src="release.assets.coverImage.url || release.assets.coverImage.preview" 
                      :alt="release.basic?.title"
                    />
                    <div v-else class="cover-placeholder">
                      <font-awesome-icon icon="music" />
                    </div>
                  </div>
                </td>
                <td>
                  <div class="release-title">
                    {{ release.basic?.title || 'Untitled' }}
                    <span v-if="release.basic?.catalogNumber" class="catalog-number">
                      {{ release.basic.catalogNumber }}
                    </span>
                  </div>
                </td>
                <td>{{ release.basic?.displayArtist || 'Unknown Artist' }}</td>
                <td>{{ release.basic?.type || 'Album' }}</td>
                <td>{{ formatDate(release.basic?.releaseDate) }}</td>
                <td>
                  <span class="badge" :class="getStatusClass(release.status)">
                    {{ getStatusLabel(release.status) }}
                  </span>
                </td>
                <td>{{ release.tracks?.length || 0 }}</td>
                <td>
                  <div class="actions">
                    <button 
                      @click="viewRelease(release)" 
                      class="btn-icon"
                      title="View"
                    >
                      <font-awesome-icon icon="eye" />
                    </button>
                    <button 
                      @click="editRelease(release)" 
                      class="btn-icon"
                      title="Edit"
                    >
                      <font-awesome-icon icon="edit" />
                    </button>
                    <button 
                      v-if="release.status === 'ready'"
                      @click="deliverRelease(release)" 
                      class="btn-icon"
                      title="Deliver"
                    >
                      <font-awesome-icon icon="truck" />
                    </button>
                    <button 
                      @click="confirmDelete(release)" 
                      class="btn-icon text-error"
                      title="Delete"
                    >
                      <font-awesome-icon icon="trash" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state card">
        <div class="card-body">
          <font-awesome-icon icon="music" class="empty-icon" />
          <h2>{{ hasActiveFilters ? 'No releases found' : 'No releases yet' }}</h2>
          <p>
            {{ hasActiveFilters 
              ? 'Try adjusting your filters or search query' 
              : 'Create your first release to get started' 
            }}
          </p>
          <button 
            v-if="!hasActiveFilters"
            @click="navigateToNewRelease" 
            class="btn btn-primary"
          >
            <font-awesome-icon icon="plus" />
            Create Your First Release
          </button>
          <button 
            v-else
            @click="clearFilters" 
            class="btn btn-secondary"
          >
            Clear Filters
          </button>
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
            <div v-if="releaseToDelete" class="release-info">
              <strong>{{ releaseToDelete.basic?.title || 'Untitled' }}</strong>
              <span>by {{ releaseToDelete.basic?.displayArtist || 'Unknown Artist' }}</span>
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
            <button 
              @click="executeDelete" 
              class="btn btn-error"
              :disabled="isDeleting"
            >
              <font-awesome-icon v-if="isDeleting" icon="spinner" class="fa-spin" />
              <font-awesome-icon v-else icon="trash" />
              {{ isDeleting ? 'Deleting...' : 'Delete Release' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Bulk Status Update Modal -->
      <div v-if="showBulkStatusModal" class="modal-overlay" @click.self="cancelBulkStatus">
        <div class="modal">
          <div class="modal-header">
            <h3>Update Status</h3>
            <button @click="cancelBulkStatus" class="btn-icon">
              <font-awesome-icon icon="times" />
            </button>
          </div>
          <div class="modal-body">
            <p>Update status for {{ selectedReleases.length }} selected {{ selectedReleases.length === 1 ? 'release' : 'releases' }}:</p>
            
            <div class="form-group">
              <label class="form-label">New Status</label>
              <select v-model="bulkNewStatus" class="form-select">
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            
            <div class="selected-releases-list">
              <div v-for="release in selectedReleasesData" :key="release.id" class="selected-release-item">
                <span>{{ release.basic?.title || 'Untitled' }}</span>
                <span class="badge" :class="getStatusClass(release.status)">
                  {{ getStatusLabel(release.status) }}
                </span>
                <font-awesome-icon icon="arrow-right" />
                <span class="badge" :class="getStatusClass(bulkNewStatus)">
                  {{ getStatusLabel(bulkNewStatus) }}
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="cancelBulkStatus" class="btn btn-secondary">
              Cancel
            </button>
            <button 
              @click="executeBulkStatusUpdate" 
              class="btn btn-primary"
              :disabled="isBulkProcessing"
            >
              <font-awesome-icon v-if="isBulkProcessing" icon="spinner" class="fa-spin" />
              <font-awesome-icon v-else icon="edit" />
              {{ isBulkProcessing ? 'Updating...' : 'Update Status' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Bulk Delete Confirmation Modal -->
      <div v-if="showBulkDeleteConfirm" class="modal-overlay" @click.self="cancelBulkDelete">
        <div class="modal">
          <div class="modal-header">
            <h3>Confirm Bulk Delete</h3>
            <button @click="cancelBulkDelete" class="btn-icon">
              <font-awesome-icon icon="times" />
            </button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete {{ selectedReleases.length }} {{ selectedReleases.length === 1 ? 'release' : 'releases' }}?</p>
            
            <div class="selected-releases-list">
              <div v-for="release in selectedReleasesData" :key="release.id" class="selected-release-item">
                <strong>{{ release.basic?.title || 'Untitled' }}</strong>
                <span>by {{ release.basic?.displayArtist || 'Unknown Artist' }}</span>
              </div>
            </div>
            
            <p class="warning-text">
              <font-awesome-icon icon="exclamation-triangle" />
              This action cannot be undone. All associated data will be permanently deleted.
            </p>
          </div>
          <div class="modal-footer">
            <button @click="cancelBulkDelete" class="btn btn-secondary">
              Cancel
            </button>
            <button 
              @click="executeBulkDelete" 
              class="btn btn-error"
              :disabled="isBulkProcessing"
            >
              <font-awesome-icon v-if="isBulkProcessing" icon="spinner" class="fa-spin" />
              <font-awesome-icon v-else icon="trash" />
              {{ isBulkProcessing ? 'Deleting...' : `Delete ${selectedReleases.length} ${selectedReleases.length === 1 ? 'Release' : 'Releases'}` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.catalog {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
  gap: var(--space-lg);
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

/* Statistics */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.stat-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
}

.stat-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Filters */
.filters-section {
  margin-bottom: var(--space-lg);
}

.filters-row {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-icon {
  position: absolute;
  left: var(--space-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  pointer-events: none;
}

.search-box .form-input {
  padding-left: calc(var(--space-md) * 2 + 1rem);
}

.form-select {
  min-width: 150px;
}

/* Bulk Actions Bar */
.bulk-actions-bar {
  margin-bottom: var(--space-lg);
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
}

.bulk-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.bulk-count {
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-primary);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.btn-link:hover {
  text-decoration: none;
}

.bulk-actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
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

/* Table */
.releases-table {
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  background-color: var(--color-bg-secondary);
  font-weight: var(--font-semibold);
  text-align: left;
  padding: var(--space-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--color-border);
}

.table td {
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.table tbody tr:hover {
  background-color: var(--color-bg-secondary);
}

.checkbox-column {
  width: 40px;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* Cover Thumbnail */
.cover-thumbnail {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: var(--color-bg-secondary);
}

.cover-thumbnail img {
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
  font-size: 1.25rem;
}

/* Release Info */
.release-title {
  font-weight: var(--font-medium);
  color: var(--color-heading);
}

.catalog-number {
  display: block;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-xs);
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

/* Actions */
.actions {
  display: flex;
  gap: var(--space-xs);
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
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-3xl);
}

.empty-icon {
  font-size: 4rem;
  color: var(--color-border);
  margin-bottom: var(--space-lg);
}

.empty-state h2 {
  font-size: var(--text-2xl);
  color: var(--color-heading);
  margin-bottom: var(--space-md);
}

.empty-state p {
  color: var(--color-text-secondary);
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

.form-group {
  margin-bottom: var(--space-md);
}

.form-label {
  display: block;
  margin-bottom: var(--space-xs);
  font-weight: var(--font-medium);
  color: var(--color-text);
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

.selected-releases-list {
  max-height: 200px;
  overflow-y: auto;
  margin: var(--space-md) 0;
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.selected-release-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.selected-release-item:last-child {
  border-bottom: none;
}

.selected-release-item strong {
  flex: 1;
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
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .form-select {
    width: 100%;
  }
  
  .bulk-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .bulk-actions {
    justify-content: stretch;
  }
  
  .bulk-actions .btn {
    flex: 1;
  }
  
  .table {
    font-size: var(--text-sm);
  }
  
  .table th,
  .table td {
    padding: var(--space-sm);
  }
  
  .actions {
    flex-direction: column;
  }
  
  .modal {
    margin: var(--space-md);
  }
  
  .selected-release-item {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Loading animation for refresh button */
.fa-spin {
  animation: fa-spin 1s linear infinite;
}

@keyframes fa-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>