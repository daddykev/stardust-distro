// src/dictionaries/genres/index.js
/**
 * Genre Dictionary Service
 * Manages genre mappings across different DSPs
 */

import DEFAULT_GENRES from './default.js'
import APPLE_GENRES from './apple-539.js'

// Future DSP mappings will be imported here
// import SPOTIFY_GENRES from './spotify.js'
// import BEATPORT_GENRES from './beatport.js'
// import AMAZON_GENRES from './amazon.js'

export class GenreService {
  constructor() {
    this.providers = {
      'default': DEFAULT_GENRES,
      'apple': APPLE_GENRES,
      // 'spotify': SPOTIFY_GENRES,
      // 'beatport': BEATPORT_GENRES,
      // 'amazon': AMAZON_GENRES
    }
    
    this.currentProvider = 'default'
  }
  
  /**
   * Get genres for a specific DSP
   */
  getGenresForDSP(dsp = 'default') {
    return this.providers[dsp] || this.providers.default
  }
  
  /**
   * Map a genre from one DSP to another
   */
  mapGenre(genre, fromDSP, toDSP) {
    // For now, return the same genre
    // Future implementation will have mapping tables
    return genre
  }
  
  /**
   * Get all parent genres (top-level)
   */
  getParentGenres(dsp = 'default') {
    const genres = this.getGenresForDSP(dsp)
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
  getSubgenres(parentCode, dsp = 'default') {
    const genres = this.getGenresForDSP(dsp)
    const parentGenre = genres.byCode[parentCode]
    
    if (!parentGenre) return []
    
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
  searchGenres(query, dsp = 'default') {
    const genres = this.getGenresForDSP(dsp)
    const lowerQuery = query.toLowerCase()
    const results = []
    
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
  getGenreByCode(code, dsp = 'default') {
    const genres = this.getGenresForDSP(dsp)
    return genres.byCode[code] || null
  }
  
  /**
   * Get formatted genre path
   */
  getGenrePath(code, dsp = 'default') {
    const genre = this.getGenreByCode(code, dsp)
    return genre ? genre.path.join(' > ') : ''
  }
  
  /**
   * Validate if a genre code exists
   */
  isValidGenre(code, dsp = 'default') {
    return !!this.getGenreByCode(code, dsp)
  }
}

// Export singleton instance
export const genreService = new GenreService()

// Export convenience functions
export const getParentGenres = (dsp) => genreService.getParentGenres(dsp)
export const getSubgenres = (parentCode, dsp) => genreService.getSubgenres(parentCode, dsp)
export const searchGenres = (query, dsp) => genreService.searchGenres(query, dsp)
export const getGenreByCode = (code, dsp) => genreService.getGenreByCode(code, dsp)
export const getGenrePath = (code, dsp) => genreService.getGenrePath(code, dsp)

export default genreService