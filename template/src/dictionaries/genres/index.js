// src/dictionaries/genres/index.js
/**
 * Genre Dictionary Service
 * Manages genre mappings across different DSPs with Genre Truth System
 */

import DEFAULT_GENRES from './default.js'
import GENRE_TRUTH from './genre-truth.js'
import APPLE_GENRES from './apple-539.js'
import BEATPORT_GENRES from './beatport-202505.js'

// Future DSP mappings will be imported here
// import SPOTIFY_GENRES from './spotify.js'
// import AMAZON_GENRES from './amazon.js'

export class GenreService {
  constructor() {
    this.providers = {
      'default': DEFAULT_GENRES,
      'genre-truth': GENRE_TRUTH,
      'apple': APPLE_GENRES,
      'apple-539': APPLE_GENRES, // Alias for compatibility
      'beatport': BEATPORT_GENRES,
      // 'spotify': SPOTIFY_GENRES,
      // 'amazon': AMAZON_GENRES
    }
    
    this.currentProvider = 'genre-truth' // Changed from 'default'
    
    // Initialize mapping system
    this.initializeMappings()
  }
  
  /**
   * Initialize genre mappings between providers
   */
  initializeMappings() {
    this.mappings = new Map()
    
    // Apple 5.3.9 mapping (1:1 since it's our truth source)
    this.mappings.set('apple', this.createIdentityMapping())
    this.mappings.set('apple-539', this.createIdentityMapping())
    
    // Beatport mappings (complex hierarchical)
    this.mappings.set('beatport', this.createBeatportMappings())
  }
  
  /**
   * Create identity mapping (1:1) for truth source
   */
  createIdentityMapping() {
    return {
      type: 'identity',
      version: '1.0.0'
    }
  }
  
  /**
   * Create Beatport-specific mappings
   */
  createBeatportMappings() {
    return {
      type: 'hierarchical',
      version: '2025-05',
      rules: {
        // Electronic Dance Music mappings
        'HOUSE-00': 'BP-HOUSE-00',
        'TECHNO-00': 'BP-TECHNO-PEAK-00',
        'TRANCE-00': 'BP-TRANCE-MAIN-00',
        'DUBSTEP-00': 'BP-DUBSTEP-00',
        'JUNGLE-DRUM-N-BASS-00': 'BP-DRUM-BASS-00',
        'BREAKBEAT-00': 'BP-BREAKS-00',
        'GARAGE-00': 'BP-UK-GARAGE-00',
        'HARDCORE-00': 'BP-HARD-DANCE-00',
        
        // Sub-genre mappings
        'AMBIENT-00': 'BP-AMBIENT-00',
        'BASS-00': 'BP-BASS-HOUSE-00',
        'DOWNTEMPO-00': 'BP-DOWNTEMPO-00',
        'ELECTRONICA-00': 'BP-ELECTRONICA-00',
        'IDM-EXPERIMENTAL-00': 'BP-AMBIENT-00',
        'INDUSTRIAL-00': 'BP-HARD-DANCE-00',
        
        // African genre mappings
        'AFRO-HOUSE-00': 'BP-AFRO-HOUSE-00',
        'AMAPIANO-00': 'BP-AMAPIANO-00',
        
        // Brazilian mappings
        'BRAZILIAN-00': 'BP-BRAZILIAN-FUNK-00',
        
        // Default fallback for electronic genres
        'ELECTRONIC-00': 'BP-ELECTRONICA-00',
        'DANCE-00': 'BP-HOUSE-00',
        
        // Non-electronic fallback
        '*': null // No mapping for non-electronic genres
      }
    }
  }
  
  /**
   * Get genres for a specific DSP
   */
  getGenresForDSP(dsp = 'genre-truth') {
    return this.providers[dsp] || this.providers['genre-truth']
  }
  
  /**
   * Map a genre from truth source to target DSP
   */
  mapGenre(genreCode, targetDSP) {
    if (!genreCode || targetDSP === 'genre-truth') {
      return genreCode // No mapping needed
    }
    
    const mapping = this.mappings.get(targetDSP)
    if (!mapping) {
      console.warn(`No mapping available for DSP: ${targetDSP}`)
      return null
    }
    
    if (mapping.type === 'identity') {
      return genreCode // Direct mapping
    }
    
    if (mapping.type === 'hierarchical') {
      return mapping.rules[genreCode] || mapping.rules['*'] || null
    }
    
    return null
  }
  
  /**
   * Get mapping info for a genre
   */
  getMappingInfo(genreCode, targetDSP) {
    const mappedCode = this.mapGenre(genreCode, targetDSP)
    if (!mappedCode) return null
    
    const targetGenres = this.getGenresForDSP(targetDSP)
    const mappedGenre = targetGenres.byCode[mappedCode]
    
    return {
      sourceCode: genreCode,
      targetCode: mappedCode,
      targetGenre: mappedGenre,
      dsp: targetDSP,
      mappingType: this.mappings.get(targetDSP)?.type || 'unknown'
    }
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
      if (genre.name.toLowerCase().includes(lowerQuery)) {
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
    return Object.keys(this.providers).map(id => ({
      id,
      name: this.getProviderDisplayName(id),
      version: this.providers[id].version || 'Unknown'
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
      'spotify': 'Spotify',
      'amazon': 'Amazon Music'
    }
    return displayNames[id] || id
  }
  
  /**
   * Get mapping statistics
   */
  getMappingStats(targetDSP) {
    if (!this.mappings.has(targetDSP)) {
      return { total: 0, mapped: 0, unmapped: 0, percentage: 0 }
    }
    
    const truthGenres = Object.keys(this.providers['genre-truth'].byCode)
    const totalCount = truthGenres.length
    let mappedCount = 0
    
    truthGenres.forEach(code => {
      if (this.mapGenre(code, targetDSP)) {
        mappedCount++
      }
    })
    
    return {
      total: totalCount,
      mapped: mappedCount,
      unmapped: totalCount - mappedCount,
      percentage: Math.round((mappedCount / totalCount) * 100)
    }
  }
}

// Export singleton instance
export const genreService = new GenreService()

// Export convenience functions that now use Genre Truth by default
export const getParentGenres = (dsp = 'genre-truth') => genreService.getParentGenres(dsp)
export const getSubgenres = (parentCode, dsp = 'genre-truth') => genreService.getSubgenres(parentCode, dsp)
export const searchGenres = (query, dsp = 'genre-truth') => genreService.searchGenres(query, dsp)
export const getGenreByCode = (code, dsp = 'genre-truth') => genreService.getGenreByCode(code, dsp)
export const getGenrePath = (code, dsp = 'genre-truth') => genreService.getGenrePath(code, dsp)
export const mapGenre = (genreCode, targetDSP) => genreService.mapGenre(genreCode, targetDSP)
export const getMappingInfo = (genreCode, targetDSP) => genreService.getMappingInfo(genreCode, targetDSP)
export const getMappingStats = (targetDSP) => genreService.getMappingStats(targetDSP)

export default genreService