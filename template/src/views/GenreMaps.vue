<!-- src/views/GenreMaps.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { GENRE_TRUTH } from '@/dictionaries/genres/genre-truth'
import { BEATPORT_GENRES } from '@/dictionaries/genres/beatport-202505'
import { GenreMapper } from '@/dictionaries/genres/mappings'

const { user, userProfile } = useAuth()

// State
const selectedTruthGenre = ref('')
const selectedTargetDSP = ref('beatport')
const mappings = ref(new Map())
const unsavedChanges = ref(false)
const searchQuery = ref('')

// Available DSPs for mapping
const availableDSPs = ref([
  { id: 'beatport', name: 'Beatport', version: '2025-05' },
  { id: 'amazon', name: 'Amazon Music', version: 'TBD' },
  { id: 'spotify', name: 'Spotify', version: 'TBD' }
])

// Computed
const truthGenres = computed(() => {
  return Object.entries(GENRE_TRUTH.byCode)
    .filter(([code, genre]) => 
      !searchQuery.value || 
      genre.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .map(([code, genre]) => ({ code, ...genre }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const targetGenres = computed(() => {
  if (selectedTargetDSP.value === 'beatport') {
    return Object.entries(BEATPORT_GENRES.byCode)
      .map(([code, genre]) => ({ code, ...genre }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  return []
})

const currentMapping = computed(() => {
  if (!selectedTruthGenre.value) return null
  return mappings.value.get(selectedTruthGenre.value)
})

// Methods
const loadMappings = async () => {
  const mapper = new GenreMapper()
  // In a real implementation, this would load from Firestore
  // For now, use the default mappings
  const truthCodes = Object.keys(GENRE_TRUTH.byCode)
  
  truthCodes.forEach(code => {
    const mapped = mapper.mapGenre(code, selectedTargetDSP.value)
    if (mapped) {
      mappings.value.set(code, mapped)
    }
  })
}

const updateMapping = (truthCode, targetCode) => {
  if (targetCode) {
    mappings.value.set(truthCode, targetCode)
  } else {
    mappings.value.delete(truthCode)
  }
  unsavedChanges.value = true
}

const saveMappings = async () => {
  try {
    // In production, save to Firestore
    const mappingData = {
      sourceDSP: 'genre-truth',
      targetDSP: selectedTargetDSP.value,
      mappings: Object.fromEntries(mappings.value),
      version: '1.0.0',
      createdBy: user.value.uid,
      updatedAt: new Date()
    }
    
    console.log('Saving mappings:', mappingData)
    // await saveMappingsToFirestore(mappingData)
    
    unsavedChanges.value = false
    alert('Mappings saved successfully!')
  } catch (error) {
    console.error('Error saving mappings:', error)
    alert('Error saving mappings')
  }
}

const exportMappings = () => {
  const exportData = {
    source: 'Stardust Distro Genre Truth v1.0',
    target: selectedTargetDSP.value,
    mappings: Object.fromEntries(mappings.value),
    exportedAt: new Date().toISOString(),
    exportedBy: userProfile.value.email
  }
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `genre-mappings-${selectedTargetDSP.value}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const getMappingStats = computed(() => {
  const total = Object.keys(GENRE_TRUTH.byCode).length
  const mapped = mappings.value.size
  return {
    total,
    mapped,
    unmapped: total - mapped,
    percentage: Math.round((mapped / total) * 100)
  }
})

// Lifecycle
onMounted(() => {
  loadMappings()
})
</script>

<template>
  <div class="genre-maps">
    <div class="container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Genre Mapping System</h1>
          <p class="text-secondary">
            Map genres from our truth source to DSP-specific implementations
          </p>
        </div>
        
        <div class="header-actions">
          <button 
            @click="saveMappings"
            class="btn btn-success"
            :disabled="!unsavedChanges"
          >
            <font-awesome-icon icon="save" />
            Save Changes
          </button>
          <button @click="exportMappings" class="btn btn-secondary">
            <font-awesome-icon icon="download" />
            Export Mappings
          </button>
        </div>
      </div>

      <!-- Mapping Stats -->
      <div class="mapping-stats">
        <div class="stat-card">
          <div class="stat-value">{{ getMappingStats.mapped }}</div>
          <div class="stat-label">Mapped Genres</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ getMappingStats.unmapped }}</div>
          <div class="stat-label">Unmapped Genres</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ getMappingStats.percentage }}%</div>
          <div class="stat-label">Coverage</div>
        </div>
      </div>

      <!-- Controls -->
      <div class="mapping-controls">
        <div class="control-group">
          <label>Target DSP:</label>
          <select 
            v-model="selectedTargetDSP" 
            class="form-select"
            @change="loadMappings"
          >
            <option 
              v-for="dsp in availableDSPs" 
              :key="dsp.id" 
              :value="dsp.id"
            >
              {{ dsp.name }} ({{ dsp.version }})
            </option>
          </select>
        </div>
        
        <div class="control-group">
          <label>Search Genres:</label>
          <input 
            v-model="searchQuery" 
            type="text" 
            class="form-input"
            placeholder="Search truth genres..."
          >
        </div>
      </div>

      <!-- Mapping Interface -->
      <div class="mapping-interface">
        <!-- Truth Genres (Left Panel) -->
        <div class="genre-panel truth-panel">
          <div class="panel-header">
            <h3>Genre Truth (Source)</h3>
            <div class="panel-subtitle">
              {{ GENRE_TRUTH.sourceSpec }} - {{ truthGenres.length }} genres
            </div>
          </div>
          
          <div class="genre-list">
            <div 
              v-for="genre in truthGenres" 
              :key="genre.code"
              class="genre-item"
              :class="{ 
                selected: selectedTruthGenre === genre.code,
                mapped: mappings.has(genre.code)
              }"
              @click="selectedTruthGenre = genre.code"
            >
              <div class="genre-name">{{ genre.name }}</div>
              <div class="genre-path">{{ genre.path.join(' > ') }}</div>
              <div v-if="mappings.has(genre.code)" class="mapping-indicator">
                <font-awesome-icon icon="link" />
              </div>
            </div>
          </div>
        </div>

        <!-- Mapping Arrow -->
        <div class="mapping-arrow">
          <font-awesome-icon icon="arrow-right" />
        </div>

        <!-- Target Genres (Right Panel) -->
        <div class="genre-panel target-panel">
          <div class="panel-header">
            <h3>{{ selectedTargetDSP }} Genres (Target)</h3>
            <div class="panel-subtitle">
              {{ targetGenres.length }} available genres
            </div>
          </div>
          
          <div v-if="selectedTruthGenre" class="current-mapping">
            <div class="mapping-for">
              Mapping for: <strong>{{ GENRE_TRUTH.byCode[selectedTruthGenre]?.name }}</strong>
            </div>
            
            <select 
              :value="currentMapping" 
              @change="updateMapping(selectedTruthGenre, $event.target.value)"
              class="form-select"
            >
              <option value="">-- No mapping --</option>
              <option 
                v-for="genre in targetGenres" 
                :key="genre.code" 
                :value="genre.code"
              >
                {{ genre.name }}
                <template v-if="genre.xmlNotation">
                  ({{ genre.xmlNotation }})
                </template>
              </option>
            </select>
          </div>
          
          <div v-else class="no-selection">
            <font-awesome-icon icon="hand-pointer" />
            <p>Select a genre from the left to create mapping</p>
          </div>
        </div>
      </div>

      <!-- Unsaved Changes Warning -->
      <div v-if="unsavedChanges" class="unsaved-warning">
        <font-awesome-icon icon="exclamation-triangle" />
        You have unsaved changes
      </div>
    </div>
  </div>
</template>

<style scoped>
.genre-maps {
  padding: var(--space-lg) 0;
  min-height: calc(100vh - 80px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-xl);
  gap: var(--space-lg);
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
}

.mapping-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.stat-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
}

.stat-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.stat-label {
  color: var(--color-text-secondary);
  margin-top: var(--space-xs);
}

.mapping-controls {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.control-group label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.mapping-interface {
  display: grid;
  grid-template-columns: 1fr 60px 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
  min-height: 600px;
}

.genre-panel {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.panel-header {
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
}

.panel-header h3 {
  margin: 0;
  color: var(--color-text);
}

.panel-subtitle {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin-top: var(--space-xs);
}

.genre-list {
  max-height: 500px;
  overflow-y: auto;
}

.genre-item {
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  position: relative;
  transition: all var(--transition-base);
}

.genre-item:hover {
  background-color: var(--color-bg-secondary);
}

.genre-item.selected {
  background-color: var(--color-primary-light);
  border-left: 3px solid var(--color-primary);
}

.genre-item.mapped {
  border-right: 3px solid var(--color-success);
}

.genre-name {
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.genre-path {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.mapping-indicator {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  color: var(--color-success);
}

.mapping-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-2xl);
  color: var(--color-text-secondary);
}

.current-mapping {
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.mapping-for {
  margin-bottom: var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--color-text-secondary);
  gap: var(--space-sm);
}

.unsaved-warning {
  position: fixed;
  bottom: var(--space-lg);
  right: var(--space-lg);
  background-color: var(--color-warning);
  color: white;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  box-shadow: var(--shadow-lg);
}

/* Responsive */
@media (max-width: 1024px) {
  .mapping-interface {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
  }
  
  .mapping-arrow {
    display: none;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .mapping-stats {
    grid-template-columns: 1fr;
  }
  
  .mapping-controls {
    grid-template-columns: 1fr;
  }
}
</style>