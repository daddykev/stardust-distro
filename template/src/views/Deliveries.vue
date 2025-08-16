<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import deliveryTargetService from '../services/deliveryTargets'
import { db } from '../firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  limit,
  Timestamp
} from 'firebase/firestore'

const router = useRouter()
const { user } = useAuth()

// State
const deliveries = ref([])
const deliveryTargets = ref([])
const filterStatus = ref('all')
const selectedTarget = ref('all')
const isLoading = ref(true)
const showTargetModal = ref(false)
const showDeliveryDetails = ref(false)
const selectedDelivery = ref(null)
const isProcessingAction = ref(false)

// Real-time listener
let unsubscribeDeliveries = null

// Computed
const filteredDeliveries = computed(() => {
  let filtered = [...deliveries.value]
  
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(d => d.status === filterStatus.value)
  }
  
  if (selectedTarget.value !== 'all') {
    filtered = filtered.filter(d => d.targetName === selectedTarget.value)
  }
  
  // Sort by scheduled time (most recent first)
  filtered.sort((a, b) => {
    const dateA = a.scheduledAt?.toDate ? a.scheduledAt.toDate() : new Date(a.scheduledAt)
    const dateB = b.scheduledAt?.toDate ? b.scheduledAt.toDate() : new Date(b.scheduledAt)
    return dateB - dateA
  })
  
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

const todaysDeliveries = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return deliveries.value.filter(d => {
    const deliveryDate = d.completedAt?.toDate ? d.completedAt.toDate() : 
                        d.completedAt ? new Date(d.completedAt) : null
    return deliveryDate && deliveryDate >= today
  })
})

// Methods
const loadDeliveries = () => {
  if (!user.value) return
  
  // Set up real-time listener for deliveries
  const q = query(
    collection(db, 'deliveries'),
    where('tenantId', '==', user.value.uid),
    orderBy('scheduledAt', 'desc'),
    limit(100)
  )
  
  unsubscribeDeliveries = onSnapshot(q, (snapshot) => {
    const deliveriesData = []
    snapshot.forEach((doc) => {
      deliveriesData.push({ id: doc.id, ...doc.data() })
    })
    deliveries.value = deliveriesData
    isLoading.value = false
  }, (error) => {
    console.error('Error loading deliveries:', error)
    isLoading.value = false
  })
}

const loadDeliveryTargets = async () => {
  try {
    deliveryTargets.value = await deliveryTargetService.getTenantTargets(user.value.uid)
  } catch (error) {
    console.error('Error loading delivery targets:', error)
  }
}

const retryDelivery = async (delivery) => {
  if (!confirm(`Retry delivery to ${delivery.targetName}?`)) return
  
  isProcessingAction.value = true
  try {
    // Update delivery status back to queued
    await updateDoc(doc(db, 'deliveries', delivery.id), {
      status: 'queued',
      retryCount: (delivery.retryCount || 0) + 1,
      lastRetryAt: Timestamp.now(),
      scheduledAt: Timestamp.now(), // Reschedule for immediate processing
      error: null,
      failedAt: null
    })
    
    console.log('✅ Delivery queued for retry')
    
    // The Cloud Function processDeliveryQueue will pick this up within 1 minute
    // No simulation - let the real delivery engine handle it
  } catch (error) {
    console.error('Error retrying delivery:', error)
    alert('Failed to retry delivery')
  } finally {
    isProcessingAction.value = false
  }
}

const cancelDelivery = async (delivery) => {
  if (!confirm(`Cancel delivery to ${delivery.targetName}?`)) return
  
  isProcessingAction.value = true
  try {
    await updateDoc(doc(db, 'deliveries', delivery.id), {
      status: 'cancelled',
      cancelledAt: Timestamp.now()
    })
    console.log('✅ Delivery cancelled')
  } catch (error) {
    console.error('Error cancelling delivery:', error)
    alert('Failed to cancel delivery')
  } finally {
    isProcessingAction.value = false
  }
}

const deleteDelivery = async (delivery) => {
  if (!confirm(`Delete this delivery record? This action cannot be undone.`)) return
  
  isProcessingAction.value = true
  try {
    await deleteDoc(doc(db, 'deliveries', delivery.id))
    console.log('✅ Delivery record deleted')
  } catch (error) {
    console.error('Error deleting delivery:', error)
    alert('Failed to delete delivery')
  } finally {
    isProcessingAction.value = false
  }
}

const viewDeliveryDetails = (delivery) => {
  selectedDelivery.value = delivery
  showDeliveryDetails.value = true
}

const downloadERN = (delivery) => {
  if (!delivery.ernXml) {
    alert('ERN not available for this delivery')
    return
  }
  
  const blob = new Blob([delivery.ernXml], { type: 'text/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${delivery.releaseTitle}_${delivery.targetName}_${delivery.ernMessageId}.xml`.replace(/[^a-z0-9]/gi, '_')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const downloadReceipt = (delivery) => {
  // Generate a delivery receipt
  const receipt = {
    deliveryId: delivery.id,
    releaseTitle: delivery.releaseTitle,
    targetName: delivery.targetName,
    status: delivery.status,
    completedAt: delivery.completedAt,
    messageId: delivery.ernMessageId,
    acknowledgment: delivery.receipt?.acknowledgment || 'Delivered successfully'
  }
  
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `delivery_receipt_${delivery.id}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
    case 'cancelled':
      return 'status-cancelled'
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
    case 'cancelled':
      return 'ban'
    default:
      return 'truck'
  }
}

const formatTime = (date) => {
  if (!date) return 'N/A'
  
  // Handle Firestore Timestamp
  const d = date?.toDate ? date.toDate() : 
           date?.seconds ? new Date(date.seconds * 1000) : 
           new Date(date)
  
  const now = new Date()
  const diff = Math.abs(now - d)
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (d > now) {
    if (hours < 1) return 'In a few minutes'
    if (hours < 24) return `In ${hours} hour${hours > 1 ? 's' : ''}`
    return `In ${days} day${days > 1 ? 's' : ''}`
  } else {
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}

const formatDateTime = (date) => {
  if (!date) return 'N/A'
  
  const d = date?.toDate ? date.toDate() : 
           date?.seconds ? new Date(date.seconds * 1000) : 
           new Date(date)
  
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getDuration = (start, end) => {
  if (!start || !end) return 'N/A'
  
  const startDate = start?.toDate ? start.toDate() : new Date(start)
  const endDate = end?.toDate ? end.toDate() : new Date(end)
  
  const diff = endDate - startDate
  const minutes = Math.floor(diff / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

const getProgressPercentage = (delivery) => {
  // Simulate progress based on time elapsed
  if (delivery.status !== 'processing') return 0
  
  const start = delivery.startedAt?.toDate ? delivery.startedAt.toDate() : new Date(delivery.startedAt)
  const now = new Date()
  const elapsed = now - start
  const estimatedDuration = 30000 // 30 seconds estimated
  
  return Math.min(Math.round((elapsed / estimatedDuration) * 100), 95)
}

const navigateToNewDelivery = () => {
  router.push('/deliveries/new')
}

const navigateToTargetSettings = () => {
  router.push('/settings?tab=delivery')
}

// Cleanup on unmount
onMounted(() => {
  loadDeliveries()
  loadDeliveryTargets()
  
  // Cleanup
  return () => {
    if (unsubscribeDeliveries) {
      unsubscribeDeliveries()
    }
  }
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
        <div class="header-actions">
          <button @click="navigateToTargetSettings" class="btn btn-secondary">
            <font-awesome-icon icon="cog" />
            Manage Targets
          </button>
          <button @click="navigateToNewDelivery" class="btn btn-primary">
            <font-awesome-icon icon="plus" />
            New Delivery
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-icon success">
              <font-awesome-icon icon="check-circle" />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ todaysDeliveries.length }}</div>
              <div class="stat-label">Completed Today</div>
            </div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-icon processing">
              <font-awesome-icon icon="spinner" spin />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statusCounts.processing }}</div>
              <div class="stat-label">In Progress</div>
            </div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-icon queued">
              <font-awesome-icon icon="clock" />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statusCounts.queued }}</div>
              <div class="stat-label">Queued</div>
            </div>
          </div>
        </div>
        <div class="stat-card card">
          <div class="card-body">
            <div class="stat-icon error">
              <font-awesome-icon icon="times-circle" />
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statusCounts.failed }}</div>
              <div class="stat-label">Failed</div>
            </div>
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
          <button @click="navigateToNewDelivery" class="btn btn-primary">
            Create Your First Delivery
          </button>
        </div>
      </div>

      <!-- Deliveries List -->
      <div v-else class="deliveries-list">
        <div 
          v-for="delivery in filteredDeliveries" 
          :key="delivery.id"
          class="delivery-card card"
          :class="{ 'test-mode': delivery.testMode }"
        >
          <div class="card-body">
            <div class="delivery-header">
              <div class="delivery-info">
                <h3 class="delivery-title">{{ delivery.releaseTitle }}</h3>
                <p class="delivery-artist">{{ delivery.releaseArtist }}</p>
                <div class="delivery-meta">
                  <span class="delivery-target">
                    <font-awesome-icon icon="truck" />
                    {{ delivery.targetName }}
                  </span>
                  <span class="delivery-protocol">
                    {{ delivery.targetProtocol }}
                  </span>
                  <span v-if="delivery.testMode" class="test-badge">
                    TEST
                  </span>
                  <span v-if="delivery.retryCount" class="retry-badge">
                    Retry #{{ delivery.retryCount }}
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
                <div 
                  class="progress-fill" 
                  :style="{ width: `${getProgressPercentage(delivery)}%` }"
                ></div>
              </div>
              <span class="progress-text">{{ getProgressPercentage(delivery) }}% complete</span>
            </div>

            <!-- Error Message for Failed -->
            <div v-if="delivery.status === 'failed' && delivery.error" class="delivery-error">
              <font-awesome-icon icon="exclamation-triangle" />
              {{ delivery.error }}
            </div>

            <!-- Success Message for Completed -->
            <div v-if="delivery.status === 'completed' && delivery.receipt" class="delivery-success">
              <font-awesome-icon icon="check-circle" />
              {{ delivery.receipt.acknowledgment }}
            </div>

            <div class="delivery-footer">
              <div class="delivery-time">
                <span v-if="delivery.status === 'queued'">
                  Scheduled {{ formatTime(delivery.scheduledAt) }}
                </span>
                <span v-else-if="delivery.status === 'processing'">
                  Started {{ formatTime(delivery.startedAt) }}
                </span>
                <span v-else-if="delivery.status === 'completed'">
                  Completed {{ formatTime(delivery.completedAt) }}
                  <span class="time-duration">
                    ({{ getDuration(delivery.startedAt, delivery.completedAt) }})
                  </span>
                </span>
                <span v-else-if="delivery.status === 'failed'">
                  Failed {{ formatTime(delivery.failedAt) }}
                </span>
                <span v-else-if="delivery.status === 'cancelled'">
                  Cancelled {{ formatTime(delivery.cancelledAt) }}
                </span>
              </div>
              
              <div class="delivery-actions">
                <button 
                  v-if="delivery.status === 'queued'"
                  @click="cancelDelivery(delivery)"
                  class="btn btn-secondary btn-sm"
                  :disabled="isProcessingAction"
                >
                  Cancel
                </button>
                <button 
                  v-if="delivery.status === 'failed'"
                  @click="retryDelivery(delivery)"
                  class="btn btn-primary btn-sm"
                  :disabled="isProcessingAction"
                >
                  <font-awesome-icon icon="redo" />
                  Retry
                </button>
                <button 
                  @click="viewDeliveryDetails(delivery)"
                  class="btn-icon"
                  title="View Details"
                >
                  <font-awesome-icon icon="eye" />
                </button>
                <button 
                  @click="downloadERN(delivery)"
                  class="btn-icon"
                  title="Download ERN"
                >
                  <font-awesome-icon icon="file-code" />
                </button>
                <button 
                  v-if="delivery.status === 'completed'"
                  @click="downloadReceipt(delivery)"
                  class="btn-icon"
                  title="Download Receipt"
                >
                  <font-awesome-icon icon="download" />
                </button>
                <button 
                  v-if="delivery.status === 'failed' || delivery.status === 'cancelled'"
                  @click="deleteDelivery(delivery)"
                  class="btn-icon text-error"
                  title="Delete"
                  :disabled="isProcessingAction"
                >
                  <font-awesome-icon icon="trash" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delivery Targets Section -->
      <div class="targets-section">
        <div class="section-header">
          <h2 class="section-title">Active Delivery Targets</h2>
          <router-link to="/settings?tab=delivery" class="btn btn-secondary btn-sm">
            Manage Targets
          </router-link>
        </div>
        
        <div v-if="activeTargets.length === 0" class="empty-targets">
          <p>No active delivery targets configured</p>
          <button @click="navigateToTargetSettings" class="btn btn-primary">
            Configure Targets
          </button>
        </div>
        
        <div v-else class="targets-grid">
          <div 
            v-for="target in activeTargets" 
            :key="target.id"
            class="target-card card"
          >
            <div class="card-body">
              <div class="target-header">
                <h3 class="target-name">{{ target.name }}</h3>
                <span class="target-status active">Active</span>
              </div>
              <div class="target-info">
                <span class="target-type">{{ target.type }}</span>
                <span class="target-protocol">{{ target.protocol }}</span>
                <span class="target-ern">ERN {{ target.ernVersion }}</span>
                <span v-if="target.testMode" class="target-mode">Test Mode</span>
              </div>
              <div class="target-stats">
                <span>
                  {{ deliveries.filter(d => d.targetName === target.name && d.status === 'completed').length }}
                  delivered
                </span>
                <span>
                  {{ deliveries.filter(d => d.targetName === target.name && d.status === 'queued').length }}
                  queued
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Delivery Details Modal -->
    <div v-if="showDeliveryDetails" class="modal-overlay" @click.self="showDeliveryDetails = false">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>Delivery Details</h3>
          <button @click="showDeliveryDetails = false" class="btn-icon">
            <font-awesome-icon icon="times" />
          </button>
        </div>
        <div v-if="selectedDelivery" class="modal-body">
          <div class="detail-section">
            <h4>Release Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Title:</span>
                <span>{{ selectedDelivery.releaseTitle }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Artist:</span>
                <span>{{ selectedDelivery.releaseArtist }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Release ID:</span>
                <span class="mono-text">{{ selectedDelivery.releaseId }}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Target Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Target:</span>
                <span>{{ selectedDelivery.targetName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Protocol:</span>
                <span>{{ selectedDelivery.targetProtocol }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">ERN Version:</span>
                <span>{{ selectedDelivery.ernVersion }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Message ID:</span>
                <span class="mono-text">{{ selectedDelivery.ernMessageId }}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Delivery Timeline</h4>
            <div class="timeline">
              <div class="timeline-item">
                <span class="timeline-label">Created:</span>
                <span>{{ formatDateTime(selectedDelivery.createdAt) }}</span>
              </div>
              <div class="timeline-item">
                <span class="timeline-label">Scheduled:</span>
                <span>{{ formatDateTime(selectedDelivery.scheduledAt) }}</span>
              </div>
              <div v-if="selectedDelivery.startedAt" class="timeline-item">
                <span class="timeline-label">Started:</span>
                <span>{{ formatDateTime(selectedDelivery.startedAt) }}</span>
              </div>
              <div v-if="selectedDelivery.completedAt" class="timeline-item">
                <span class="timeline-label">Completed:</span>
                <span>{{ formatDateTime(selectedDelivery.completedAt) }}</span>
              </div>
              <div v-if="selectedDelivery.failedAt" class="timeline-item">
                <span class="timeline-label">Failed:</span>
                <span>{{ formatDateTime(selectedDelivery.failedAt) }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="selectedDelivery.package" class="detail-section">
            <h4>Package Contents</h4>
            <div class="package-info">
              <p>ERN File: {{ selectedDelivery.package.ernFile }}</p>
              <p>Audio Files: {{ selectedDelivery.package.audioFiles?.length || 0 }}</p>
              <p>Image Files: {{ selectedDelivery.package.imageFiles?.length || 0 }}</p>
              <p>Total Size: {{ selectedDelivery.package.totalSize }}</p>
            </div>
          </div>
          
          <div v-if="selectedDelivery.notes" class="detail-section">
            <h4>Notes</h4>
            <p>{{ selectedDelivery.notes }}</p>
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

.header-actions {
  display: flex;
  gap: var(--space-sm);
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.stat-card .card-body {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-icon.success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.stat-icon.processing {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.stat-icon.queued {
  background-color: rgba(128, 134, 139, 0.1);
  color: var(--color-text-secondary);
}

.stat-icon.error {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

.stat-content {
  flex: 1;
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
  margin-bottom: var(--space-xl);
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

.delivery-card.test-mode {
  border-left: 4px solid var(--color-warning);
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

.delivery-artist {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
}

.delivery-meta {
  display: flex;
  gap: var(--space-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  align-items: center;
}

.delivery-meta span {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.test-badge,
.retry-badge {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
}

.test-badge {
  background-color: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

.retry-badge {
  background-color: rgba(66, 133, 244, 0.1);
  color: var(--color-info);
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

.status-cancelled {
  background-color: rgba(128, 134, 139, 0.3);
  color: var(--color-text-secondary);
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

/* Error/Success Messages */
.delivery-error,
.delivery-success {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  margin: var(--space-md) 0;
}

.delivery-error {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

.delivery-success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
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

.btn-icon.text-error:hover {
  color: var(--color-error);
}

/* Delivery Targets Section */
.targets-section {
  margin-top: var(--space-2xl);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.empty-targets {
  text-align: center;
  padding: var(--space-xl);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
}

.empty-targets p {
  margin-bottom: var(--space-md);
}

.targets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-lg);
}

.target-card {
  transition: all var(--transition-base);
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

.target-stats {
  display: flex;
  justify-content: space-between;
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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
  max-width: 700px;
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
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: var(--space-xl);
}

.detail-section h4 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
  color: var(--color-heading);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.detail-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.mono-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.timeline-item {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-left: 2px solid var(--color-border);
  padding-left: var(--space-md);
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-primary);
}

.timeline-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  min-width: 80px;
}

.package-info {
  background-color: var(--color-bg-secondary);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.package-info p {
  margin-bottom: var(--space-xs);
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    flex-direction: column;
  }
  
  .header-actions .btn {
    width: 100%;
  }
  
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
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>