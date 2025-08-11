<script setup>
import { ref, computed, onMounted } from 'vue'

// Time period selection
const selectedPeriod = ref('30days')
const customDateRange = ref({
  start: '',
  end: ''
})

// Analytics data
const isLoading = ref(true)
const analyticsData = ref({
  overview: {
    totalReleases: 127,
    totalDeliveries: 892,
    successRate: 96.5,
    avgDeliveryTime: 4.2,
    activeTargets: 12,
    totalTracks: 1453
  },
  trends: {
    releases: [
      { month: 'Jan', count: 8 },
      { month: 'Feb', count: 12 },
      { month: 'Mar', count: 15 },
      { month: 'Apr', count: 11 },
      { month: 'May', count: 18 },
      { month: 'Jun', count: 22 }
    ],
    deliveries: [
      { month: 'Jan', success: 45, failed: 2 },
      { month: 'Feb', success: 67, failed: 3 },
      { month: 'Mar', success: 89, failed: 1 },
      { month: 'Apr', success: 72, failed: 4 },
      { month: 'May', success: 98, failed: 2 },
      { month: 'Jun', success: 112, failed: 3 }
    ]
  },
  topPerformers: [
    { title: 'Summer Vibes EP', artist: 'The Sunset Band', deliveries: 24, successRate: 100 },
    { title: 'Midnight Dreams', artist: 'Luna Nova', deliveries: 18, successRate: 94.4 },
    { title: 'Electric Pulse', artist: 'Digital Waves', deliveries: 15, successRate: 93.3 },
    { title: 'Ocean Waves', artist: 'Coastal Sound', deliveries: 12, successRate: 100 },
    { title: 'Urban Legends', artist: 'City Lights', deliveries: 10, successRate: 90 }
  ],
  dspPerformance: [
    { name: 'Spotify', deliveries: 234, successRate: 98.2, avgTime: 3.5 },
    { name: 'Apple Music', deliveries: 189, successRate: 97.8, avgTime: 4.1 },
    { name: 'YouTube Music', deliveries: 156, successRate: 95.5, avgTime: 5.2 },
    { name: 'Deezer', deliveries: 134, successRate: 94.0, avgTime: 4.8 },
    { name: 'Amazon Music', deliveries: 98, successRate: 96.9, avgTime: 3.9 }
  ],
  territories: [
    { code: 'US', name: 'United States', releases: 45, percentage: 35.4 },
    { code: 'GB', name: 'United Kingdom', releases: 32, percentage: 25.2 },
    { code: 'DE', name: 'Germany', releases: 18, percentage: 14.2 },
    { code: 'FR', name: 'France', releases: 15, percentage: 11.8 },
    { code: 'JP', name: 'Japan', releases: 10, percentage: 7.9 },
    { code: 'Other', name: 'Other', releases: 7, percentage: 5.5 }
  ],
  releaseTypes: [
    { type: 'Album', count: 45, percentage: 35.4 },
    { type: 'Single', count: 52, percentage: 40.9 },
    { type: 'EP', count: 28, percentage: 22.0 },
    { type: 'Compilation', count: 2, percentage: 1.6 }
  ]
})

// Computed
const periodLabel = computed(() => {
  switch (selectedPeriod.value) {
    case '7days': return 'Last 7 Days'
    case '30days': return 'Last 30 Days'
    case '90days': return 'Last 90 Days'
    case '12months': return 'Last 12 Months'
    case 'custom': return 'Custom Range'
    default: return 'Last 30 Days'
  }
})

const maxReleaseCount = computed(() => {
  return Math.max(...analyticsData.value.trends.releases.map(r => r.count))
})

const maxDeliveryCount = computed(() => {
  const deliveries = analyticsData.value.trends.deliveries
  return Math.max(...deliveries.map(d => d.success + d.failed))
})

// Methods
const loadAnalytics = async () => {
  isLoading.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    // Data is already set in ref above for demo
  } catch (error) {
    console.error('Error loading analytics:', error)
  } finally {
    isLoading.value = false
  }
}

const exportData = (format) => {
  console.log(`Exporting analytics data as ${format}`)
  // TODO: Implement export functionality
}

const getBarHeight = (value, max) => {
  return `${(value / max) * 100}%`
}

const getSuccessRateColor = (rate) => {
  if (rate >= 95) return 'text-success'
  if (rate >= 85) return 'text-warning'
  return 'text-error'
}

const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num)
}

onMounted(() => {
  loadAnalytics()
})
</script>

<template>
  <div class="analytics">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Analytics</h1>
          <p class="page-subtitle">Track your distribution performance and insights</p>
        </div>
        <div class="header-actions">
          <select v-model="selectedPeriod" class="form-select">
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="12months">Last 12 Months</option>
            <option value="custom">Custom Range</option>
          </select>
          <div class="export-menu">
            <button class="btn btn-secondary">
              <font-awesome-icon icon="download" />
              Export
            </button>
            <div class="export-dropdown">
              <button @click="exportData('csv')">Export as CSV</button>
              <button @click="exportData('pdf')">Export as PDF</button>
              <button @click="exportData('json')">Export as JSON</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading analytics data...</p>
      </div>

      <!-- Analytics Content -->
      <template v-else>
        <!-- Overview Cards -->
        <div class="overview-grid">
          <div class="overview-card card">
            <div class="card-body">
              <div class="overview-icon">
                <font-awesome-icon icon="music" />
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ formatNumber(analyticsData.overview.totalReleases) }}</div>
                <div class="overview-label">Total Releases</div>
                <div class="overview-change positive">
                  <font-awesome-icon icon="arrow-up" />
                  12% from last period
                </div>
              </div>
            </div>
          </div>

          <div class="overview-card card">
            <div class="card-body">
              <div class="overview-icon">
                <font-awesome-icon icon="truck" />
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ formatNumber(analyticsData.overview.totalDeliveries) }}</div>
                <div class="overview-label">Total Deliveries</div>
                <div class="overview-change positive">
                  <font-awesome-icon icon="arrow-up" />
                  8% from last period
                </div>
              </div>
            </div>
          </div>

          <div class="overview-card card">
            <div class="card-body">
              <div class="overview-icon success">
                <font-awesome-icon icon="check-circle" />
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ analyticsData.overview.successRate }}%</div>
                <div class="overview-label">Success Rate</div>
                <div class="overview-change positive">
                  <font-awesome-icon icon="arrow-up" />
                  2.5% improvement
                </div>
              </div>
            </div>
          </div>

          <div class="overview-card card">
            <div class="card-body">
              <div class="overview-icon">
                <font-awesome-icon icon="clock" />
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ analyticsData.overview.avgDeliveryTime }} min</div>
                <div class="overview-label">Avg Delivery Time</div>
                <div class="overview-change negative">
                  <font-awesome-icon icon="arrow-up" />
                  0.3 min increase
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="charts-grid">
          <!-- Release Trends -->
          <div class="chart-card card">
            <div class="card-header">
              <h2 class="chart-title">Release Trends</h2>
              <span class="chart-period">{{ periodLabel }}</span>
            </div>
            <div class="card-body">
              <div class="bar-chart">
                <div class="chart-bars">
                  <div 
                    v-for="item in analyticsData.trends.releases" 
                    :key="item.month"
                    class="bar-group"
                  >
                    <div class="bar-container">
                      <div 
                        class="bar bar-primary"
                        :style="{ height: getBarHeight(item.count, maxReleaseCount) }"
                      >
                        <span class="bar-value">{{ item.count }}</span>
                      </div>
                    </div>
                    <span class="bar-label">{{ item.month }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Delivery Performance -->
          <div class="chart-card card">
            <div class="card-header">
              <h2 class="chart-title">Delivery Performance</h2>
              <span class="chart-period">{{ periodLabel }}</span>
            </div>
            <div class="card-body">
              <div class="bar-chart">
                <div class="chart-bars">
                  <div 
                    v-for="item in analyticsData.trends.deliveries" 
                    :key="item.month"
                    class="bar-group"
                  >
                    <div class="bar-container stacked">
                      <div 
                        class="bar bar-success"
                        :style="{ height: getBarHeight(item.success, maxDeliveryCount) }"
                      >
                        <span class="bar-value">{{ item.success }}</span>
                      </div>
                      <div 
                        class="bar bar-error"
                        :style="{ height: getBarHeight(item.failed, maxDeliveryCount) }"
                      >
                        <span class="bar-value" v-if="item.failed > 0">{{ item.failed }}</span>
                      </div>
                    </div>
                    <span class="bar-label">{{ item.month }}</span>
                  </div>
                </div>
                <div class="chart-legend">
                  <div class="legend-item">
                    <span class="legend-color success"></span>
                    <span>Successful</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-color error"></span>
                    <span>Failed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Performance Tables -->
        <div class="tables-grid">
          <!-- Top Performing Releases -->
          <div class="table-card card">
            <div class="card-header">
              <h2 class="section-title">Top Performing Releases</h2>
            </div>
            <div class="card-body">
              <div class="performance-table">
                <div class="table-header">
                  <span>Release</span>
                  <span>Deliveries</span>
                  <span>Success Rate</span>
                </div>
                <div 
                  v-for="release in analyticsData.topPerformers" 
                  :key="release.title"
                  class="table-row"
                >
                  <div class="release-info">
                    <div class="release-title">{{ release.title }}</div>
                    <div class="release-artist">{{ release.artist }}</div>
                  </div>
                  <span class="table-value">{{ release.deliveries }}</span>
                  <span class="table-value" :class="getSuccessRateColor(release.successRate)">
                    {{ release.successRate }}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- DSP Performance -->
          <div class="table-card card">
            <div class="card-header">
              <h2 class="section-title">DSP Performance</h2>
            </div>
            <div class="card-body">
              <div class="performance-table">
                <div class="table-header">
                  <span>Platform</span>
                  <span>Deliveries</span>
                  <span>Success</span>
                  <span>Avg Time</span>
                </div>
                <div 
                  v-for="dsp in analyticsData.dspPerformance" 
                  :key="dsp.name"
                  class="table-row"
                >
                  <span class="dsp-name">
                    <font-awesome-icon :icon="['fab', 'spotify']" />
                    {{ dsp.name }}
                  </span>
                  <span class="table-value">{{ dsp.deliveries }}</span>
                  <span class="table-value" :class="getSuccessRateColor(dsp.successRate)">
                    {{ dsp.successRate }}%
                  </span>
                  <span class="table-value">{{ dsp.avgTime }}m</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Distribution Insights -->
        <div class="insights-grid">
          <!-- Territory Distribution -->
          <div class="insight-card card">
            <div class="card-header">
              <h2 class="section-title">Territory Distribution</h2>
            </div>
            <div class="card-body">
              <div class="territory-list">
                <div 
                  v-for="territory in analyticsData.territories" 
                  :key="territory.code"
                  class="territory-item"
                >
                  <div class="territory-info">
                    <span class="territory-flag">{{ territory.code }}</span>
                    <span class="territory-name">{{ territory.name }}</span>
                  </div>
                  <div class="territory-stats">
                    <span class="territory-count">{{ territory.releases }} releases</span>
                    <div class="territory-bar">
                      <div 
                        class="territory-fill"
                        :style="{ width: `${territory.percentage}%` }"
                      ></div>
                    </div>
                    <span class="territory-percentage">{{ territory.percentage }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Release Types -->
          <div class="insight-card card">
            <div class="card-header">
              <h2 class="section-title">Release Types</h2>
            </div>
            <div class="card-body">
              <div class="type-chart">
                <div class="donut-placeholder">
                  <div class="donut-center">
                    <div class="donut-value">{{ analyticsData.overview.totalReleases }}</div>
                    <div class="donut-label">Total</div>
                  </div>
                  <!-- Mock donut chart segments -->
                  <svg class="donut-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-primary)" stroke-width="15" stroke-dasharray="141.3 251.3" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-secondary)" stroke-width="15" stroke-dasharray="102.8 251.3" stroke-dashoffset="-141.3" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-warning)" stroke-width="15" stroke-dasharray="55.3 251.3" stroke-dashoffset="-244.1" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-info)" stroke-width="15" stroke-dasharray="4 251.3" stroke-dashoffset="-299.4" transform="rotate(-90 50 50)" />
                  </svg>
                </div>
                <div class="type-legend">
                  <div 
                    v-for="type in analyticsData.releaseTypes" 
                    :key="type.type"
                    class="legend-item"
                  >
                    <span class="legend-dot" :class="`type-${type.type.toLowerCase()}`"></span>
                    <span class="legend-label">{{ type.type }}</span>
                    <span class="legend-value">{{ type.count }} ({{ type.percentage }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="quick-stats card">
          <div class="card-body">
            <div class="stats-row">
              <div class="stat-item">
                <font-awesome-icon icon="bullseye" class="stat-icon" />
                <div class="stat-content">
                  <div class="stat-value">{{ analyticsData.overview.activeTargets }}</div>
                  <div class="stat-label">Active Targets</div>
                </div>
              </div>
              <div class="stat-item">
                <font-awesome-icon icon="music" class="stat-icon" />
                <div class="stat-content">
                  <div class="stat-value">{{ formatNumber(analyticsData.overview.totalTracks) }}</div>
                  <div class="stat-label">Total Tracks</div>
                </div>
              </div>
              <div class="stat-item">
                <font-awesome-icon icon="calendar" class="stat-icon" />
                <div class="stat-content">
                  <div class="stat-value">18</div>
                  <div class="stat-label">Releases This Week</div>
                </div>
              </div>
              <div class="stat-item">
                <font-awesome-icon icon="globe" class="stat-icon" />
                <div class="stat-content">
                  <div class="stat-value">45</div>
                  <div class="stat-label">Countries Reached</div>
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
.analytics {
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

/* Export Menu */
.export-menu {
  position: relative;
}

.export-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--space-xs);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  display: none;
  min-width: 150px;
  z-index: var(--z-dropdown);
}

.export-menu:hover .export-dropdown {
  display: block;
}

.export-dropdown button {
  display: block;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-base);
}

.export-dropdown button:hover {
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

/* Overview Grid */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.overview-card .card-body {
  display: flex;
  gap: var(--space-lg);
}

.overview-icon {
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

.overview-icon.success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.overview-content {
  flex: 1;
}

.overview-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.overview-label {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-sm);
}

.overview-change {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
}

.overview-change.positive {
  color: var(--color-success);
}

.overview-change.negative {
  color: var(--color-error);
}

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.chart-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.chart-period {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Bar Chart */
.bar-chart {
  height: 250px;
  display: flex;
  flex-direction: column;
}

.chart-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-md);
  padding-bottom: var(--space-md);
}

.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.bar-container {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

.bar-container.stacked {
  flex-direction: column-reverse;
}

.bar {
  width: 60%;
  min-height: 2px;
  background-color: var(--color-primary);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  position: relative;
  transition: all var(--transition-base);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: var(--space-xs);
}

.bar:hover {
  opacity: 0.8;
}

.bar-primary {
  background-color: var(--color-primary);
}

.bar-success {
  background-color: var(--color-success);
}

.bar-error {
  background-color: var(--color-error);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}

.bar-value {
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.bar-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: var(--space-lg);
  margin-top: var(--space-md);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-sm);
}

.legend-color.success {
  background-color: var(--color-success);
}

.legend-color.error {
  background-color: var(--color-error);
}

/* Performance Tables */
.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.performance-table {
  display: flex;
  flex-direction: column;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-bottom: 2px solid var(--color-border);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.table-card:last-child .table-header {
  grid-template-columns: 2fr 1fr 1fr 1fr;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--color-border-light);
  align-items: center;
}

.table-card:last-child .table-row {
  grid-template-columns: 2fr 1fr 1fr 1fr;
}

.table-row:last-child {
  border-bottom: none;
}

.release-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.release-title {
  font-weight: var(--font-medium);
  color: var(--color-heading);
}

.release-artist {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.dsp-name {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: var(--font-medium);
}

.table-value {
  color: var(--color-text);
}

.text-success {
  color: var(--color-success);
}

.text-warning {
  color: var(--color-warning);
}

.text-error {
  color: var(--color-error);
}

/* Insights Grid */
.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

/* Territory Distribution */
.territory-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.territory-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-lg);
}

.territory-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 120px;
}

.territory-flag {
  width: 32px;
  height: 24px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.territory-name {
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.territory-stats {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.territory-count {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  min-width: 80px;
}

.territory-bar {
  flex: 1;
  height: 8px;
  background-color: var(--color-border-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.territory-fill {
  height: 100%;
  background-color: var(--color-primary);
  transition: width var(--transition-base);
}

.territory-percentage {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  min-width: 40px;
  text-align: right;
}

/* Release Types Chart */
.type-chart {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
}

.donut-placeholder {
  position: relative;
  width: 200px;
  height: 200px;
  flex-shrink: 0;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.donut-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
}

.donut-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.donut-svg {
  width: 100%;
  height: 100%;
}

.type-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.type-legend .legend-item {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: var(--space-sm);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  background-color: var(--color-primary);
}

.legend-dot.type-album {
  background-color: var(--color-primary);
}

.legend-dot.type-single {
  background-color: var(--color-secondary);
}

.legend-dot.type-ep {
  background-color: var(--color-warning);
}

.legend-dot.type-compilation {
  background-color: var(--color-info);
}

.legend-label {
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.legend-value {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Quick Stats */
.quick-stats {
  margin-bottom: var(--space-xl);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-xl);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.stat-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-secondary);
  color: var(--color-primary);
  font-size: 1.25rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Responsive */
@media (max-width: 768px) {
  .charts-grid,
  .tables-grid,
  .insights-grid {
    grid-template-columns: 1fr;
  }
  
  .overview-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .stats-row {
    grid-template-columns: 1fr 1fr;
  }
  
  .type-chart {
    flex-direction: column;
  }
  
  .territory-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .territory-stats {
    width: 100%;
  }
}
</style>