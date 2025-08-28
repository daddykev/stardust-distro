// services/ern.js
import { httpsCallable } from 'firebase/functions'
import { functions, auth, db } from '../firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { ERN382Builder } from './ern/ern-382'
import { ERN42Builder } from './ern/ern-42'
import { ERN43Builder } from './ern/ern-43'

// Import existing services correctly
import catalogService from './catalog'
import { classifyRelease } from '../utils/releaseClassifier'
import { escapeUrlForXml } from '../utils/urlUtils'

// Import genre mapping service
import genreMappingService from './genreMappings'

/**
 * Enhanced ERN Service with multi-version support and genre mapping
 */
class ERNService {
  constructor() {
    this.defaultVersion = '4.3'
    this.supportedVersions = ['3.8.2', '4.2', '4.3']
    this.builders = {
      '3.8.2': new ERN382Builder(),
      '4.2': new ERN42Builder(),
      '4.3': new ERN43Builder()
    }
  }

  /**
   * Get builder for specific version
   */
  getBuilder(version) {
    if (!this.supportedVersions.includes(version)) {
      console.warn(`Unsupported ERN version ${version}, falling back to ${this.defaultVersion}`)
      return this.builders[this.defaultVersion]
    }
    return this.builders[version]
  }

  /**
   * Generate ERN with automatic version selection
   */
  async generateERN(releaseId, targetConfig, options = {}) {
    // Determine ERN version from target config or use default
    const version = targetConfig.ernVersion || this.defaultVersion
    
    return this.generateERNWithVersion(releaseId, targetConfig, version, options)
  }

  /**
   * Map genre based on target configuration
   */
  async mapGenreForTarget(genre, targetConfig) {
    // Start with original genre data
    let mappedGenre = {
      code: genre?.genreCode || genre?.code || '',
      name: genre?.genreName || genre?.name || '',
      subgenreCode: genre?.subgenreCode || '',
      subgenreName: genre?.subgenreName || ''
    }

    // Check if genre mapping is enabled for this target
    if (!targetConfig.genreMapping?.enabled) {
      console.log('Genre mapping not enabled for target, using original genres')
      return mappedGenre
    }

    try {
      // If a specific mapping ID is provided, use it
      if (targetConfig.genreMapping.mappingId) {
        const mapping = await genreMappingService.getMapping(targetConfig.genreMapping.mappingId)
        
        if (mapping && mapping.mappings) {
          // Map the primary genre
          if (mappedGenre.code && mapping.mappings[mappedGenre.code]) {
            const targetGenreCode = mapping.mappings[mappedGenre.code]
            console.log(`Mapped genre: ${mappedGenre.code} -> ${targetGenreCode}`)
            
            // Update the genre code
            mappedGenre.code = targetGenreCode
            
            // Try to get the genre name from the target DSP dictionary
            mappedGenre.name = await this.getGenreNameForDSP(targetGenreCode, targetConfig.type)
          }
          
          // Map the subgenre if present
          if (mappedGenre.subgenreCode && mapping.mappings[mappedGenre.subgenreCode]) {
            const targetSubgenreCode = mapping.mappings[mappedGenre.subgenreCode]
            console.log(`Mapped subgenre: ${mappedGenre.subgenreCode} -> ${targetSubgenreCode}`)
            
            mappedGenre.subgenreCode = targetSubgenreCode
            mappedGenre.subgenreName = await this.getGenreNameForDSP(targetSubgenreCode, targetConfig.type)
          }
        }
      } else {
        // Use built-in mapping
        console.log('Using built-in genre mapping for', targetConfig.type)
        const builtInMapping = genreMappingService.getBuiltInMapping(targetConfig.type?.toLowerCase())
        
        if (builtInMapping && builtInMapping.mappings) {
          // Apply built-in mapping logic
          console.log('Applying built-in mapping rules')
        }
      }

      // Handle unmapped genres
      if (targetConfig.genreMapping.strictMode && 
          mappedGenre.code === (genre?.genreCode || genre?.code)) {
        // Genre wasn't mapped and strict mode is enabled
        throw new Error(`Genre "${mappedGenre.name}" (${mappedGenre.code}) cannot be mapped for ${targetConfig.name}. Strict mode enabled.`)
      }
      
      // Apply fallback if no mapping was found
      if (mappedGenre.code === (genre?.genreCode || genre?.code) && 
          targetConfig.genreMapping.fallbackGenre) {
        console.log(`No mapping found, using fallback: ${targetConfig.genreMapping.fallbackGenre}`)
        mappedGenre.code = targetConfig.genreMapping.fallbackGenre
        mappedGenre.name = await this.getGenreNameForDSP(targetConfig.genreMapping.fallbackGenre, targetConfig.type)
      }

    } catch (error) {
      console.error('Error mapping genre:', error)
      
      if (targetConfig.genreMapping.strictMode) {
        throw error // Re-throw in strict mode
      }
      
      // In non-strict mode, log the error but continue with original genre
      console.warn('Genre mapping failed, using original genre')
    }

    return mappedGenre
  }

  /**
   * Get genre name from DSP-specific dictionary
   */
  async getGenreNameForDSP(genreCode, dspType) {
    try {
      if (dspType?.toLowerCase().includes('beatport')) {
        const { BEATPORT_GENRES } = await import('../dictionaries/genres/beatport-202505')
        return BEATPORT_GENRES.byCode[genreCode]?.name || genreCode
      } else if (dspType?.toLowerCase().includes('apple')) {
        const { APPLE_GENRES } = await import('../dictionaries/genres/apple-539')
        return APPLE_GENRES.byCode[genreCode]?.name || genreCode
      } else if (dspType?.toLowerCase().includes('amazon')) {
        const { AMAZON_GENRES } = await import('../dictionaries/genres/amazon-201805')
        return AMAZON_GENRES.byCode[genreCode]?.name || genreCode
      }
    } catch (error) {
      console.warn(`Could not load genre name for ${genreCode} from ${dspType} dictionary`)
    }
    
    return genreCode // Return code if name not found
  }

  /**
   * Generate a stable message ID for idempotency
   * This should be deterministic for the same release/target combination
   */
  generateMessageId(releaseId, targetId, messageSubType = 'Initial') {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    
    // Create a more predictable ID for idempotency
    // Include release and target to make it unique per delivery attempt
    const components = [
      'MSG',
      releaseId.substr(-8), // Last 8 chars of release ID
      targetId ? targetId.substr(-8) : 'NOTARGET', // Last 8 chars of target ID
      messageSubType.toUpperCase(),
      timestamp,
      random
    ].filter(Boolean)
    
    return components.join('-')
  }

  /**
   * Generate ERN with specific version
   */
  async generateERNWithVersion(releaseId, targetConfig, version, options = {}) {
    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('User must be authenticated')
      }

      // Get release data using the catalog service
      const release = await catalogService.getRelease(releaseId)
      if (!release) {
        throw new Error('Release not found')
      }

      // Get the UPC/barcode from the correct field
      const upc = release.basic?.upc || release.basic?.barcode || release.basic?.ean || ''

      // Validate UPC exists and is valid
      if (!upc || upc === 'undefined' || upc === '') {
        throw new Error('Release must have a valid UPC/barcode for DDEX delivery')
      }

      // Validate UPC format (12-14 digits)
      if (!/^\d{12,14}$/.test(upc)) {
        throw new Error(`Invalid UPC format: ${upc}. Must be 12-14 digits.`)
      }

      // Map genres based on target configuration
      const mappedGenre = await this.mapGenreForTarget(release.metadata, targetConfig)
      
      console.log('Genre mapping result:', {
        original: {
          code: release.metadata?.genreCode,
          name: release.metadata?.genreName
        },
        mapped: mappedGenre,
        target: targetConfig.name,
        mappingEnabled: targetConfig.genreMapping?.enabled
      })

      // Override release metadata with mapped genres
      const mappedRelease = {
        ...release,
        metadata: {
          ...release.metadata,
          genreCode: mappedGenre.code,
          genreName: mappedGenre.name,
          subgenreCode: mappedGenre.subgenreCode,
          subgenreName: mappedGenre.subgenreName
        }
      }

      // Classify the release type
      const classification = classifyRelease(mappedRelease)

      // Generate a unique but stable message ID for idempotency
      // Use provided messageId, or generate one that includes target info for stability
      const messageId = options.messageId || this.generateMessageId(
        releaseId, 
        targetConfig.id || 'default',
        options.messageSubType || 'Initial'
      )
      
      console.log('Generated ERN Message ID for idempotency:', messageId)

      // Call the Cloud Function to calculate MD5 hashes
      const calculateMD5 = httpsCallable(functions, 'calculateFileMD5')
      
      // Get MD5 for cover image
      let coverMD5 = null
      const coverAsset = mappedRelease.assets?.coverImage
      if (coverAsset?.url) {
        try {
          const coverResult = await calculateMD5({ url: coverAsset.url })
          coverMD5 = coverResult.data.md5
          console.log('Cover MD5:', coverMD5)
        } catch (error) {
          console.error('Error calculating cover MD5:', error)
        }
      }

      // Get MD5 for each audio track
      const trackMD5s = {}
      if (mappedRelease.tracks && mappedRelease.tracks.length > 0) {
        for (const track of mappedRelease.tracks) {
          if (track.audio?.url) {
            try {
              const audioResult = await calculateMD5({ url: track.audio.url })
              trackMD5s[track.isrc] = audioResult.data.md5
              console.log(`Track ${track.isrc} MD5:`, audioResult.data.md5)
            } catch (error) {
              console.error(`Error calculating MD5 for track ${track.isrc}:`, error)
            }
          }
        }
      }

      // Prepare the product data with mapped genres
      const product = {
        ...mappedRelease,
        basic: {
          ...mappedRelease.basic,
          upc: upc,
          ean: upc
        },
        metadata: {
          ...mappedRelease.metadata,
          genreCode: mappedGenre.code,
          genreName: mappedGenre.name,
          subgenreCode: mappedGenre.subgenreCode,
          subgenreName: mappedGenre.subgenreName
        },
        upc: upc // Add UPC at root level for compatibility
      }

      // Prepare resource data with calculated MD5 hashes
      const resourceData = {
        tracks: mappedRelease.tracks?.map((track, index) => ({
          ...track,
          md5: trackMD5s[track.isrc] || null,
          sequenceNumber: track.sequenceNumber || index + 1,
          title: track.metadata?.title || track.title || 'Untitled',
          artist: track.metadata?.displayArtist || track.artist || 'Unknown Artist',
          duration: track.metadata?.duration || track.duration || 0,
          isrc: track.isrc,
          audio: track.audio,
          metadata: track.metadata
        })) || [],
        coverImage: coverAsset ? {
          ...coverAsset,
          md5: coverMD5
        } : null
      }

      // Configuration object for the builders
      const config = {
        // Basic identifiers
        messageId,
        senderId: targetConfig.config?.distributorId || 'stardust-distro',
        senderName: targetConfig.senderName || user.displayName || 'Stardust Distro',
        senderPartyId: targetConfig.config?.distributorId || 'stardust-distro',
        messageSender: targetConfig.senderName || user.displayName || 'Stardust Distro',
        recipientId: targetConfig.partyId,
        recipientName: targetConfig.partyName,
        recipientPartyId: targetConfig.partyId,
        messageRecipient: targetConfig.partyName,
        messageCreatedDateTime: new Date().toISOString(),
        
        // Release classification
        profile: classification.profile,
        releaseType: classification.releaseType || 'Album',
        commercialType: classification.commercialType,
        
        // Message type configuration
        messageType: options.messageType || 'NewReleaseMessage',
        messageSubType: options.messageSubType || 'Initial',
        updateIndicator: options.messageSubType === 'Update' ? 'OriginalMessage' : null,
        
        // Deals configuration
        includeDeals: options.includeDeals !== false,
        dealStartDate: targetConfig.dealStartDate || new Date().toISOString().split('T')[0],
        dealEndDate: targetConfig.dealEndDate,
        commercialModels: targetConfig.commercialModels || [{
          type: 'PayAsYouGoModel',
          usageTypes: ['PermanentDownload', 'OnDemandStream']
        }],
        territories: targetConfig.territories || ['Worldwide'],
        takedownDate: options.takedownDate,
        
        // Additional metadata
        trackCount: mappedRelease.tracks?.length || 0,
        upc: upc,
        albumTitle: mappedRelease.basic?.title,
        albumArtist: mappedRelease.basic?.displayArtist,
        labelName: mappedRelease.basic?.label,
        releaseDate: mappedRelease.basic?.releaseDate,
        originalReleaseDate: mappedRelease.basic?.originalReleaseDate,
        catalogNumber: mappedRelease.basic?.catalogNumber,
        pLine: mappedRelease.metadata?.copyright,
        cLine: mappedRelease.metadata?.copyright,
        
        // URL handling - properly escape URLs for XML
        coverUrl: coverAsset?.url ? escapeUrlForXml(coverAsset.url) : null,
        coverMD5: coverMD5,
        coverImageUrl: coverAsset?.url ? escapeUrlForXml(coverAsset.url) : null,
        
        // Version-specific config
        allowUGCClips: targetConfig.allowUGCClips,
        supportsImmersiveAudio: targetConfig.supportsImmersiveAudio,
        meadUrl: targetConfig.meadUrl,
        pieUrl: targetConfig.pieUrl,
        exclusivity: targetConfig.exclusivity,
        preOrderDate: targetConfig.preOrderDate,
        displayStartDate: targetConfig.displayStartDate,
        supportsPreOrder: targetConfig.supportsPreOrder,
        audioFormats: targetConfig.audioFormats || ['WAV', 'FLAC']
      }

      // Log the configuration for debugging
      console.log('ERN Generation Config:', {
        version,
        profile: config.profile,
        releaseType: config.releaseType,
        messageSubType: config.messageSubType,
        trackCount: config.trackCount,
        upc: upc,
        messageId: messageId,
        targetId: targetConfig.id,
        genreMapping: {
          enabled: targetConfig.genreMapping?.enabled,
          original: release.metadata?.genreCode,
          mapped: mappedGenre.code
        }
      })

      // Get version-specific builder and generate ERN
      const builder = this.getBuilder(version)
      if (!builder) {
        throw new Error(`No builder available for ERN version ${version}`)
      }
      
      // Call buildERN with proper data structure
      const ernXml = builder.buildERN(product, resourceData, config)

      // Validate the generated ERN if not in test mode
      if (!targetConfig.testMode) {
        const validation = await this.validateERNVersion(ernXml, version)
        if (!validation.valid) {
          console.warn('ERN validation warning:', validation.error)
        }
      }

      // Save ERN with version tracking and genre mapping info
      await this.saveERNWithVersion(releaseId, ernXml, targetConfig, classification, {
        messageType: 'NewReleaseMessage',
        messageSubType: options.messageSubType || 'Initial',
        version: version,
        messageId: messageId, // Include messageId in save
        genreMapping: targetConfig.genreMapping?.enabled ? {
          enabled: true,
          original: release.metadata?.genreCode || null,
          mapped: mappedGenre.code || null,
          mappingId: targetConfig.genreMapping?.mappingId || null
        } : null  // Don't include genreMapping at all if not enabled
      })

      return {
        ern: ernXml,
        messageId,
        classification,
        version: version,
        profile: classification.profile,
        releaseType: classification.releaseType,
        messageSubType: options.messageSubType || 'Initial',
        upc: upc,
        targetId: targetConfig.id, // Include targetId for idempotency
        genreMapping: targetConfig.genreMapping?.enabled ? {
          enabled: true,
          original: release.metadata?.genreName || release.metadata?.genre || null,
          mapped: mappedGenre.name || mappedGenre.code || null
        } : null  // Return null if genre mapping is not enabled
      }
    } catch (error) {
      console.error('Error generating ERN:', error)
      throw error
    }
  }

  /**
   * Generate ERN with message type (backward compatibility)
   */
  async generateERNWithType(releaseId, targetConfig, messageTypeConfig) {
    const version = targetConfig.ernVersion || this.defaultVersion
    return this.generateERNWithVersion(releaseId, targetConfig, version, messageTypeConfig)
  }

  /**
   * Check version compatibility
   */
  isVersionCompatible(version, targetType) {
    const compatibility = {
      'spotify': ['4.3', '4.2'],
      'apple': ['4.3'],
      'amazon': ['4.3', '4.2', '3.8.2'],
      'tidal': ['4.3', '4.2'],
      'deezer': ['4.2', '3.8.2'],
      'youtube': ['4.3'],
      'default': ['4.3', '4.2', '3.8.2']
    }
    
    const supportedVersions = compatibility[targetType.toLowerCase()] || compatibility.default
    return supportedVersions.includes(version)
  }

  /**
   * Get recommended version for DSP
   */
  getRecommendedVersion(targetType) {
    const recommendations = {
      'spotify': '4.3',
      'apple': '4.3',
      'amazon': '3.8.2',
      'tidal': '4.3',
      'deezer': '3.8.2',
      'youtube': '4.3',
      'soundcloud': '3.8.2',
      'default': '4.3'
    }
    
    return recommendations[targetType.toLowerCase()] || recommendations.default
  }

  /**
   * Validate ERN version schema
   */
  async validateERNVersion(ernXml, version) {
    const versionMarkers = {
      '3.8.2': 'xmlns:ern="http://ddex.net/xml/ern/382"',
      '4.2': 'xmlns:ern="http://ddex.net/xml/ern/42"',
      '4.3': 'xmlns:ern="http://ddex.net/xml/ern/43"'
    }
    
    const marker = versionMarkers[version]
    if (!marker) {
      return { valid: false, error: `Unknown version: ${version}` }
    }
    
    if (!ernXml.includes(marker)) {
      return { valid: false, error: `ERN does not appear to be version ${version}` }
    }
    
    return { valid: true }
  }

  /**
   * Extract message ID from ERN XML
   */
  extractMessageId(ernXml) {
    const match = ernXml.match(/<MessageId>([^<]+)<\/MessageId>/)
    return match ? match[1] : null
  }

  /**
   * Save ERN with version tracking
   */
  async saveERNWithVersion(releaseId, ernXml, targetConfig, classification, messageConfig) {
    const docRef = doc(db, 'releases', releaseId)
    
    const ernData = {
      version: messageConfig.version,
      generatedAt: new Date(),
      messageId: this.extractMessageId(ernXml),
      messageType: messageConfig.messageType,
      messageSubType: messageConfig.messageSubType,
      target: targetConfig.name || 'Unknown',
      xml: ernXml,
      classification: classification ? {
        releaseType: classification.releaseType,
        commercialType: classification.commercialType,
        profile: classification.profile,
        trackCount: classification.trackCount,
        duration: classification.totalDurationFormatted,
        rationale: classification.rationale
      } : null
    }
    
    // Only add genreMapping if it exists and has values
    if (messageConfig.genreMapping) {
      ernData.genreMapping = {
        enabled: messageConfig.genreMapping.enabled || false,  // Default to false instead of undefined
        original: messageConfig.genreMapping.original || null,
        mapped: messageConfig.genreMapping.mapped || null
      }
      
      // Only add mappingId if it exists
      if (messageConfig.genreMapping.mappingId) {
        ernData.genreMapping.mappingId = messageConfig.genreMapping.mappingId
      }
    }
    
    // Track ERN history with version
    const ernHistoryKey = `${targetConfig.id || 'default'}_${Date.now()}`
    
    // Build the update object, excluding undefined values
    const updateData = {
      'ddex.lastGenerated': new Date(),
      'ddex.version': messageConfig.version,
      'ddex.classification': ernData.classification,
      'ddex.lastMessageType': messageConfig.messageSubType,
      [`ddex.ernHistory.${ernHistoryKey}`]: ernData
    }
    
    // Only add genreMapping if it exists
    if (ernData.genreMapping) {
      updateData['ddex.genreMapping'] = ernData.genreMapping
    }
    
    await updateDoc(docRef, updateData)
    
    return ernData
  }

  /**
   * Get ERN version statistics
   */
  async getVersionStats() {
    // This would query Firestore for ERN generation statistics
    return {
      '3.8.2': { count: 0, percentage: 0 },
      '4.2': { count: 0, percentage: 0 },
      '4.3': { count: 0, percentage: 100 }
    }
  }
}

export default new ERNService()