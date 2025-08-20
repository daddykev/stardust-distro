// src/services/ern.js
import { db } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { create } from 'xmlbuilder2'

// Constants for magic numbers
const TEN_MINUTES_IN_SECONDS = 600
const THIRTY_MINUTES_IN_SECONDS = 1800
const DEFAULT_IMAGE_WIDTH = 3000
const DEFAULT_IMAGE_HEIGHT = 3000
const DEFAULT_IMAGE_RESOLUTION = 300
const DEFAULT_AUDIO_CHANNELS = 2
const DEFAULT_BITS_PER_SAMPLE = 16
const DEFAULT_SAMPLING_RATE = 44100
const DEFAULT_BITRATE = 1411

export class ERNService {
  constructor() {
    this.version = '4.3'
    this.namespace = 'http://ddex.net/xml/ern/43'
  }

  /**
   * Classification engine for determining ReleaseType and Profile
   * Based on industry standards (primarily Apple Music's rules)
   */
  classifyRelease(release) {
    const tracks = release.tracks || []
    const trackCount = tracks.length
    
    // Calculate total duration
    const totalDuration = tracks.reduce((sum, track) => {
      const duration = track.duration || track.audio?.duration || 0
      return sum + duration
    }, 0)
    
    // Check if any track exceeds 10 minutes
    const hasLongTrack = tracks.some(track => {
      const duration = track.duration || track.audio?.duration || 0
      return duration > TEN_MINUTES_IN_SECONDS
    })
    
    // Determine classification based on industry standards
    let classification = {
      releaseType: 'Album',
      commercialType: 'Album',
      profile: 'Audio',
      rationale: ''
    }
    
    // Apply Apple Music's classification rules (industry standard)
    if (trackCount === 0) {
      classification = {
        releaseType: 'UserDefined',
        commercialType: 'Invalid',
        profile: 'Audio',
        rationale: 'No tracks in release'
      }
    } else if (trackCount === 1) {
      if (totalDuration > TEN_MINUTES_IN_SECONDS) {
        classification = {
          releaseType: 'Album',
          commercialType: 'EP',
          profile: 'Audio',
          rationale: `Single track over 10 minutes (${Math.round(totalDuration/60)}min)`
        }
      } else {
        classification = {
          releaseType: 'Single',
          commercialType: 'Single',
          profile: 'SimpleAudioSingle',
          rationale: `Single track under 10 minutes`
        }
      }
    } else if (trackCount >= 2 && trackCount <= 3) {
      if (totalDuration > THIRTY_MINUTES_IN_SECONDS) {
        classification = {
          releaseType: 'Album',
          commercialType: 'Album',
          profile: 'Audio',
          rationale: `${trackCount} tracks over 30 minutes total`
        }
      } else if (hasLongTrack) {
        classification = {
          releaseType: 'Album',
          commercialType: 'EP',
          profile: 'Audio',
          rationale: `${trackCount} tracks with at least one over 10 minutes`
        }
      } else {
        classification = {
          releaseType: 'Single',
          commercialType: 'Single',
          profile: 'Audio',
          rationale: `${trackCount} tracks, all under 10 minutes, total under 30 minutes`
        }
      }
    } else if (trackCount >= 4 && trackCount <= 6) {
      if (totalDuration > THIRTY_MINUTES_IN_SECONDS) {
        classification = {
          releaseType: 'Album',
          commercialType: 'Album',
          profile: 'Audio',
          rationale: `${trackCount} tracks over 30 minutes total`
        }
      } else {
        classification = {
          releaseType: 'Album',
          commercialType: 'EP',
          profile: 'Audio',
          rationale: `${trackCount} tracks under 30 minutes (EP range)`
        }
      }
    } else {
      classification = {
        releaseType: 'Album',
        commercialType: 'Album',
        profile: 'Audio',
        rationale: `${trackCount} tracks (7+ is always Album)`
      }
    }
    
    // Check if user manually specified a type that should override
    const userType = release.basic?.type
    if (userType) {
      if (userType === 'Single' && trackCount <= 3 && totalDuration < THIRTY_MINUTES_IN_SECONDS && !hasLongTrack) {
        classification.releaseType = 'Single'
        classification.commercialType = 'Single'
      } else if (userType === 'EP' && trackCount >= 1 && trackCount <= 6 && totalDuration < THIRTY_MINUTES_IN_SECONDS) {
        classification.releaseType = 'Album'
        classification.commercialType = 'EP'
        classification.rationale += ' (User specified EP)'
      } else if (userType === 'Compilation') {
        classification.releaseType = 'Album'
        classification.secondaryTypes = ['Compilation']
        classification.rationale += ' (Compilation)'
      }
    }
    
    // Add duration and track count to classification for reference
    classification.trackCount = trackCount
    classification.totalDurationSeconds = totalDuration
    classification.totalDurationFormatted = this.formatDuration(totalDuration)
    classification.hasLongTrack = hasLongTrack
    
    console.log('Release Classification:', {
      title: release.basic?.title,
      trackCount,
      totalDuration: `${Math.round(totalDuration/60)} minutes`,
      classification
    })
    
    return classification
  }

  /**
   * Calculate MD5 hash for a file from URL using Cloud Function
   */
  async calculateFileMD5(url) {
    if (!url) {
      throw new Error('No URL provided for MD5 calculation')
    }
    
    try {
      console.log(`Calculating MD5 for: ${url}`)
      const functions = getFunctions()
      const calculateMD5 = httpsCallable(functions, 'calculateFileMD5')
      const result = await calculateMD5({ url })
      console.log(`MD5 calculated: ${result.data.md5}`)
      return result.data.md5
    } catch (error) {
      console.error('Error calculating MD5:', error)
      throw new Error(`Failed to calculate MD5 for ${url}: ${error.message}`)
    }
  }

  /**
   * Generate ERN for a release with proper classification
   */
  async generateERN(releaseId, targetConfig = {}) {
    try {
      // Fetch release data
      const release = await this.getRelease(releaseId)
      
      // Validate critical data
      if (!release.basic?.barcode) {
        throw new Error('Release must have a valid UPC/barcode')
      }
      
      const upc = release.basic.barcode
      
      // Validate tracks have ISRCs
      const tracksWithoutISRC = (release.tracks || []).filter(t => !t.isrc && !t.metadata?.isrc)
      if (tracksWithoutISRC.length > 0) {
        throw new Error(`${tracksWithoutISRC.length} track(s) missing ISRC codes`)
      }
      
      // Classify the release
      const classification = this.classifyRelease(release)
      
      // Store classification for debugging/tracking
      release.classification = classification
      
      // Get cover image URL directly from known location
      const coverImageUrl = release.assets?.coverImage?.url || null
      
      // Transform release data with classification
      const product = this.transformToProduct(release, targetConfig, classification)
      
      // Transform resources with MD5 calculation
      const resourceData = await this.transformToResources(
        release.tracks || [], 
        upc, 
        coverImageUrl
      )
      
      // Build ERN XML with correct profile using xmlbuilder2
      const ernXml = await this.buildERNWithBuilder(product, resourceData, {
        messageControlType: targetConfig.testMode ? 'TestMessage' : 'LiveMessage',
        messageSender: targetConfig.senderName || release.basic?.label || 'Stardust Distro',
        messageRecipient: targetConfig.partyName || 'DSP',
        senderPartyId: targetConfig.senderPartyId,
        recipientPartyId: targetConfig.partyId,
        profile: classification.profile
      })
      
      // Save ERN and classification to release record
      await this.saveERN(releaseId, ernXml, targetConfig, classification)
      
      return {
        success: true,
        ern: ernXml,
        messageId: this.extractMessageId(ernXml),
        version: this.version,
        upc: upc,
        classification: {
          releaseType: classification.releaseType,
          commercialType: classification.commercialType,
          profile: classification.profile,
          trackCount: classification.trackCount,
          duration: classification.totalDurationFormatted,
          rationale: classification.rationale
        }
      }
    } catch (error) {
      console.error('Error generating ERN:', error)
      throw error
    }
  }

  /**
   * Transform release data to product format with classification
   */
  transformToProduct(release, targetConfig, classification) {
    const basic = release.basic || {}
    const metadata = release.metadata || {}
    const territories = release.territories || {}
    
    // Use classification for ReleaseType
    const releaseType = classification.releaseType
    const secondaryTypes = classification.secondaryTypes || []
    
    return {
      releaseReference: `R${release.id.substr(0, 10).toUpperCase()}`,
      releaseType: releaseType,
      secondaryReleaseTypes: secondaryTypes,
      commercialType: classification.commercialType,
      upc: basic.barcode,
      catalogNumber: basic.catalogNumber,
      title: basic.title || 'Untitled',
      artist: basic.displayArtist || 'Unknown Artist',
      label: basic.label || 'Independent',
      genre: metadata.genre,
      parentalWarning: metadata.parentalWarning,
      
      // Add classification metadata for DSPs
      trackCount: classification.trackCount,
      totalDuration: classification.totalDurationSeconds,
      
      // Copyright
      pLineYear: metadata.copyrightYear || new Date().getFullYear(),
      pLineText: metadata.pLine || `${metadata.copyrightYear || new Date().getFullYear()} ${basic.label || 'Independent'}`,
      cLineYear: metadata.copyrightYear || new Date().getFullYear(),
      cLineText: metadata.copyright || `${metadata.copyrightYear || new Date().getFullYear()} ${basic.label || 'Independent'}`,
      
      // Dates
      releaseDate: this.formatDate(basic.releaseDate),
      originalReleaseDate: basic.originalReleaseDate ? this.formatDate(basic.originalReleaseDate) : null,
      
      // Deal information
      dealStartDate: targetConfig.dealStartDate || new Date().toISOString().split('T')[0],
      dealEndDate: targetConfig.dealEndDate,
      
      // Territories
      territoryCode: territories.territories?.[0] || 'Worldwide',
      excludedTerritories: territories.excludedTerritories || [],
      
      // Commercial models
      commercialModels: targetConfig.commercialModels || [{
        type: 'PayAsYouGoModel',
        usageTypes: ['PermanentDownload', 'OnDemandStream']
      }],
      
      // Tracks
      tracks: (release.tracks || []).map((track, index) => ({
        sequenceNumber: index + 1,
        resourceReference: `A${(index + 1).toString().padStart(3, '0')}`,
        isrc: track.isrc,
        title: track.metadata?.title || track.title,
        artist: track.metadata?.displayArtist || track.artist || basic.displayArtist,
        duration: track.duration || track.audio?.duration || 0
      }))
    }
  }

  /**
   * Transform tracks to resources with DDEX-compliant file naming and MD5 calculation
   */
  async transformToResources(tracks, upc, coverImageUrl) {
    const discNumber = '01' // Default to disc 01
    
    // Calculate MD5 for audio files
    const audioResources = await Promise.all(tracks.map(async (track, index) => {
      const trackNumber = String(track.sequenceNumber || index + 1).padStart(3, '0')
      const audioFormat = track.audio?.format || 'WAV'
      const fileExtension = audioFormat.toLowerCase() === 'wav' ? 'wav' : 
                          audioFormat.toLowerCase() === 'flac' ? 'flac' : 'mp3'
      
      // DDEX-compliant filename
      const ddexFileName = `${upc}_${discNumber}_${trackNumber}.${fileExtension}`
      
      // Calculate MD5 for the audio file
      let audioMD5 = 'PENDING'
      const audioUrl = track.audio?.url || track.audioUrl
      
      if (audioUrl) {
        try {
          audioMD5 = await this.calculateFileMD5(audioUrl)
        } catch (error) {
          console.error(`Failed to calculate MD5 for track ${index + 1}:`, error)
          // Continue processing even if MD5 fails
          audioMD5 = 'MD5_CALCULATION_FAILED'
        }
      }
      
      const trackTitle = track.title || track.metadata?.title || `Track ${index + 1}`
      const trackArtist = track.artist || track.metadata?.displayArtist || track.displayArtist || 'Unknown Artist'
      const trackDuration = track.duration || track.metadata?.duration || track.audio?.duration || 0
      const trackISRC = track.isrc || track.metadata?.isrc
      
      if (!trackISRC) {
        throw new Error(`Track ${index + 1} (${trackTitle}) is missing ISRC code`)
      }
      
      return {
        resourceReference: `A${(index + 1).toString().padStart(3, '0')}`,
        isrc: trackISRC,
        title: trackTitle,
        artist: trackArtist,
        duration: this.formatDuration(trackDuration),
        ddexFileName: ddexFileName,
        fileUri: audioUrl || '',
        audioMD5: audioMD5,
        codecType: audioFormat === 'WAV' ? 'PCM' : audioFormat || 'PCM',
        bitRate: track.audio?.bitrate || DEFAULT_BITRATE,
        samplingRate: track.audio?.sampleRate || DEFAULT_SAMPLING_RATE,
        bitsPerSample: DEFAULT_BITS_PER_SAMPLE,
        channels: DEFAULT_AUDIO_CHANNELS,
        genre: track.genre || track.metadata?.genre,
        parentalWarning: track.parentalWarning || track.metadata?.parentalWarning,
        languageOfPerformance: track.language || track.metadata?.language || 'en',
        contributors: track.contributors || track.metadata?.contributors || [],
        label: track.label || track.metadata?.label,
        pLineYear: track.pLineYear || track.metadata?.pLineYear,
        pLineText: track.pLineText || track.metadata?.pLineText,
        previewDetails: track.preview ? {
          startPoint: track.preview.startTime || 30,
          endPoint: (track.preview.startTime || 30) + (track.preview.duration || 30)
        } : null
      }
    }))
    
    // Calculate MD5 for cover image
    let coverMD5 = 'PENDING'
    if (coverImageUrl) {
      try {
        coverMD5 = await this.calculateFileMD5(coverImageUrl)
      } catch (error) {
        console.error('Failed to calculate MD5 for cover image:', error)
        // Continue processing even if MD5 fails
        coverMD5 = 'MD5_CALCULATION_FAILED'
      }
    }
    
    return {
      audioResources,
      coverMD5,
      coverImageUrl
    }
  }

  /**
   * Build ERN XML using xmlbuilder2 for safety and correctness
   */
  async buildERNWithBuilder(product, resourceData, options = {}) {
    const messageId = this.generateMessageId()
    const createdDate = new Date().toISOString()
    
    // Use the profile from classification
    const profile = options.profile || 'Audio'
    const profileVersion = profile === 'SimpleAudioSingle' ? 'SimpleAudioSingle/23' : 'Audio/23'
    
    // Extract resources and coverMD5
    const resources = resourceData.audioResources || resourceData
    const coverMD5 = resourceData.coverMD5 || 'PENDING'
    const coverImageUrl = resourceData.coverImageUrl
    
    const config = {
      messageControlType: options.messageControlType || 'TestMessage',
      messageSender: options.messageSender || 'Stardust Distro',
      messageRecipient: options.messageRecipient || 'Test DSP',
      senderPartyId: options.senderPartyId,
      recipientPartyId: options.recipientPartyId,
      ...options
    }
    
    // Build ERN with xmlbuilder2
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
    
    const ernMessage = doc.ele('ern:NewReleaseMessage', {
      'xmlns:ern': this.namespace,
      'xmlns:xs': 'http://www.w3.org/2001/XMLSchema-instance',
      'MessageSchemaVersionId': 'ern/43',
      'ReleaseProfileVersionId': profileVersion,
      'LanguageAndScriptCode': 'en'
    })
    
    // Build MessageHeader
    const messageHeader = ernMessage.ele('MessageHeader')
    messageHeader.ele('MessageId').txt(messageId)
    messageHeader.ele('MessageCreatedDateTime').txt(createdDate)
    messageHeader.ele('MessageControlType').txt(config.messageControlType)
    
    const messageSender = messageHeader.ele('MessageSender')
    if (config.senderPartyId) {
      messageSender.ele('PartyId').txt(config.senderPartyId)
    }
    messageSender.ele('PartyName').ele('FullName').txt(config.messageSender)
    
    const messageRecipient = messageHeader.ele('MessageRecipient')
    if (config.recipientPartyId) {
      messageRecipient.ele('PartyId').txt(config.recipientPartyId)
    }
    messageRecipient.ele('PartyName').ele('FullName').txt(config.messageRecipient)
    
    // Build ResourceList
    this.buildResourceListWithBuilder(ernMessage, resources, product.upc, coverMD5, coverImageUrl)
    
    // Build ReleaseList
    this.buildReleaseListWithBuilder(ernMessage, product, resources)
    
    // Build DealList
    this.buildDealListWithBuilder(ernMessage, product)
    
    // Convert to XML string
    return doc.end({ prettyPrint: true })
  }

  /**
   * Build ResourceList using xmlbuilder2
   */
  buildResourceListWithBuilder(parent, resources, upc, coverMD5, coverImageUrl) {
    const resourceList = parent.ele('ResourceList')
    
    // Add sound recordings
    for (const resource of resources) {
      this.buildSoundRecordingWithBuilder(resourceList, resource)
    }
    
    // Add image resource
    this.buildImageResourceWithBuilder(resourceList, upc, coverMD5, coverImageUrl)
  }

  /**
   * Build SoundRecording using xmlbuilder2
   */
  buildSoundRecordingWithBuilder(parent, resource) {
    const soundRecording = parent.ele('SoundRecording')
    
    soundRecording.ele('SoundRecordingType').txt('MusicalWorkSoundRecording')
    soundRecording.ele('ResourceReference').txt(resource.resourceReference)
    
    const resourceId = soundRecording.ele('ResourceId')
    resourceId.ele('ISRC').txt(resource.isrc)
    
    const referenceTitle = soundRecording.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(resource.title)
    
    soundRecording.ele('DisplayTitleText').txt(resource.title)
    
    const displayArtist = soundRecording.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(resource.artist)
    
    soundRecording.ele('Duration').txt(resource.duration)
    
    if (resource.genre) {
      soundRecording.ele('Genre').ele('GenreText').txt(resource.genre)
    }
    
    if (resource.parentalWarning) {
      soundRecording.ele('ParentalWarningType').txt(resource.parentalWarning)
    }
    
    if (resource.languageOfPerformance) {
      soundRecording.ele('LanguageOfPerformance').txt(resource.languageOfPerformance)
    }
    
    soundRecording.ele('IsArtistRelated').txt('true')
    
    const pLineYear = resource.pLineYear || new Date().getFullYear()
    const pLineText = this.formatPLineText(resource.pLineText, pLineYear, resource.label || resource.artist)
    
    const pLine = soundRecording.ele('PLine')
    pLine.ele('Year').txt(String(pLineYear))
    pLine.ele('PLineText').txt(pLineText)
    
    // Add contributors if present
    if (resource.contributors && resource.contributors.length > 0) {
      for (const contrib of resource.contributors.filter(c => c.name)) {
        const contributor = soundRecording.ele('ResourceContributor')
        contributor.ele('PartyName').ele('FullName').txt(contrib.name)
        contributor.ele('ResourceContributorRole').txt(contrib.role)
      }
    }
    
    // Technical Details
    const technicalDetails = soundRecording.ele('TechnicalDetails')
    technicalDetails.ele('TechnicalResourceDetailsReference').txt(`T${resource.resourceReference}`)
    technicalDetails.ele('AudioCodecType').txt(resource.codecType || 'PCM')
    technicalDetails.ele('BitRate').txt(String(resource.bitRate || DEFAULT_BITRATE))
    technicalDetails.ele('SamplingRate').txt(String(resource.samplingRate || DEFAULT_SAMPLING_RATE))
    technicalDetails.ele('BitsPerSample').txt(String(resource.bitsPerSample || DEFAULT_BITS_PER_SAMPLE))
    technicalDetails.ele('NumberOfChannels').txt(String(resource.channels || DEFAULT_AUDIO_CHANNELS))
    
    const file = technicalDetails.ele('File')
    file.ele('FileName').txt(resource.ddexFileName)
    file.ele('FilePath').txt(resource.ddexFileName)
    if (resource.fileUri) {
      file.ele('URI').txt(resource.fileUri)
    }
    
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(resource.audioMD5 || 'PENDING')
    
    // Add preview details if present
    if (resource.previewDetails) {
      const preview = technicalDetails.ele('PreviewDetails')
      preview.ele('StartPoint').txt(String(resource.previewDetails.startPoint || 30))
      preview.ele('EndPoint').txt(String(resource.previewDetails.endPoint || 60))
      const previewDuration = (resource.previewDetails.endPoint || 60) - (resource.previewDetails.startPoint || 30)
      preview.ele('Duration').txt(`PT${previewDuration}S`)
      preview.ele('TopLeftCorner').txt('0')
      preview.ele('BottomRightCorner').txt('0')
      preview.ele('ExpressionType').txt('Full')
    }
  }

  /**
   * Build Image Resource using xmlbuilder2
   */
  buildImageResourceWithBuilder(parent, upc, coverMD5, coverImageUrl) {
    const image = parent.ele('Image')
    
    image.ele('ImageType').txt('FrontCoverImage')
    image.ele('ResourceReference').txt('I001')
    
    const imageId = image.ele('ImageId')
    imageId.ele('ProprietaryId', { 
      'Namespace': 'DPID:PADPIDA2023081501R' 
    }).txt(`${upc}_IMG_001`)
    
    const technicalDetails = image.ele('TechnicalDetails')
    technicalDetails.ele('TechnicalResourceDetailsReference').txt('TI001')
    technicalDetails.ele('ImageCodecType').txt('JPEG')
    technicalDetails.ele('ImageWidth').txt(String(DEFAULT_IMAGE_WIDTH))
    technicalDetails.ele('ImageHeight').txt(String(DEFAULT_IMAGE_HEIGHT))
    technicalDetails.ele('ImageResolution').txt(String(DEFAULT_IMAGE_RESOLUTION))
    
    const file = technicalDetails.ele('File')
    file.ele('FileName').txt(`${upc}.jpg`)
    file.ele('FilePath').txt(`${upc}.jpg`)
    
    // Include URI if we have the cover image URL
    if (coverImageUrl) {
      file.ele('URI').txt(coverImageUrl)
    }
    
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(coverMD5 || 'PENDING')
  }

  /**
   * Build ReleaseList using xmlbuilder2
   */
  buildReleaseListWithBuilder(parent, product, resources) {
    const releaseList = parent.ele('ReleaseList')
    const release = releaseList.ele('Release')
    
    release.ele('ReleaseReference').txt(product.releaseReference)
    
    // Handle multiple release types if present
    const releaseTypes = product.secondaryReleaseTypes && product.secondaryReleaseTypes.length > 0
      ? [product.releaseType, ...product.secondaryReleaseTypes]
      : [product.releaseType]
    
    for (const type of releaseTypes) {
      release.ele('ReleaseType').txt(type)
    }
    
    const releaseId = release.ele('ReleaseId')
    releaseId.ele('ICPN', { 'isEan': 'true' }).txt(product.upc)
    
    if (product.catalogNumber) {
      releaseId.ele('CatalogNumber', {
        'Namespace': `DPID:${product.labelDPID || 'PADPIDA2023081501R'}`
      }).txt(product.catalogNumber)
    }
    
    const referenceTitle = release.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(product.title)
    
    release.ele('DisplayTitleText').txt(product.title)
    
    const displayArtist = release.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(product.artist)
    
    release.ele('LabelName').txt(product.label)
    
    if (product.genre) {
      release.ele('Genre').ele('GenreText').txt(product.genre)
    }
    
    if (product.parentalWarning) {
      release.ele('ParentalWarningType').txt(product.parentalWarning)
    }
    
    // PLine
    const pLineYear = product.pLineYear || new Date().getFullYear()
    const pLineText = this.formatPLineText(product.pLineText, pLineYear, product.label)
    
    const pLine = release.ele('PLine')
    pLine.ele('Year').txt(String(pLineYear))
    pLine.ele('PLineText').txt(pLineText)
    
    // CLine
    const cLineYear = product.cLineYear || new Date().getFullYear()
    const cLineText = this.formatCLineText(product.cLineText, cLineYear, product.label)
    
    const cLine = release.ele('CLine')
    cLine.ele('Year').txt(String(cLineYear))
    cLine.ele('CLineText').txt(cLineText)
    
    const releaseDate = product.releaseDate || new Date().toISOString().split('T')[0]
    release.ele('ReleaseDate').txt(releaseDate)
    
    if (product.originalReleaseDate) {
      release.ele('OriginalReleaseDate').txt(product.originalReleaseDate)
    }
    
    // ReleaseResourceReferenceList
    const resourceRefList = release.ele('ReleaseResourceReferenceList')
    
    product.tracks.forEach((track, index) => {
      resourceRefList.ele('ReleaseResourceReference', {
        'ReleaseResourceType': index === 0 ? 'PrimaryResource' : 'SecondaryResource'
      }).txt(track.resourceReference)
    })
    
    // Add image reference
    resourceRefList.ele('ReleaseResourceReference', {
      'ReleaseResourceType': 'SecondaryResource'
    }).txt('I001')
  }

  /**
   * Build DealList using xmlbuilder2
   */
  buildDealListWithBuilder(parent, product) {
    const dealList = parent.ele('DealList')
    
    const startDate = product.dealStartDate || new Date().toISOString().split('T')[0]
    const commercialModels = product.commercialModels || [{
      type: 'PayAsYouGoModel',
      usageTypes: ['PermanentDownload']
    }]
    
    commercialModels.forEach((model, index) => {
      const releaseDeal = dealList.ele('ReleaseDeal')
      releaseDeal.ele('DealReleaseReference').txt(product.releaseReference)
      
      const deal = releaseDeal.ele('Deal')
      deal.ele('DealId').txt(`${product.releaseReference}_DEAL_${index + 1}`)
      
      const dealTerms = deal.ele('DealTerms')
      
      const territory = dealTerms.ele('Territory')
      territory.ele('TerritoryCode').txt(product.territoryCode)
      
      const validityPeriod = dealTerms.ele('ValidityPeriod')
      validityPeriod.ele('StartDate').txt(startDate)
      
      if (product.dealEndDate) {
        validityPeriod.ele('EndDate').txt(product.dealEndDate)
      }
      
      dealTerms.ele('CommercialModelType').txt(model.type)
      
      for (const useType of model.usageTypes) {
        dealTerms.ele('Usage').ele('UseType').txt(useType)
      }
      
      if (model.price && model.type === 'PayAsYouGoModel') {
        const priceInfo = dealTerms.ele('PriceInformation')
        priceInfo.ele('PriceType').txt('WholePrice')
        
        const price = priceInfo.ele('Price')
        price.ele('Amount', {
          'CurrencyCode': model.currency || 'USD'
        }).txt(String(model.price))
      }
    })
  }

  // Helper methods
  mapReleaseType(type) {
    const typeMap = {
      'Single': 'Single',
      'EP': 'Album',  // EP must be sent as Album
      'Album': 'Album',
      'Compilation': 'Compilation'
    }
    return typeMap[type] || 'Album'
  }

  formatDate(date) {
    if (!date) return new Date().toISOString().split('T')[0]
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toISOString().split('T')[0]
  }

  formatDuration(seconds) {
    if (!seconds) return 'PT0S'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    let duration = 'PT'
    if (hours > 0) duration += `${hours}H`
    if (minutes > 0) duration += `${minutes}M`
    if (secs > 0) duration += `${secs}S`
    
    return duration || 'PT0S'
  }

  formatPLineText(text, year, label) {
    if (text) return text
    return `${year} ${label || 'Independent'}`
  }

  formatCLineText(text, year, label) {
    if (text) return text
    return `${year} ${label || 'Independent'}`
  }

  getTerritoryCode(territories) {
    if (!territories || territories.length === 0) return 'Worldwide'
    return territories[0] || 'Worldwide'
  }

  generateMessageId() {
    return `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  extractMessageId(ernXml) {
    const match = ernXml.match(/<MessageId>([^<]+)<\/MessageId>/)
    return match ? match[1] : null
  }

  // Database operations
  async getRelease(releaseId) {
    const docRef = doc(db, 'releases', releaseId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      throw new Error('Release not found')
    }
    
    return { id: docSnap.id, ...docSnap.data() }
  }

  async saveERN(releaseId, ernXml, targetConfig, classification = null) {
    const docRef = doc(db, 'releases', releaseId)
    
    const ernData = {
      version: this.version,
      generatedAt: new Date(),
      messageId: this.extractMessageId(ernXml),
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
    
    await updateDoc(docRef, {
      'ddex.lastGenerated': new Date(),
      'ddex.version': this.version,
      'ddex.classification': ernData.classification,
      'ddex.erns': { [targetConfig.id || 'default']: ernData }
    })
    
    return ernData
  }
}

export default new ERNService()