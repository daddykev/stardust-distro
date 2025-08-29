// src/services/productMetadata.js
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../firebase'

class ProductMetadataService {
  /**
   * Get or fetch product metadata
   */
  async getMetadata(upc, options = {}) {
    const { 
      forceRefresh = false,
      sources = ['deezer'], // Start with just Deezer
      skipExpired = false
    } = options
    
    // Check if we have cached data
    const cached = await this.getCached(upc)
    
    if (cached && !forceRefresh) {
      // Check if any requested source is expired
      const needsRefresh = !skipExpired && sources.some(source => 
        this.isSourceExpired(cached.sources?.[source])
      )
      
      if (!needsRefresh) {
        return cached
      }
    }
    
    // Fetch from requested sources
    const metadata = await this.fetchAndStore(upc, sources)
    
    return metadata
  }
  
  /**
   * Get cached metadata from Firestore
   */
  async getCached(upc) {
    try {
      const docRef = doc(db, 'productMetadata', upc)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      }
      return null
    } catch (error) {
      console.error('Error fetching cached metadata:', error)
      return null
    }
  }
  
  /**
   * Check if a source is expired
   */
  isSourceExpired(sourceData) {
    if (!sourceData || sourceData.status !== 'success') {
      return true
    }
    
    const now = Date.now()
    const expiresAt = sourceData.expiresAt?.toMillis ? 
      sourceData.expiresAt.toMillis() : 
      new Date(sourceData.expiresAt).getTime()
    
    return now > expiresAt
  }
  
  /**
   * Fetch from APIs and store
   */
  async fetchAndStore(upc, sources) {
    // Get existing document if it exists
    const existing = await this.getCached(upc) || {
      upc,
      sources: {},
      extracted: {},
      synthesis: { 
        preferredSource: 'deezer', // For now, default to Deezer
        strategy: 'consensus' 
      },
      quality: {},
      usage: {
        accessCount: 0,
        usedInReleases: []
      }
    }
    
    // Fetch from requested sources
    const fetchPromises = sources.map(source => 
      this.fetchFromSource(upc, source)
        .then(result => ({ source, ...result }))
        .catch(error => ({ 
          source, 
          status: 'error', 
          error: error.message 
        }))
    )
    
    const results = await Promise.all(fetchPromises)
    
    // Process each result
    const now = new Date()
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    for (const result of results) {
      const { source, ...data } = result
      
      // Store raw response
      existing.sources[source] = {
        fetchedAt: now,
        expiresAt: thirtyDaysFromNow,
        status: data.status || 'success',
        raw: data.raw || data.album || null,
        error: data.error || null
      }
      
      // Extract normalized data if successful
      if (data.status !== 'error' && (data.raw || data.album)) {
        existing.extracted[source] = this.extractData(source, data.raw || data.album)
      }
    }
    
    // Update quality metrics
    existing.quality = this.assessQuality(existing.extracted)
    existing.lastUpdated = serverTimestamp()
    existing.usage.accessCount = (existing.usage.accessCount || 0) + 1
    existing.usage.lastAccessed = serverTimestamp()
    
    // Save to Firestore
    await this.save(upc, existing)
    
    return existing
  }
  
  /**
   * Fetch from a specific source
   */
  async fetchFromSource(upc, source) {
    try {
      switch (source) {
        case 'deezer':
          const apiUrl = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:5001/stardust-distro/us-central1/api'
            : 'https://us-central1-stardust-distro.cloudfunctions.net/api'
          
          console.log(`🎵 Fetching Deezer metadata for UPC: ${upc}`)
          
          // This is exactly how Migration.vue was calling it
          const response = await fetch(`${apiUrl}/deezer/album/${upc}`)
          const data = await response.json()
          
          if (data.success && data.album) {
            console.log(`  ✅ Found album: ${data.album.title}`)
            
            // The album already includes tracks
            let albumTracks = data.album.tracks?.data || []
            console.log(`  📀 Album has ${albumTracks.length} tracks`)
            
            // Fetch ISRCs exactly like Migration.vue did
            if (albumTracks.length > 0) {
              const trackIds = albumTracks.map(t => t.id)
              console.log(`  🔍 Fetching ISRCs for track IDs: ${trackIds.join(', ')}`)
              
              try {
                const isrcResponse = await fetch(`${apiUrl}/deezer/tracks/batch-isrc`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ trackIds })
                })
                
                if (isrcResponse.ok) {
                  const isrcData = await isrcResponse.json()
                  console.log(`  📦 ISRC response:`, JSON.stringify(isrcData, null, 2))
                  
                  if (isrcData.tracks) {
                    // Create a map with STRING keys (this is the fix!)
                    const isrcMap = {}
                    isrcData.tracks.forEach(t => {
                      if (t.isrc) {
                        // Ensure both the key and comparison are strings
                        isrcMap[String(t.id)] = t.isrc
                      }
                    })
                    
                    console.log(`  📊 ISRC map created:`, isrcMap)
                    
                    // Map ISRCs back to tracks - ensure string comparison
                    albumTracks = albumTracks.map(track => {
                      const trackIdStr = String(track.id) // Convert to string for comparison
                      const isrc = isrcMap[trackIdStr] || ''
                      
                      if (isrc) {
                        console.log(`    ✅ Track ${track.id} "${track.title}": ISRC = ${isrc}`)
                      } else {
                        console.log(`    ❌ Track ${track.id} "${track.title}": No ISRC found`)
                      }
                      
                      return {
                        ...track,
                        isrc: isrc  // Add the ISRC to the track
                      }
                    })
                    
                    console.log(`  📊 Found ISRCs for ${Object.keys(isrcMap).length}/${albumTracks.length} tracks`)
                  }
                } else {
                  console.warn('  ⚠️ Could not fetch ISRCs: status', isrcResponse.status)
                }
              } catch (error) {
                console.warn('  ⚠️ Could not fetch ISRCs:', error.message)
              }
            }
            
            // Return the album with ISRCs merged into tracks
            return { 
              status: 'success', 
              raw: {
                ...data.album,
                tracks: {
                  ...data.album.tracks,
                  data: albumTracks  // This now has ISRCs
                }
              }
            }
          } else {
            return { 
              status: 'not_found',
              error: data.error?.message || 'Album not found'
            }
          }
          
        // ... other sources
      }
    } catch (error) {
      console.error(`Error fetching from ${source}:`, error)
      throw error
    }
  }
  
  /**
   * Extract normalized data from raw API response
   */
  extractData(source, raw) {
    switch (source) {
      case 'deezer':
        return this.extractDeezerData(raw)
      case 'spotify':
        return this.extractSpotifyData(raw)
      case 'discogs':
        return this.extractDiscogsData(raw)
      default:
        return raw
    }
  }
  
  /**
   * Extract Deezer data into normalized format
   */
  extractDeezerData(raw) {
    console.log('🔄 Extracting Deezer data...')
    console.log('  Raw tracks:', raw.tracks?.data?.length || 0)
    
    const extracted = {
      title: raw.title,
      artist: raw.artist?.name || 'Unknown Artist',
      releaseDate: raw.release_date,
      label: raw.label,
      genre: raw.genres?.data?.[0]?.name || '',
      duration: raw.duration,
      coverArt: {
        xl: raw.cover_xl,
        large: raw.cover_big,
        medium: raw.cover_medium,
        small: raw.cover_small
      },
      tracks: raw.tracks?.data?.map((track, index) => {
        const extractedTrack = {
          position: track.track_position || index + 1,
          title: track.title || `Track ${index + 1}`,
          artist: track.artist?.name || raw.artist?.name,
          duration: track.duration,
          isrc: track.isrc || '',  // This should now have the ISRC
          deezerId: String(track.id),
          preview: track.preview || null
        }
        
        console.log(`  Track ${index + 1}: ISRC = ${extractedTrack.isrc || 'NONE'}`)
        
        return extractedTrack
      }) || []
    }
    
    console.log(`  Extracted ${extracted.tracks.length} tracks`)
    console.log(`  ISRCs found: ${extracted.tracks.filter(t => t.isrc).length}`)
    
    return extracted
  }
  
  /**
   * Extract Spotify data (placeholder for now)
   */
  extractSpotifyData(raw) {
    // TODO: Implement when we add Spotify
    return {}
  }
  
  /**
   * Extract Discogs data (placeholder for now)
   */
  extractDiscogsData(raw) {
    // TODO: Implement when we add Discogs
    return {}
  }
  
  /**
   * Assess metadata quality
   */
  assessQuality(extracted) {
    const sources = Object.keys(extracted)
    const quality = {
      sources,
      completeness: {},
      hasConflicts: false,
      conflictFields: [],
      lastAssessed: new Date()
    }
    
    // Assess completeness for each source
    sources.forEach(source => {
      const data = extracted[source]
      let score = 0
      let total = 0
      
      // Check required fields
      const fields = ['title', 'artist', 'releaseDate', 'tracks']
      fields.forEach(field => {
        total++
        if (data[field] && (Array.isArray(data[field]) ? data[field].length > 0 : true)) {
          score++
        }
      })
      
      // Check for cover art
      if (data.coverArt && Object.values(data.coverArt).some(url => url)) {
        score += 0.5
      }
      total += 0.5
      
      // Check track completeness
      if (data.tracks?.length > 0) {
        const hasISRCs = data.tracks.filter(t => t.isrc).length / data.tracks.length
        score += hasISRCs * 0.5
        total += 0.5
      }
      
      quality.completeness[source] = score / total
    })
    
    // Check for conflicts (when we have multiple sources)
    if (sources.length > 1) {
      const trackCounts = sources.map(s => extracted[s].tracks?.length || 0)
      if (new Set(trackCounts).size > 1) {
        quality.hasConflicts = true
        quality.conflictFields.push('track_count')
      }
    }
    
    return quality
  }
  
  /**
   * Save metadata to Firestore
   */
  async save(upc, metadata) {
    try {
      const docRef = doc(db, 'productMetadata', upc)
      await setDoc(docRef, metadata, { merge: true })
      console.log(`✅ Saved metadata for UPC ${upc} to productMetadata collection`)
    } catch (error) {
      console.error('Error saving metadata:', error)
      throw error
    }
  }
  
  /**
   * Apply manual correction
   */
  async applyCorrection(upc, field, value, reason) {
    const docRef = doc(db, 'productMetadata', upc)
    
    await updateDoc(docRef, {
      [`corrections.${field}`]: {
        value,
        correctedBy: auth.currentUser?.uid,
        correctedAt: serverTimestamp(),
        reason
      },
      lastUpdated: serverTimestamp()
    })
  }
}

export default new ProductMetadataService()