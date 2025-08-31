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
            :disabled="!unsavedChanges || isSaving"
          >
            <font-awesome-icon v-if="isSaving" icon="spinner" spin />
            <font-awesome-icon v-else icon="save" />
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
          <button @click="exportMappings" class="btn btn-secondary">
            <font-awesome-icon icon="download" />
            Export Mappings
          </button>
          <label class="btn btn-secondary">
            <font-awesome-icon icon="upload" />
            Import Mappings
            <input 
              type="file" 
              accept=".json"
              @change="importMappings"
              style="display: none;"
            >
          </label>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="alert alert-success">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="alert alert-error">
        {{ errorMessage }}
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

      <!-- Saved Mappings Section -->
      <div class="saved-mappings-section">
        <h3>Saved Mappings</h3>
        <div class="saved-mappings-grid">
          <div v-if="savedMappings.length === 0" class="empty-state">
            <p>No saved mappings yet. Create your first mapping below.</p>
          </div>
          <div 
            v-for="mapping in savedMappings" 
            :key="mapping.id"
            class="saved-mapping-card"
            :class="{ active: editingMappingId === mapping.id }"
          >
            <div class="mapping-card-header">
              <h4>{{ mapping.name }}</h4>
              <span v-if="mapping.isDefault" class="badge badge-primary">Default</span>
            </div>
            <div class="mapping-card-stats">
              <span>{{ mapping.stats?.totalMapped || 0 }} genres mapped</span>
              <span v-if="mapping.strictMode" class="badge badge-warning">Strict</span>
            </div>
            <div class="mapping-card-actions">
              <button @click="loadMapping(mapping)" class="btn btn-sm btn-primary">
                Load
              </button>
              <button @click="duplicateMapping(mapping)" class="btn btn-sm btn-secondary">
                Duplicate
              </button>
              <button @click="deleteMapping(mapping)" class="btn btn-sm btn-danger">
                Delete
              </button>
            </div>
          </div>
          <div class="saved-mapping-card new-mapping" @click="createNewMapping">
            <font-awesome-icon icon="plus" class="new-mapping-icon" />
            <span>Create New Mapping</span>
          </div>
        </div>
      </div>

      <!-- Mapping Configuration -->
      <div class="mapping-config">
        <h3>Mapping Configuration</h3>
        <div class="config-grid">
          <div class="config-field">
            <label>Mapping Name</label>
            <input 
              v-model="mappingName" 
              type="text" 
              class="form-control"
              placeholder="e.g., Beatport Electronic Mapping v2"
              @input="unsavedChanges = true"
            >
          </div>
          <div class="config-field">
            <label>Target DSP</label>
            <select v-model="selectedTargetDSP" class="form-control">
              <option 
                v-for="dsp in availableDSPs" 
                :key="dsp.id"
                :value="dsp.id"
              >
                {{ dsp.name }} ({{ dsp.version }})
              </option>
            </select>
          </div>
          <div class="config-field">
            <label>Fallback Genre</label>
            <input 
              v-model="fallbackGenre" 
              type="text" 
              class="form-control"
              placeholder="e.g., ELECTRONIC-00"
              @input="unsavedChanges = true"
            >
            <small class="text-muted">Used when no mapping exists</small>
          </div>
          <div class="config-options">
            <div class="form-check">
              <input 
                type="checkbox" 
                v-model="strictMode"
                class="form-check-input"
                id="strictMode"
                @change="unsavedChanges = true"
              >
              <label class="form-check-label" for="strictMode">
                Strict Mode (reject delivery if genre cannot be mapped)
              </label>
            </div>
            <div class="form-check">
              <input 
                type="checkbox" 
                v-model="isDefault"
                class="form-check-input"
                id="isDefault"
                @change="unsavedChanges = true"
              >
              <label class="form-check-label" for="isDefault">
                Set as default mapping for {{ selectedTargetDSP }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Search Controls -->
      <div class="mapping-controls">
        <div class="control-group">
          <label>Search Genres</label>
          <input 
            v-model="searchQuery" 
            type="text" 
            class="form-control"
            placeholder="Search by name or code..."
          >
        </div>
        <div class="control-group">
          <label>Filter</label>
          <select v-model="filterMode" class="form-control">
            <option value="all">All Genres</option>
            <option value="mapped">Mapped Only</option>
            <option value="unmapped">Unmapped Only</option>
          </select>
        </div>
        <div class="control-group">
          <label>Quick Actions</label>
          <div class="quick-actions">
            <button @click="autoMapIdentical" class="btn btn-sm btn-secondary">
              Auto-map Identical
            </button>
            <button @click="clearAllMappings" class="btn btn-sm btn-warning">
              Clear All
            </button>
          </div>
        </div>
      </div>

      <!-- Mapping Interface -->
      <div class="mapping-interface">
        <!-- Source Panel -->
        <div class="genre-panel">
          <div class="panel-header">
            <h3>Genre Truth Source</h3>
            <div class="panel-subtitle">Our canonical genre taxonomy</div>
          </div>
          <div class="genre-list">
            <div 
              v-for="genre in filteredTruthGenres" 
              :key="genre.code"
              class="genre-item"
              :class="{ 
                selected: selectedTruthGenre === genre.code,
                mapped: mappings.has(genre.code)
              }"
              @click="selectTruthGenre(genre.code)"
            >
              <div class="genre-content">
                <div class="genre-name">{{ genre.name }}</div>
                <div class="genre-path">{{ genre.path.join(' > ') }}</div>
                <div class="genre-code">{{ genre.code }}</div>
              </div>
              <div v-if="mappings.has(genre.code)" class="mapping-indicator">
                <font-awesome-icon icon="check-circle" />
              </div>
            </div>
          </div>
        </div>

        <!-- Arrow -->
        <div class="mapping-arrow">
          <font-awesome-icon icon="arrow-right" />
        </div>

        <!-- Target Panel -->
        <div class="genre-panel">
          <div class="panel-header">
            <h3>{{ getTargetDSPName() }}</h3>
            <div class="panel-subtitle">Target DSP genre list</div>
          </div>
          <div v-if="selectedTruthGenre" class="current-mapping">
            <div class="mapping-for">
              Mapping for: <strong>{{ getGenreName(selectedTruthGenre) }}</strong>
            </div>
            <select 
              v-model="currentTargetMapping"
              @change="updateMapping(selectedTruthGenre, $event.target.value)"
              class="form-control"
            >
              <option value="">-- No Mapping --</option>
              <option 
                v-for="targetGenre in targetGenres" 
                :key="targetGenre.code"
                :value="targetGenre.code"
              >
                {{ targetGenre.name }} ({{ targetGenre.code }})
              </option>
            </select>
          </div>
          <div v-else class="no-selection">
            <font-awesome-icon icon="music" class="empty-icon" />
            <p>Select a genre from the left to map it</p>
          </div>
          <div v-if="selectedTruthGenre && targetGenres.length > 0" class="genre-list">
            <div 
              v-for="genre in suggestedTargetGenres" 
              :key="genre.code"
              class="genre-item target-genre"
              :class="{ 
                selected: currentTargetMapping === genre.code,
                suggested: genre.suggested
              }"
              @click="updateMapping(selectedTruthGenre, genre.code)"
            >
              <div class="genre-content">
                <div class="genre-name">
                  {{ genre.name }}
                  <span v-if="genre.suggested" class="badge badge-info">Suggested</span>
                </div>
                <div class="genre-code">{{ genre.code }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk Mapping Section -->
      <div class="bulk-mapping-section">
        <h3>Bulk Mapping Tools</h3>
        <div class="bulk-actions">
          <button @click="showUnmappedOnly" class="btn btn-secondary">
            Show Unmapped ({{ getMappingStats.unmapped }})
          </button>
          <button @click="applyCommonMappings" class="btn btn-secondary">
            Apply Common Mappings
          </button>
          <button @click="validateMappings" class="btn btn-secondary">
            Validate All Mappings
          </button>
        </div>
      </div>

      <!-- Unsaved Warning -->
      <div v-if="unsavedChanges" class="unsaved-warning">
        <font-awesome-icon icon="exclamation-triangle" />
        <span>You have unsaved changes</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { GENRE_TRUTH } from '@/dictionaries/genres/genre-truth'
import { BEATPORT_GENRES } from '@/dictionaries/genres/beatport-202505'
import { AMAZON_GENRES } from '@/dictionaries/genres/amazon-201805'
import { APPLE_GENRES } from '@/dictionaries/genres/apple-539'
import genreMappingService from '@/services/genreMappings'

const { user, userProfile } = useAuth()

// State
const selectedTruthGenre = ref('')
const selectedTargetDSP = ref('beatport')
const mappings = ref(new Map())
const unsavedChanges = ref(false)
const searchQuery = ref('')
const filterMode = ref('all')
const mappingName = ref('')
const fallbackGenre = ref('')
const strictMode = ref(false)
const isDefault = ref(false)
const editingMappingId = ref(null)
const savedMappings = ref([])
const isSaving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Available DSPs for mapping
const availableDSPs = ref([
  { id: 'beatport', name: 'Beatport', version: '2025-05' },
  { id: 'amazon', name: 'Amazon Music', version: '2018-05' },
  { id: 'apple', name: 'Apple Music', version: '5.3.9' },
  { id: 'spotify', name: 'Spotify', version: 'Coming Soon', disabled: true }
])

// Get target DSP genres based on selection
const targetGenres = computed(() => {
  switch (selectedTargetDSP.value) {
    case 'beatport':
      return Object.entries(BEATPORT_GENRES.byCode)
        .map(([code, genre]) => ({ code, ...genre }))
        .sort((a, b) => a.name.localeCompare(b.name))
    case 'amazon':
      return Object.entries(AMAZON_GENRES?.byCode || {})
        .map(([code, genre]) => ({ code, ...genre }))
        .sort((a, b) => a.name.localeCompare(b.name))
    case 'apple':
      return Object.entries(APPLE_GENRES?.byCode || {})
        .map(([code, genre]) => ({ code, ...genre }))
        .sort((a, b) => a.name.localeCompare(b.name))
    default:
      return []
  }
})

// Filtered truth genres based on search and filter
const filteredTruthGenres = computed(() => {
  let genres = Object.entries(GENRE_TRUTH.byCode)
    .map(([code, genre]) => ({ code, ...genre }))
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    genres = genres.filter(genre => 
      genre.name.toLowerCase().includes(query) ||
      genre.code.toLowerCase().includes(query)
    )
  }
  
  // Apply mapping filter
  if (filterMode.value === 'mapped') {
    genres = genres.filter(genre => mappings.value.has(genre.code))
  } else if (filterMode.value === 'unmapped') {
    genres = genres.filter(genre => !mappings.value.has(genre.code))
  }
  
  return genres.sort((a, b) => a.name.localeCompare(b.name))
})

// Get current mapping for selected genre
const currentTargetMapping = computed({
  get: () => mappings.value.get(selectedTruthGenre.value) || '',
  set: (value) => updateMapping(selectedTruthGenre.value, value)
})

// Get suggested target genres
const suggestedTargetGenres = computed(() => {
  if (!selectedTruthGenre.value || !targetGenres.value.length) return []
  
  const sourceName = getGenreName(selectedTruthGenre.value).toLowerCase()
  
  // Find potential matches
  return targetGenres.value.map(genre => {
    const targetName = genre.name.toLowerCase()
    const suggested = 
      targetName.includes(sourceName) ||
      sourceName.includes(targetName) ||
      calculateSimilarity(sourceName, targetName) > 0.7
    
    return { ...genre, suggested }
  }).sort((a, b) => {
    // Suggested first
    if (a.suggested && !b.suggested) return -1
    if (!a.suggested && b.suggested) return 1
    return a.name.localeCompare(b.name)
  })
})

// Get mapping statistics
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

// Methods
const selectTruthGenre = (code) => {
  selectedTruthGenre.value = selectedTruthGenre.value === code ? '' : code
}

const getGenreName = (code) => {
  return GENRE_TRUTH.byCode[code]?.name || code
}

const getTargetDSPName = () => {
  return availableDSPs.value.find(d => d.id === selectedTargetDSP.value)?.name || 'Target DSP'
}

const updateMapping = (truthCode, targetCode) => {
  if (!truthCode) return
  
  if (targetCode) {
    mappings.value.set(truthCode, targetCode)
  } else {
    mappings.value.delete(truthCode)
  }
  unsavedChanges.value = true
}

// Load saved mappings from Firestore
const loadSavedMappings = async () => {
  if (!user.value) return
  
  try {
    savedMappings.value = await genreMappingService.getTenantMappings(
      user.value.uid, 
      selectedTargetDSP.value
    )
  } catch (error) {
    console.error('Error loading saved mappings:', error)
    errorMessage.value = 'Failed to load saved mappings'
  }
}

// Load a specific mapping
const loadMapping = async (mapping) => {
  if (!mapping) return
  
  editingMappingId.value = mapping.id
  mappingName.value = mapping.name
  fallbackGenre.value = mapping.fallbackGenre || ''
  strictMode.value = mapping.strictMode || false
  isDefault.value = mapping.isDefault || false
  selectedTargetDSP.value = mapping.targetDSP
  
  // Load the mappings
  mappings.value = new Map(Object.entries(mapping.mappings || {}))
  unsavedChanges.value = false
  
  successMessage.value = `Loaded mapping: ${mapping.name}`
  setTimeout(() => successMessage.value = '', 3000)
}

// Create new mapping
const createNewMapping = () => {
  editingMappingId.value = null
  mappingName.value = ''
  fallbackGenre.value = ''
  strictMode.value = false
  isDefault.value = false
  mappings.value = new Map()
  unsavedChanges.value = false
  
  successMessage.value = 'Started new mapping. Configure and save when ready.'
  setTimeout(() => successMessage.value = '', 3000)
}

// Duplicate mapping
const duplicateMapping = (mapping) => {
  editingMappingId.value = null
  mappingName.value = `${mapping.name} (Copy)`
  fallbackGenre.value = mapping.fallbackGenre || ''
  strictMode.value = mapping.strictMode || false
  isDefault.value = false
  mappings.value = new Map(Object.entries(mapping.mappings || {}))
  unsavedChanges.value = true
  
  successMessage.value = 'Mapping duplicated. Remember to save with a new name.'
  setTimeout(() => successMessage.value = '', 3000)
}

// Delete mapping
const deleteMapping = async (mapping) => {
  if (!confirm(`Delete mapping "${mapping.name}"? This cannot be undone.`)) return
  
  try {
    await genreMappingService.deleteMapping(mapping.id)
    await loadSavedMappings()
    
    if (editingMappingId.value === mapping.id) {
      createNewMapping()
    }
    
    successMessage.value = 'Mapping deleted successfully'
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Error deleting mapping:', error)
    errorMessage.value = 'Failed to delete mapping'
  }
}

// Save mappings to Firestore
const saveMappings = async () => {
  if (!user.value) return
  
  isSaving.value = true
  errorMessage.value = ''
  
  try {
    const mappingData = {
      tenantId: user.value.uid,
      name: mappingName.value || `${selectedTargetDSP.value} Genre Mapping`,
      sourceDSP: 'genre-truth',
      targetDSP: selectedTargetDSP.value,
      mappings: Object.fromEntries(mappings.value),
      version: '1.0.0',
      fallbackGenre: fallbackGenre.value,
      strictMode: strictMode.value,
      isActive: true,
      isDefault: isDefault.value,
      createdBy: user.value.uid,
      stats: getMappingStats.value
    }
    
    if (editingMappingId.value) {
      await genreMappingService.updateMapping(editingMappingId.value, mappingData)
      successMessage.value = 'Mapping updated successfully!'
    } else {
      const newId = await genreMappingService.createMapping(mappingData)
      editingMappingId.value = newId
      successMessage.value = 'Mapping created successfully!'
    }
    
    unsavedChanges.value = false
    await loadSavedMappings()
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Error saving mappings:', error)
    errorMessage.value = 'Failed to save mapping: ' + error.message
  } finally {
    isSaving.value = false
  }
}

// Export mappings
const exportMappings = () => {
  const exportData = {
    version: '1.0',
    source: 'Genre Truth v1.0',
    target: selectedTargetDSP.value,
    name: mappingName.value || 'Exported Mapping',
    mappings: Object.fromEntries(mappings.value),
    fallbackGenre: fallbackGenre.value,
    strictMode: strictMode.value,
    stats: getMappingStats.value,
    exportedAt: new Date().toISOString(),
    exportedBy: userProfile.value?.email
  }
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `genre-mapping-${selectedTargetDSP.value}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  successMessage.value = 'Mapping exported successfully'
  setTimeout(() => successMessage.value = '', 3000)
}

// Import mappings
const importMappings = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    
    // Validate import data
    if (!data.mappings || !data.target) {
      throw new Error('Invalid mapping file format')
    }
    
    // Load the imported data
    mappings.value = new Map(Object.entries(data.mappings))
    fallbackGenre.value = data.fallbackGenre || ''
    strictMode.value = data.strictMode || false
    selectedTargetDSP.value = data.target
    mappingName.value = data.name || `Imported ${data.target} mapping`
    editingMappingId.value = null // New mapping
    
    unsavedChanges.value = true
    successMessage.value = 'Mappings imported successfully! Remember to save.'
    setTimeout(() => successMessage.value = '', 3000)
  } catch (error) {
    console.error('Import error:', error)
    errorMessage.value = 'Failed to import mappings: ' + error.message
  }
  
  // Reset file input
  event.target.value = ''
}

// Auto-map identical names
const autoMapIdentical = () => {
  let count = 0
  const truthGenres = Object.entries(GENRE_TRUTH.byCode)
  
  truthGenres.forEach(([truthCode, truthGenre]) => {
    // Skip if already mapped
    if (mappings.value.has(truthCode)) return
    
    // Find exact name match in target
    const match = targetGenres.value.find(
      tg => tg.name.toLowerCase() === truthGenre.name.toLowerCase()
    )
    
    if (match) {
      mappings.value.set(truthCode, match.code)
      count++
    }
  })
  
  if (count > 0) {
    unsavedChanges.value = true
    successMessage.value = `Auto-mapped ${count} identical genre names`
    setTimeout(() => successMessage.value = '', 3000)
  } else {
    errorMessage.value = 'No identical matches found to auto-map'
    setTimeout(() => errorMessage.value = '', 3000)
  }
}

// Clear all mappings
const clearAllMappings = () => {
  if (!confirm('Clear all mappings? This will remove all genre mappings.')) return
  
  mappings.value.clear()
  unsavedChanges.value = true
  successMessage.value = 'All mappings cleared'
  setTimeout(() => successMessage.value = '', 3000)
}

// Show unmapped only
const showUnmappedOnly = () => {
  filterMode.value = 'unmapped'
  searchQuery.value = ''
}

// Apply common mappings (predefined patterns)
const applyCommonMappings = () => {
  const commonPatterns = {
    'HOUSE-00': 'BP-HOUSE-00',
    'TECHNO-00': 'BP-TECHNO-PEAK-00',
    'TRANCE-00': 'BP-TRANCE-MAIN-00',
    'DUBSTEP-00': 'BP-DUBSTEP-00',
    'DRUM-BASS-00': 'BP-DRUM-BASS-00',
    'AMBIENT-00': 'BP-AMBIENT-00'
  }
  
  let count = 0
  Object.entries(commonPatterns).forEach(([source, target]) => {
    if (!mappings.value.has(source) && targetGenres.value.some(g => g.code === target)) {
      mappings.value.set(source, target)
      count++
    }
  })
  
  if (count > 0) {
    unsavedChanges.value = true
    successMessage.value = `Applied ${count} common mappings`
    setTimeout(() => successMessage.value = '', 3000)
  }
}

// Validate all mappings
const validateMappings = () => {
  const invalid = []
  
  mappings.value.forEach((targetCode, sourceCode) => {
    // Check if source exists
    if (!GENRE_TRUTH.byCode[sourceCode]) {
      invalid.push(`Source genre not found: ${sourceCode}`)
    }
    
    // Check if target exists
    if (!targetGenres.value.some(g => g.code === targetCode)) {
      invalid.push(`Target genre not found: ${targetCode} (for ${sourceCode})`)
    }
  })
  
  if (invalid.length > 0) {
    errorMessage.value = `Found ${invalid.length} invalid mappings. Check console for details.`
    console.error('Invalid mappings:', invalid)
  } else {
    successMessage.value = 'All mappings are valid!'
    setTimeout(() => successMessage.value = '', 3000)
  }
}

// Calculate string similarity (for suggestions)
const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

// Levenshtein distance for string similarity
const levenshteinDistance = (str1, str2) => {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Watch for DSP changes
watch(selectedTargetDSP, () => {
  loadSavedMappings()
})

// Lifecycle
onMounted(() => {
  loadSavedMappings()
  
  // Load first saved mapping or create new
  if (savedMappings.value.length > 0) {
    loadMapping(savedMappings.value[0])
  } else {
    createNewMapping()
  }
})
</script>

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

.alert {
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
}

.alert-success {
  background-color: var(--color-success-light);
  color: var(--color-success-dark);
  border: 1px solid var(--color-success);
}

.alert-error {
  background-color: var(--color-error-light);
  color: var(--color-error-dark);
  border: 1px solid var(--color-error);
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

.saved-mappings-section {
  margin-bottom: var(--space-xl);
}

.saved-mappings-section h3 {
  margin-bottom: var(--space-md);
}

.saved-mappings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-md);
}

.saved-mapping-card {
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.saved-mapping-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.saved-mapping-card.active {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.saved-mapping-card.new-mapping {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-style: dashed;
  min-height: 120px;
}

.new-mapping-icon {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-sm);
  color: var(--color-text-secondary);
}

.mapping-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.mapping-card-header h4 {
  margin: 0;
  font-size: var(--text-base);
}

.mapping-card-stats {
  margin-bottom: var(--space-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.mapping-card-actions {
  display: flex;
  gap: var(--space-xs);
}

.mapping-config {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.mapping-config h3 {
  margin-bottom: var(--space-md);
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-md);
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.config-field label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.config-options {
  grid-column: 1 / -1;
  display: flex;
  gap: var(--space-lg);
  margin-top: var(--space-md);
}

.mapping-controls {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
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

.quick-actions {
  display: flex;
  gap: var(--space-sm);
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
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.genre-item.target-genre.suggested {
  background-color: var(--color-info-light);
}

.genre-content {
  flex: 1;
}

.genre-name {
  font-weight: var(--font-medium);
  color: var(--color-text);
  margin-bottom: 2px;
}

.genre-path {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.genre-code {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-text-muted);
}

.mapping-indicator {
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

.empty-icon {
  font-size: var(--text-3xl);
  opacity: 0.5;
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
}

.bulk-mapping-section {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.bulk-mapping-section h3 {
  margin-bottom: var(--space-md);
}

.bulk-actions {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.badge-primary {
  background-color: var(--color-primary);
  color: white;
}

.badge-warning {
  background-color: var(--color-warning);
  color: white;
}

.badge-info {
  background-color: var(--color-info);
  color: white;
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
  z-index: 1000;
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
  
  .mapping-controls {
    grid-template-columns: 1fr;
  }
  
  .config-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .header-actions .btn {
    width: 100%;
  }
  
  .mapping-stats {
    grid-template-columns: 1fr;
  }
  
  .saved-mappings-grid {
    grid-template-columns: 1fr;
  }
  
  .bulk-actions {
    flex-direction: column;
  }
  
  .bulk-actions .btn {
    width: 100%;
  }
}
</style>