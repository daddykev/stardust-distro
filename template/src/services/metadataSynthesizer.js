// src/services/metadataSynthesizer.js
class MetadataSynthesizer {
  /**
   * Synthesize metadata from multiple sources at runtime
   */
  synthesize(productMetadata, options = {}) {
    if (!productMetadata || !productMetadata.extracted) {
      return null
    }
    
    const {
      strategy = productMetadata.synthesis?.strategy || 'consensus',
      preferredSource = productMetadata.synthesis?.preferredSource || 'deezer'
    } = options
    
    const extracted = productMetadata.extracted
    const corrections = productMetadata.corrections || {}
    const sources = Object.keys(extracted)
    
    // If we only have one source, use it directly
    if (sources.length === 1) {
      const source = sources[0]
      const data = extracted[source]
      
      return {
        ...data,
        _meta: {
          synthesizedAt: new Date().toISOString(),
          strategy: 'single_source',
          source,
          sources: [source],
          hasCorrections: Object.keys(corrections).length > 0
        }
      }
    }
    
    // Build synthesized result
    const result = {
      upc: productMetadata.upc,
      title: this.selectValue('title', extracted, corrections.album?.title, strategy, preferredSource),
      artist: this.selectValue('artist', extracted, corrections.album?.artist, strategy, preferredSource),
      releaseDate: this.selectValue('releaseDate', extracted, corrections.album?.releaseDate, strategy, preferredSource),
      label: this.selectValue('label', extracted, corrections.album?.label, strategy, preferredSource),
      genre: this.selectValue('genre', extracted, corrections.album?.genre, strategy, preferredSource),
      
      // Best available cover art
      coverArt: this.selectCoverArt(extracted, preferredSource),
      
      // Synthesized tracks
      tracks: this.synthesizeTracks(extracted, corrections.tracks, strategy, preferredSource),
      
      // Include metadata about the synthesis
      _meta: {
        synthesizedAt: new Date().toISOString(),
        strategy,
        preferredSource,
        sources,
        hasCorrections: Object.keys(corrections).length > 0
      }
    }
    
    return result
  }
  
  /**
   * Select best value based on strategy
   */
  selectValue(field, extracted, correction, strategy, preferredSource) {
    // Manual correction always wins
    if (correction !== undefined && correction !== null) {
      return correction
    }
    
    const values = {}
    Object.entries(extracted).forEach(([source, data]) => {
      if (data[field] !== undefined && data[field] !== null) {
        values[source] = data[field]
      }
    })
    
    // If no values found
    if (Object.keys(values).length === 0) {
      return null
    }
    
    // Strategy: preferred source
    if (strategy === 'preferred' && values[preferredSource] !== undefined) {
      return values[preferredSource]
    }
    
    // Strategy: consensus (most common value)
    if (strategy === 'consensus') {
      const valueCounts = {}
      Object.values(values).forEach(val => {
        const normalized = String(val).toLowerCase().trim()
        valueCounts[normalized] = (valueCounts[normalized] || [])
        valueCounts[normalized].push(val)
      })
      
      // Find most common normalized value
      const sorted = Object.entries(valueCounts).sort((a, b) => b[1].length - a[1].length)
      if (sorted.length > 0) {
        // Return the first original value that matches the most common normalized version
        return sorted[0][1][0]
      }
    }
    
    // Default: use preferred source or first available
    return values[preferredSource] || Object.values(values)[0]
  }
  
  /**
   * Select best cover art
   */
  selectCoverArt(extracted, preferredSource) {
    const sources = Object.keys(extracted)
    
    // Try preferred source first
    if (extracted[preferredSource]?.coverArt) {
      const art = extracted[preferredSource].coverArt
      if (art.xl || art.large || art.medium) {
        return art
      }
    }
    
    // Fall back to any source with cover art
    for (const source of sources) {
      if (extracted[source]?.coverArt) {
        const art = extracted[source].coverArt
        if (art.xl || art.large || art.medium || art.primary) {
          return art
        }
      }
    }
    
    return null
  }
  
  /**
   * Synthesize tracks preserving all source data
   */
  synthesizeTracks(extracted, corrections = {}, strategy, preferredSource) {
    // Get max track count from all sources
    const maxTracks = Math.max(
      ...Object.values(extracted).map(source => source.tracks?.length || 0)
    )
    
    const synthesizedTracks = []
    
    for (let i = 0; i < maxTracks; i++) {
      const trackCorrection = corrections?.[i + 1] || {}
      
      const trackData = {
        position: i + 1,
        
        // Synthesized values
        title: this.selectTrackValue(i, 'title', extracted, trackCorrection.title, strategy, preferredSource),
        artist: this.selectTrackValue(i, 'artist', extracted, trackCorrection.artist, strategy, preferredSource),
        isrc: this.selectTrackValue(i, 'isrc', extracted, trackCorrection.isrc, strategy, preferredSource),
        
        // Duration with all source values preserved
        duration: {
          synthesized: this.selectTrackValue(i, 'duration', extracted, trackCorrection.duration, strategy, preferredSource),
          sources: {}
        },
        
        // Platform identifiers
        identifiers: {}
      }
      
      // Preserve all source-specific data
      Object.entries(extracted).forEach(([source, data]) => {
        if (data.tracks && data.tracks[i]) {
          const track = data.tracks[i]
          
          // Store source-specific duration
          if (track.duration !== undefined) {
            trackData.duration.sources[source] = track.duration
          }
          
          // Store platform identifier
          if (source === 'deezer' && track.deezerId) {
            trackData.identifiers.deezer = track.deezerId
          }
          if (source === 'spotify' && track.spotifyId) {
            trackData.identifiers.spotify = track.spotifyId
          }
          
          // Store preview URL if available
          if (track.preview && !trackData.preview) {
            trackData.preview = track.preview
          }
        }
      })
      
      synthesizedTracks.push(trackData)
    }
    
    return synthesizedTracks
  }
  
  selectTrackValue(trackIndex, field, extracted, correction, strategy, preferredSource) {
    if (correction !== undefined && correction !== null) {
      return correction
    }
    
    const values = {}
    Object.entries(extracted).forEach(([source, data]) => {
      if (data.tracks && data.tracks[trackIndex] && data.tracks[trackIndex][field] !== undefined) {
        values[source] = data.tracks[trackIndex][field]
      }
    })
    
    if (Object.keys(values).length === 0) {
      return null
    }
    
    // Use same selection logic as selectValue
    if (strategy === 'preferred' && values[preferredSource] !== undefined) {
      return values[preferredSource]
    }
    
    return values[preferredSource] || Object.values(values)[0]
  }
}

export default new MetadataSynthesizer()