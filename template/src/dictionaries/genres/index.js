// src/dictionaries/genres/index.js
/**
 * Genre Dictionary Service
 * Provides access to genre dictionaries and basic fallback mappings
 * Custom mappings in Firestore (via GenreMaps.vue) take precedence over these defaults
 */

import DEFAULT_GENRES from './default.js'
import GENRE_TRUTH from './genre-truth.js'

// Keep the static imports but make them conditional for the heavy ones
let APPLE_GENRES = null
let BEATPORT_GENRES = null
let AMAZON_GENRES = null

export class GenreService {
  constructor() {
    // Registry of available genre dictionaries - start with core ones
    this.providers = {
      'default': DEFAULT_GENRES,
      'genre-truth': GENRE_TRUTH,
    }
    
    this.currentProvider = 'genre-truth' // Default to Genre Truth
    
    // Initialize basic fallback mappings
    this.initializeFallbackMappings()
    
    // Track loading state for lazy dictionaries
    this.loadingPromises = {}
  }
  
  /**
   * Initialize basic fallback mappings
   * These are overridden by custom Firestore mappings when available
   */
  initializeFallbackMappings() {
    this.fallbackMappings = new Map()
    
    // Apple 5.3.9 mapping (1:1 since it's our truth source)
    this.fallbackMappings.set('apple', {
      type: 'identity',
      version: '1.0.0'
    })
    
    // Beatport basic mappings - mostly electronic/dance focused
    this.fallbackMappings.set('beatport', {
      type: 'basic',
      version: '2025-05',
      mappings: {
        // Core electronic genres
        'HOUSE-00': 'BP-HOUSE-00',
        'TECHNO-00': 'BP-TECHNO-PEAK-00',
        'DUBSTEP-00': 'BP-DUBSTEP-00',
        'DRUM-BASS-00': 'BP-DRUM-BASS-00',
        'GARAGE-00': 'BP-UK-GARAGE-00',
        'AMBIENT-00': 'BP-AMBIENT-00',
        'DOWNTEMPO-00': 'BP-DOWNTEMPO-00',
        
        // General electronic
        'ELECTRONIC-00': 'BP-ELECTRONICA-00',
        'DANCE-00': 'BP-DANCE-POP-00',
        'DANCE-POP-00': 'BP-DANCE-POP-00'
      },
      fallback: 'BP-DANCE-POP-00' // Everything else goes to Dance Pop
    })
    
    // Amazon basic mappings - broader genre coverage
    this.fallbackMappings.set('amazon', {
      type: 'basic',
      version: '2018-05',
      mappings: {
        // Major genre categories
        'HIP-HOP-RAP-00': 'AM-RAP-00',
        'ELECTRONIC-00': 'AM-DANCE-00',
        'POP-00': 'AM-POP-00',
        'R-B-SOUL-00': 'AM-RB-00',
        'LATIN-00': 'AM-LATIN-00',
        'ALTERNATIVE-00': 'AM-ALTERNATIVE-00',
        'K-POP-00': 'AM-K-POP-00',
        
        // Some common sub-genres
        'HOUSE-00': 'AM-DANCE-HOUSE',
        'TECHNO-00': 'AM-DANCE-TECHNO',
        'DUBSTEP-00': 'AM-DANCE-DUBSTEP'
      },
      fallback: 'AM-POP-00' // Everything else goes to Pop
    })
  }
  
  /**
   * Lazy load DSP-specific dictionaries
   */
  async loadDSPDictionary(dsp) {
    // If already loaded, return immediately
    if (this.providers[dsp]) {
      return this.providers[dsp]
    }
    
    // If currently loading, wait for the promise
    if (this.loadingPromises[dsp]) {
      return this.loadingPromises[dsp]
    }
    
    // Start loading
    let loadPromise
    
    switch(dsp) {
      case 'apple':
      case 'apple-539':
        loadPromise = import('./apple-539.js').then(module => {
          APPLE_GENRES = module.default
          this.providers['apple'] = APPLE_GENRES
          this.providers['apple-539'] = APPLE_GENRES
          return APPLE_GENRES
        })
        this.loadingPromises['apple'] = loadPromise
        this.loadingPromises['apple-539'] = loadPromise
        break
        
      case 'beatport':
      case 'beatport-202505':
        loadPromise = import('./beatport-202505.js').then(module => {
          BEATPORT_GENRES = module.default
          this.providers['beatport'] = BEATPORT_GENRES
          this.providers['beatport-202505'] = BEATPORT_GENRES
          return BEATPORT_GENRES
        })
        this.loadingPromises['beatport'] = loadPromise
        this.loadingPromises['beatport-202505'] = loadPromise
        break
        
      case 'amazon':
      case 'amazon-201805':
        loadPromise = import('./amazon-201805.js').then(module => {
          AMAZON_GENRES = module.default
          this.providers['amazon'] = AMAZON_GENRES
          this.providers['amazon-201805'] = AMAZON_GENRES
          return AMAZON_GENRES
        })
        this.loadingPromises['amazon'] = loadPromise
        this.loadingPromises['amazon-201805'] = loadPromise
        break
        
      default:
        return this.providers['genre-truth']
    }
    
    return loadPromise
  }
  
  /**
   * Get fallback mapping for a genre
   * NOTE: Custom Firestore mappings should be checked first - these are just defaults
   */
  getFallbackMapping(genreCode, targetDSP) {
    if (!genreCode || targetDSP === 'genre-truth') {
      return genreCode // No mapping needed
    }
    
    const dspMapping = this.fallbackMappings.get(targetDSP)
    if (!dspMapping) {
      console.warn(`No fallback mappings available for DSP: ${targetDSP}`)
      return null
    }
    
    // Identity mapping (1:1)
    if (dspMapping.type === 'identity') {
      return genreCode
    }
    
    // Basic mapping with fallback
    if (dspMapping.type === 'basic') {
      return dspMapping.mappings[genreCode] || dspMapping.fallback
    }
    
    return null
  }
  
  /**
   * Get genres for a specific DSP
   * Made async to support lazy loading
   */
  async getGenresForDSP(dsp = 'genre-truth') {
    // For core dictionaries, return immediately
    if (this.providers[dsp]) {
      return this.providers[dsp]
    }
    
    // For DSP-specific, load lazily
    return this.loadDSPDictionary(dsp)
  }
  
  /**
   * Get genres for DSP synchronously (for backward compatibility)
   * Returns null if not loaded yet
   */
  getGenresForDSPSync(dsp = 'genre-truth') {
    return this.providers[dsp] || null
  }
  
  /**
   * Get all parent genres (top-level)
   */
  async getParentGenres(dsp = 'genre-truth') {
    const genres = await this.getGenresForDSP(dsp)
    
    if (!genres || !genres.tree) {
      console.warn(`No tree structure available for DSP: ${dsp}`)
      return []
    }
    
    return Object.entries(genres.tree)
      .map(([name, data]) => ({
        name,
        code: data.code,
        hasChildren: Object.keys(data.children || {}).length > 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  
  /**
   * Get subgenres for a parent genre
   */
  async getSubgenres(parentCode, dsp = 'genre-truth') {
    const genres = await this.getGenresForDSP(dsp)
    
    if (!genres) return []
    
    const parentGenre = genres.byCode[parentCode]
    
    if (!parentGenre || !genres.tree) return []
    
    // Find in tree structure
    for (const [name, data] of Object.entries(genres.tree)) {
      if (data.code === parentCode) {
        return Object.entries(data.children || {})
          .map(([childName, childData]) => ({
            name: childName,
            code: childData.code,
            parent: parentCode
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }
      
      // Check nested children
      if (data.children) {
        for (const [childName, childData] of Object.entries(data.children)) {
          if (childData.code === parentCode && childData.children) {
            return Object.entries(childData.children)
              .map(([subName, subData]) => ({
                name: subName,
                code: subData.code,
                parent: parentCode
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
          }
        }
      }
    }
    
    return []
  }
  
  /**
   * Search genres across all levels
   */
  async searchGenres(query, dsp = 'genre-truth') {
    const genres = await this.getGenresForDSP(dsp)
    const lowerQuery = query.toLowerCase()
    const results = []
    
    if (!genres || !genres.byCode) {
      console.warn(`No byCode structure available for DSP: ${dsp}`)
      return []
    }
    
    Object.entries(genres.byCode).forEach(([code, genre]) => {
      if (genre.name.toLowerCase().includes(lowerQuery) || 
          code.toLowerCase().includes(lowerQuery)) {
        results.push({
          code,
          name: genre.name,
          path: genre.path,
          pathString: genre.path.join(' > ')
        })
      }
    })
    
    return results.sort((a, b) => a.name.localeCompare(b.name))
  }
  
  /**
   * Get genre info by code
   */
  async getGenreByCode(code, dsp = 'genre-truth') {
    const genres = await this.getGenresForDSP(dsp)
    return genres && genres.byCode ? genres.byCode[code] || null : null
  }
  
  /**
   * Get formatted genre path
   */
  async getGenrePath(code, dsp = 'genre-truth') {
    const genre = await this.getGenreByCode(code, dsp)
    return genre ? genre.path.join(' > ') : ''
  }
  
  /**
   * Validate if a genre code exists
   */
  async isValidGenre(code, dsp = 'genre-truth') {
    const genre = await this.getGenreByCode(code, dsp)
    return !!genre
  }
  
  /**
   * Get available DSP providers
   */
  getAvailableProviders() {
    const providers = [
      { id: 'default', loaded: true },
      { id: 'genre-truth', loaded: true },
      { id: 'apple', loaded: !!this.providers['apple'] },
      { id: 'beatport', loaded: !!this.providers['beatport'] },
      { id: 'amazon', loaded: !!this.providers['amazon'] }
    ]
    
    return providers.map(p => ({
      id: p.id,
      name: this.getProviderDisplayName(p.id),
      version: p.loaded && this.providers[p.id] ? 
        (this.providers[p.id].version || 'Unknown') : 'Not Loaded',
      genreCount: p.loaded && this.providers[p.id] && this.providers[p.id].byCode ? 
        Object.keys(this.providers[p.id].byCode).length : 0,
      hasFallbackMappings: this.fallbackMappings.has(p.id),
      loaded: p.loaded
    }))
  }
  
  /**
   * Get display name for provider
   */
  getProviderDisplayName(id) {
    const displayNames = {
      'default': 'Default',
      'genre-truth': 'Genre Truth',
      'apple': 'Apple Music',
      'apple-539': 'Apple Music 5.3.9',
      'beatport': 'Beatport',
      'beatport-202505': 'Beatport 2025-05',
      'amazon': 'Amazon Music',
      'amazon-201805': 'Amazon Music 2018-05',
      'spotify': 'Spotify'
    }
    return displayNames[id] || id
  }
  
  /**
   * Get all genres as flat list
   */
  async getAllGenres(dsp = 'genre-truth') {
    const genres = await this.getGenresForDSP(dsp)
    
    if (!genres || !genres.byCode) {
      console.warn(`No byCode structure available for DSP: ${dsp}`)
      return []
    }
    
    return Object.entries(genres.byCode)
      .map(([code, genre]) => ({
        code,
        name: genre.name,
        path: genre.path,
        pathString: genre.path.join(' > ')
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  
  /**
   * Get XML notation for Amazon genres (with proper escaping)
   */
  getAmazonXmlNotation(code) {
    const amazonGenre = this.providers['amazon']?.byCode?.[code]
    return amazonGenre ? amazonGenre.xmlNotation : null
  }
  
  /**
   * Check if a DSP is available
   */
  hasDSP(dsp) {
    return !!this.providers[dsp] || ['apple', 'beatport', 'amazon'].includes(dsp)
  }
  
  /**
   * Get fallback stats for a DSP
   */
  getFallbackStats(targetDSP) {
    const dspMapping = this.fallbackMappings.get(targetDSP)
    if (!dspMapping) {
      return { mapped: 0, fallback: null }
    }
    
    return {
      mapped: Object.keys(dspMapping.mappings || {}).length,
      fallback: dspMapping.fallback,
      fallbackName: this.getGenreByCodeSync(dspMapping.fallback, targetDSP)?.name
    }
  }
  
  /**
   * Synchronous version for backward compatibility
   */
  getGenreByCodeSync(code, dsp = 'genre-truth') {
    const genres = this.providers[dsp]
    return genres && genres.byCode ? genres.byCode[code] || null : null
  }
}

// Export singleton instance
export const genreService = new GenreService()

// Export convenience functions - now async where needed
export const getGenresForDSP = async (dsp = 'genre-truth') => genreService.getGenresForDSP(dsp)
export const getParentGenres = async (dsp = 'genre-truth') => genreService.getParentGenres(dsp)
export const getSubgenres = async (parentCode, dsp = 'genre-truth') => genreService.getSubgenres(parentCode, dsp)
export const searchGenres = async (query, dsp = 'genre-truth') => genreService.searchGenres(query, dsp)
export const getGenreByCode = async (code, dsp = 'genre-truth') => genreService.getGenreByCode(code, dsp)
export const getGenrePath = async (code, dsp = 'genre-truth') => genreService.getGenrePath(code, dsp)
export const isValidGenre = async (code, dsp = 'genre-truth') => genreService.isValidGenre(code, dsp)
export const getAllGenres = async (dsp = 'genre-truth') => genreService.getAllGenres(dsp)
export const getAvailableProviders = () => genreService.getAvailableProviders()
export const getAmazonXmlNotation = (code) => genreService.getAmazonXmlNotation(code)
export const hasDSP = (dsp) => genreService.hasDSP(dsp)
export const getFallbackMapping = (genreCode, targetDSP) => genreService.getFallbackMapping(genreCode, targetDSP)
export const getFallbackStats = (targetDSP) => genreService.getFallbackStats(targetDSP)

export default genreService