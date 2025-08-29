<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useArtists } from '../composables/useArtists'
import { useAuth } from '../composables/useAuth'
import ArtistForm from '../components/ArtistForm.vue'

const router = useRouter()
const { user } = useAuth()
const { 
  artists, 
  loadArtists, 
  deleteArtist,
  isLoading,
  error,
  artistCount,
  individualArtists,
  groupArtists
} = useArtists()

// UI state
const searchQuery = ref('')
const selectedType = ref('all')
const showArtistModal = ref(false)
const editingArtist = ref(null)
const showDeleteConfirm = ref(false)
const artistToDelete = ref(null)
const isDeleting = ref(false)

// Filtered artists
const filteredArtists = computed(() => {
  let filtered = artists.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(artist => 
      artist.name?.toLowerCase().includes(query) ||
      artist.legalName?.toLowerCase().includes(query) ||
      artist.spotifyArtistId?.toLowerCase().includes(query) ||
      artist.appleArtistId?.toLowerCase().includes(query)
    )
  }

  // Filter by type
  if (selectedType.value !== 'all') {
    filtered = filtered.filter(artist => artist.type === selectedType.value)
  }

  return filtered
})

// Statistics
const stats = computed(() => {
  const total = artists.value.length
  const individuals = individualArtists.value.length
  const groups = groupArtists.value.length
  const verified = artists.value.filter(a => a.verified).length
  
  return {
    total,
    individuals,
    groups,
    verified
  }
})

// Load artists on mount
onMounted(async () => {
  await loadArtists()
})

// Methods
const openAddArtist = () => {
  editingArtist.value = null
  showArtistModal.value = true
}

const openEditArtist = (artist) => {
  editingArtist.value = artist
  showArtistModal.value = true
}

const closeArtistModal = () => {
  showArtistModal.value = false
  editingArtist.value = null
}

const onArtistSaved = async () => {
  closeArtistModal()
  await loadArtists()
}

const confirmDelete = (artist) => {
  artistToDelete.value = artist
  showDeleteConfirm.value = true
}

const cancelDelete = () => {
  artistToDelete.value = null
  showDeleteConfirm.value = false
}

const executeDelete = async () => {
  if (!artistToDelete.value) return
  
  isDeleting.value = true
  try {
    await deleteArtist(artistToDelete.value.id)
    showDeleteConfirm.value = false
    artistToDelete.value = null
    console.log('✅ Artist deleted successfully')
  } catch (err) {
    console.error('❌ Failed to delete artist:', err)
    alert('Failed to delete artist. Please try again.')
  } finally {
    isDeleting.value = false
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedType.value = 'all'
}

const hasActiveFilters = computed(() => {
  return searchQuery.value || selectedType.value !== 'all'
})

const refreshArtists = async () => {
  await loadArtists()
}

const getRoleBadges = (roles) => {
  if (!roles || roles.length === 0) return []
  return roles.slice(0, 3) // Show first 3 roles
}

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
    month: 'short',
    day: 'numeric'
  })
}

// Navigate back to catalog
const backToCatalog = () => {
  router.push('/catalog')
}
</script>

<template>
  <div class="artists">
    <div class="container">
      <!-- Header -->
      <div class="artists-header">
        <div>
          <div class="breadcrumb">
            <button @click="backToCatalog" class="btn-link">
              <font-awesome-icon icon="chevron-left" />
              Back to Catalog
            </button>
          </div>
          <h1 class="page-title">Artists & Contributors</h1>
          <p class="page-subtitle">Manage artist profiles and contributor information</p>
        </div>
        <button @click="openAddArtist" class="btn btn-primary">
          <font-awesome-icon icon="plus" />
          Add Artist
        </button>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">Total Artists</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.individuals }}</div>
          <div class="stat-label">Individuals</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.groups }}</div>
          <div class="stat-label">Groups</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.verified }}</div>
          <div class="stat-label">Verified</div>
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
                placeholder="Search artists..."
              />
            </div>
            
            <select v-model="selectedType" class="form-select">
              <option value="all">All Types</option>
              <option value="individual">Individual</option>
              <option value="group">Group</option>
            </select>
            
            <button 
              v-if="hasActiveFilters"
              @click="clearFilters" 
              class="btn btn-secondary"
            >
              Clear Filters
            </button>
            
            <button 
              @click="refreshArtists" 
              class="btn btn-secondary"
              :disabled="isLoading"
            >
              <font-awesome-icon icon="sync" :class="{ 'fa-spin': isLoading }" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-banner">
        <font-awesome-icon icon="exclamation-triangle" />
        <span>{{ error }}</span>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && artists.length === 0" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading artists...</p>
      </div>

      <!-- Artists Table -->
      <div v-else-if="filteredArtists.length > 0" class="artists-table card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Legal Name</th>
                <th>Spotify ID</th>
                <th>Apple ID</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="artist in filteredArtists" :key="artist.id">
                <td>
                  <div class="artist-name">
                    <strong>{{ artist.name }}</strong>
                    <span v-if="artist.verified" class="verified-badge" title="Verified">
                      <font-awesome-icon icon="check-circle" />
                    </span>
                  </div>
                </td>
                <td>
                  <span class="type-badge" :class="artist.type === 'group' ? 'badge-info' : 'badge-secondary'">
                    {{ artist.type }}
                  </span>
                </td>
                <td>{{ artist.legalName || '-' }}</td>
                <td>
                  <span v-if="artist.spotifyArtistId" class="external-id">
                    {{ artist.spotifyArtistId }}
                  </span>
                  <span v-else class="text-muted">-</span>
                </td>
                <td>
                  <span v-if="artist.appleArtistId" class="external-id">
                    {{ artist.appleArtistId }}
                  </span>
                  <span v-else class="text-muted">-</span>
                </td>
                <td>
                  <div class="roles-badges">
                    <span 
                      v-for="role in getRoleBadges(artist.roles)" 
                      :key="role"
                      class="role-badge"
                    >
                      {{ role }}
                    </span>
                    <span v-if="artist.roles?.length > 3" class="more-badge">
                      +{{ artist.roles.length - 3 }}
                    </span>
                  </div>
                </td>
                <td>
                  <span class="status-badge" :class="artist.status === 'active' ? 'badge-success' : 'badge-warning'">
                    {{ artist.status }}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <button 
                      @click="openEditArtist(artist)" 
                      class="btn-icon"
                      title="Edit"
                    >
                      <font-awesome-icon icon="edit" />
                    </button>
                    <button 
                      @click="confirmDelete(artist)" 
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
          <font-awesome-icon icon="users" class="empty-icon" />
          <h2>{{ hasActiveFilters ? 'No artists found' : 'No artists yet' }}</h2>
          <p>
            {{ hasActiveFilters 
              ? 'Try adjusting your filters or search query' 
              : 'Add your first artist to get started' 
            }}
          </p>
          <button 
            v-if="!hasActiveFilters"
            @click="openAddArtist" 
            class="btn btn-primary"
          >
            <font-awesome-icon icon="plus" />
            Add Your First Artist
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

      <!-- Artist Form Modal -->
      <ArtistForm 
        v-if="showArtistModal"
        :artist="editingArtist"
        @close="closeArtistModal"
        @saved="onArtistSaved"
      />

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
            <p>Are you sure you want to delete this artist?</p>
            <div v-if="artistToDelete" class="artist-info">
              <strong>{{ artistToDelete.name }}</strong>
              <span v-if="artistToDelete.legalName">{{ artistToDelete.legalName }}</span>
            </div>
            <p class="warning-text">
              <font-awesome-icon icon="exclamation-triangle" />
              This action cannot be undone. The artist will be removed from all releases.
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
              {{ isDeleting ? 'Deleting...' : 'Delete Artist' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.artists {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

.artists-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.breadcrumb {
  margin-bottom: var(--space-md);
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
}

.btn-link:hover {
  text-decoration: underline;
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
.artists-table {
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

/* Artist Info */
.artist-name {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.artist-name strong {
  font-weight: var(--font-medium);
  color: var(--color-heading);
}

.verified-badge {
  color: var(--color-primary);
  font-size: var(--text-sm);
}

.external-id {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.text-muted {
  color: var(--color-text-tertiary);
}

/* Badges */
.type-badge,
.status-badge,
.role-badge {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-info {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-secondary {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.badge-success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.badge-warning {
  background-color: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

.roles-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.role-badge {
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
  text-transform: capitalize;
}

.more-badge {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-xs);
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

.artist-info {
  background-color: var(--color-bg-secondary);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin: var(--space-md) 0;
}

.artist-info strong {
  display: block;
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.artist-info span {
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
}

/* Icon for users */
.empty-icon.fa-users {
  font-size: 4rem;
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