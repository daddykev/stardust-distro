<template>
  <div class="new-delivery">
    <div class="container">
      <div class="header">
        <router-link to="/deliveries" class="back-link">
          <font-awesome-icon icon="chevron-left" />
          Back to Deliveries
        </router-link>
      </div>
      
      <div class="card">
        <div class="card-body">
          <h1>Create New Delivery</h1>
          <p class="text-secondary">Select a release and delivery targets.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<style scoped>
.new-delivery {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

.header {
  margin-bottom: var(--space-xl);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-medium);
}

.back-link:hover {
  text-decoration: underline;
}

h1 {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-md);
}

.text-secondary {
  color: var(--color-text-secondary);
}
</style>