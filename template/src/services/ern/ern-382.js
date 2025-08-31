// services/ern/ern-382.js
import { create } from 'xmlbuilder2'
import { escapeUrlForXml } from '../../utils/urlUtils'

/**
 * ERN 3.8.2 Builder
 */
export class ERN382Builder {
  constructor() {
    this.version = '3.8.2'
    this.namespace = 'http://ddex.net/xml/ern/382'
    this.schemaLocation = 'http://ddex.net/xml/ern/382 http://ddex.net/xml/ern/382/release-notification.xsd'
  }

  /**
   * Build ERN 3.8.2 message
   */
  buildERN(product, resources, config) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
    
    // Determine the correct profile version for 3.8.2
    let profileVersion = 'AudioSingle'
    if (config.trackCount > 1) {
      profileVersion = 'AudioAlbum'
    }
    
    // Root element for 3.8.2
    const ernMessage = doc.ele('ern:NewReleaseMessage', {
      'xmlns:ern': this.namespace,
      'xmlns:xs': 'http://www.w3.org/2001/XMLSchema-instance',
      'MessageSchemaVersionId': 'ern/382',
      'ReleaseProfileVersionId': `CommonRelease${profileVersion}/13`,
      'LanguageAndScriptCode': 'en',
      'xs:schemaLocation': this.schemaLocation
    })

    // Build sections
    this.buildMessageHeader(ernMessage, config)
    
    // FIX: Pass the tracks array and coverImage separately
    this.buildResourceList(ernMessage, resources.tracks || [], product.upc || product.basic?.upc || product.basic?.barcode, {
      ...config,
      coverMD5: resources.coverImage?.md5,
      coverImageUrl: resources.coverImage?.url
    })
    
    this.buildReleaseList(ernMessage, product, resources.tracks || [])
    
    if (config.includeDeals !== false) {
      this.buildDealList(ernMessage, product, config)
    }
    
    return doc.end({ prettyPrint: true })
  }

  buildMessageHeader(parent, config) {
    const header = parent.ele('MessageHeader')
    
    // Thread ID for 3.8.2
    header.ele('MessageThreadId').txt(config.messageId)
    header.ele('MessageId').txt(config.messageId)
    header.ele('MessageCreatedDateTime').txt(new Date().toISOString())
    
    // Control type
    const controlType = config.messageSubType === 'Update' ? 'UpdateMessage' : 'TestMessage'
    header.ele('MessageControlType').txt(controlType)
    
    // Sender
    const sender = header.ele('MessageSender')
    if (config.senderPartyId) {
      sender.ele('PartyId').txt(config.senderPartyId)
    }
    sender.ele('PartyName').ele('FullName').txt(config.messageSender || config.senderName || import.meta.env.VITE_ORGANIZATION_NAME || 'Music Distributor')
    
    // SentOnBehalfOf for 3.8.2
    if (config.sentOnBehalfOf) {
      const sentOnBehalfOf = header.ele('SentOnBehalfOf')
      sentOnBehalfOf.ele('PartyId').txt(config.sentOnBehalfOf.partyId || config.senderPartyId)
      sentOnBehalfOf.ele('PartyName').ele('FullName').txt(config.sentOnBehalfOf.name || config.senderName)
    }
    
    // Recipient
    const recipient = header.ele('MessageRecipient')
    if (config.recipientPartyId) {
      recipient.ele('PartyId').txt(config.recipientPartyId)
    }
    recipient.ele('PartyName').ele('FullName').txt(config.messageRecipient || config.recipientName || 'DSP')
  }

  buildResourceList(parent, tracks, upc, config) {
    const resourceList = parent.ele('ResourceList')
    
    // Add sound recordings - handle as array
    if (Array.isArray(tracks)) {
      tracks.forEach(track => {
        this.buildSoundRecording(resourceList, track, upc)
      })
    }
    
    // Add image resource
    this.buildImageResource(resourceList, upc, config.coverMD5, config.coverImageUrl)
  }

  buildSoundRecording(parent, track, upc) {
    const recording = parent.ele('SoundRecording')
    
    recording.ele('SoundRecordingType').txt('MusicalWorkSoundRecording')
    
    // Generate resource reference
    const resourceRef = `A${String(track.sequenceNumber || 1).padStart(3, '0')}`
    recording.ele('ResourceReference').txt(resourceRef)
    
    // SoundRecordingId for 3.8.2
    const resourceId = recording.ele('SoundRecordingId')
    resourceId.ele('ISRC').txt(track.isrc)
    
    // Title
    const referenceTitle = recording.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(track.metadata?.title || track.title || 'Untitled')
    referenceTitle.ele('SubTitle').txt(track.metadata?.subtitle || '')
    
    // Display title
    const displayTitle = recording.ele('DisplayTitle')
    displayTitle.ele('TitleText').txt(track.metadata?.title || track.title || 'Untitled')
    
    // Display artist
    const displayArtist = recording.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(track.metadata?.displayArtist || track.artist || 'Unknown Artist')
    displayArtist.ele('ArtistRole').txt('MainArtist')
    
    // Duration (3.8.2 format)
    const durationSeconds = track.metadata?.duration || track.duration || 0
    const duration = `PT${Math.floor(durationSeconds / 60)}M${Math.floor(durationSeconds % 60)}S`
    recording.ele('Duration').txt(duration)
    
    // Details
    const detailsByTerritory = recording.ele('DetailsByTerritory')
    detailsByTerritory.ele('TerritoryCode').txt('Worldwide')
    
    // Language
    detailsByTerritory.ele('LanguageOfPerformance').txt(track.language || 'en')
    
    // PLine
    const pLine = detailsByTerritory.ele('PLine')
    pLine.ele('Year').txt(String(new Date().getFullYear()))
    pLine.ele('PLineText').txt(`${new Date().getFullYear()} ${track.label || track.metadata?.displayArtist || 'Unknown'}`)
    
    // TechnicalSoundRecordingDetails
    const technicalDetails = detailsByTerritory.ele('TechnicalSoundRecordingDetails')
    technicalDetails.ele('TechnicalResourceDetailsReference').txt(`T${resourceRef}`)
    technicalDetails.ele('AudioCodecType').txt('PCM')
    technicalDetails.ele('BitRate').txt('1411')
    technicalDetails.ele('SamplingRate').txt('44100')
    technicalDetails.ele('BitsPerSample').txt('16')
    technicalDetails.ele('NumberOfChannels').txt('2')
    
    const file = technicalDetails.ele('File')
    const discNumber = '01'
    const trackNumber = String(track.sequenceNumber || 1).padStart(3, '0')
    const fileName = `${upc}_${discNumber}_${trackNumber}.wav`
    
    file.ele('FileName').txt(fileName)
    file.ele('FilePath').txt(fileName)
    
    if (track.audio?.url) {
      file.ele('URL').txt(escapeUrlForXml(track.audio.url))
    }
    
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(track.md5 || 'PENDING')
    
    // Store resource reference for later use
    track.resourceReference = resourceRef
  }

  buildImageResource(parent, upc, coverMD5, coverImageUrl) {
    const image = parent.ele('Image')
    
    image.ele('ImageType').txt('FrontCoverImage')
    image.ele('ResourceReference').txt('I001')
    
    const imageId = image.ele('ImageId')
    imageId.ele('ProprietaryId', {
      'Namespace': 'DPID:PADPIDA2023081501R'
    }).txt(`${upc}_IMG_001`)
    
    // DetailsByTerritory for 3.8.2
    const detailsByTerritory = image.ele('DetailsByTerritory')
    detailsByTerritory.ele('TerritoryCode').txt('Worldwide')
    
    // TechnicalImageDetails
    const technicalDetails = detailsByTerritory.ele('TechnicalImageDetails')
    technicalDetails.ele('TechnicalResourceDetailsReference').txt('TI001')
    technicalDetails.ele('ImageCodecType').txt('JPEG')
    technicalDetails.ele('ImageWidth').txt('3000')
    technicalDetails.ele('ImageHeight').txt('3000')
    technicalDetails.ele('ImageResolution').txt('300')
    
    const file = technicalDetails.ele('File')
    file.ele('FileName').txt(`${upc}.jpg`)
    file.ele('FilePath').txt(`${upc}.jpg`)
    
    if (coverImageUrl) {
      file.ele('URL').txt(escapeUrlForXml(coverImageUrl))
    }
    
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(coverMD5 || 'PENDING')
  }

  buildReleaseList(parent, product, tracks) {
    const releaseList = parent.ele('ReleaseList')
    const release = releaseList.ele('Release', { 'IsMainRelease': 'true' })
    
    // Release reference
    const releaseRef = `R${String(1).padStart(3, '0')}`
    release.ele('ReleaseReference').txt(releaseRef)
    release.ele('ReleaseType').txt(product.basic?.type || 'Album')
    
    const releaseId = release.ele('ReleaseId')
    releaseId.ele('ICPN', { 'IsEan': 'true' }).txt(product.basic?.upc || product.basic?.barcode || product.upc)
    
    if (product.basic?.catalogNumber) {
      releaseId.ele('CatalogNumber', {
        'Namespace': 'DPID:PADPIDA2023081501R'
      }).txt(product.basic.catalogNumber)
    }
    
    // Title
    const referenceTitle = release.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(product.basic?.title || 'Untitled')
    
    const displayTitle = release.ele('DisplayTitle')
    displayTitle.ele('TitleText').txt(product.basic?.title || 'Untitled')
    
    // Artist
    const displayArtist = release.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(product.basic?.displayArtist || 'Unknown Artist')
    displayArtist.ele('ArtistRole').txt('MainArtist')
    
    if (product.basic?.label) {
      release.ele('LabelName').txt(product.basic.label)
    }
    
    // Genre (3.8.2 structure)
    if (product.metadata?.genreName || product.metadata?.genre) {
      const genre = release.ele('Genre')
      genre.ele('GenreText').txt(product.metadata.genreName || product.metadata.genre)
    }
    
    // PLine
    const pLine = release.ele('PLine')
    pLine.ele('Year').txt(String(new Date().getFullYear()))
    pLine.ele('PLineText').txt(`${new Date().getFullYear()} ${product.basic?.label || 'Unknown Label'}`)
    
    // CLine
    const cLine = release.ele('CLine')
    cLine.ele('Year').txt(String(new Date().getFullYear()))
    cLine.ele('CLineText').txt(`${new Date().getFullYear()} ${product.basic?.label || 'Unknown Label'}`)
    
    // Dates (3.8.2 structure with GlobalOriginalReleaseDate)
    const releaseDate = product.basic?.releaseDate ? 
      new Date(product.basic.releaseDate).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0]
    
    release.ele('GlobalOriginalReleaseDate').txt(product.basic?.originalReleaseDate || releaseDate)
    
    // ReleaseDetailsByTerritory
    const releaseDetails = release.ele('ReleaseDetailsByTerritory')
    releaseDetails.ele('TerritoryCode').txt('Worldwide')
    
    // DisplayArtistName at territory level
    releaseDetails.ele('DisplayArtistName').txt(product.basic?.displayArtist || 'Unknown Artist')
    releaseDetails.ele('LabelName').txt(product.basic?.label || 'Unknown Label')
    releaseDetails.ele('ReleaseDate').txt(releaseDate)
    
    // Resource references in ReleaseDetailsByTerritory
    const resourceRefList = releaseDetails.ele('ReleaseResourceReferenceList')
    
    // Add track references
    if (Array.isArray(tracks)) {
      tracks.forEach((track, index) => {
        const resourceRef = track.resourceReference || `A${String(index + 1).padStart(3, '0')}`
        const refElement = resourceRefList.ele('ReleaseResourceReference')
        refElement.ele('SequenceNumber').txt(String(index + 1))
        refElement.ele('ReleaseResourceReference').txt(resourceRef)
        refElement.ele('ResourceType').txt('SoundRecording')
      })
    }
    
    // Add image reference
    const imageRef = resourceRefList.ele('ReleaseResourceReference')
    imageRef.ele('SequenceNumber').txt(String((tracks?.length || 0) + 1))
    imageRef.ele('ReleaseResourceReference').txt('I001')
    imageRef.ele('ResourceType').txt('Image')
    
    // Store release reference for deal list
    product.releaseReference = releaseRef
  }

  buildDealList(parent, product, config) {
    const dealList = parent.ele('DealList')
    
    const releaseDeal = dealList.ele('ReleaseDeal')
    releaseDeal.ele('DealReleaseReference').txt(product.releaseReference || 'R001')
    
    const deal = releaseDeal.ele('Deal')
    
    // DealTerms
    const dealTerms = deal.ele('DealTerms')
    dealTerms.ele('CommercialModelType').txt('SubscriptionModel')
    
    // Usage for 3.8.2
    const usage = dealTerms.ele('Usage')
    usage.ele('UseType').txt('OnDemandStream')
    usage.ele('UseType').txt('NonInteractiveStream')
    
    // Territory
    dealTerms.ele('TerritoryCode').txt('Worldwide')
    
    // Deal period
    const validityPeriod = dealTerms.ele('ValidityPeriod')
    validityPeriod.ele('StartDate').txt(config.dealStartDate || new Date().toISOString().split('T')[0])
    
    // Deal ID at the end
    deal.ele('DealId').txt(`${product.releaseReference || 'R001'}_DEAL_1`)
  }
}