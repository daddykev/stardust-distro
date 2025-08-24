// services/apple.js
import { httpsCallable } from 'firebase/functions'
import { functions, auth, db } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { Apple5323Builder } from './apple/apple-5323'
import catalogService from './catalog'
import { classifyRelease } from '../utils/releaseClassifier'
import { escapeUrlForXml } from '../utils/urlUtils'

/**
 * Apple Music Package Service
 * Handles generation of Apple Music XML packages (non-DDEX format)
 */
class AppleService {
  constructor() {
    this.defaultVersion = '5.3.23'
    this.supportedVersions = ['5.3.23'] // Future: '5.4', '5.5', etc.
    this.builders = {
      '5.3.23': new Apple5323Builder()
    }
  }

  /**
   * Get builder for specific Apple spec version
   */
  getBuilder(version) {
    if (!this.supportedVersions.includes(version)) {
      console.warn(`Unsupported Apple spec version ${version}, falling back to ${this.defaultVersion}`)
      return this.builders[this.defaultVersion]
    }
    return this.builders[version]
  }

  /**
   * Generate Apple Music package XML
   */
  async generatePackage(releaseId, targetConfig, options = {}) {
    // Determine Apple spec version from target config or use default
    const version = targetConfig.appleSpecVersion || this.defaultVersion
    
    return this.generatePackageWithVersion(releaseId, targetConfig, version, options)
  }

  /**
   * Generate Apple Music package with specific version
   */
  async generatePackageWithVersion(releaseId, targetConfig, version, options = {}) {
    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('User must be authenticated')
      }

      // Get release data
      const release = await catalogService.getRelease(releaseId)
      if (!release) {
        throw new Error('Release not found')
      }

      // Get the UPC/EAN
      const upc = release.basic?.upc || release.basic?.barcode || release.basic?.ean || ''
      
      // Validate UPC
      if (!upc || upc === 'undefined' || upc === '') {
        throw new Error('Release must have a valid UPC/barcode for Apple Music delivery')
      }

      if (!/^\d{12,14}$/.test(upc)) {
        throw new Error(`Invalid UPC format: ${upc}. Must be 12-14 digits.`)
      }

      // Classify release
      const classification = classifyRelease(release)
      console.log('Release classification for Apple:', classification)

      // Extract assets
      const coverAsset = release.assets?.coverImage || null
      const audioAssets = []
      
      if (release.tracks) {
        release.tracks.forEach((track, index) => {
          if (track.audio?.url) {
            audioAssets.push({
              type: 'audio',
              trackId: track.id,
              storageUrl: track.audio.url,
              metadata: {
                trackId: track.id,
                format: track.audio.format || 'WAV',
                duration: track.audio.duration || track.duration,
                bitrate: track.audio.bitrate,
                sampleRate: track.audio.sampleRate,
                size: track.audio.size
              }
            })
          }
        })
      }

      // Calculate MD5 checksums
      let coverChecksum = ''
      if (coverAsset?.url) {
        try {
          const calculateMD5 = httpsCallable(functions, 'calculateFileMD5')
          const result = await calculateMD5({ url: coverAsset.url })
          coverChecksum = result.data.md5
        } catch (error) {
          console.error('Error calculating cover checksum:', error)
        }
      }

      // Prepare track data for Apple format
      const tracks = await Promise.all((release.tracks || []).map(async (track, index) => {
        const audioAsset = audioAssets.find(a => a.trackId === track.id)
        
        let checksum = ''
        if (audioAsset?.storageUrl) {
          try {
            const calculateMD5 = httpsCallable(functions, 'calculateFileMD5')
            const result = await calculateMD5({ url: audioAsset.storageUrl })
            checksum = result.data.md5
          } catch (error) {
            console.error(`Error calculating checksum for track ${track.id}:`, error)
          }
        }

        // Apple uses different file naming convention
        const audioFileName = `${upc}_${String(index + 1).padStart(2, '0')}.${audioAsset?.metadata?.format?.toLowerCase() || 'wav'}`

        return {
          trackNumber: index + 1,
          volumeNumber: track.discNumber || 1,
          title: track.title || track.metadata?.title || `Track ${index + 1}`,
          artist: track.artist || track.displayArtist || track.metadata?.displayArtist || release.basic.artist,
          isrc: track.isrc || `XX${upc}${String(index + 1).padStart(2, '0')}`,
          duration: track.duration || track.audio?.duration || 180,
          fileName: audioFileName,
          checksum: checksum,
          genre: track.metadata?.genre || track.genre || release.metadata?.genre,
          explicit: track.metadata?.explicit || false,
          previewStart: track.previewStart || 0,
          previewDuration: track.previewDuration || 30,
          // Apple-specific fields
          work_name: track.workName,
          movement_number: track.movementNumber,
          movement_name: track.movementName,
          composer: track.composer,
          lyricist: track.lyricist,
          producer: track.producer,
          mixer: track.mixer,
          publisher: track.publisher,
          pline: track.pline || `${new Date().getFullYear()} ${release.basic.label}`,
          recordLabel: track.recordLabel || release.basic.label,
          trackLanguage: track.language || 'en'
        }
      }))

      // Prepare package data for Apple
      const packageData = {
        provider: targetConfig.appleProviderId || targetConfig.config?.providerId || 'Unknown_Provider',
        teamId: targetConfig.appleTeamId || targetConfig.config?.teamId,
        vendorId: upc, // Apple uses vendor_id which is typically the UPC
        upc: upc,
        
        // Album metadata
        albumTitle: release.basic.title,
        albumArtist: release.basic.artist || release.basic.displayArtist,
        label: release.basic.label,
        genre: this.mapToAppleGenre(release.metadata?.genre),
        releaseDate: this.formatAppleDate(release.basic.releaseDate),
        originalReleaseDate: this.formatAppleDate(release.basic.originalReleaseDate || release.basic.releaseDate),
        copyrightPline: release.metadata?.copyrightLine || `℗ ${new Date().getFullYear()} ${release.basic.label}`,
        copyrightCline: release.metadata?.copyrightCline || `© ${new Date().getFullYear()} ${release.basic.label}`,
        
        // Sales and availability
        salesStartDate: this.formatAppleDate(targetConfig.salesStartDate || release.basic.releaseDate),
        preorderDate: targetConfig.preorderDate ? this.formatAppleDate(targetConfig.preorderDate) : null,
        territories: this.mapToAppleTerritories(targetConfig.territories || ['WW']),
        excludedTerritories: targetConfig.excludedTerritories || [],
        priceTier: targetConfig.priceTier || 'TIER_01',
        wholesalePriceTier: targetConfig.wholesalePriceTier,
        
        // Additional metadata
        labelUrl: release.metadata?.labelUrl,
        primaryArtistUrl: release.metadata?.artistUrl,
        notes: release.metadata?.notes,
        volume_count: Math.max(...tracks.map(t => t.volumeNumber || 1)),
        track_count: tracks.length,
        
        // Asset references
        coverArtFileName: `${upc}.jpg`,
        coverArtChecksum: coverChecksum,
        
        // Product type
        product_type: this.mapToAppleProductType(classification.releaseType),
        
        // Compilation flag
        compilation: release.metadata?.compilation || false,
        
        // Language
        language: release.metadata?.language || 'en',
        
        // Tracks
        tracks: tracks
      }

      // Configuration for builder
      const config = {
        provider: packageData.provider,
        teamId: packageData.teamId,
        timestamp: new Date().toISOString(),
        schemaVersion: version,
        
        // Delivery options
        completeAlbum: options.completeAlbum !== false,
        clearance: options.clearance !== false,
        
        // Apple-specific options
        itunesKind: 'song', // or 'music-video'
        allowDownload: targetConfig.allowDownload !== false,
        allowStream: targetConfig.allowStream !== false
      }

      // Log configuration
      console.log('Apple Package Generation Config:', {
        version,
        provider: config.provider,
        vendorId: packageData.vendorId,
        productType: packageData.product_type,
        trackCount: packageData.track_count
      })

      // Get version-specific builder and generate XML
      const builder = this.getBuilder(version)
      if (!builder) {
        throw new Error(`No builder available for Apple spec version ${version}`)
      }
      
      const packageXml = builder.buildPackage(packageData, config)

      // Save package metadata
      await this.savePackageMetadata(releaseId, packageXml, targetConfig, {
        version: version,
        vendorId: packageData.vendorId,
        productType: packageData.product_type
      })

      return {
        xml: packageXml,
        vendorId: packageData.vendorId,
        version: version,
        productType: packageData.product_type,
        trackCount: packageData.track_count
      }
    } catch (error) {
      console.error('Error generating Apple package:', error)
      throw error
    }
  }

  /**
   * Map genre to Apple's genre taxonomy
   */
  mapToAppleGenre(genre) {
    // Apple has specific genre IDs and names
    // This is a simplified mapping - full implementation would use Apple's complete genre list
    const genreMap = {
      'pop': { id: 14, name: 'Pop' },
      'rock': { id: 21, name: 'Rock' },
      'alternative': { id: 20, name: 'Alternative' },
      'electronic': { id: 7, name: 'Electronic' },
      'hip-hop': { id: 18, name: 'Hip-Hop/Rap' },
      'r&b': { id: 15, name: 'R&B/Soul' },
      'country': { id: 6, name: 'Country' },
      'jazz': { id: 11, name: 'Jazz' },
      'classical': { id: 5, name: 'Classical' },
      'dance': { id: 17, name: 'Dance' },
      'soundtrack': { id: 16, name: 'Soundtrack' },
      'world': { id: 19, name: 'World' }
    }
    
    const normalized = (genre || 'pop').toLowerCase()
    return genreMap[normalized] || genreMap['pop']
  }

  /**
   * Map territories to Apple format
   */
  mapToAppleTerritories(territories) {
    // Apple uses ISO 3166-1 alpha-2 codes
    // 'Worldwide' becomes 'WW' in Apple's system
    return territories.map(t => {
      if (t.toLowerCase() === 'worldwide') return 'WW'
      return t.toUpperCase()
    })
  }

  /**
   * Map release type to Apple product type
   */
  mapToAppleProductType(releaseType) {
    const typeMap = {
      'Single': 'S',
      'EP': 'E',
      'Album': 'A',
      'Video': 'V',
      'MusicVideo': 'MV'
    }
    
    return typeMap[releaseType] || 'A'
  }

  /**
   * Format date for Apple (YYYY-MM-DD)
   */
  formatAppleDate(date) {
    if (!date) return null
    
    // Handle various date formats
    const d = new Date(date)
    if (isNaN(d.getTime())) return null
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  }

  /**
   * Save package metadata to Firestore
   */
  async savePackageMetadata(releaseId, packageXml, targetConfig, metadata) {
    const docRef = doc(db, 'releases', releaseId)
    
    const packageData = {
      version: metadata.version,
      generatedAt: new Date(),
      vendorId: metadata.vendorId,
      productType: metadata.productType,
      target: targetConfig.name || 'Apple Music',
      xml: packageXml
    }
    
    const packageHistoryKey = `apple_${targetConfig.id || 'default'}_${Date.now()}`
    
    await updateDoc(docRef, {
      'apple.lastGenerated': new Date(),
      'apple.version': metadata.version,
      'apple.vendorId': metadata.vendorId,
      'apple.productType': metadata.productType,
      [`apple.packageHistory.${packageHistoryKey}`]: packageData
    })
    
    return packageData
  }

  /**
   * Validate Apple package
   */
  async validatePackage(packageXml, version) {
    // This would integrate with Apple's validation tools
    // For now, return basic validation
    const versionMarkers = {
      '5.3.23': 'http://apple.com/itunes/importer/version="5.3"'
    }
    
    const marker = versionMarkers[version]
    if (!marker) {
      return { valid: false, error: `Unknown version: ${version}` }
    }
    
    // Basic XML structure validation
    if (!packageXml.includes('<package>')) {
      return { valid: false, error: 'Missing package root element' }
    }
    
    if (!packageXml.includes('<metadata>')) {
      return { valid: false, error: 'Missing metadata element' }
    }
    
    return { valid: true }
  }
}

export default new AppleService()