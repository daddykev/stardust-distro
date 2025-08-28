<template>
  <div class="not-found">
    <div class="container">
      <div class="content">
        <div class="icon">
          <font-awesome-icon icon="exclamation-triangle" />
        </div>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div class="actions">
          <router-link to="/" class="btn btn-primary">
            Go Home
          </router-link>
          <router-link to="/dashboard" class="btn btn-secondary">
            Go to Dashboard
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
}

.content {
  text-align: center;
  max-width: 500px;
}

.icon {
  font-size: 4rem;
  color: var(--color-warning);
  margin-bottom: var(--space-lg);
}

h1 {
  font-size: 6rem;
  font-weight: var(--font-bold);
  color: var(--color-primary);
  margin-bottom: var(--space-md);
  line-height: 1;
}

h2 {
  font-size: var(--text-2xl);
  color: var(--color-heading);
  margin-bottom: var(--space-md);
}

p {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xl);
  font-size: var(--text-lg);
}

.actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
}
</style>