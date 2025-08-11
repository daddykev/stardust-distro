<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { userProfile } = useAuth()

// State
const releases = ref([])
const searchQuery = ref('')
const filterStatus = ref('all')
const sortBy = ref('recent')
const isLoading = ref(true)

// Mock data
const mockReleases = [
  {
    id: '1',
    title: 'Summer Vibes EP',
    artist: 'The Sunset Band',
    type: 'EP',
    status: 'delivered',
    releaseDate: new Date('2024-06-15'),
    trackCount: 4,
    territories: ['Worldwide'],
    coverUrl: null
  },
  {
    id: '2',
    title: 'Midnight Dreams',
    artist: 'Luna Nova',
    type: 'Album',
    status: 'ready',
    releaseDate: new Date('2024-07-01'),
    trackCount: 12,
    territories: ['US', 'CA', 'UK'],
    coverUrl: null
  },
  {
    id: '3',
    title: 'Electric Pulse',
    artist: 'Digital Waves',
    type: 'Single',
    status: 'draft',
    releaseDate: new Date('2024-08-01'),
    trackCount: 1,
    territories: ['Worldwide'],
    coverUrl: null
  }
]

// Computed
const filteredReleases = computed(() => {
  let filtered = [...releases.value]
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(release => 
      release.title.toLowerCase().includes(query) ||
      release.artist.toLowerCase().includes(query)
    )
  }
  
  // Apply status filter
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(release => release.status === filterStatus.value)
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'recent':
        return b.releaseDate - a.releaseDate
      case 'oldest':
        return a.releaseDate - b.releaseDate
      case 'title':
        return a.title.localeCompare(b.title)
      case 'artist':
        return a.artist.localeCompare(b.artist)
      default:
        return 0
    }
  })
  
  return filtered
})

const statusCounts = computed(() => {
  const counts = {
    all: releases.value.length,
    draft: 0,
    ready: 0,
    delivered: 0,
    archived: 0
  }
  
  releases.value.forEach(release => {
    if (counts[release.status] !== undefined) {
      counts[release.status]++
    }
  })
  
  return counts
})

// Methods
const loadReleases = async () => {
  isLoading.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    releases.value = mockReleases
  } catch (error) {
    console.error('Error loading releases:', error)
  } finally {
    isLoading.value = false
  }
}

const createNewRelease = () => {
  router.push('/releases/new')
}

const viewRelease = (release) => {
  router.push(`/releases/${release.id}`)
}

const editRelease = (release) => {
  router.push(`/releases/${release.id}/edit`)
}

const duplicateRelease = (release) => {
  console.log('Duplicate release:', release.title)
  // TODO: Implement duplication logic
}

const archiveRelease = (release) => {
  console.log('Archive release:', release.title)
  // TODO: Implement archive logic
}

const getStatusColor = (status) => {
  switch (status) {
    case 'draft':
      return 'status-draft'
    case 'ready':
      return 'status-ready'
    case 'delivered':
      return 'status-delivered'
    case 'archived':
      return 'status-archived'
    default:
      return ''
  }
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'draft':
      return 'edit'
    case 'ready':
      return 'check'
    case 'delivered':
      return 'truck'
    case 'archived':
      return 'archive'
    default:
      return 'music'
  }
}

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

onMounted(() => {
  loadReleases()
})
</script>

<template>
  <div class="catalog">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Release Catalog</h1>
          <p class="page-subtitle">Manage your music releases and distributions</p>
        </div>
        <button @click="createNewRelease" class="btn btn-primary">
          <font-awesome-icon icon="plus" />
          New Release
        </button>
      </div>

      <!-- Filters Bar -->
      <div class="filters-bar card">
        <div class="card-body">
          <div class="filters-content">
            <!-- Search -->
            <div class="search-box">
              <font-awesome-icon icon="search" class="search-icon" />
              <input 
                v-model="searchQuery"
                type="text" 
                class="search-input"
                placeholder="Search releases..."
              />
            </div>

            <!-- Status Filter -->
            <div class="filter-tabs">
              <button 
                v-for="(count, status) in statusCounts" 
                :key="status"
                @click="filterStatus = status"
                class="filter-tab"
                :class="{ active: filterStatus === status }"
              >
                {{ status.charAt(0).toUpperCase() + status.slice(1) }}
                <span class="filter-count">{{ count }}</span>
              </button>
            </div>

            <!-- Sort Dropdown -->
            <select v-model="sortBy" class="form-select sort-select">
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title A-Z</option>
              <option value="artist">Artist A-Z</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading your catalog...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="releases.length === 0" class="empty-state card">
        <div class="card-body">
          <font-awesome-icon icon="music" class="empty-icon" />
          <h2 class="empty-title">No releases yet</h2>
          <p class="empty-description">
            Create your first release to start distributing your music
          </p>
          <button @click="createNewRelease" class="btn btn-primary">
            <font-awesome-icon icon="plus" />
            Create Your First Release
          </button>
        </div>
      </div>

      <!-- No Results State -->
      <div v-else-if="filteredReleases.length === 0" class="empty-state card">
        <div class="card-body">
          <font-awesome-icon icon="search" class="empty-icon" />
          <h2 class="empty-title">No releases found</h2>
          <p class="empty-description">
            Try adjusting your search or filters
          </p>
        </div>
      </div>

      <!-- Releases Grid -->
      <div v-else class="releases-grid">
        <div 
          v-for="release in filteredReleases" 
          :key="release.id"
          class="release-card card card-hover"
          @click="viewRelease(release)"
        >
          <div class="release-cover">
            <div v-if="!release.coverUrl" class="cover-placeholder">
              <font-awesome-icon icon="music" />
            </div>
            <img v-else :src="release.coverUrl" :alt="release.title" />
            <div class="release-type">{{ release.type }}</div>
          </div>
          
          <div class="release-content">
            <div class="release-info">
              <h3 class="release-title">{{ release.title }}</h3>
              <p class="release-artist">{{ release.artist }}</p>
              <div class="release-meta">
                <span class="release-date">
                  <font-awesome-icon icon="calendar" />
                  {{ formatDate(release.releaseDate) }}
                </span>
                <span class="release-tracks">
                  <font-awesome-icon icon="music" />
                  {{ release.trackCount }} {{ release.trackCount === 1 ? 'track' : 'tracks' }}
                </span>
              </div>
            </div>
            
            <div class="release-footer">
              <span class="release-status" :class="getStatusColor(release.status)">
                <font-awesome-icon :icon="getStatusIcon(release.status)" />
                {{ release.status }}
              </span>
              
              <div class="release-actions" @click.stop>
                <button @click="editRelease(release)" class="btn-icon" title="Edit">
                  <font-awesome-icon icon="edit" />
                </button>
                <button @click="duplicateRelease(release)" class="btn-icon" title="Duplicate">
                  <font-awesome-icon icon="copy" />
                </button>
                <button @click="archiveRelease(release)" class="btn-icon" title="Archive">
                  <font-awesome-icon icon="archive" />
                </button>
              </div>
            </div>
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

.page-header {
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

/* Filters Bar */
.filters-bar {
  margin-bottom: var(--space-xl);
}

.filters-content {
  display: flex;
  gap: var(--space-lg);
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: var(--space-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
}

.search-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  padding-left: calc(var(--space-md) * 2.5);
  font-size: var(--text-base);
  color: var(--color-text);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.filter-tabs {
  display: flex;
  gap: var(--space-xs);
}

.filter-tab {
  padding: var(--space-sm) var(--space-md);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-weight: var(--font-medium);
}

.filter-tab:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
}

.filter-tab.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.filter-count {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.filter-tab:not(.active) .filter-count {
  background-color: var(--color-bg-secondary);
}

.sort-select {
  width: auto;
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

.empty-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-sm);
}

.empty-description {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xl);
}

/* Releases Grid */
.releases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
}

.release-card {
  cursor: pointer;
  overflow: hidden;
  transition: all var(--transition-base);
}

.release-card:hover {
  transform: translateY(-2px);
}

.release-cover {
  position: relative;
  width: 100%;
  padding-top: 100%; /* 1:1 Aspect Ratio */
  background-color: var(--color-bg-secondary);
  overflow: hidden;
}

.release-cover img,
.cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-secondary-light));
  color: var(--color-primary);
  font-size: 3rem;
}

.release-type {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-md);
  text-transform: uppercase;
}

.release-content {
  padding: var(--space-lg);
}

.release-info {
  margin-bottom: var(--space-md);
}

.release-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.release-artist {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.release-meta {
  display: flex;
  gap: var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.release-meta span {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.release-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.release-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-transform: capitalize;
}

.status-draft {
  background-color: rgba(128, 134, 139, 0.1);
  color: var(--color-text-secondary);
}

.status-ready {
  background-color: var(--color-info);
  color: white;
}

.status-delivered {
  background-color: var(--color-success);
  color: white;
}

.status-archived {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
}

.release-actions {
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

/* Responsive */
@media (max-width: 768px) {
  .filters-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    width: 100%;
  }
  
  .filter-tabs {
    overflow-x: auto;
    padding-bottom: var(--space-xs);
  }
  
  .releases-grid {
    grid-template-columns: 1fr;
  }
}
</style>