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
    default: 'apple'
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
  }
}

const selectSubgenre = (subgenre) => {
  const parent = getGenreByCode(subgenre.parent, props.dsp)
  emit('update:modelValue', parent?.code || '')
  emit('update:subgenreValue', subgenre.code)
}

const selectGenre = (result) => {
  // Determine if it's a parent or subgenre
  if (result.path.length === 2) {
    // It's a parent genre
    emit('update:modelValue', result.code)
    emit('update:subgenreValue', '')
  } else if (result.path.length === 3) {
    // It's a subgenre
    const parentPath = result.path.slice(0, 2)
    const parent = Object.values(getParentGenres(props.dsp))
      .find(g => g.name === parentPath[1])
    
    if (parent) {
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
  if (props.modelValue) {
    const genre = getGenreByCode(props.modelValue, props.dsp)
    if (genre) {
      selectedParent.value = genre.code
      loadSubgenres(genre.code)
    }
  } else if (props.subgenreValue) {
    const subgenre = getGenreByCode(props.subgenreValue, props.dsp)
    if (subgenre && subgenre.parent) {
      selectedParent.value = subgenre.parent
      loadSubgenres(subgenre.parent)
    }
  }
}

// Lifecycle
onMounted(() => {
  loadParentGenres()
  initializeSelection()
})

// Watch for external changes
watch(() => props.modelValue, () => {
  initializeSelection()
})
</script>

<template>
  <div class="genre-selector">
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
        @click="selectGenre(result)"
      >
        <div class="result-name">{{ result.name }}</div>
        <div class="result-path">{{ result.pathString }}</div>
      </div>
    </div>
    
    <!-- Genre Tree -->
    <div v-else class="genre-tree">
      <!-- Selected Genre Display -->
      <div v-if="selectedGenre" class="selected-genre">
        <div class="selected-label">Selected:</div>
        <div class="selected-value">
          {{ selectedGenrePath || selectedGenre }}
          <font-awesome-icon 
            icon="times" 
            class="clear-selection"
            @click="clearSelection"
          />
        </div>
      </div>
      
      <!-- Parent Genres -->
      <div class="genre-level parent-genres">
        <div class="level-header">Main Genres</div>
        <div class="genre-grid">
          <div
            v-for="genre in parentGenres"
            :key="genre.code"
            class="genre-item"
            :class="{ 
              selected: selectedParent === genre.code,
              'has-children': genre.hasChildren
            }"
            @click="selectParentGenre(genre)"
          >
            {{ genre.name }}
            <font-awesome-icon 
              v-if="genre.hasChildren" 
              icon="chevron-right" 
              class="expand-icon"
            />
          </div>
        </div>
      </div>
      
      <!-- Subgenres -->
      <div v-if="selectedParent && subgenres.length > 0" class="genre-level subgenres">
        <div class="level-header">
          Subgenres of {{ getParentName(selectedParent) }}
        </div>
        <div class="genre-grid">
          <div
            v-for="subgenre in subgenres"
            :key="subgenre.code"
            class="genre-item subgenre"
            :class="{ selected: modelValue === subgenre.code }"
            @click="selectSubgenre(subgenre)"
          >
            {{ subgenre.name }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Results -->
    <div v-if="searchQuery && searchResults.length === 0" class="no-results">
      No genres found matching "{{ searchQuery }}"
    </div>
  </div>
</template>

<style scoped>
.genre-selector {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

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
  color: var(--color-text);
}

.search-results {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  max-height: 300px;
  overflow-y: auto;
}

.results-header {
  padding: var(--space-sm) var(--space-md);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-border);
}

.search-result-item {
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  transition: background-color var(--transition-base);
  border-bottom: 1px solid var(--color-border-light);
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

.selected-genre {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background-color: var(--color-primary-light);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-md);
}

.selected-label {
  font-weight: var(--font-semibold);
  color: var(--color-primary);
}

.selected-value {
  flex: 1;
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.clear-selection {
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color var(--transition-base);
}

.clear-selection:hover {
  color: var(--color-error);
}

.genre-level {
  margin-bottom: var(--space-lg);
}

.genre-level:last-child {
  margin-bottom: 0;
}

.level-header {
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.genre-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-sm);
}

.genre-item {
  padding: var(--space-sm) var(--space-md);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.genre-item:hover {
  background-color: var(--color-surface-hover);
  border-color: var(--color-primary);
  transform: translateY(-1px);
}

.genre-item.selected {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.genre-item.has-children {
  font-weight: var(--font-medium);
}

.expand-icon {
  font-size: var(--text-xs);
  opacity: 0.6;
}

.genre-item.selected .expand-icon {
  opacity: 1;
}

.subgenre {
  background-color: var(--color-surface);
}

.no-results {
  text-align: center;
  padding: var(--space-xl);
  color: var(--color-text-secondary);
}

/* Scrollbar styling */
.search-results::-webkit-scrollbar {
  width: 6px;
}

.search-results::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.search-results::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-md);
}

.search-results::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-dark);
}

/* Responsive */
@media (max-width: 768px) {
  .genre-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}
</style>