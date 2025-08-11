<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { db } from '../firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'

const router = useRouter()
const { userProfile, logout } = useAuth()

// Dashboard data
const stats = ref({
  totalReleases: 0,
  pendingDeliveries: 0,
  successfulDeliveries: 0,
  failedDeliveries: 0
})

const recentActivity = ref([])
const isLoading = ref(true)

// Computed greeting
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const displayName = computed(() => {
  return userProfile.value?.organizationName || userProfile.value?.displayName || 'there'
})

// Load dashboard data
const loadDashboardData = async () => {
  if (!userProfile.value) return
  
  try {
    // For now, we'll use mock data since we don't have releases yet
    // In production, this would fetch real data from Firestore
    
    // Simulate loading real data
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Mock stats (replace with real Firestore queries)
    stats.value = {
      totalReleases: 12,
      pendingDeliveries: 3,
      successfulDeliveries: 45,
      failedDeliveries: 2
    }
    
    // Mock recent activity
    recentActivity.value = [
      {
        id: '1',
        type: 'release_created',
        title: 'New release created',
        description: 'Summer Vibes EP',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'success'
      },
      {
        id: '2',
        type: 'delivery_completed',
        title: 'Delivery completed',
        description: 'Delivered to Spotify',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        status: 'success'
      },
      {
        id: '3',
        type: 'delivery_failed',
        title: 'Delivery failed',
        description: 'Failed to deliver to Apple Music',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: 'error'
      }
    ]
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  } finally {
    isLoading.value = false
  }
}

// Format timestamp
const formatTime = (date) => {
  const now = new Date()
  const diff = now - date
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

// Get icon for activity type
const getActivityIcon = (type) => {
  switch (type) {
    case 'release_created':
      return 'plus'
    case 'delivery_completed':
      return 'check'
    case 'delivery_failed':
      return 'times'
    default:
      return 'music'
  }
}

// Get color class for status
const getStatusClass = (status) => {
  switch (status) {
    case 'success':
      return 'text-success'
    case 'error':
      return 'text-error'
    case 'warning':
      return 'text-warning'
    default:
      return 'text-info'
  }
}

// Quick actions
const navigateToNewRelease = () => {
  router.push('/releases/new')
}

const navigateToReleases = () => {
  router.push('/releases')
}

const navigateToDeliveries = () => {
  router.push('/deliveries')
}

const navigateToSettings = () => {
  router.push('/settings')
}

onMounted(() => {
  loadDashboardData()
})
</script>

<template>
  <div class="dashboard">
    <div class="container">
      <!-- Welcome Header -->
      <div class="dashboard-header">
        <div>
          <h1 class="dashboard-title">{{ greeting }}, {{ displayName }}!</h1>
          <p class="dashboard-subtitle">Here's what's happening with your music distribution</p>
        </div>
        <div class="header-actions">
          <button @click="navigateToNewRelease" class="btn btn-primary">
            <font-awesome-icon icon="plus" />
            New Release
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>

      <!-- Dashboard Content -->
      <template v-else>
        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card card">
            <div class="card-body">
              <div class="stat-icon">
                <font-awesome-icon icon="music" />
              </div>
              <div class="stat-content">
                <h3 class="stat-value">{{ stats.totalReleases }}</h3>
                <p class="stat-label">Total Releases</p>
              </div>
            </div>
          </div>

          <div class="stat-card card">
            <div class="card-body">
              <div class="stat-icon warning">
                <font-awesome-icon icon="truck" />
              </div>
              <div class="stat-content">
                <h3 class="stat-value">{{ stats.pendingDeliveries }}</h3>
                <p class="stat-label">Pending Deliveries</p>
              </div>
            </div>
          </div>

          <div class="stat-card card">
            <div class="card-body">
              <div class="stat-icon success">
                <font-awesome-icon icon="check-circle" />
              </div>
              <div class="stat-content">
                <h3 class="stat-value">{{ stats.successfulDeliveries }}</h3>
                <p class="stat-label">Successful Deliveries</p>
              </div>
            </div>
          </div>

          <div class="stat-card card">
            <div class="card-body">
              <div class="stat-icon error">
                <font-awesome-icon icon="times" />
              </div>
              <div class="stat-content">
                <h3 class="stat-value">{{ stats.failedDeliveries }}</h3>
                <p class="stat-label">Failed Deliveries</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="content-grid">
          <!-- Recent Activity -->
          <div class="activity-section">
            <div class="card">
              <div class="card-header">
                <h2 class="section-title">Recent Activity</h2>
                <button @click="loadDashboardData" class="btn-icon" title="Refresh">
                  <font-awesome-icon icon="sync" />
                </button>
              </div>
              <div class="card-body">
                <div v-if="recentActivity.length === 0" class="empty-state">
                  <font-awesome-icon icon="music" class="empty-icon" />
                  <p>No recent activity</p>
                  <button @click="navigateToNewRelease" class="btn btn-primary btn-sm">
                    Create Your First Release
                  </button>
                </div>
                <div v-else class="activity-list">
                  <div v-for="activity in recentActivity" :key="activity.id" class="activity-item">
                    <div class="activity-icon" :class="getStatusClass(activity.status)">
                      <font-awesome-icon :icon="getActivityIcon(activity.type)" />
                    </div>
                    <div class="activity-content">
                      <h4 class="activity-title">{{ activity.title }}</h4>
                      <p class="activity-description">{{ activity.description }}</p>
                      <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <div class="card">
              <div class="card-header">
                <h2 class="section-title">Quick Actions</h2>
              </div>
              <div class="card-body">
                <div class="action-grid">
                  <button @click="navigateToNewRelease" class="action-button">
                    <font-awesome-icon icon="plus" class="action-icon" />
                    <span>New Release</span>
                  </button>
                  <button @click="navigateToReleases" class="action-button">
                    <font-awesome-icon icon="music" class="action-icon" />
                    <span>View Catalog</span>
                  </button>
                  <button @click="navigateToDeliveries" class="action-button">
                    <font-awesome-icon icon="truck" class="action-icon" />
                    <span>Deliveries</span>
                  </button>
                  <button @click="navigateToSettings" class="action-button">
                    <font-awesome-icon icon="cog" class="action-icon" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Getting Started Guide -->
            <div class="card">
              <div class="card-header">
                <h2 class="section-title">Getting Started</h2>
              </div>
              <div class="card-body">
                <div class="checklist">
                  <div class="checklist-item completed">
                    <font-awesome-icon icon="check-circle" class="check-icon" />
                    <span>Create your account</span>
                  </div>
                  <div class="checklist-item">
                    <font-awesome-icon icon="circle" class="check-icon" />
                    <span>Configure delivery targets</span>
                  </div>
                  <div class="checklist-item">
                    <font-awesome-icon icon="circle" class="check-icon" />
                    <span>Upload your first release</span>
                  </div>
                  <div class="checklist-item">
                    <font-awesome-icon icon="circle" class="check-icon" />
                    <span>Send your first delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.dashboard-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.dashboard-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
  background-color: var(--color-primary-light);
  color: var(--color-primary);
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

.stat-icon.warning {
  background-color: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
}

.stat-icon.error {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.stat-label {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--space-lg);
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

/* Section Headers */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
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

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.activity-item {
  display: flex;
  gap: var(--space-md);
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background-color: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: var(--font-medium);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.activity-description {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-xs);
}

.activity-time {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

/* Quick Actions */
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base);
  gap: var(--space-sm);
}

.action-button:hover {
  background-color: var(--color-bg);
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-icon {
  font-size: 1.5rem;
  color: var(--color-primary);
}

.action-button span {
  font-weight: var(--font-medium);
  color: var(--color-text);
}

/* Checklist */
.checklist {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-text-secondary);
}

.checklist-item.completed {
  color: var(--color-text);
}

.checklist-item .check-icon {
  color: var(--color-border);
}

.checklist-item.completed .check-icon {
  color: var(--color-success);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
  color: var(--color-border);
  margin-bottom: var(--space-md);
}

.empty-state p {
  margin-bottom: var(--space-lg);
}
</style>