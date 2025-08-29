<!-- src/components/TestStatus.vue -->
<template>
  <div class="test-status-wrapper">
    <font-awesome-icon 
      v-if="status === 'passed'" 
      icon="check-circle" 
      class="status-icon passed"
    />
    <font-awesome-icon 
      v-else-if="status === 'failed'" 
      icon="times-circle" 
      class="status-icon failed"
    />
    <font-awesome-icon 
      v-else-if="status === 'warning'" 
      icon="exclamation-triangle" 
      class="status-icon warning"
    />
    <font-awesome-icon 
      v-else-if="status === 'running'" 
      icon="spinner" 
      spin
      class="status-icon running"
    />
    <span v-else class="status-icon pending">—</span>
    
    <span v-if="duration" class="test-duration">{{ duration }}ms</span>
    <span v-if="details" class="test-details">{{ details }}</span>
    <span v-if="error" class="test-error">{{ error }}</span>
  </div>
</template>

<script setup>
defineProps(['status', 'duration', 'details', 'error'])
</script>

<style scoped>
.test-status-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.status-icon {
  font-size: 20px;
}

.status-icon.passed { color: var(--color-success); }
.status-icon.failed { color: var(--color-error); }
.status-icon.warning { color: var(--color-warning); }
.status-icon.running { color: var(--color-info); }
.status-icon.pending { 
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.test-duration,
.test-details,
.test-pending {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.test-error {
  font-size: var(--text-sm);
  color: var(--color-error);
}
</style>