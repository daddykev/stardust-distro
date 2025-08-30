<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import batchService from '../services/batch'

const router = useRouter()
const { user } = useAuth()

// State
const batches = ref([])
const isLoading = ref(false)
const error = ref(null)
const showNewBatchModal = ref(false)
const newBatchName = ref('')
const newBatchDescription = ref('')
const selectedBatch = ref(null)
const showDeleteConfirm = ref(false)

// Computed
const activeBatches = computed(() => 
  batches.value.filter(b => b.status === 'active')
)

const archivedBatches = computed(() => 
  batches.value.filter(b => b.status === 'archived')
)

// Methods
const loadBatches = async () => {
  if (!user.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    batches.value = await batchService.getUserBatches(user.value.uid)
  } catch (err) {
    console.error('Error loading batches:', err)
    error.value = 'Failed to load batches'
  } finally {
    isLoading.value = false
  }
}

const createNewBatch = async () => {
  if (!newBatchName.value.trim()) {
    error.value = 'Please enter a batch name'
    return
  }
  
  isLoading.value = true
  error.value = null
  
  try {
    const batch = await batchService.createBatch(user.value.uid, {
      name: newBatchName.value,
      description: newBatchDescription.value,
      sourceType: 'manual'
    })
    
    // Navigate to migration with the new batch
    router.push(`/migration?batchId=${batch.id}`)
  } catch (err) {
    console.error('Error creating batch:', err)
    error.value = 'Failed to create batch'
  } finally {
    isLoading.value = false
  }
}

const openBatch = (batch) => {
  router.push(`/migration?batchId=${batch.id}`)
}

const confirmDeleteBatch = (batch) => {
  selectedBatch.value = batch
  showDeleteConfirm.value = true
}

const deleteBatch = async () => {
  if (!selectedBatch.value) return
  
  isLoading.value = true
  
  try {
    await batchService.deleteBatch(selectedBatch.value.id)
    await loadBatches()
    showDeleteConfirm.value = false
    selectedBatch.value = null
  } catch (err) {
    console.error('Error deleting batch:', err)
    error.value = 'Failed to delete batch'
  } finally {
    isLoading.value = false
  }
}

const archiveBatch = async (batch) => {
  try {
    await batchService.archiveBatch(batch.id)
    await loadBatches()
  } catch (err) {
    console.error('Error archiving batch:', err)
    error.value = 'Failed to archive batch'
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getBatchStatusColor = (status) => {
  const colors = {
    active: 'badge-info',
    processing: 'badge-warning',
    completed: 'badge-success',
    archived: 'badge-secondary'
  }
  return colors[status] || 'badge-secondary'
}

const getBatchProgress = (stats) => {
  if (!stats || stats.totalReleases === 0) return 0
  return Math.round((stats.completeReleases / stats.totalReleases) * 100)
}

// Lifecycle
onMounted(() => {
  loadBatches()
})
</script>

<template>
  <div class="batch-manager section">
    <div class="container">
      <!-- Header -->
      <div class="batch-header flex justify-between items-center mb-xl">
        <div>
          <h1 class="text-3xl font-bold mb-xs">Import Batches</h1>
          <p class="text-lg text-secondary">
            Manage your catalog import batches
          </p>
        </div>
        <div class="flex gap-md">
          <button 
            @click="loadBatches" 
            class="btn btn-secondary"
            :disabled="isLoading"
          >
            <font-awesome-icon icon="sync" :spin="isLoading" />
            Refresh
          </button>
          <button 
            @click="showNewBatchModal = true" 
            class="btn btn-primary"
          >
            <font-awesome-icon icon="plus" />
            New Batch
          </button>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="error-banner flex items-center gap-sm p-md mb-lg rounded-lg">
        <font-awesome-icon icon="exclamation-triangle" />
        <span>{{ error }}</span>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && batches.length === 0" class="text-center p-3xl">
        <font-awesome-icon icon="spinner" spin class="text-3xl text-primary mb-md" />
        <p class="text-secondary">Loading batches...</p>
      </div>

      <!-- Active Batches -->
      <div v-if="activeBatches.length > 0" class="mb-xl">
        <h2 class="text-xl font-semibold mb-lg">Active Batches</h2>
        <div class="grid grid-cols-1 gap-lg">
          <div 
            v-for="batch in activeBatches" 
            :key="batch.id"
            class="batch-card card card-hover p-lg cursor-pointer"
            @click="openBatch(batch)"
          >
            <div class="flex justify-between items-start mb-md">
              <div>
                <h3 class="text-lg font-semibold mb-xs">{{ batch.name }}</h3>
                <p v-if="batch.description" class="text-sm text-secondary">
                  {{ batch.description }}
                </p>
              </div>
              <span class="badge" :class="getBatchStatusColor(batch.status)">
                {{ batch.status }}
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="progress-section mb-md">
              <div class="flex justify-between text-sm text-secondary mb-xs">
                <span>Progress</span>
                <span>{{ getBatchProgress(batch.stats) }}%</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill"
                  :style="{ width: `${getBatchProgress(batch.stats)}%` }"
                ></div>
              </div>
            </div>

            <!-- Stats -->
            <div class="batch-stats grid grid-cols-4 gap-md mb-md">
              <div class="stat-item">
                <div class="stat-value">{{ batch.stats?.totalReleases || 0 }}</div>
                <div class="stat-label">Total</div>
              </div>
              <div class="stat-item">
                <div class="stat-value text-success">{{ batch.stats?.completeReleases || 0 }}</div>
                <div class="stat-label">Complete</div>
              </div>
              <div class="stat-item">
                <div class="stat-value text-warning">{{ batch.stats?.incompleteReleases || 0 }}</div>
                <div class="stat-label">Incomplete</div>
              </div>
              <div class="stat-item">
                <div class="stat-value text-info">{{ batch.stats?.catalogedReleases || 0 }}</div>
                <div class="stat-label">Cataloged</div>
              </div>
            </div>

            <!-- Metadata -->
            <div class="batch-metadata flex justify-between items-center text-sm text-secondary">
              <span>Created {{ formatDate(batch.createdAt) }}</span>
              <div class="batch-actions flex gap-sm" @click.stop>
                <button 
                  @click.stop="archiveBatch(batch)"
                  class="btn-icon"
                  title="Archive"
                >
                  <font-awesome-icon icon="box" />
                </button>
                <button 
                  @click.stop="confirmDeleteBatch(batch)"
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

      <!-- Archived Batches -->
      <div v-if="archivedBatches.length > 0">
        <h2 class="text-xl font-semibold mb-lg">Archived Batches</h2>
        <div class="grid grid-cols-1 gap-md">
          <div 
            v-for="batch in archivedBatches" 
            :key="batch.id"
            class="batch-card-archived card p-md opacity-75"
          >
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-semibold">{{ batch.name }}</h4>
                <p class="text-sm text-secondary">
                  {{ batch.stats?.totalReleases || 0 }} releases • 
                  Archived {{ formatDate(batch.archivedAt) }}
                </p>
              </div>
              <button 
                @click="confirmDeleteBatch(batch)"
                class="btn-icon text-error"
                title="Delete"
              >
                <font-awesome-icon icon="trash" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!isLoading && batches.length === 0" class="empty-state card p-3xl text-center">
        <font-awesome-icon icon="file-import" class="text-5xl text-border mb-lg" />
        <h2 class="text-2xl font-semibold mb-md">No Import Batches Yet</h2>
        <p class="text-secondary mb-lg">
          Create your first batch to start importing releases
        </p>
        <button @click="showNewBatchModal = true" class="btn btn-primary">
          <font-awesome-icon icon="plus" />
          Create Your First Batch
        </button>
      </div>

      <!-- New Batch Modal -->
      <div v-if="showNewBatchModal" class="modal-overlay" @click.self="showNewBatchModal = false">
        <div class="modal">
          <div class="modal-header">
            <h3>Create New Batch</h3>
            <button @click="showNewBatchModal = false" class="btn-icon">
              <font-awesome-icon icon="times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Batch Name</label>
              <input 
                v-model="newBatchName"
                type="text"
                class="form-input"
                placeholder="e.g., Q1 2025 Releases"
                @keyup.enter="createNewBatch"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Description (Optional)</label>
              <textarea 
                v-model="newBatchDescription"
                class="form-textarea"
                rows="3"
                placeholder="Add notes about this batch..."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showNewBatchModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button 
              @click="createNewBatch"
              class="btn btn-primary"
              :disabled="!newBatchName.trim() || isLoading"
            >
              <font-awesome-icon v-if="isLoading" icon="spinner" spin />
              <span v-else>Create & Start Import</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal">
          <div class="modal-header">
            <h3>Delete Batch</h3>
            <button @click="showDeleteConfirm = false" class="btn-icon">
              <font-awesome-icon icon="times" />
            </button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this batch?</p>
            <div class="batch-info p-md bg-secondary rounded-md mt-md">
              <strong>{{ selectedBatch?.name }}</strong>
              <p class="text-sm text-secondary mt-xs">
                {{ selectedBatch?.stats?.totalReleases || 0 }} releases will be removed
              </p>
            </div>
            <p class="warning-text mt-md">
              <font-awesome-icon icon="exclamation-triangle" />
              This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button @click="showDeleteConfirm = false" class="btn btn-secondary">
              Cancel
            </button>
            <button 
              @click="deleteBatch"
              class="btn btn-error"
              :disabled="isLoading"
            >
              <font-awesome-icon v-if="isLoading" icon="spinner" spin />
              <font-awesome-icon v-else icon="trash" />
              Delete Batch
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Batch Cards */
.batch-card {
  transition: all var(--transition-base);
  cursor: pointer;
}

.batch-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.batch-card-archived {
  background-color: var(--color-bg-secondary);
}

/* Progress Bar */
.progress-bar {
  height: 6px;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-success));
  transition: width var(--transition-base);
}

/* Stats Grid */
.batch-stats {
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-xs);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

/* Batch Actions */
.batch-actions {
  opacity: 0.7;
  transition: opacity var(--transition-base);
}

.batch-card:hover .batch-actions {
  opacity: 1;
}

/* Error Banner */
.error-banner {
  background-color: rgba(234, 67, 53, 0.1);
  border: 1px solid var(--color-error);
  color: var(--color-error);
}

/* Warning Text */
.warning-text {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-warning);
  background-color: rgba(251, 188, 4, 0.1);
  padding: var(--space-md);
  border-radius: var(--radius-md);
}

/* Badge */
.badge {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
}

.badge-info {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-warning {
  background-color: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

.badge-success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.badge-secondary {
  background-color: var(--color-bg-secondary);
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

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

/* Button Icon */
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
</style>