<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useDelivery } from '../composables/useDelivery'
import deliveryService from '../services/delivery'
import ReconciliationDashboard from '../components/ReconciliationDashboard.vue'
import { db } from '../firebase'
import { doc, onSnapshot } from 'firebase/firestore'

const router = useRouter()
const { user } = useAuth()
const { 
  deliveries, 
  subscribeToDeliveries, 
  cleanup,
  isLoading 
} = useDelivery()

// State
const activeTab = ref('active')
const showDetailsModal = ref(false)
const showLogsModal = ref(false)
const selectedDelivery = ref(null)
const deliveryLogs = ref([])
const isLiveLogging = ref(false)
const isRefreshing = ref(false)

// Filters
const filterStatus = ref('')
const filterTarget = ref('')
const searchQuery = ref('')

// Listeners
let logsUnsubscribe = null

// Computed
const activeDeliveries = computed(() => {
  return deliveries.value.filter(d => 
    ['queued', 'processing'].includes(d.status)
  ).sort((a, b) => {
    // Sort by priority, then by scheduled time
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
    const aPriority = priorityOrder[a.priority] || 2
    const bPriority = priorityOrder[b.priority] || 2
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }
    
    // Then by scheduled time
    const aTime = a.scheduledAt?.toMillis ? a.scheduledAt.toMillis() : 0
    const bTime = b.scheduledAt?.toMillis ? b.scheduledAt.toMillis() : 0
    return aTime - bTime
  })
})

const completedDeliveries = computed(() => {
  return deliveries.value.filter(d => 
    ['completed', 'failed', 'cancelled'].includes(d.status)
  ).sort((a, b) => {
    // Sort by completion time, newest first
    const aTime = (a.completedAt || a.updatedAt)?.toMillis ? 
      (a.completedAt || a.updatedAt).toMillis() : 0
    const bTime = (b.completedAt || b.updatedAt)?.toMillis ? 
      (b.completedAt || b.updatedAt).toMillis() : 0
    return bTime - aTime
  })
})

const uniqueTargets = computed(() => {
  const targets = new Set()
  deliveries.value.forEach(d => {
    if (d.targetName) {
      targets.add(d.targetName)
    }
  })
  return Array.from(targets).sort()
})

const filteredDeliveries = computed(() => {
  let filtered = activeTab.value === 'active' ? activeDeliveries.value : completedDeliveries.value
  
  if (filterStatus.value) {
    filtered = filtered.filter(d => d.status === filterStatus.value)
  }
  
  if (filterTarget.value) {
    filtered = filtered.filter(d => d.targetName === filterTarget.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(d => 
      d.releaseTitle?.toLowerCase().includes(query) ||
      d.releaseArtist?.toLowerCase().includes(query)
    )
  }
  
  return filtered
})

const stats = computed(() => {
  return {
    queued: deliveries.value.filter(d => d.status === 'queued').length,
    processing: deliveries.value.filter(d => d.status === 'processing').length,
    completed: deliveries.value.filter(d => d.status === 'completed').length,
    failed: deliveries.value.filter(d => d.status === 'failed').length
  }
})

// Methods
const refreshDeliveries = async () => {
  if (!user.value) return
  
  isRefreshing.value = true
  
  // Re-subscribe to get fresh data
  subscribeToDeliveries(user.value.uid)
  
  setTimeout(() => {
    isRefreshing.value = false
  }, 1000)
}

const viewDetails = (delivery) => {
  selectedDelivery.value = delivery
  showDetailsModal.value = true
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedDelivery.value = null
}

const viewLogs = async (delivery) => {
  selectedDelivery.value = delivery
  deliveryLogs.value = delivery.logs || []
  showLogsModal.value = true
  
  // If delivery is processing, start live logging
  if (delivery.status === 'processing') {
    startLiveLogging()
  }
}

const closeLogsModal = () => {
  showLogsModal.value = false
  stopLiveLogging()
  selectedDelivery.value = null
  deliveryLogs.value = []
}

const startLiveLogging = () => {
  if (!selectedDelivery.value) return
  
  isLiveLogging.value = true
  
  // Subscribe to real-time log updates
  logsUnsubscribe = onSnapshot(
    doc(db, 'deliveries', selectedDelivery.value.id),
    (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        deliveryLogs.value = data.logs || []
        
        // Auto-scroll to bottom
        setTimeout(() => {
          const container = document.querySelector('.logs-container')
          if (container) {
            container.scrollTop = container.scrollHeight
          }
        }, 100)
      }
    }
  )
}

const stopLiveLogging = () => {
  isLiveLogging.value = false
  if (logsUnsubscribe) {
    logsUnsubscribe()
    logsUnsubscribe = null
  }
}

const exportLogs = () => {
  if (!deliveryLogs.value.length) return
  
  const dataStr = JSON.stringify(deliveryLogs.value, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `delivery_logs_${selectedDelivery.value?.id || 'export'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const retryDelivery = async (delivery) => {
  if (confirm('Are you sure you want to retry this delivery?')) {
    try {
      await deliveryService.retryDelivery(delivery.id)
      refreshDeliveries()
    } catch (error) {
      console.error('Error retrying delivery:', error)
      alert('Failed to retry delivery. Please try again.')
    }
  }
}

const cancelDelivery = async (delivery) => {
  if (confirm('Are you sure you want to cancel this delivery?')) {
    try {
      await deliveryService.cancelDelivery(delivery.id)
      refreshDeliveries()
    } catch (error) {
      console.error('Error cancelling delivery:', error)
      alert('Failed to cancel delivery. Please try again.')
    }
  }
}

const downloadERN = (delivery) => {
  if (!delivery.ernXml) {
    alert('ERN not available for this delivery')
    return
  }
  
  deliveryService.downloadERN(delivery)
}

const downloadReceipt = (delivery) => {
  if (!delivery.receipt && delivery.status !== 'completed') {
    alert('Receipt not available for this delivery')
    return
  }
  
  deliveryService.downloadReceipt(delivery)
}

const getStatusIcon = (status) => {
  switch (status) {
    case 'queued': return 'clock'
    case 'processing': return 'spinner'
    case 'completed': return 'check-circle'
    case 'failed': return 'exclamation-triangle'
    case 'cancelled': return 'times-circle'
    default: return 'question-circle'
  }
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  
  try {
    // Handle Firestore Timestamp
    if (date && typeof date.toDate === 'function') {
      date = date.toDate()
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      date = new Date(date)
    }
    
    // Format the date
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

const formatLogTime = (timestamp) => {
  if (!timestamp) return ''
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    }).format(date)
  } catch (error) {
    return ''
  }
}

const formatDuration = (ms) => {
  if (!ms || ms === 0) return 'N/A'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// Lifecycle
onMounted(() => {
  if (user.value) {
    subscribeToDeliveries(user.value.uid)
  }
})

onUnmounted(() => {
  cleanup()
  stopLiveLogging()
})
</script>

<template>
  <div class="deliveries">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div>
          <h1>Deliveries</h1>
          <p class="subtitle">Monitor and manage your release deliveries</p>
        </div>
        <div class="header-actions">
          <button @click="refreshDeliveries" class="btn btn-secondary">
            <font-awesome-icon icon="sync-alt" :spin="isRefreshing" />
            Refresh
          </button>
          <router-link to="/deliveries/new" class="btn btn-primary">
            <font-awesome-icon icon="plus" />
            New Delivery
          </router-link>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon queued">
            <font-awesome-icon icon="clock" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.queued }}</div>
            <div class="stat-label">Queued</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon processing">
            <font-awesome-icon icon="spinner" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.processing }}</div>
            <div class="stat-label">Processing</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon completed">
            <font-awesome-icon icon="check-circle" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.completed }}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon failed">
            <font-awesome-icon icon="exclamation-triangle" />
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.failed }}</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          @click="activeTab = 'active'"
          class="tab"
          :class="{ active: activeTab === 'active' }"
        >
          Active
        </button>
        <button 
          @click="activeTab = 'history'"
          class="tab"
          :class="{ active: activeTab === 'history' }"
        >
          History
        </button>
        <button 
          @click="activeTab = 'reconciliation'"
          class="tab"
          :class="{ active: activeTab === 'reconciliation' }"
        >
          Receipts
        </button>
      </div>

      <!-- Filters (not shown for reconciliation tab) -->
      <div v-if="activeTab !== 'reconciliation'" class="filters">
        <select v-model="filterStatus" class="form-select">
          <option value="">All Status</option>
          <option value="queued">Queued</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        
        <select v-model="filterTarget" class="form-select">
          <option value="">All Targets</option>
          <option v-for="target in uniqueTargets" :key="target" :value="target">
            {{ target }}
          </option>
        </select>
        
        <input 
          v-model="searchQuery"
          type="search"
          placeholder="Search releases..."
          class="form-input search-input"
        />
      </div>

      <!-- Active Deliveries -->
      <div v-if="activeTab === 'active'">
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading deliveries...</p>
        </div>
        
        <div v-else-if="filteredDeliveries.length === 0" class="empty-state">
          <font-awesome-icon icon="inbox" />
          <h3>No Active Deliveries</h3>
          <p>Queue a new delivery to get started</p>
          <router-link to="/deliveries/new" class="btn btn-primary">
            <font-awesome-icon icon="plus" />
            New Delivery
          </router-link>
        </div>
        
        <div v-else class="deliveries-grid">
          <div v-for="delivery in filteredDeliveries" :key="delivery.id" class="delivery-card">
            <div class="delivery-header">
              <div class="delivery-info">
                <h3>{{ delivery.releaseTitle }}</h3>
                <p>{{ delivery.releaseArtist }}</p>
              </div>
              <div class="delivery-status" :class="delivery.status">
                <font-awesome-icon 
                  :icon="getStatusIcon(delivery.status)" 
                  :spin="delivery.status === 'processing'"
                />
                {{ delivery.status }}
              </div>
            </div>
            
            <div class="delivery-meta">
              <div class="meta-item">
                <span class="meta-label">Target:</span>
                <span>{{ delivery.targetName }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Protocol:</span>
                <span>{{ delivery.targetProtocol?.toUpperCase() }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Type:</span>
                <span>{{ delivery.messageSubType || 'Initial' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Scheduled:</span>
                <span>{{ formatDate(delivery.scheduledAt) }}</span>
              </div>
              <div v-if="delivery.startedAt" class="meta-item">
                <span class="meta-label">Started:</span>
                <span>{{ formatDate(delivery.startedAt) }}</span>
              </div>
              <div v-if="delivery.currentStep" class="meta-item">
                <span class="meta-label">Current Step:</span>
                <span>{{ delivery.currentStep }}</span>
              </div>
            </div>
            
            <div class="delivery-actions">
              <button 
                v-if="delivery.status === 'processing'"
                @click="viewLogs(delivery)"
                class="btn btn-sm btn-secondary"
              >
                <font-awesome-icon icon="list" />
                View Logs
              </button>
              <button 
                v-if="delivery.status === 'failed'"
                @click="retryDelivery(delivery)"
                class="btn btn-sm btn-warning"
              >
                <font-awesome-icon icon="redo" />
                Retry
              </button>
              <button 
                v-if="['queued', 'processing'].includes(delivery.status)"
                @click="cancelDelivery(delivery)"
                class="btn btn-sm btn-secondary"
              >
                <font-awesome-icon icon="times" />
                Cancel
              </button>
              <button 
                @click="viewDetails(delivery)"
                class="btn btn-sm btn-primary"
              >
                <font-awesome-icon icon="eye" />
                Details
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- History -->
      <div v-if="activeTab === 'history'">
        <div v-if="filteredDeliveries.length === 0" class="empty-state">
          <font-awesome-icon icon="history" />
          <h3>No Delivery History</h3>
          <p>Completed deliveries will appear here</p>
        </div>
        
        <div v-else class="deliveries-grid">
          <div v-for="delivery in filteredDeliveries" :key="delivery.id" class="delivery-card">
            <div class="delivery-header">
              <div class="delivery-info">
                <h3>{{ delivery.releaseTitle }}</h3>
                <p>{{ delivery.releaseArtist }}</p>
              </div>
              <div class="delivery-status" :class="delivery.status">
                <font-awesome-icon :icon="getStatusIcon(delivery.status)" />
                {{ delivery.status }}
              </div>
            </div>
            
            <div class="delivery-meta">
              <div class="meta-item">
                <span class="meta-label">Target:</span>
                <span>{{ delivery.targetName }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Protocol:</span>
                <span>{{ delivery.targetProtocol?.toUpperCase() }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Type:</span>
                <span>{{ delivery.messageSubType || 'Initial' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Completed:</span>
                <span>{{ formatDate(delivery.completedAt || delivery.updatedAt) }}</span>
              </div>
              <div v-if="delivery.totalDuration" class="meta-item">
                <span class="meta-label">Duration:</span>
                <span>{{ formatDuration(delivery.totalDuration) }}</span>
              </div>
              <div v-if="delivery.error" class="meta-item error">
                <span class="meta-label">Error:</span>
                <span>{{ delivery.error }}</span>
              </div>
            </div>
            
            <div class="delivery-actions">
              <button 
                v-if="delivery.logs?.length > 0"
                @click="viewLogs(delivery)"
                class="btn btn-sm btn-secondary"
              >
                <font-awesome-icon icon="list" />
                Logs
              </button>
              <button 
                v-if="delivery.ernXml"
                @click="downloadERN(delivery)"
                class="btn btn-sm btn-secondary"
              >
                <font-awesome-icon icon="download" />
                ERN
              </button>
              <button 
                v-if="delivery.receipt || delivery.status === 'completed'"
                @click="downloadReceipt(delivery)"
                class="btn btn-sm btn-secondary"
              >
                <font-awesome-icon icon="file-invoice" />
                Receipt
              </button>
              <button 
                v-if="delivery.status === 'failed'"
                @click="retryDelivery(delivery)"
                class="btn btn-sm btn-warning"
              >
                <font-awesome-icon icon="redo" />
                Retry
              </button>
              <button 
                @click="viewDetails(delivery)"
                class="btn btn-sm btn-primary"
              >
                <font-awesome-icon icon="eye" />
                Details
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Reconciliation Tab -->
      <div v-if="activeTab === 'reconciliation'">
        <ReconciliationDashboard />
      </div>
    </div>

    <!-- Delivery Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
      <div class="modal modal-large" @click.stop>
        <div class="modal-header">
          <h2>Delivery Details</h2>
          <button @click="closeDetailsModal" class="modal-close">
            <font-awesome-icon icon="times" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="selectedDelivery" class="details-content">
            <div class="details-section">
              <h3>Release Information</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <span class="label">Title:</span>
                  <span>{{ selectedDelivery.releaseTitle }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Artist:</span>
                  <span>{{ selectedDelivery.releaseArtist }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">UPC:</span>
                  <span>{{ selectedDelivery.upc || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Release ID:</span>
                  <span class="mono">{{ selectedDelivery.releaseId }}</span>
                </div>
              </div>
            </div>

            <div class="details-section">
              <h3>Delivery Information</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <span class="label">Target:</span>
                  <span>{{ selectedDelivery.targetName }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Protocol:</span>
                  <span>{{ selectedDelivery.targetProtocol?.toUpperCase() }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Message Type:</span>
                  <span>{{ selectedDelivery.messageType || 'NewReleaseMessage' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Message SubType:</span>
                  <span>{{ selectedDelivery.messageSubType || 'Initial' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">ERN Version:</span>
                  <span>{{ selectedDelivery.ernVersion || '4.3' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Message ID:</span>
                  <span class="mono">{{ selectedDelivery.ernMessageId }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Status:</span>
                  <span class="status-badge" :class="selectedDelivery.status">
                    {{ selectedDelivery.status }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="label">Priority:</span>
                  <span>{{ selectedDelivery.priority || 'normal' }}</span>
                </div>
              </div>
            </div>

            <div class="details-section">
              <h3>Timeline</h3>
              <div class="timeline">
                <div class="timeline-item">
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <strong>Created</strong>
                    <span>{{ formatDate(selectedDelivery.createdAt) }}</span>
                  </div>
                </div>
                <div v-if="selectedDelivery.scheduledAt" class="timeline-item">
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <strong>Scheduled</strong>
                    <span>{{ formatDate(selectedDelivery.scheduledAt) }}</span>
                  </div>
                </div>
                <div v-if="selectedDelivery.startedAt" class="timeline-item">
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <strong>Started</strong>
                    <span>{{ formatDate(selectedDelivery.startedAt) }}</span>
                  </div>
                </div>
                <div v-if="selectedDelivery.completedAt" class="timeline-item">
                  <div class="timeline-marker success"></div>
                  <div class="timeline-content">
                    <strong>Completed</strong>
                    <span>{{ formatDate(selectedDelivery.completedAt) }}</span>
                  </div>
                </div>
                <div v-if="selectedDelivery.failedAt" class="timeline-item">
                  <div class="timeline-marker error"></div>
                  <div class="timeline-content">
                    <strong>Failed</strong>
                    <span>{{ formatDate(selectedDelivery.failedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selectedDelivery.receipt" class="details-section">
              <h3>Receipt</h3>
              <div class="receipt-content">
                <pre>{{ JSON.stringify(selectedDelivery.receipt, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDetailsModal" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>

    <!-- Logs Modal -->
    <div v-if="showLogsModal" class="modal-overlay" @click="closeLogsModal">
      <div class="modal modal-large" @click.stop>
        <div class="modal-header">
          <h2>Delivery Logs</h2>
          <div class="modal-actions">
            <button 
              v-if="isLiveLogging"
              @click="stopLiveLogging"
              class="btn btn-sm btn-warning"
            >
              <font-awesome-icon icon="pause" />
              Pause
            </button>
            <button 
              v-else-if="selectedDelivery?.status === 'processing'"
              @click="startLiveLogging"
              class="btn btn-sm btn-success"
            >
              <font-awesome-icon icon="play" />
              Live
            </button>
            <button @click="closeLogsModal" class="modal-close">
              <font-awesome-icon icon="times" />
            </button>
          </div>
        </div>
        <div class="modal-body">
          <div class="logs-container">
            <div v-if="deliveryLogs.length === 0" class="empty-logs">
              <font-awesome-icon icon="list" />
              <p>No logs available</p>
            </div>
            <div v-else class="logs-list">
              <div 
                v-for="(log, index) in deliveryLogs" 
                :key="index"
                class="log-entry"
                :class="`log-${log.level}`"
              >
                <div class="log-header">
                  <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
                  <span class="log-level" :class="log.level">{{ log.level }}</span>
                  <span class="log-step">{{ log.step }}</span>
                </div>
                <div class="log-message">{{ log.message }}</div>
                <div v-if="log.details" class="log-details">
                  <pre>{{ JSON.stringify(log.details, null, 2) }}</pre>
                </div>
                <div v-if="log.duration" class="log-duration">
                  Duration: {{ formatDuration(log.duration) }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="exportLogs" class="btn btn-secondary">
            <font-awesome-icon icon="download" />
            Export Logs
          </button>
          <button @click="closeLogsModal" class="btn btn-primary">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Import existing styles from components.css */
.deliveries {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
}

.header h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.subtitle {
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  transition: all var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.stat-icon.queued {
  background: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

.stat-icon.processing {
  background: rgba(66, 133, 244, 0.1);
  color: var(--color-info);
}

.stat-icon.completed {
  background: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.stat-icon.failed {
  background: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-xs);
}

/* Tabs */
.tabs {
  display: flex;
  gap: var(--space-sm);
  border-bottom: 2px solid var(--color-border);
  margin-bottom: var(--space-lg);
}

.tab {
  padding: var(--space-sm) var(--space-lg);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
  cursor: pointer;
  position: relative;
  transition: all var(--transition-base);
}

.tab:hover {
  color: var(--color-text);
}

.tab.active {
  color: var(--color-primary);
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
}

/* Filters */
.filters {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.search-input {
  flex: 1;
  max-width: 400px;
}

/* Deliveries Grid */
.deliveries-grid {
  display: grid;
  gap: var(--space-lg);
}

.delivery-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: all var(--transition-base);
}

.delivery-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-dark);
}

.delivery-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-md);
}

.delivery-info h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.delivery-info p {
  color: var(--color-text-secondary);
}

.delivery-status {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.delivery-status.queued {
  background: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

.delivery-status.processing {
  background: rgba(66, 133, 244, 0.1);
  color: var(--color-info);
}

.delivery-status.completed {
  background: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.delivery-status.failed {
  background: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

.delivery-status.cancelled {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.delivery-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  padding: var(--space-md) 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.meta-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.meta-item.error {
  color: var(--color-error);
}

.delivery-actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-3xl);
  color: var(--color-text-secondary);
}

.empty-state svg {
  font-size: 3rem;
  margin-bottom: var(--space-md);
  opacity: 0.5;
}

.empty-state h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
  margin-bottom: var(--space-sm);
}

.empty-state p {
  margin-bottom: var(--space-lg);
}

/* Loading */
.loading-container {
  text-align: center;
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
  margin: 0 auto var(--space-md);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-lg);
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-large {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.modal-close:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

.modal-footer {
  padding: var(--space-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

/* Details Content */
.details-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.details-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
  color: var(--color-heading);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-md);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.detail-item .label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.detail-item .mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  word-break: break-all;
}

.status-badge {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.status-badge.completed {
  background: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.status-badge.failed {
  background: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

.status-badge.processing {
  background: rgba(66, 133, 244, 0.1);
  color: var(--color-info);
}

.status-badge.queued {
  background: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

/* Timeline */
.timeline {
  position: relative;
  padding-left: var(--space-xl);
}

.timeline::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border);
}

.timeline-item {
  position: relative;
  padding-bottom: var(--space-lg);
}

.timeline-marker {
  position: absolute;
  left: -26px;
  top: 5px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
}

.timeline-marker.success {
  border-color: var(--color-success);
  background: var(--color-success);
}

.timeline-marker.error {
  border-color: var(--color-error);
  background: var(--color-error);
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.timeline-content strong {
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.timeline-content span {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Receipt */
.receipt-content {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}

.receipt-content pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Logs */
.logs-container {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  max-height: 500px;
  overflow-y: auto;
}

.empty-logs {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
}

.empty-logs svg {
  font-size: 2rem;
  margin-bottom: var(--space-sm);
  opacity: 0.5;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.log-entry {
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  border-left: 3px solid transparent;
}

.log-entry.log-info {
  background: rgba(66, 133, 244, 0.05);
  border-left-color: var(--color-info);
}

.log-entry.log-success {
  background: rgba(52, 168, 83, 0.05);
  border-left-color: var(--color-success);
}

.log-entry.log-warning {
  background: rgba(251, 188, 4, 0.05);
  border-left-color: var(--color-warning);
}

.log-entry.log-error {
  background: rgba(234, 67, 53, 0.05);
  border-left-color: var(--color-error);
}

.log-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xs);
}

.log-time {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.log-level {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.log-level.info {
  background: var(--color-info);
  color: white;
}

.log-level.success {
  background: var(--color-success);
  color: white;
}

.log-level.warning {
  background: var(--color-warning);
  color: white;
}

.log-level.error {
  background: var(--color-error);
  color: white;
}

.log-step {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.log-message {
  font-size: var(--text-sm);
  color: var(--color-text);
  margin-bottom: var(--space-xs);
}

.log-details {
  margin-top: var(--space-xs);
  padding: var(--space-xs);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.log-details pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.log-duration {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-xs);
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: var(--space-md);
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters {
    flex-direction: column;
  }
  
  .delivery-meta {
    grid-template-columns: 1fr;
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>