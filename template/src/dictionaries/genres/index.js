// src/dictionaries/genres/index.js
/**
 * Genre Dictionary Service
 * Provides access to genre dictionaries and basic fallback mappings
 * Custom mappings in Firestore (via GenreMaps.vue) take precedence over these defaults
 */

import DEFAULT_GENRES from './default.js'
import GENRE_TRUTH from './genre-truth.js'
import APPLE_GENRES from './apple-539.js'
import BEATPORT_GENRES from './beatport-202505.js'
import AMAZON_GENRES from './amazon-201805.js'

// Future DSP dictionaries will be imported here
// import SPOTIFY_GENRES from './spotify.js'

export class GenreService {
  constructor() {
    // Registry of available genre dictionaries
    this.providers = {
      'default': DEFAULT_GENRES,
      'genre-truth': GENRE_TRUTH,
      'apple': APPLE_GENRES,
      'apple-539': APPLE_GENRES, // Alias for compatibility
      'beatport': BEATPORT_GENRES,
      'beatport-202505': BEATPORT_GENRES, // Alias with version
      'amazon': AMAZON_GENRES,
      'amazon-201805': AMAZON_GENRES, // Alias with version
      // 'spotify': SPOTIFY_GENRES,
    }
    
    this.currentProvider = 'genre-truth' // Default to Genre Truth
    
    // Initialize basic fallback mappings
    this.initializeFallbackMappings()
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
   */
  getGenresForDSP(dsp = 'genre-truth') {
    return this.providers[dsp] || this.providers['genre-truth']
  }
  
  /**
   * Get all parent genres (top-level)
   */
  getParentGenres(dsp = 'genre-truth') {
    const genres = this.getGenresForDSP(dsp)
    
    if (!genres.tree) {
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
  getSubgenres(parentCode, dsp = 'genre-truth') {
    const genres = this.getGenresForDSP(dsp)
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
  searchGenres(query, dsp = 'genre-truth') {
    const genres = this.getGenresForDSP(dsp)
    const lowerQuery = query.toLowerCase()
    const results = []
    
    if (!genres.byCode) {
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
  getGenreByCode(code, dsp = 'genre-truth') {
    const genres = this.getGenresForDSP(dsp)
    return genres.byCode ? genres.byCode[code] || null : null
  }
  
  /**
   * Get formatted genre path
   */
  getGenrePath(code, dsp = 'genre-truth') {
    const genre = this.getGenreByCode(code, dsp)
    return genre ? genre.path.join(' > ') : ''
  }
  
  /**
   * Validate if a genre code exists
   */
  isValidGenre(code, dsp = 'genre-truth') {
    return !!this.getGenreByCode(code, dsp)
  }
  
  /**
   * Get available DSP providers
   */
  getAvailableProviders() {
    return Object.keys(this.providers)
      .filter(id => !id.includes('-') || id === 'genre-truth') // Filter out version aliases except genre-truth
      .map(id => ({
        id,
        name: this.getProviderDisplayName(id),
        version: this.providers[id].version || 'Unknown',
        genreCount: Object.keys(this.providers[id].byCode || {}).length,
        hasFallbackMappings: this.fallbackMappings.has(id)
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
  getAllGenres(dsp = 'genre-truth') {
    const genres = this.getGenresForDSP(dsp)
    
    if (!genres.byCode) {
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
    const amazonGenre = AMAZON_GENRES.byCode[code]
    return amazonGenre ? amazonGenre.xmlNotation : null
  }
  
  /**
   * Check if a DSP is available
   */
  hasDSP(dsp) {
    return !!this.providers[dsp]
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
      fallbackName: this.getGenreByCode(dspMapping.fallback, targetDSP)?.name
    }
  }
}

// Export singleton instance
export const genreService = new GenreService()

// Export convenience functions
export const getGenresForDSP = (dsp = 'genre-truth') => genreService.getGenresForDSP(dsp)
export const getParentGenres = (dsp = 'genre-truth') => genreService.getParentGenres(dsp)
export const getSubgenres = (parentCode, dsp = 'genre-truth') => genreService.getSubgenres(parentCode, dsp)
export const searchGenres = (query, dsp = 'genre-truth') => genreService.searchGenres(query, dsp)
export const getGenreByCode = (code, dsp = 'genre-truth') => genreService.getGenreByCode(code, dsp)
export const getGenrePath = (code, dsp = 'genre-truth') => genreService.getGenrePath(code, dsp)
export const isValidGenre = (code, dsp = 'genre-truth') => genreService.isValidGenre(code, dsp)
export const getAllGenres = (dsp = 'genre-truth') => genreService.getAllGenres(dsp)
export const getAvailableProviders = () => genreService.getAvailableProviders()
export const getAmazonXmlNotation = (code) => genreService.getAmazonXmlNotation(code)
export const hasDSP = (dsp) => genreService.hasDSP(dsp)
export const getFallbackMapping = (genreCode, targetDSP) => genreService.getFallbackMapping(genreCode, targetDSP)
export const getFallbackStats = (targetDSP) => genreService.getFallbackStats(targetDSP)

export default genreService