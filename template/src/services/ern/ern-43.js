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
    this.buildResourceList(ernMessage, resources, product.upc, config)
    this.buildReleaseList(ernMessage, product, resources)
    
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
    sender.ele('PartyName').ele('FullName').txt(config.messageSender)
    
    // Recipient
    const recipient = header.ele('MessageRecipient')
    if (config.recipientPartyId) {
      recipient.ele('PartyId').txt(config.recipientPartyId)
    }
    recipient.ele('PartyName').ele('FullName').txt(config.messageRecipient)
  }

  buildResourceList(parent, resources, upc, config) {
    const resourceList = parent.ele('ResourceList')
    
    // Add sound recordings - simplified structure
    resources.forEach(resource => {
      this.buildSoundRecording(resourceList, resource, upc)
    })
    
    // Add image resource - simplified
    this.buildImageResource(resourceList, upc, config.coverMD5, config.coverImageUrl)
  }

  buildSoundRecording(parent, resource, upc) {
    const recording = parent.ele('SoundRecording')
    
    recording.ele('SoundRecordingType').txt('MusicalWorkSoundRecording')
    recording.ele('ResourceReference').txt(resource.resourceReference)
    
    // Use ResourceId instead of SoundRecordingId (matching working XML)
    const resourceId = recording.ele('ResourceId')
    resourceId.ele('ISRC').txt(resource.isrc)
    
    // ReferenceTitle (not DisplayTitle)
    const referenceTitle = recording.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(resource.title)
    
    // DisplayTitleText as direct element
    recording.ele('DisplayTitleText').txt(resource.title)
    
    // DisplayArtist
    const displayArtist = recording.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(resource.artist)
    
    // Duration
    const duration = `PT${Math.floor(resource.duration / 60)}M${Math.floor(resource.duration % 60)}S`
    recording.ele('Duration').txt(duration)
    
    // Language of performance
    recording.ele('LanguageOfPerformance').txt(resource.language || 'en')
    
    recording.ele('IsArtistRelated').txt('true')
    
    // PLine (not CLine for sound recordings in working XML)
    const pLine = recording.ele('PLine')
    pLine.ele('Year').txt(String(new Date().getFullYear()))
    pLine.ele('PLineText').txt(`${new Date().getFullYear()} ${resource.label || resource.artist}`)
    
    // TechnicalDetails (simplified structure matching working XML)
    const technicalDetails = recording.ele('TechnicalDetails')
    technicalDetails.ele('TechnicalResourceDetailsReference').txt(`T${resource.resourceReference}`)
    technicalDetails.ele('AudioCodecType').txt('PCM')  // Always PCM in working XML
    technicalDetails.ele('BitRate').txt('1411')
    technicalDetails.ele('SamplingRate').txt('44100')
    technicalDetails.ele('BitsPerSample').txt('16')
    technicalDetails.ele('NumberOfChannels').txt('2')
    
    const file = technicalDetails.ele('File')
    file.ele('FileName').txt(resource.fileName)
    file.ele('FilePath').txt(resource.fileName)
    
    if (resource.storageUrl) {
      file.ele('URI').txt(escapeUrlForXml(resource.storageUrl))
    }
    
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(resource.md5 || 'PENDING')
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

  buildReleaseList(parent, product, resources) {
    const releaseList = parent.ele('ReleaseList')
    const release = releaseList.ele('Release')  // No IsMainRelease attribute in working XML
    
    release.ele('ReleaseReference').txt(product.releaseReference)
    release.ele('ReleaseType').txt(product.releaseType || 'Single')
    
    const releaseId = release.ele('ReleaseId')
    releaseId.ele('ICPN', { 'isEan': 'true' }).txt(product.upc)  // Note: lowercase isEan in working XML
    releaseId.ele('CatalogNumber', {
      'Namespace': 'DPID:PADPIDA2023081501R'
    }).txt('APR-002')  // You may want to make this dynamic
    
    // ReferenceTitle
    const referenceTitle = release.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(product.title || 'Untitled')
    
    // DisplayTitleText (flat)
    release.ele('DisplayTitleText').txt(product.title || 'Untitled')
    
    // DisplayArtist
    const displayArtist = release.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(product.artist)
    
    release.ele('LabelName').txt(product.label)
    
    // Genre at release level
    if (product.genre) {
      release.ele('Genre').ele('GenreText').txt(product.genre)
    }
    
    // PLine
    const pLine = release.ele('PLine')
    pLine.ele('Year').txt(String(new Date().getFullYear()))
    pLine.ele('PLineText').txt(`${new Date().getFullYear()} ${product.label}`)
    
    // CLine
    const cLine = release.ele('CLine')
    cLine.ele('Year').txt(String(new Date().getFullYear()))
    cLine.ele('CLineText').txt(`${new Date().getFullYear()} ${product.label}`)
    
    // Dates (note the different format)
    release.ele('ReleaseDate').txt(product.releaseDate || new Date().toISOString().split('T')[0])
    release.ele('OriginalReleaseDate').txt(product.releaseDate || new Date().toISOString().split('T')[0])
    
    // ReleaseResourceReferenceList (simplified structure)
    const resourceRefList = release.ele('ReleaseResourceReferenceList')
    
    resources.forEach((track, index) => {
      resourceRefList.ele('ReleaseResourceReference', {
        'ReleaseResourceType': index === 0 ? 'PrimaryResource' : 'SecondaryResource'
      }).txt(track.resourceReference)
    })
    
    // Add image reference
    resourceRefList.ele('ReleaseResourceReference', {
      'ReleaseResourceType': 'SecondaryResource'
    }).txt('I001')
  }

  buildDealList(parent, product, config) {
    const dealList = parent.ele('DealList')
    
    const releaseDeal = dealList.ele('ReleaseDeal')
    releaseDeal.ele('DealReleaseReference').txt(product.releaseReference)
    
    const deal = releaseDeal.ele('Deal')
    deal.ele('DealId').txt(`${product.releaseReference}_DEAL_1`)
    
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