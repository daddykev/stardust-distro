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

/**
 * Enhanced ERN Service with multi-version support
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

      // Get the UPC/barcode from the correct field - check multiple possible locations
      const upc = release.basic?.upc || release.basic?.barcode || release.basic?.ean || ''

      // Validate UPC exists and is valid
      if (!upc || upc === 'undefined' || upc === '') {
        throw new Error('Release must have a valid UPC/barcode for DDEX delivery')
      }

      // Validate UPC format (12-14 digits)
      if (!/^\d{12,14}$/.test(upc)) {
        throw new Error(`Invalid UPC format: ${upc}. Must be 12-14 digits.`)
      }

      // Classify release to determine profile and type
      const classification = classifyRelease(release)
      console.log('Release classification:', classification)
      console.log('Using UPC:', upc)

      // Extract asset information from the release data itself
      const coverAsset = release.assets?.coverImage || null
      const audioAssets = []
      
      // Get audio assets from tracks
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
      
      // Calculate MD5 for cover image
      let coverMD5 = 'PENDING'
      if (coverAsset?.url) {
        try {
          const calculateMD5 = httpsCallable(functions, 'calculateFileMD5')
          const result = await calculateMD5({ url: coverAsset.url })
          coverMD5 = result.data.md5
        } catch (error) {
          console.error('Error calculating cover MD5:', error)
        }
      }

      // Prepare resource data from tracks
      const tracks = release.tracks || []
      const resourceData = await Promise.all(tracks.map(async (track, index) => {
        // Find the audio asset for this track
        const audioAsset = audioAssets.find(a => a.trackId === track.id)
        
        let md5 = 'PENDING'
        if (audioAsset?.storageUrl) {
          try {
            const calculateMD5 = httpsCallable(functions, 'calculateFileMD5')
            const result = await calculateMD5({ url: audioAsset.storageUrl })
            md5 = result.data.md5
          } catch (error) {
            console.error(`Error calculating MD5 for track ${track.id}:`, error)
          }
        }

        const discNumber = String(track.discNumber || 1).padStart(2, '0')
        const trackNumber = String(index + 1).padStart(3, '0')
        const fileExtension = audioAsset?.metadata?.format?.toLowerCase() || 'wav'
        // Use the validated UPC here
        const ddexFileName = `${upc}_${discNumber}_${trackNumber}.${fileExtension}`

        return {
          resourceReference: `A${String(index + 1).padStart(3, '0')}`,
          title: track.title || track.metadata?.title || `Track ${index + 1}`,
          artist: track.artist || track.displayArtist || track.metadata?.displayArtist || release.basic.artist,
          displayArtist: track.displayArtist || track.artist || track.metadata?.displayArtist || release.basic.artist,
          isrc: track.isrc || `XX${upc}${String(index + 1).padStart(2, '0')}`,
          duration: track.duration || track.audio?.duration || 180,
          fileName: ddexFileName,
          format: audioAsset?.metadata?.format || 'WAV',
          codecType: audioAsset?.metadata?.format || 'WAV',
          storageUrl: audioAsset?.storageUrl || track.audio?.url || '',
          md5: md5,
          label: release.basic.label,
          copyrightLine: release.metadata?.copyrightLine || `© ${new Date().getFullYear()} ${release.basic.label}`,
          contributors: track.metadata?.contributors || track.contributors || [],
          bitDepth: audioAsset?.metadata?.bitDepth,
          sampleRate: audioAsset?.metadata?.sampleRate,
          channels: audioAsset?.metadata?.channels,
          // Version-specific fields
          iswc: track.iswc,
          isImmersiveAudio: track.isImmersiveAudio,
          immersiveAudioType: track.immersiveAudioType,
          subtitle: track.subtitle,
          genre: track.metadata?.genre || track.genre,
          language: track.metadata?.language || track.language || 'en'
        }
      }))

      // Prepare product data with validated UPC
      const messageId = `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const product = {
        messageId,
        releaseReference: `R${upc}`,  // Use validated UPC
        grid: release.metadata?.grid || `A1-${upc}-R${upc}-M`,  // Use validated UPC
        upc: upc,  // Use validated UPC
        title: release.basic.title,
        subtitle: release.basic.subtitle,
        artist: release.basic.artist || release.basic.displayArtist,
        label: release.basic.label,
        releaseType: classification.releaseType,
        secondaryReleaseTypes: release.basic.secondaryReleaseTypes,
        releaseDate: release.basic.releaseDate,
        genre: release.metadata?.genre,
        subGenre: release.metadata?.subGenre,
        parentalWarning: release.metadata?.parentalWarning || 'NotExplicit',
        copyrightLine: release.metadata?.copyrightLine,
        productionYear: release.metadata?.productionYear,
        territoryCode: targetConfig.territories?.[0] || 'Worldwide',
        dealStartDate: targetConfig.dealStartDate,
        dealEndDate: targetConfig.dealEndDate,
        commercialModels: targetConfig.commercialModels,
        marketingComment: release.metadata?.marketingComment,
        displayStartDate: targetConfig.displayStartDate
      }

      // Prepare config with profile from classification
      const config = {
        messageId,
        messageSender: targetConfig.senderName || user.displayName || 'Unknown Sender',
        senderPartyId: targetConfig.senderPartyId || targetConfig.config?.distributorId,
        messageRecipient: targetConfig.partyName || targetConfig.name,
        recipientPartyId: targetConfig.partyId,
        profile: classification.profile,
        releaseType: classification.releaseType,
        trackCount: classification.trackCount,
        testMode: targetConfig.testMode || false,
        includeDeals: options.includeDeals !== false,
        messageSubType: options.messageSubType || 'Initial',
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
        upc: upc  // Log the UPC being used
      })

      // Get version-specific builder and generate ERN
      const builder = this.getBuilder(version)
      if (!builder) {
        throw new Error(`No builder available for ERN version ${version}`)
      }
      
      const ernXml = builder.buildERN(product, resourceData, config)

      // Validate the generated ERN if not in test mode
      if (!targetConfig.testMode) {
        const validation = await this.validateERNVersion(ernXml, version)
        if (!validation.valid) {
          console.warn('ERN validation warning:', validation.error)
        }
      }

      // Save ERN with version tracking
      await this.saveERNWithVersion(releaseId, ernXml, targetConfig, classification, {
        messageType: 'NewReleaseMessage',
        messageSubType: options.messageSubType || 'Initial',
        version: version
      })

      return {
        ern: ernXml,
        messageId,
        classification,
        version: version,
        profile: classification.profile,
        releaseType: classification.releaseType,
        upc: upc  // Return the UPC for confirmation
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
      'amazon': '3.8.2', // Most compatible
      'tidal': '4.3',
      'deezer': '3.8.2', // Most compatible
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
    // This would integrate with DDEX Workbench API
    // For now, return basic validation
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
    
    // Track ERN history with version
    const ernHistoryKey = `${targetConfig.id || 'default'}_${Date.now()}`
    
    await updateDoc(docRef, {
      'ddex.lastGenerated': new Date(),
      'ddex.version': messageConfig.version,
      'ddex.classification': ernData.classification,
      'ddex.lastMessageType': messageConfig.messageSubType,
      [`ddex.ernHistory.${ernHistoryKey}`]: ernData
    })
    
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