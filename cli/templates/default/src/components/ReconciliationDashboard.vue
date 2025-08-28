<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import receiptService from '../services/receipts'

const { user } = useAuth()

// State
const receipts = ref([])
const isLoading = ref(false)
const selectedDateRange = ref('last30days')
const customDateRange = ref({
  startDate: null,
  endDate: null
})
const selectedTarget = ref('all')
const selectedStatus = ref('all')
const showUnacknowledgedOnly = ref(false)
const reconciliationReport = ref(null)

// Available filters
const dateRanges = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' }
]

// Computed
const dateRange = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (selectedDateRange.value) {
    case 'today':
      return {
        startDate: today,
        endDate: now
      }
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        startDate: yesterday,
        endDate: today
      }
    case 'last7days':
      const week = new Date(today)
      week.setDate(week.getDate() - 7)
      return {
        startDate: week,
        endDate: now
      }
    case 'last30days':
      const month = new Date(today)
      month.setDate(month.getDate() - 30)
      return {
        startDate: month,
        endDate: now
      }
    case 'thisMonth':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now
      }
    case 'lastMonth':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        startDate: lastMonth,
        endDate: lastMonthEnd
      }
    case 'custom':
      return customDateRange.value
    default:
      return {
        startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now
      }
  }
})

const filteredReceipts = computed(() => {
  let filtered = receipts.value
  
  if (selectedTarget.value !== 'all') {
    filtered = filtered.filter(r => r.targetId === selectedTarget.value)
  }
  
  if (selectedStatus.value !== 'all') {
    filtered = filtered.filter(r => r.status === selectedStatus.value)
  }
  
  if (showUnacknowledgedOnly.value) {
    filtered = filtered.filter(r => !r.acknowledgment?.acknowledged && r.status === 'completed')
  }
  
  return filtered
})

const uniqueTargets = computed(() => {
  const targets = new Set()
  receipts.value.forEach(r => {
    if (r.targetName) {
      targets.add({ id: r.targetId, name: r.targetName })
    }
  })
  return Array.from(targets)
})

const summaryStats = computed(() => {
  const stats = {
    total: filteredReceipts.value.length,
    successful: filteredReceipts.value.filter(r => r.status === 'completed').length,
    failed: filteredReceipts.value.filter(r => r.status === 'failed').length,
    acknowledged: filteredReceipts.value.filter(r => r.acknowledgment?.acknowledged).length,
    unacknowledged: filteredReceipts.value.filter(r => !r.acknowledgment?.acknowledged && r.status === 'completed').length
  }
  
  stats.successRate = stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0
  stats.acknowledgmentRate = stats.successful > 0 ? Math.round((stats.acknowledged / stats.successful) * 100) : 0
  
  return stats
})

// Methods
const loadReceipts = async () => {
  if (!user.value) return
  
  isLoading.value = true
  
  try {
    const filters = {
      ...dateRange.value,
      status: selectedStatus.value === 'all' ? null : selectedStatus.value,
      targetId: selectedTarget.value === 'all' ? null : selectedTarget.value,
      acknowledged: showUnacknowledgedOnly.value ? false : undefined
    }
    
    receipts.value = await receiptService.getReceiptsForReconciliation(user.value.uid, filters)
    
    // Generate report
    reconciliationReport.value = await receiptService.generateReconciliationReport(
      user.value.uid,
      dateRange.value
    )
  } catch (error) {
    console.error('Error loading receipts:', error)
  } finally {
    isLoading.value = false
  }
}

const exportReceipts = () => {
  const fileName = `reconciliation_${selectedDateRange.value}_${Date.now()}`
  receiptService.exportReceipts(filteredReceipts.value, fileName)
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  if (date.toDate) date = date.toDate()
  return new Date(date).toLocaleString()
}

const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

const viewReceiptDetails = (receipt) => {
  // Could open a modal with full receipt details
  console.log('View receipt:', receipt)
}

const resendToTarget = async (receipt) => {
  // Trigger a re-delivery
  console.log('Resend to target:', receipt)
}

// Watchers
watch([selectedDateRange, selectedTarget, selectedStatus, showUnacknowledgedOnly], () => {
  loadReceipts()
})

// Lifecycle
onMounted(() => {
  loadReceipts()
})
</script>

<template>
  <div class="reconciliation-dashboard">
    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <label>Date Range</label>
        <select v-model="selectedDateRange" class="form-select">
          <option v-for="range in dateRanges" :key="range.value" :value="range.value">
            {{ range.label }}
          </option>
        </select>
      </div>
      
      <div v-if="selectedDateRange === 'custom'" class="filter-group">
        <label>Start Date</label>
        <input 
          v-model="customDateRange.startDate" 
          type="date" 
          class="form-input"
        />
      </div>
      
      <div v-if="selectedDateRange === 'custom'" class="filter-group">
        <label>End Date</label>
        <input 
          v-model="customDateRange.endDate" 
          type="date" 
          class="form-input"
        />
      </div>
      
      <div class="filter-group">
        <label>Target</label>
        <select v-model="selectedTarget" class="form-select">
          <option value="all">All Targets</option>
          <option v-for="target in uniqueTargets" :key="target.id" :value="target.id">
            {{ target.name }}
          </option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>Status</label>
        <select v-model="selectedStatus" class="form-select">
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      
      <div class="filter-group checkbox-group">
        <label>
          <input 
            type="checkbox" 
            v-model="showUnacknowledgedOnly"
          />
          Unacknowledged Only
        </label>
      </div>
      
      <button @click="exportReceipts" class="btn btn-secondary">
        <font-awesome-icon icon="download" />
        Export
      </button>
    </div>
    
    <!-- Summary Stats -->
    <div class="summary-cards">
      <div class="stat-card">
        <div class="stat-value">{{ summaryStats.total }}</div>
        <div class="stat-label">Total Deliveries</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value">{{ summaryStats.successRate }}%</div>
        <div class="stat-label">Success Rate</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value">{{ summaryStats.acknowledged }}</div>
        <div class="stat-label">Acknowledged</div>
      </div>
      
      <div class="stat-card warning" v-if="summaryStats.unacknowledged > 0">
        <div class="stat-value">{{ summaryStats.unacknowledged }}</div>
        <div class="stat-label">Pending Acknowledgment</div>
      </div>
    </div>
    
    <!-- Receipts Table -->
    <div class="receipts-table-container">
      <table class="receipts-table">
        <thead>
          <tr>
            <th>Date/Time</th>
            <th>Release</th>
            <th>Target</th>
            <th>Type</th>
            <th>Protocol</th>
            <th>Status</th>
            <th>Acknowledgment</th>
            <th>Files</th>
            <th>Size</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="10" class="loading-cell">
              <div class="loading-spinner"></div>
              Loading receipts...
            </td>
          </tr>
          
          <tr v-else-if="filteredReceipts.length === 0">
            <td colspan="10" class="empty-cell">
              No receipts found for selected filters
            </td>
          </tr>
          
          <tr v-else v-for="receipt in filteredReceipts" :key="receipt.id">
            <td>{{ formatDate(receipt.deliveryCompleted) }}</td>
            <td>
              <div class="release-info">
                <div>{{ receipt.releaseTitle }}</div>
                <div class="text-secondary">{{ receipt.releaseArtist }}</div>
              </div>
            </td>
            <td>{{ receipt.targetName }}</td>
            <td>
              <span class="badge" :class="`badge-${receipt.messageSubType?.toLowerCase()}`">
                {{ receipt.messageSubType }}
              </span>
            </td>
            <td>{{ receipt.targetProtocol }}</td>
            <td>
              <span class="badge" :class="receipt.status === 'completed' ? 'badge-success' : 'badge-error'">
                {{ receipt.status }}
              </span>
            </td>
            <td>
              <span v-if="receipt.acknowledgment?.acknowledged" class="badge badge-success">
                <font-awesome-icon icon="check" />
                Acknowledged
              </span>
              <span v-else-if="receipt.status === 'completed'" class="badge badge-warning">
                Pending
              </span>
              <span v-else>-</span>
            </td>
            <td>{{ receipt.filesTransferred?.totalFiles || 0 }}</td>
            <td>{{ formatBytes(receipt.filesTransferred?.totalBytes) }}</td>
            <td>
              <div class="action-buttons">
                <button 
                  @click="viewReceiptDetails(receipt)" 
                  class="btn-icon"
                  title="View Details"
                >
                  <font-awesome-icon icon="eye" />
                </button>
                <button 
                  v-if="!receipt.acknowledgment?.acknowledged && receipt.status === 'completed'"
                  @click="resendToTarget(receipt)" 
                  class="btn-icon"
                  title="Resend"
                >
                  <font-awesome-icon icon="redo" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.reconciliation-dashboard {
  padding: var(--space-lg);
}

.filters-section {
  display: flex;
  gap: var(--space-md);
  align-items: flex-end;
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.checkbox-group {
  justify-content: center;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.stat-card {
  background: var(--color-surface);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.stat-card.warning {
  background: var(--color-warning-light);
  border-color: var(--color-warning);
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

.receipts-table-container {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.receipts-table {
  width: 100%;
  border-collapse: collapse;
}

.receipts-table th {
  background: var(--color-bg-secondary);
  padding: var(--space-md);
  text-align: left;
  font-weight: var(--font-semibold);
  border-bottom: 2px solid var(--color-border);
}

.receipts-table td {
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.release-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.text-secondary {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.badge {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
}

.badge-initial {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-update {
  background: var(--color-info-light);
  color: var(--color-info);
}

.badge-takedown {
  background: var(--color-error-light);
  color: var(--color-error);
}

.badge-success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.badge-error {
  background: var(--color-error-light);
  color: var(--color-error);
}

.badge-warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.action-buttons {
  display: flex;
  gap: var(--space-sm);
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-icon:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-md);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>