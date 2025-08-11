<template>
  <div class="release-detail">
    <div class="container">
      <div class="header">
        <router-link to="/catalog" class="back-link">
          <font-awesome-icon icon="chevron-left" />
          Back to Catalog
        </router-link>
      </div>
      
      <div class="card">
        <div class="card-body">
          <h1>Release Details</h1>
          <p>Release ID: {{ $route.params.id }}</p>
          <p class="text-secondary">This page will display detailed information about the release.</p>
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
.release-detail {
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