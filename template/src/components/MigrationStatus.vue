<!-- src/components/MigrationStatus.vue -->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  importJob: Object,
  matchingResults: Object
})

const emit = defineEmits(['close'])

const incompleteDetails = computed(() => {
  return props.matchingResults?.incomplete || []
})

const formatDate = (date) => {
  if (!date) return 'N/A'
  const d = date.toDate ? date.toDate() : new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getMissingFiles = (match) => {
  const missing = []
  
  if (!match.matchedFiles.coverImage) {
    missing.push('Cover Image')
  }
  
  const missingAudio = match.matchedFiles.audioTracks.filter(t => t.missing)
  if (missingAudio.length > 0) {
    missing.push(`${missingAudio.length} audio file${missingAudio.length > 1 ? 's' : ''}`)
  }
  
  return missing.join(', ')
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal modal-lg">
      <div class="modal-header">
        <h3>Migration Status Details</h3>
        <button @click="emit('close')" class="btn-icon">
          <font-awesome-icon icon="times" />
        </button>
      </div>
      
      <div class="modal-body">
        <!-- Import Job Info -->
        <div v-if="importJob" class="status-section">
          <h4>Import Job Information</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Job ID:</span>
              <span class="info-value">{{ importJob.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value">{{ importJob.status }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Started:</span>
              <span class="info-value">{{ formatDate(importJob.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Last Updated:</span>
              <span class="info-value">{{ formatDate(importJob.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Incomplete Releases -->
        <div v-if="incompleteDetails.length > 0" class="status-section">
          <h4>Incomplete Releases</h4>
          <p class="section-description">
            These releases are missing files. You can upload the missing files later or edit them manually.
          </p>
          
          <div class="incomplete-list">
            <div 
              v-for="item in incompleteDetails" 
              :key="item.release.upc"
              class="incomplete-item"
            >
              <div class="item-header">
                <h5>{{ item.release.title }}</h5>
                <span class="upc">{{ item.release.upc }}</span>
              </div>
              <div class="item-details">
                <div class="detail-row">
                  <span class="detail-label">Artist:</span>
                  <span>{{ item.release.artist }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Missing Files:</span>
                  <span class="missing-files">{{ getMissingFiles(item) }}</span>
                </div>
                <div class="track-status">
                  <h6>Track Status:</h6>
                  <div class="track-list">
                    <div 
                      v-for="track in item.matchedFiles.audioTracks" 
                      :key="track.trackNumber"
                      class="track-item"
                      :class="{ missing: track.missing }"
                    >
                      <font-awesome-icon :icon="track.missing ? 'times' : 'check'" />
                      Track {{ track.trackNumber }}: {{ track.title }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="status-actions">
          <p class="action-description">
            You can continue uploading missing files or complete these releases manually in the catalog.
          </p>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="emit('close')" class="btn btn-primary">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  max-width: 800px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-lg {
  max-width: 900px;
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
}

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: var(--space-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-sm);
  color: var(--color-text-secondary);
}

/* Status Sections */
.status-section {
  margin-bottom: var(--space-xl);
}

.status-section h4 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
}

.section-description {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.info-item {
  display: flex;
  gap: var(--space-sm);
}

.info-label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.info-value {
  color: var(--color-text);
}

/* Incomplete List */
.incomplete-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.incomplete-item {
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.item-header h5 {
  font-weight: var(--font-semibold);
  font-size: var(--text-lg);
}

.upc {
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.detail-row {
  display: flex;
  gap: var(--space-sm);
}

.detail-label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  min-width: 100px;
}

.missing-files {
  color: var(--color-warning);
}

/* Track Status */
.track-status {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.track-status h6 {
  font-weight: var(--font-medium);
  margin-bottom: var(--space-sm);
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.track-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs);
  font-size: var(--text-sm);
}

.track-item.missing {
  color: var(--color-error);
}

.track-item:not(.missing) {
  color: var(--color-success);
}

/* Actions */
.status-actions {
  padding: var(--space-lg);
  background-color: var(--color-info);
  color: white;
  border-radius: var(--radius-lg);
}

.action-description {
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .modal {
    margin: var(--space-md);
    max-height: 90vh;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>