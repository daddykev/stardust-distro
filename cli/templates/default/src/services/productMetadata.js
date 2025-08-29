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
      sources = ['spotify', 'deezer'], // Default to both, Spotify first
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
        preferredSource: 'spotify', // Default to Spotify
        strategy: 'consensus' 
      },
      quality: {},
      usage: {
        accessCount: 0,
        users: [],
        usedInReleases: []
      },
      createdBy: auth.currentUser?.uid,
      createdAt: new Date()
    }
    
    // Add current user to usage tracking if not already there
    const currentUserId = auth.currentUser?.uid
    if (currentUserId && !existing.usage.users?.includes(currentUserId)) {
      existing.usage.users = [...(existing.usage.users || []), currentUserId]
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
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5001/stardust-distro/us-central1/api'
        : 'https://us-central1-stardust-distro.cloudfunctions.net/api'
      
      switch (source) {
        case 'spotify':
          console.log(`🎵 Fetching Spotify metadata for UPC: ${upc}`)
          
          const spotifyResponse = await fetch(`${apiUrl}/spotify/album/${upc}`)
          const spotifyData = await spotifyResponse.json()
          
          if (spotifyData.success && spotifyData.album) {
            console.log(`  ✅ Found album on Spotify: ${spotifyData.album.name}`)
            console.log(`  📀 Album has ${spotifyData.album.tracks_with_isrc?.length || spotifyData.album.tracks?.items?.length || 0} tracks`)
            
            // Spotify includes ISRCs directly in the tracks_with_isrc array
            const tracksWithISRC = spotifyData.album.tracks_with_isrc || spotifyData.album.tracks?.items || []
            
            // Log ISRCs
            let isrcCount = 0
            tracksWithISRC.forEach((track, i) => {
              const isrc = track.external_ids?.isrc
              if (isrc) {
                isrcCount++
                console.log(`    ✅ Track ${i + 1} "${track.name}": ISRC = ${isrc}`)
              } else {
                console.log(`    ❌ Track ${i + 1} "${track.name}": No ISRC`)
              }
            })
            
            console.log(`  📊 Found ISRCs for ${isrcCount}/${tracksWithISRC.length} tracks`)
            
            return { 
              status: 'success', 
              raw: spotifyData.album
            }
          } else {
            console.log(`  ❌ Album not found on Spotify for UPC: ${upc}`)
            return { 
              status: 'not_found',
              error: spotifyData.error?.message || 'Album not found on Spotify'
            }
          }
          
        case 'deezer':
          console.log(`🎵 Fetching Deezer metadata for UPC: ${upc}`)
          
          const deezerResponse = await fetch(`${apiUrl}/deezer/album/${upc}`)
          const deezerData = await deezerResponse.json()
          
          if (deezerData.success && deezerData.album) {
            console.log(`  ✅ Found album on Deezer: ${deezerData.album.title}`)
            
            // Get the tracks
            let albumTracks = deezerData.album.tracks?.data || []
            console.log(`  📀 Album has ${albumTracks.length} tracks`)
            
            // Fetch ISRCs
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
                  
                  if (isrcData.tracks) {
                    // Create a map with STRING keys (important for matching)
                    const isrcMap = {}
                    isrcData.tracks.forEach(t => {
                      if (t.isrc) {
                        isrcMap[String(t.id)] = t.isrc
                      }
                    })
                    
                    // Map ISRCs back to tracks - ensure string comparison
                    albumTracks = albumTracks.map(track => {
                      const trackIdStr = String(track.id)
                      const isrc = isrcMap[trackIdStr] || ''
                      
                      if (isrc) {
                        console.log(`    ✅ Track ${track.id} "${track.title}": ISRC = ${isrc}`)
                      } else {
                        console.log(`    ❌ Track ${track.id} "${track.title}": No ISRC found`)
                      }
                      
                      return {
                        ...track,
                        isrc: isrc
                      }
                    })
                    
                    console.log(`  📊 Found ISRCs for ${Object.keys(isrcMap).length}/${albumTracks.length} tracks`)
                  }
                } else {
                  console.warn(`  ⚠️ Could not fetch ISRCs: status ${isrcResponse.status}`)
                }
              } catch (error) {
                console.warn('  ⚠️ Could not fetch ISRCs:', error.message)
              }
            }
            
            return { 
              status: 'success', 
              raw: {
                ...deezerData.album,
                tracks: {
                  ...deezerData.album.tracks,
                  data: albumTracks
                }
              }
            }
          } else {
            console.log(`  ❌ Album not found on Deezer for UPC: ${upc}`)
            return { 
              status: 'not_found',
              error: deezerData.error?.message || 'Album not found on Deezer'
            }
          }
          
        case 'discogs':
          // TODO: Implement Discogs fetch when ready
          console.log(`  ⚠️ Discogs integration not yet implemented`)
          return {
            status: 'not_implemented',
            error: 'Discogs integration coming soon'
          }
          
        default:
          throw new Error(`Unknown source: ${source}`)
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
      case 'spotify':
        return this.extractSpotifyData(raw)
      case 'deezer':
        return this.extractDeezerData(raw)
      case 'discogs':
        return this.extractDiscogsData(raw)
      default:
        return raw
    }
  }
  
  /**
   * Extract Spotify data into normalized format
   */
  extractSpotifyData(raw) {
    console.log('🔄 Extracting Spotify data...')
    
    const tracks = raw.tracks_with_isrc || raw.tracks?.items || []
    
    const extracted = {
      title: raw.name,
      artist: raw.artists?.[0]?.name || 'Unknown Artist',
      releaseDate: raw.release_date,
      label: raw.label || '',
      genre: raw.genres?.[0] || '',
      albumType: raw.album_type, // single, album, compilation
      totalTracks: raw.total_tracks,
      coverArt: {
        large: raw.images?.[0]?.url,
        medium: raw.images?.[1]?.url,
        small: raw.images?.[2]?.url
      },
      externalIds: {
        spotify: raw.id,
        upc: raw.external_ids?.upc
      },
      tracks: tracks.map((track, index) => {
        const extractedTrack = {
          position: track.track_number || index + 1,
          discNumber: track.disc_number || 1,
          title: track.name,
          artist: track.artists?.[0]?.name || raw.artists?.[0]?.name,
          duration: Math.round(track.duration_ms / 1000), // Convert ms to seconds
          isrc: track.external_ids?.isrc || '',
          explicit: track.explicit || false,
          spotifyId: track.id,
          spotifyUri: track.uri,
          preview: track.preview_url || null
        }
        
        console.log(`  Track ${index + 1}: "${extractedTrack.title}" - ISRC: ${extractedTrack.isrc || 'NONE'}`)
        
        return extractedTrack
      })
    }
    
    console.log(`  Extracted ${extracted.tracks.length} tracks from Spotify`)
    console.log(`  ISRCs found: ${extracted.tracks.filter(t => t.isrc).length}`)
    console.log(`  Album type: ${extracted.albumType}`)
    
    return extracted
  }
  
  /**
   * Extract Deezer data into normalized format
   */
  extractDeezerData(raw) {
    console.log('🔄 Extracting Deezer data...')
    
    const extracted = {
      title: raw.title,
      artist: raw.artist?.name || 'Unknown Artist',
      releaseDate: raw.release_date,
      label: raw.label,
      genre: raw.genres?.data?.[0]?.name || '',
      duration: raw.duration, // Album duration in seconds
      totalTracks: raw.nb_tracks || raw.tracks?.data?.length,
      coverArt: {
        xl: raw.cover_xl,
        large: raw.cover_big,
        medium: raw.cover_medium,
        small: raw.cover_small
      },
      externalIds: {
        deezer: String(raw.id),
        upc: raw.upc
      },
      tracks: raw.tracks?.data?.map((track, index) => {
        const extractedTrack = {
          position: track.track_position || index + 1,
          discNumber: track.disk_number || 1,
          title: track.title || `Track ${index + 1}`,
          artist: track.artist?.name || raw.artist?.name,
          duration: track.duration, // Already in seconds
          isrc: track.isrc || '',
          explicit: track.explicit_lyrics || false,
          deezerId: String(track.id),
          preview: track.preview || null
        }
        
        console.log(`  Track ${index + 1}: "${extractedTrack.title}" - ISRC: ${extractedTrack.isrc || 'NONE'}`)
        
        return extractedTrack
      }) || []
    }
    
    console.log(`  Extracted ${extracted.tracks.length} tracks from Deezer`)
    console.log(`  ISRCs found: ${extracted.tracks.filter(t => t.isrc).length}`)
    
    return extracted
  }
  
  /**
   * Extract Discogs data (placeholder for now)
   */
  extractDiscogsData(raw) {
    console.log('🔄 Extracting Discogs data...')
    // TODO: Implement when Discogs is added
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
      
      // Check track completeness (ISRCs)
      if (data.tracks?.length > 0) {
        const hasISRCs = data.tracks.filter(t => t.isrc).length / data.tracks.length
        score += hasISRCs * 0.5
        total += 0.5
      }
      
      // Check for label
      if (data.label) {
        score += 0.25
      }
      total += 0.25
      
      quality.completeness[source] = score / total
    })
    
    // Check for conflicts between sources
    if (sources.length > 1) {
      // Check track count differences
      const trackCounts = sources.map(s => extracted[s].tracks?.length || 0)
      if (new Set(trackCounts).size > 1) {
        quality.hasConflicts = true
        quality.conflictFields.push('track_count')
      }
      
      // Check release date differences
      const releaseDates = sources.map(s => extracted[s].releaseDate).filter(d => d)
      if (new Set(releaseDates).size > 1) {
        quality.hasConflicts = true
        quality.conflictFields.push('release_date')
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
  
  /**
   * Update synthesis preferences
   */
  async updateSynthesisPreferences(upc, preferences) {
    const docRef = doc(db, 'productMetadata', upc)
    
    await updateDoc(docRef, {
      'synthesis': preferences,
      lastUpdated: serverTimestamp()
    })
  }
}

export default new ProductMetadataService()