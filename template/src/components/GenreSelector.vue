<!-- src/components/GenreSelector.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { 
  getParentGenres, 
  getSubgenres, 
  searchGenres, 
  getGenreByCode,
  getGenrePath 
} from '@/dictionaries/genres'

const props = defineProps({
  modelValue: String,
  subgenreValue: String,
  dsp: {
    type: String,
    default: 'genre-truth' // Use genre truth as default instead of 'apple'
  },
  showMappingInfo: {
    type: Boolean,
    default: false
  },
  targetDSP: {
    type: String,
    default: null // For showing mapped genre info
  }
})

const emit = defineEmits(['update:modelValue', 'update:subgenreValue'])

// State
const searchQuery = ref('')
const searchResults = ref([])
const selectedParent = ref('')
const parentGenres = ref([])
const subgenres = ref([])

// Computed
const selectedGenre = computed(() => {
  if (props.subgenreValue) {
    return props.subgenreValue
  }
  return props.modelValue
})

const selectedGenrePath = computed(() => {
  const code = selectedGenre.value
  if (!code) return ''
  return getGenrePath(code, props.dsp)
})

const selectedGenreInfo = computed(() => {
  const code = selectedGenre.value
  if (!code) return null
  return getGenreByCode(code, props.dsp)
})

// Get mapped genre info for target DSP if specified
const mappedGenreInfo = computed(() => {
  if (!props.targetDSP || !selectedGenre.value) return null
  
  // This would use the GenreMapper in a real implementation
  // For now, return placeholder info
  return {
    name: 'Mapped Genre Name',
    code: 'MAPPED-CODE',
    dsp: props.targetDSP
  }
})

// Methods
const loadParentGenres = () => {
  parentGenres.value = getParentGenres(props.dsp)
}

const loadSubgenres = (parentCode) => {
  subgenres.value = getSubgenres(parentCode, props.dsp)
}

const selectParentGenre = (genre) => {
  selectedParent.value = genre.code
  
  if (genre.hasChildren) {
    loadSubgenres(genre.code)
  } else {
    // If no children, select this as the genre
    emit('update:modelValue', genre.code)
    emit('update:subgenreValue', '')
    selectedParent.value = genre.code
  }
}

const selectSubgenre = (subgenre) => {
  const parent = getGenreByCode(subgenre.parent, props.dsp)
  emit('update:modelValue', parent?.code || '')
  emit('update:subgenreValue', subgenre.code)
}

const selectGenreFromSearch = (result) => {
  // Determine if it's a parent or subgenre based on path length
  if (result.path.length === 2) {
    // It's a parent genre
    emit('update:modelValue', result.code)
    emit('update:subgenreValue', '')
    selectedParent.value = result.code
    
    // Load subgenres if it has any
    const genre = parentGenres.value.find(g => g.code === result.code)
    if (genre?.hasChildren) {
      loadSubgenres(result.code)
    }
  } else if (result.path.length === 3) {
    // It's a subgenre - find its parent
    const parentName = result.path[1]
    const parent = parentGenres.value.find(g => g.name === parentName)
    
    if (parent) {
      selectedParent.value = parent.code
      loadSubgenres(parent.code)
      emit('update:modelValue', parent.code)
      emit('update:subgenreValue', result.code)
    }
  }
  
  clearSearch()
}

const handleSearch = () => {
  if (searchQuery.value.length >= 2) {
    searchResults.value = searchGenres(searchQuery.value, props.dsp)
  } else {
    searchResults.value = []
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
}

const clearSelection = () => {
  emit('update:modelValue', '')
  emit('update:subgenreValue', '')
  selectedParent.value = ''
  subgenres.value = []
}

const getParentName = (code) => {
  const genre = parentGenres.value.find(g => g.code === code)
  return genre?.name || ''
}

// Initialize selected parent if a genre is already selected
const initializeSelection = () => {
  if (props.subgenreValue) {
    // If we have a subgenre selected, find its parent
    const subgenre = getGenreByCode(props.subgenreValue, props.dsp)
    if (subgenre && subgenre.parent) {
      selectedParent.value = subgenre.parent
      loadSubgenres(subgenre.parent)
    }
  } else if (props.modelValue) {
    // If we have a parent genre selected
    const genre = getGenreByCode(props.modelValue, props.dsp)
    if (genre) {
      selectedParent.value = props.modelValue
      
      // Check if it has subgenres
      const parentGenre = parentGenres.value.find(g => g.code === props.modelValue)
      if (parentGenre?.hasChildren) {
        loadSubgenres(props.modelValue)
      }
    }
  }
}

// Lifecycle
onMounted(() => {
  loadParentGenres()
  // Wait for parent genres to load before initializing selection
  setTimeout(initializeSelection, 100)
})

// Watch for external changes
watch(() => [props.modelValue, props.subgenreValue], () => {
  if (parentGenres.value.length > 0) {
    initializeSelection()
  }
}, { deep: true })

watch(() => props.dsp, () => {
  loadParentGenres()
  clearSelection()
  setTimeout(initializeSelection, 100)
})
</script>

<template>
  <div class="genre-selector">
    <!-- Genre Source Info -->
    <div v-if="dsp !== 'genre-truth'" class="genre-source-info">
      <div class="source-badge">
        <font-awesome-icon icon="info-circle" />
        Using {{ dsp.toUpperCase() }} genre taxonomy
      </div>
    </div>

    <!-- Search Input -->
    <div class="genre-search">
      <input
        v-model="searchQuery"
        type="text"
        class="form-input"
        placeholder="Search genres..."
        @input="handleSearch"
      />
      <font-awesome-icon 
        v-if="searchQuery" 
        icon="times" 
        class="clear-search"
        @click="clearSearch"
      />
    </div>
    
    <!-- Search Results -->
    <div v-if="searchQuery && searchResults.length > 0" class="search-results">
      <div class="results-header">
        Search Results ({{ searchResults.length }})
      </div>
      <div 
        v-for="result in searchResults" 
        :key="result.code"
        class="search-result-item"
        @click="selectGenreFromSearch(result)"
      >
        <div class="result-name">{{ result.name }}</div>
        <div class="result-path">{{ result.pathString }}</div>
        <div v-if="result.code === selectedGenre" class="result-selected">
          <font-awesome-icon icon="check" />
        </div>
      </div>
    </div>
    
    <!-- Genre Tree Navigation -->
    <div v-else class="genre-tree">
      <!-- Selected Genre Display -->
      <div v-if="selectedGenre" class="selected-genre">
        <div class="selected-header">
          <div class="selected-label">Selected Genre:</div>
          <font-awesome-icon 
            icon="times" 
            class="clear-selection"
            @click="clearSelection"
            title="Clear selection"
          />
        </div>
        <div class="selected-details">
          <div class="selected-name">{{ selectedGenreInfo?.name }}</div>
          <div class="selected-path">{{ selectedGenrePath }}</div>
          <div class="selected-code">Code: {{ selectedGenre }}</div>
        </div>
        
        <!-- Mapping Info (if applicable) -->
        <div v-if="showMappingInfo && targetDSP && mappedGenreInfo" class="mapping-info">
          <div class="mapping-arrow">
            <font-awesome-icon icon="arrow-right" />
          </div>
          <div class="mapped-genre">
            <div class="mapped-dsp">{{ targetDSP.toUpperCase() }}</div>
            <div class="mapped-name">{{ mappedGenreInfo.name }}</div>
            <div class="mapped-code">{{ mappedGenreInfo.code }}</div>
          </div>
        </div>
      </div>
      
      <!-- Parent Genres Grid -->
      <div class="genre-level parent-genres">
        <div class="level-header">
          <font-awesome-icon icon="music" />
          Main Genres
        </div>
        <div class="genre-grid">
          <div
            v-for="genre in parentGenres"
            :key="genre.code"
            class="genre-item parent-genre"
            :class="{ 
              selected: selectedParent === genre.code,
              'has-children': genre.hasChildren,
              'is-final-selection': modelValue === genre.code && !subgenreValue
            }"
            @click="selectParentGenre(genre)"
          >
            <div class="genre-content">
              <div class="genre-name">{{ genre.name }}</div>
              <div class="genre-indicators">
                <font-awesome-icon 
                  v-if="genre.hasChildren" 
                  icon="chevron-right" 
                  class="expand-icon"
                />
                <font-awesome-icon 
                  v-if="modelValue === genre.code && !subgenreValue" 
                  icon="check-circle" 
                  class="selected-icon"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Subgenres Grid -->
      <div v-if="selectedParent && subgenres.length > 0" class="genre-level subgenres">
        <div class="level-header">
          <font-awesome-icon icon="list" />
          {{ getParentName(selectedParent) }} Subgenres
          <span class="subgenre-count">({{ subgenres.length }})</span>
        </div>
        <div class="genre-grid">
          <div
            v-for="subgenre in subgenres"
            :key="subgenre.code"
            class="genre-item subgenre"
            :class="{ selected: subgenreValue === subgenre.code }"
            @click="selectSubgenre(subgenre)"
          >
            <div class="genre-content">
              <div class="genre-name">{{ subgenre.name }}</div>
              <div class="genre-indicators">
                <font-awesome-icon 
                  v-if="subgenreValue === subgenre.code" 
                  icon="check-circle" 
                  class="selected-icon"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Helper Text -->
      <div v-if="!selectedGenre" class="helper-text">
        <font-awesome-icon icon="hand-pointer" />
        Select a main genre to begin, or use the search above to find specific genres
      </div>
    </div>
    
    <!-- No Search Results -->
    <div v-if="searchQuery && searchResults.length === 0" class="no-results">
      <font-awesome-icon icon="search" />
      <div>No genres found matching "{{ searchQuery }}"</div>
      <div class="no-results-hint">Try a different search term or browse the categories below</div>
    </div>
  </div>
</template>

<style scoped>
.genre-selector {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  max-height: 600px;
  overflow-y: auto;
}

/* Genre Source Info */
.genre-source-info {
  margin-bottom: var(--space-md);
}

.source-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  background-color: var(--color-info);
  color: white;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

/* Search */
.genre-search {
  position: relative;
  margin-bottom: var(--space-md);
}

.genre-search .form-input {
  width: 100%;
  padding-right: calc(var(--space-md) * 2 + 1rem);
}

.clear-search {
  position: absolute;
  right: var(--space-md);
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color var(--transition-base);
}

.clear-search:hover {
  color: var(--color-error);
}

/* Search Results */
.search-results {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
}

.results-header {
  padding: var(--space-sm) var(--space-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-tertiary);
}

.search-result-item {
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  transition: background-color var(--transition-base);
  border-bottom: 1px solid var(--color-border-light);
  position: relative;
  display: flex;
  flex-direction: column;
}

.search-result-item:hover {
  background-color: var(--color-primary-light);
}

.search-result-item:last-child {
  border-bottom: none;
}

.result-name {
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.result-path {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.result-selected {
  position: absolute;
  top: 50%;
  right: var(--space-md);
  transform: translateY(-50%);
  color: var(--color-success);
}

/* Selected Genre Display */
.selected-genre {
  background-color: var(--color-primary-light);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
}

.selected-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.selected-label {
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.clear-selection {
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color var(--transition-base);
  padding: var(--space-xs);
}

.clear-selection:hover {
  color: var(--color-error);
}

.selected-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.selected-name {
  font-weight: var(--font-semibold);
  color: var(--color-text);
  font-size: var(--text-lg);
}

.selected-path {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.selected-code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  background-color: var(--color-bg-secondary);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  display: inline-block;
  width: fit-content;
}

/* Mapping Info */
.mapping-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-primary);
}

.mapping-arrow {
  color: var(--color-primary);
  font-size: var(--text-lg);
}

.mapped-genre {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mapped-dsp {
  font-weight: var(--font-semibold);
  color: var(--color-secondary);
  font-size: var(--text-xs);
  text-transform: uppercase;
}

.mapped-name {
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.mapped-code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Genre Levels */
.genre-level {
  margin-bottom: var(--space-xl);
}

.genre-level:last-child {
  margin-bottom: 0;
}

.level-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.subgenre-count {
  color: var(--color-text-tertiary);
  font-weight: var(--font-normal);
  text-transform: none;
}

/* Genre Grid */
.genre-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-sm);
}

.genre-item {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  overflow: hidden;
}

.genre-item:hover {
  background-color: var(--color-surface-hover);
  border-color: var(--color-primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.genre-item.selected {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.genre-item.is-final-selection {
  background-color: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.genre-content {
  padding: var(--space-sm) var(--space-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
}

.genre-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: 1.3;
  flex: 1;
}

.genre-indicators {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-left: var(--space-sm);
}

.expand-icon {
  font-size: var(--text-xs);
  opacity: 0.6;
  transition: opacity var(--transition-base);
}

.selected-icon {
  font-size: var(--text-sm);
  color: currentColor;
}

.genre-item.selected .expand-icon,
.genre-item.is-final-selection .expand-icon {
  opacity: 1;
}

/* Subgenres */
.subgenre {
  background-color: var(--color-surface);
}

.subgenre.selected {
  background-color: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

/* Helper Text */
.helper-text {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

/* No Results */
.no-results {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.no-results-hint {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Scrollbar Styling */
.genre-selector::-webkit-scrollbar,
.search-results::-webkit-scrollbar {
  width: 6px;
}

.genre-selector::-webkit-scrollbar-track,
.search-results::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
}

.genre-selector::-webkit-scrollbar-thumb,
.search-results::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

.genre-selector::-webkit-scrollbar-thumb:hover,
.search-results::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-dark);
}

/* Responsive Design */
@media (max-width: 768px) {
  .genre-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
  
  .genre-selector {
    padding: var(--space-md);
  }
  
  .mapping-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .mapping-arrow {
    transform: rotate(90deg);
  }
}

@media (max-width: 480px) {
  .genre-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .genre-content {
    padding: var(--space-sm);
    min-height: 40px;
  }
  
  .genre-name {
    font-size: var(--text-xs);
  }
}
</style>