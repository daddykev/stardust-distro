// services/ern.js
import { httpsCallable } from 'firebase/functions'
import { functions, auth, db } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ERN382Builder } from './ern/ern-382'
import { ERN42Builder } from './ern/ern-42'
import { ERN43Builder } from './ern/ern-43'

// Import existing services correctly
import catalogService from './catalog'
import { classifyRelease } from '../utils/releaseClassifier'
import { escapeUrlForXml } from '../utils/urlUtils'

// Constants from existing implementation
const DEFAULT_IMAGE_WIDTH = 3000
const DEFAULT_IMAGE_HEIGHT = 3000
const DEFAULT_IMAGE_RESOLUTION = 300

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

      // Extract asset information from the release data itself
      // The assets are stored within the release document
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
        const ddexFileName = `${release.basic.upc}_${discNumber}_${trackNumber}.${fileExtension}`

        return {
          resourceReference: `A${String(index + 1).padStart(3, '0')}`,
          title: track.title || track.metadata?.title || `Track ${index + 1}`,
          artist: track.artist || track.displayArtist || track.metadata?.displayArtist || release.basic.artist,
          displayArtist: track.displayArtist || track.artist || track.metadata?.displayArtist || release.basic.artist,
          isrc: track.isrc || `XX${release.basic.upc}${String(index + 1).padStart(2, '0')}`,
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

      // Classify release
      const classification = classifyRelease(release)

      // Prepare product data
      const messageId = `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const product = {
        messageId,
        releaseReference: `R${release.basic.upc}`,
        grid: release.metadata?.grid || `A1-${release.basic.upc}-R${release.basic.upc}-M`,
        upc: release.basic.upc,
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

      // Prepare config
      const config = {
        messageId,
        messageSender: targetConfig.senderName || user.displayName || 'Unknown Sender',
        senderPartyId: targetConfig.senderPartyId || targetConfig.config?.distributorId,
        messageRecipient: targetConfig.partyName || targetConfig.name,
        recipientPartyId: targetConfig.partyId,
        testMode: targetConfig.testMode || false,
        includeDeals: options.includeDeals !== false,
        messageSubType: options.messageSubType || 'Initial',
        coverMD5: coverMD5,
        coverImageUrl: coverAsset?.url ? escapeUrlForXml(coverAsset.url) : null,
        // Version-specific config
        allowUGCClips: targetConfig.allowUGCClips,
        meadUrl: targetConfig.meadUrl,
        pieUrl: targetConfig.pieUrl,
        exclusivity: targetConfig.exclusivity,
        preOrderDate: targetConfig.preOrderDate
      }

      // Get version-specific builder and generate ERN
      const builder = this.getBuilder(version)
      const ernXml = builder.buildERN(product, resourceData, config)

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
        version: version
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