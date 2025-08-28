<template>
  <div v-if="duplicateInfo" class="duplicate-warning">
    <div class="warning-header">
      <font-awesome-icon 
        :icon="duplicateInfo.type === 'exact' ? 'exclamation-triangle' : 'info-circle'" 
        :class="duplicateInfo.type === 'exact' ? 'text-warning' : 'text-info'"
      />
      <span class="warning-title">
        {{ duplicateInfo.type === 'exact' ? 'Duplicate Detected' : 'Similar File Found' }}
      </span>
      <span class="similarity-badge">
        {{ duplicateInfo.similarity.toFixed(1) }}% match
      </span>
    </div>
    
    <div class="warning-body">
      <p v-if="duplicateInfo.type === 'exact'">
        This file is an exact duplicate of an existing file in your catalog.
      </p>
      <p v-else>
        This file is similar to an existing file in your catalog.
      </p>
      
      <div class="existing-file-info">
        <strong>Existing file:</strong>
        <div class="file-details">
          <span class="file-name">{{ duplicateInfo.existingFile.fileName }}</span>
          <span class="file-size">{{ formatFileSize(duplicateInfo.existingFile.fileSize) }}</span>
          <span v-if="duplicateInfo.existingFile.createdAt" class="file-date">
            Uploaded {{ formatDate(duplicateInfo.existingFile.createdAt) }}
          </span>
        </div>
      </div>
      
      <div v-if="duplicateInfo.alternatives && duplicateInfo.alternatives.length > 1" class="alternatives">
        <details>
          <summary>View {{ duplicateInfo.alternatives.length - 1 }} other similar files</summary>
          <div class="alternatives-list">
            <div 
              v-for="(alt, index) in duplicateInfo.alternatives.slice(1, 4)" 
              :key="index"
              class="alternative-item"
            >
              <span class="file-name">{{ alt.fileName }}</span>
              <span class="similarity">{{ alt.similarity.toFixed(1) }}% similar</span>
            </div>
          </div>
        </details>
      </div>
      
      <div class="warning-actions">
        <button @click="$emit('use-existing')" class="btn btn-primary btn-sm">
          Use Existing File
        </button>
        <button @click="$emit('upload-anyway')" class="btn btn-secondary btn-sm">
          Upload Anyway
        </button>
        <button @click="$emit('cancel')" class="btn btn-secondary btn-sm">
          Cancel
        </button>
      </div>
    </div>
    
    <div v-if="showFingerprint" class="fingerprint-details">
      <h4>Fingerprint Details</h4>
      <div class="fingerprint-data">
        <div class="hash-info">
          <label>MD5:</label>
          <code>{{ duplicateInfo.fingerprint?.hashes?.md5 }}</code>
        </div>
        <div class="hash-info">
          <label>SHA-256:</label>
          <code>{{ duplicateInfo.fingerprint?.hashes?.sha256 }}</code>
        </div>
        <div v-if="duplicateInfo.fingerprint?.audioFingerprint" class="audio-info">
          <label>Audio Duration:</label>
          <span>{{ formatDuration(duplicateInfo.fingerprint.audioFingerprint.duration) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  duplicateInfo: Object,
  showFingerprint: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['use-existing', 'upload-anyway', 'cancel'])

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

const formatDate = (date) => {
  if (!date) return ''
  const d = date.toDate ? date.toDate() : new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.duplicate-warning {
  background-color: var(--color-warning-light, rgba(251, 188, 4, 0.1));
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin: var(--space-md) 0;
}

.warning-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.warning-title {
  font-weight: var(--font-semibold);
  flex: 1;
}

.similarity-badge {
  background-color: var(--color-surface);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.warning-body p {
  margin-bottom: var(--space-md);
}

.existing-file-info {
  background-color: var(--color-surface);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.file-name {
  font-weight: var(--font-medium);
  color: var(--color-heading);
}

.file-size,
.file-date {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.alternatives {
  margin: var(--space-md) 0;
}

.alternatives summary {
  cursor: pointer;
  color: var(--color-primary);
  font-size: var(--text-sm);
}

.alternatives-list {
  margin-top: var(--space-sm);
  padding-left: var(--space-lg);
}

.alternative-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  font-size: var(--text-sm);
}

.similarity {
  color: var(--color-text-secondary);
}

.warning-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.fingerprint-details {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.fingerprint-details h4 {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-sm);
  color: var(--color-text-secondary);
}

.fingerprint-data {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.hash-info,
.audio-info {
  display: flex;
  gap: var(--space-sm);
  font-size: var(--text-sm);
}

.hash-info label,
.audio-info label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  min-width: 100px;
}

.hash-info code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background-color: var(--color-surface);
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  word-break: break-all;
}

.text-warning {
  color: var(--color-warning);
}

.text-info {
  color: var(--color-info);
}
</style>