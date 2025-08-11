<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// State
const deliveries = ref([])
const filterStatus = ref('all')
const selectedTarget = ref('all')
const isLoading = ref(true)
const showTargetModal = ref(false)

// Mock delivery data
const mockDeliveries = [
  {
    id: '1',
    releaseTitle: 'Summer Vibes EP',
    target: 'Spotify',
    status: 'completed',
    scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
    fileCount: 5,
    totalSize: '125 MB'
  },
  {
    id: '2',
    releaseTitle: 'Midnight Dreams',
    target: 'Apple Music',
    status: 'processing',
    scheduledAt: new Date(),
    progress: 65,
    fileCount: 13,
    totalSize: '380 MB'
  },
  {
    id: '3',
    releaseTitle: 'Electric Pulse',
    target: 'YouTube Music',
    status: 'queued',
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    fileCount: 2,
    totalSize: '45 MB'
  },
  {
    id: '4',
    releaseTitle: 'Summer Vibes EP',
    target: 'Deezer',
    status: 'failed',
    scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    failedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
    error: 'Connection timeout',
    fileCount: 5,
    totalSize: '125 MB'
  }
]

const deliveryTargets = ref([
  { id: '1', name: 'Spotify', type: 'DSP', protocol: 'SFTP', active: true },
  { id: '2', name: 'Apple Music', type: 'DSP', protocol: 'API', active: true },
  { id: '3', name: 'YouTube Music', type: 'DSP', protocol: 'FTP', active: true },
  { id: '4', name: 'Deezer', type: 'DSP', protocol: 'SFTP', active: true },
  { id: '5', name: 'Amazon Music', type: 'DSP', protocol: 'S3', active: false }
])

// Computed
const filteredDeliveries = computed(() => {
  let filtered = [...deliveries.value]
  
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(d => d.status === filterStatus.value)
  }
  
  if (selectedTarget.value !== 'all') {
    filtered = filtered.filter(d => d.target === selectedTarget.value)
  }
  
  return filtered
})

const statusCounts = computed(() => {
  const counts = {
    all: deliveries.value.length,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0
  }
  
  deliveries.value.forEach(delivery => {
    if (counts[delivery.status] !== undefined) {
      counts[delivery.status]++
    }
  })
  
  return counts
})

const activeTargets = computed(() => {
  return deliveryTargets.value.filter(t => t.active)
})

// Methods
const loadDeliveries = async () => {
  isLoading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    deliveries.value = mockDeliveries
  } catch (error) {
    console.error('Error loading deliveries:', error)
  } finally {
    isLoading.value = false
  }
}

const retryDelivery = (delivery) => {
  console.log('Retrying delivery:', delivery.id)
  // TODO: Implement retry logic
}

const cancelDelivery = (delivery) => {
  console.log('Cancelling delivery:', delivery.id)
  // TODO: Implement cancel logic
}

const viewLogs = (delivery) => {
  console.log('Viewing logs for:', delivery.id)
  // TODO: Show logs modal
}

const downloadReceipt = (delivery) => {
  console.log('Downloading receipt for:', delivery.id)
  // TODO: Download receipt
}

const getStatusColor = (status) => {
  switch (status) {
    case 'queued':
      return 'status-queued'
    case 'processing':
      return 'status-processing'
    case 'completed':
      return 'status-completed'
    case 'failed':
      return 'status-failed'
    default:
      return ''
  }
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'queued':
      return 'clock'
    case 'processing':
      return 'spinner'
    case 'completed':
      return 'check-circle'
    case 'failed':
      return 'times-circle'
    default:
      return 'truck'
  }
}

const formatTime = (date) => {
  const now = new Date()
  const diff = Math.abs(now - date)
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (date > now) {
    if (hours < 1) return 'In a few minutes'
    if (hours < 24) return `In ${hours} hour${hours > 1 ? 's' : ''}`
    return `In ${days} day${days > 1 ? 's' : ''}`
  } else {
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}

const getDuration = (start, end) => {
  const diff = end - start
  const minutes = Math.floor(diff / (1000 * 60))
  return `${minutes} min`
}

onMounted(() => {
  loadDeliveries()
})
</script>

<template>
  <div class="deliveries">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Deliveries</h1>
          <p class="page-subtitle">Monitor and manage your release deliveries</p>
        </div>
        <button @click="showTargetModal = true" class="btn btn-primary">
          <font-awesome-icon icon="plus" />
          Add Target
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-value">{{ statusCounts.completed }}</div>
            <div class="stat-label">Completed Today</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-value">{{ statusCounts.processing }}</div>
            <div class="stat-label">In Progress</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-value">{{ statusCounts.queued }}</div>
            <div class="stat-label">Queued</div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-value">{{ statusCounts.failed }}</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-tabs">
          <button 
            v-for="(count, status) in statusCounts" 
            :key="status"
            @click="filterStatus = status"
            class="filter-tab"
            :class="{ active: filterStatus === status }"
          >
            {{ status.charAt(0).toUpperCase() + status.slice(1) }}
            <span class="filter-badge">{{ count }}</span>
          </button>
        </div>
        
        <select v-model="selectedTarget" class="form-select">
          <option value="all">All Targets</option>
          <option v-for="target in activeTargets" :key="target.id" :value="target.name">
            {{ target.name }}
          </option>
        </select>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading deliveries...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredDeliveries.length === 0" class="empty-state card">
        <div class="card-body">
          <font-awesome-icon icon="truck" class="empty-icon" />
          <h2 class="empty-title">No deliveries found</h2>
          <p class="empty-description">
            {{ filterStatus === 'all' ? 'No deliveries scheduled yet' : `No ${filterStatus} deliveries` }}
          </p>
        </div>
      </div>

      <!-- Deliveries List -->
      <div v-else class="deliveries-list">
        <div 
          v-for="delivery in filteredDeliveries" 
          :key="delivery.id"
          class="delivery-card card"
        >
          <div class="card-body">
            <div class="delivery-header">
              <div class="delivery-info">
                <h3 class="delivery-title">{{ delivery.releaseTitle }}</h3>
                <div class="delivery-meta">
                  <span class="delivery-target">
                    <font-awesome-icon :icon="['fab', 'spotify']" />
                    {{ delivery.target }}
                  </span>
                  <span class="delivery-files">
                    {{ delivery.fileCount }} files · {{ delivery.totalSize }}
                  </span>
                </div>
              </div>
              
              <div class="delivery-status" :class="getStatusColor(delivery.status)">
                <font-awesome-icon 
                  :icon="getStatusIcon(delivery.status)" 
                  :spin="delivery.status === 'processing'"
                />
                {{ delivery.status }}
              </div>
            </div>

            <!-- Progress Bar for Processing -->
            <div v-if="delivery.status === 'processing'" class="delivery-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${delivery.progress}%` }"></div>
              </div>
              <span class="progress-text">{{ delivery.progress }}% complete</span>
            </div>

            <!-- Error Message for Failed -->
            <div v-if="delivery.status === 'failed'" class="delivery-error">
              <font-awesome-icon icon="exclamation-triangle" />
              {{ delivery.error }}
            </div>

            <div class="delivery-footer">
              <div class="delivery-time">
                <span v-if="delivery.status === 'queued'">
                  Scheduled {{ formatTime(delivery.scheduledAt) }}
                </span>
                <span v-else-if="delivery.status === 'processing'">
                  Started {{ formatTime(delivery.scheduledAt) }}
                </span>
                <span v-else-if="delivery.status === 'completed'">
                  Completed {{ formatTime(delivery.completedAt) }}
                  <span class="time-duration">
                    ({{ getDuration(delivery.scheduledAt, delivery.completedAt) }})
                  </span>
                </span>
                <span v-else-if="delivery.status === 'failed'">
                  Failed {{ formatTime(delivery.failedAt) }}
                </span>
              </div>
              
              <div class="delivery-actions">
                <button 
                  v-if="delivery.status === 'queued'"
                  @click="cancelDelivery(delivery)"
                  class="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button 
                  v-if="delivery.status === 'failed'"
                  @click="retryDelivery(delivery)"
                  class="btn btn-primary btn-sm"
                >
                  <font-awesome-icon icon="redo" />
                  Retry
                </button>
                <button 
                  @click="viewLogs(delivery)"
                  class="btn-icon"
                  title="View Logs"
                >
                  <font-awesome-icon icon="file-alt" />
                </button>
                <button 
                  v-if="delivery.status === 'completed'"
                  @click="downloadReceipt(delivery)"
                  class="btn-icon"
                  title="Download Receipt"
                >
                  <font-awesome-icon icon="download" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delivery Targets Section -->
      <div class="targets-section">
        <h2 class="section-title">Delivery Targets</h2>
        <div class="targets-grid">
          <div 
            v-for="target in deliveryTargets" 
            :key="target.id"
            class="target-card card"
            :class="{ inactive: !target.active }"
          >
            <div class="card-body">
              <div class="target-header">
                <h3 class="target-name">{{ target.name }}</h3>
                <span class="target-status" :class="{ active: target.active }">
                  {{ target.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="target-info">
                <span class="target-type">{{ target.type }}</span>
                <span class="target-protocol">{{ target.protocol }}</span>
              </div>
              <div class="target-actions">
                <button class="btn-icon" title="Edit">
                  <font-awesome-icon icon="edit" />
                </button>
                <button class="btn-icon" title="Test Connection">
                  <font-awesome-icon icon="plug" />
                </button>
                <button class="btn-icon" title="Delete">
                  <font-awesome-icon icon="trash" />
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
.deliveries {
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

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.stat-card .card-body {
  text-align: center;
}

.stat-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.stat-label {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* Filters */
.filters-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  gap: var(--space-lg);
  flex-wrap: wrap;
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

.filter-badge {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.filter-tab:not(.active) .filter-badge {
  background-color: var(--color-bg-secondary);
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
}

/* Deliveries List */
.deliveries-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  margin-bottom: var(--space-2xl);
}

.delivery-card {
  transition: all var(--transition-base);
}

.delivery-card:hover {
  box-shadow: var(--shadow-md);
}

.delivery-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-md);
}

.delivery-info {
  flex: 1;
}

.delivery-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.delivery-meta {
  display: flex;
  gap: var(--space-lg);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.delivery-meta span {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.delivery-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-transform: capitalize;
}

.status-queued {
  background-color: rgba(128, 134, 139, 0.1);
  color: var(--color-text-secondary);
}

.status-processing {
  background-color: var(--color-info);
  color: white;
}

.status-completed {
  background-color: var(--color-success);
  color: white;
}

.status-failed {
  background-color: var(--color-error);
  color: white;
}

/* Progress Bar */
.delivery-progress {
  margin: var(--space-md) 0;
}

.progress-bar {
  height: 8px;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-xs);
}

.progress-fill {
  height: 100%;
  background-color: var(--color-info);
  transition: width var(--transition-base);
}

.progress-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Error Message */
.delivery-error {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background-color: rgba(234, 67, 53, 0.1);
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: var(--text-sm);
  margin: var(--space-md) 0;
}

/* Delivery Footer */
.delivery-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.delivery-time {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.time-duration {
  color: var(--color-text-tertiary);
}

.delivery-actions {
  display: flex;
  gap: var(--space-sm);
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

/* Delivery Targets Section */
.targets-section {
  margin-top: var(--space-2xl);
}

.section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-lg);
}

.targets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-lg);
}

.target-card {
  transition: all var(--transition-base);
}

.target-card.inactive {
  opacity: 0.6;
}

.target-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.target-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.target-name {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
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
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.target-actions {
  display: flex;
  gap: var(--space-xs);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

/* Responsive */
@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr 1fr;
  }
  
  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-tabs {
    overflow-x: auto;
    padding-bottom: var(--space-xs);
  }
  
  .targets-grid {
    grid-template-columns: 1fr;
  }
}
</style>