// src/dictionaries/genres/mappings.js
/**
 * Genre Mapping System
 * Maps from Genre Truth to DSP-specific implementations
 */

export class GenreMapper {
  constructor() {
    this.mappings = new Map()
    this.loadMappings()
  }

  loadMappings() {
    // Apple mapping (1:1 since it's our source)
    this.mappings.set('apple', {
      type: 'identity', // 1:1 mapping since it's our source
      version: '5.3.9'
    })

    // Beatport mapping (complex hierarchical mapping)
    this.mappings.set('beatport', {
      type: 'hierarchical',
      version: '2025-05',
      rules: this.getBeatportMappings()
    })
  }

  getBeatportMappings() {
    return {
      // Electronic music mappings
      'HOUSE-00': 'BP-HOUSE-00',
      'ACID': 'BP-HOUSE-ACID',
      'DEEP-HOUSE-00': 'BP-DEEP-HOUSE-00',
      'TECH-HOUSE-00': 'BP-TECH-HOUSE-00',
      'BASS-HOUSE-00': 'BP-BASS-HOUSE-00',
      
      // Techno mappings
      'TECHNO-00': 'BP-TECHNO-PEAK-00', // Default to Peak Time
      'MINIMAL-00': 'BP-MINIMAL-00',
      'HARD-TECHNO-00': 'BP-HARD-TECHNO-00',
      
      // Trance mappings
      'TRANCE-00': 'BP-TRANCE-MAIN-00',
      'PSY-TRANCE-00': 'BP-PSY-TRANCE-00',
      
      // Other electronic
      'DUBSTEP-00': 'BP-DUBSTEP-00',
      'DRUM-BASS-00': 'BP-DRUM-BASS-00',
      'BREAKBEAT-00': 'BP-BREAKS-00',
      
      // Fallback for unmapped genres
      '*': 'BP-ELECTRONICA-00' // Default fallback
    }
  }

  mapGenre(truthCode, targetDSP) {
    const mapping = this.mappings.get(targetDSP)
    if (!mapping) return null

    if (mapping.type === 'identity') {
      return truthCode // Direct mapping for Apple
    }

    if (mapping.type === 'hierarchical') {
      return mapping.rules[truthCode] || mapping.rules['*']
    }

    return null
  }
}