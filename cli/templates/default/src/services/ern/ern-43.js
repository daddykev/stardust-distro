// services/ern/ern-43.js
import { create } from 'xmlbuilder2'
import { escapeUrlForXml } from '../../utils/urlUtils'

/**
 * ERN 4.3 Builder - Simplified to match working XML structure
 */
export class ERN43Builder {
  constructor() {
    this.version = '4.3'
    this.namespace = 'http://ddex.net/xml/ern/43'
    this.schemaLocation = 'http://ddex.net/xml/ern/43 http://ddex.net/xml/ern/43/release-notification.xsd'
  }

  /**
   * Build ERN 4.3 message - matching past-working.xml structure
   */
  buildERN(product, resources, config) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
    
    // Determine the correct profile version
    let profileVersion = 'SimpleAudioSingle/23'
    if (config.trackCount > 1) {
      profileVersion = 'SimpleAudioAlbum/23'
    }
    
    // Root element - matching working XML
    const ernMessage = doc.ele('ern:NewReleaseMessage', {
      'xmlns:ern': this.namespace,
      'xmlns:xs': 'http://www.w3.org/2001/XMLSchema-instance',  // Note: working XML uses xs, not xsi
      'MessageSchemaVersionId': 'ern/43',
      'ReleaseProfileVersionId': profileVersion,
      'LanguageAndScriptCode': 'en',
      'UpdateIndicator': config.messageSubType === 'Update' ? 'UpdateMessage' : 'OriginalMessage'
    })
    
    // Add xs:schemaLocation as an attribute (matching working XML exactly)
    ernMessage.att('xs:schemaLocation', this.schemaLocation)

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
    
    // Generate resource reference from track number or ISRC
    const resourceRef = `A${String(track.sequenceNumber || 1).padStart(3, '0')}`
    recording.ele('ResourceReference').txt(resourceRef)
    
    // Use ResourceId instead of SoundRecordingId (matching working XML)
    const resourceId = recording.ele('ResourceId')
    resourceId.ele('ISRC').txt(track.isrc)
    
    // ReferenceTitle (not DisplayTitle)
    const referenceTitle = recording.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(track.metadata?.title || track.title || 'Untitled')
    
    // DisplayTitleText as direct element
    recording.ele('DisplayTitleText').txt(track.metadata?.title || track.title || 'Untitled')
    
    // DisplayArtist
    const displayArtist = recording.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(track.metadata?.displayArtist || track.artist || 'Unknown Artist')
    
    // Duration
    const durationSeconds = track.metadata?.duration || track.duration || 0
    const duration = `PT${Math.floor(durationSeconds / 60)}M${Math.floor(durationSeconds % 60)}S`
    recording.ele('Duration').txt(duration)
    
    // Language of performance
    recording.ele('LanguageOfPerformance').txt(track.language || 'en')
    
    recording.ele('IsArtistRelated').txt('true')
    
    // PLine (not CLine for sound recordings in working XML)
    const pLine = recording.ele('PLine')
    pLine.ele('Year').txt(String(new Date().getFullYear()))
    pLine.ele('PLineText').txt(`${new Date().getFullYear()} ${track.label || track.metadata?.displayArtist || 'Unknown'}`)
    
    // TechnicalDetails (simplified structure matching working XML)
    const technicalDetails = recording.ele('TechnicalDetails')
    technicalDetails.ele('TechnicalResourceDetailsReference').txt(`T${resourceRef}`)
    technicalDetails.ele('AudioCodecType').txt('PCM')  // Always PCM in working XML
    technicalDetails.ele('BitRate').txt('1411')
    technicalDetails.ele('SamplingRate').txt('44100')
    technicalDetails.ele('BitsPerSample').txt('16')
    technicalDetails.ele('NumberOfChannels').txt('2')
    
    const file = technicalDetails.ele('File')
    // Use DDEX naming convention for filename
    const discNumber = '01'
    const trackNumber = String(track.sequenceNumber || 1).padStart(3, '0')
    const fileName = `${upc}_${discNumber}_${trackNumber}.wav`
    
    file.ele('FileName').txt(fileName)
    file.ele('FilePath').txt(fileName)
    
    if (track.audio?.url) {
      file.ele('URI').txt(escapeUrlForXml(track.audio.url))
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
    
    // TechnicalDetails (simplified like working XML)
    const technicalDetails = image.ele('TechnicalDetails')
    technicalDetails.ele('TechnicalResourceDetailsReference').txt('TI001')
    technicalDetails.ele('ImageCodecType').txt('JPEG')
    technicalDetails.ele('ImageWidth').txt('3000')
    technicalDetails.ele('ImageHeight').txt('3000')
    technicalDetails.ele('ImageResolution').txt('300')
    
    const file = technicalDetails.ele('File')
    file.ele('FileName').txt(`${upc}.jpg`)
    file.ele('FilePath').txt(`${upc}.jpg`)
    
    if (coverImageUrl) {
      file.ele('URI').txt(escapeUrlForXml(coverImageUrl))
    }
    
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(coverMD5 || 'PENDING')
  }

  buildReleaseList(parent, product, tracks) {
    const releaseList = parent.ele('ReleaseList')
    const release = releaseList.ele('Release')  // No IsMainRelease attribute in working XML
    
    // Generate release reference
    const releaseRef = `R${String(1).padStart(3, '0')}`
    release.ele('ReleaseReference').txt(releaseRef)
    release.ele('ReleaseType').txt(product.basic?.type || 'Album')
    
    const releaseId = release.ele('ReleaseId')
    releaseId.ele('ICPN', { 'isEan': 'true' }).txt(product.basic?.upc || product.basic?.barcode || product.upc)  // Note: lowercase isEan in working XML
    
    if (product.basic?.catalogNumber) {
      releaseId.ele('CatalogNumber', {
        'Namespace': 'DPID:PADPIDA2023081501R'
      }).txt(product.basic.catalogNumber)
    }
    
    // ReferenceTitle
    const referenceTitle = release.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(product.basic?.title || 'Untitled')
    
    // DisplayTitleText (flat)
    release.ele('DisplayTitleText').txt(product.basic?.title || 'Untitled')
    
    // DisplayArtist
    const displayArtist = release.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(product.basic?.displayArtist || 'Unknown Artist')
    
    if (product.basic?.label) {
      release.ele('LabelName').txt(product.basic.label)
    }
    
    // Genre at release level - using mapped genre if available
    if (product.metadata?.genreName || product.metadata?.genre) {
      release.ele('Genre').ele('GenreText').txt(product.metadata.genreName || product.metadata.genre)
    }
    
    // PLine
    const pLine = release.ele('PLine')
    pLine.ele('Year').txt(String(new Date().getFullYear()))
    pLine.ele('PLineText').txt(`${new Date().getFullYear()} ${product.basic?.label || 'Unknown Label'}`)
    
    // CLine
    const cLine = release.ele('CLine')
    cLine.ele('Year').txt(String(new Date().getFullYear()))
    cLine.ele('CLineText').txt(`${new Date().getFullYear()} ${product.basic?.label || 'Unknown Label'}`)
    
    // Dates (note the different format)
    const releaseDate = product.basic?.releaseDate ? 
      new Date(product.basic.releaseDate).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0]
    
    release.ele('ReleaseDate').txt(releaseDate)
    release.ele('OriginalReleaseDate').txt(product.basic?.originalReleaseDate || releaseDate)
    
    // ReleaseResourceReferenceList (simplified structure)
    const resourceRefList = release.ele('ReleaseResourceReferenceList')
    
    // Add track references
    if (Array.isArray(tracks)) {
      tracks.forEach((track, index) => {
        const resourceRef = track.resourceReference || `A${String(index + 1).padStart(3, '0')}`
        resourceRefList.ele('ReleaseResourceReference', {
          'ReleaseResourceType': index === 0 ? 'PrimaryResource' : 'SecondaryResource'
        }).txt(resourceRef)
      })
    }
    
    // Add image reference
    resourceRefList.ele('ReleaseResourceReference', {
      'ReleaseResourceType': 'SecondaryResource'
    }).txt('I001')
    
    // Store release reference for deal list
    product.releaseReference = releaseRef
  }

  buildDealList(parent, product, config) {
    const dealList = parent.ele('DealList')
    
    const releaseDeal = dealList.ele('ReleaseDeal')
    releaseDeal.ele('DealReleaseReference').txt(product.releaseReference || 'R001')
    
    const deal = releaseDeal.ele('Deal')
    deal.ele('DealId').txt(`${product.releaseReference || 'R001'}_DEAL_1`)
    
    const dealTerms = deal.ele('DealTerms')
    
    // Territory
    const territory = dealTerms.ele('Territory')
    territory.ele('TerritoryCode').txt('Worldwide')
    
    // Deal period
    const validityPeriod = dealTerms.ele('ValidityPeriod')
    validityPeriod.ele('StartDate').txt(config.dealStartDate || new Date().toISOString().split('T')[0])
    
    // Commercial model and usage (simplified like working XML)
    dealTerms.ele('CommercialModelType').txt('SubscriptionModel')
    
    const usage1 = dealTerms.ele('Usage')
    usage1.ele('UseType').txt('OnDemandStream')
    
    const usage2 = dealTerms.ele('Usage')
    usage2.ele('UseType').txt('NonInteractiveStream')
  }
}