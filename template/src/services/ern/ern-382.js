// services/ern/ern-382.js
import { create } from 'xmlbuilder2'
import { escapeUrlForXml } from '../../utils/urlUtils'

/**
 * ERN 3.8.2 Builder - Simplified to match working structure
 */
export class ERN382Builder {
  constructor() {
    this.version = '3.8.2'
    this.namespace = 'http://ddex.net/xml/ern/382'
    this.schemaLocation = 'http://ddex.net/xml/ern/382 http://ddex.net/xml/ern/382/release-notification.xsd'
  }

  /**
   * Build ERN 3.8.2 message - simplified structure
   */
  buildERN(product, resources, config) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
    
    // Determine profile version for 3.8.2
    let profileVersion = 'AudioAlbum'
    if (config.profile === 'AudioSingle' || config.trackCount === 1) {
      profileVersion = 'SingleResourceRelease'
    }
    
    // Root element with ERN 3.8.2 namespace
    const ernMessage = doc.ele('ern:NewReleaseMessage', {
      'xmlns:ern': this.namespace,
      'xmlns:xs': 'http://www.w3.org/2001/XMLSchema-instance',
      'MessageSchemaVersionId': 'ern/382',
      'ReleaseProfileVersionId': profileVersion,
      'LanguageAndScriptCode': 'en'
    })
    
    // Add xs:schemaLocation
    ernMessage.att('xs:schemaLocation', this.schemaLocation)

    // Build message header
    this.buildMessageHeader(ernMessage, config)
    
    // Build update indicator (3.8.2 specific)
    if (config.messageSubType === 'Update') {
      ernMessage.ele('UpdateIndicator').txt('UpdateMessage')
    } else {
      ernMessage.ele('UpdateIndicator').txt('OriginalMessage')
    }
    
    // Build resource list
    this.buildResourceList(ernMessage, resources, product.upc, config)
    
    // Build release list
    this.buildReleaseList(ernMessage, product, resources)
    
    // Build deal list (conditionally)
    if (config.includeDeals !== false) {
      this.buildDealList(ernMessage, product, config)
    }
    
    return doc.end({ prettyPrint: true })
  }

  buildMessageHeader(parent, config) {
    const header = parent.ele('MessageHeader')
    
    // MessageThreadId (3.8.2 uses this in addition to MessageId)
    header.ele('MessageThreadId').txt(config.messageId)
    header.ele('MessageId').txt(config.messageId)
    
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
    
    // Dates
    header.ele('MessageCreatedDateTime').txt(new Date().toISOString())
    
    // MessageControlType
    header.ele('MessageControlType').txt(config.testMode ? 'TestMessage' : 'LiveMessage')
  }

  buildResourceList(parent, resources, upc, config) {
    const resourceList = parent.ele('ResourceList')
    
    // Add sound recordings - simplified
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
    
    // ResourceId (simpler structure)
    const resourceId = recording.ele('ResourceId')
    resourceId.ele('ISRC').txt(resource.isrc)
    
    // ReferenceTitle
    const referenceTitle = recording.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(resource.title)
    
    // DisplayTitleText (flat)
    recording.ele('DisplayTitleText').txt(resource.title)
    
    // DisplayArtist
    const displayArtist = recording.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(resource.artist)
    
    // Duration
    const duration = `PT${Math.floor(resource.duration / 60)}M${Math.floor(resource.duration % 60)}S`
    recording.ele('Duration').txt(duration)
    
    recording.ele('LanguageOfPerformance').txt(resource.language || 'en')
    recording.ele('IsArtistRelated').txt('true')
    
    // PLine
    const pLine = recording.ele('PLine')
    pLine.ele('Year').txt(String(new Date().getFullYear()))
    pLine.ele('PLineText').txt(`${new Date().getFullYear()} ${resource.label || resource.artist}`)
    
    // TechnicalDetails (simplified)
    const technicalDetails = recording.ele('TechnicalDetails')
    technicalDetails.ele('TechnicalResourceDetailsReference').txt(`T${resource.resourceReference}`)
    technicalDetails.ele('AudioCodecType').txt('PCM')
    technicalDetails.ele('BitRate').txt('1411')
    technicalDetails.ele('SamplingRate').txt('44100')
    technicalDetails.ele('BitsPerSample').txt('16')
    technicalDetails.ele('NumberOfChannels').txt('2')
    
    const file = technicalDetails.ele('File')
    file.ele('FileName').txt(resource.fileName)
    file.ele('FilePath').txt(resource.fileName)
    
    if (resource.storageUrl) {
      file.ele('URL').txt(escapeUrlForXml(resource.storageUrl))
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
    
    // TechnicalDetails (simplified)
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
      file.ele('URL').txt(escapeUrlForXml(coverImageUrl))
    }
    
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(coverMD5 || 'PENDING')
  }

  buildReleaseList(parent, product, resources) {
    const releaseList = parent.ele('ReleaseList')
    const release = releaseList.ele('Release')
    
    release.ele('ReleaseReference').txt(product.releaseReference)
    release.ele('ReleaseType').txt(product.releaseType || 'Album')
    
    const releaseId = release.ele('ReleaseId')
    releaseId.ele('GRid').txt(product.grid || `A1-${product.upc}-${product.releaseReference}-M`)
    
    if (product.upc && product.upc !== 'undefined') {
      releaseId.ele('ICPN', { 'isEan': 'false' }).txt(product.upc)
    }
    
    if (product.catalogNumber) {
      releaseId.ele('CatalogNumber', {
        'Namespace': 'DPID:PADPIDA2023081501R'
      }).txt(product.catalogNumber || 'CAT-001')
    }
    
    // ReferenceTitle
    const referenceTitle = release.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(product.title || 'Untitled')
    
    // DisplayTitleText (flat)
    release.ele('DisplayTitleText').txt(product.title || 'Untitled')
    
    // DisplayArtist
    const displayArtist = release.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(product.artist)
    
    release.ele('LabelName').txt(product.label)
    
    // Genre
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
    
    // Dates
    release.ele('ReleaseDate').txt(product.releaseDate || new Date().toISOString().split('T')[0])
    release.ele('OriginalReleaseDate').txt(product.releaseDate || new Date().toISOString().split('T')[0])
    
    // ReleaseResourceReferenceList
    const resourceRefList = release.ele('ReleaseResourceReferenceList')
    
    resources.forEach((track, index) => {
      resourceRefList.ele('ReleaseResourceReference', {
        'ReleaseResourceType': index === 0 ? 'PrimaryResource' : 'SecondaryResource'
      }).txt(track.resourceReference)
    })
    
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
    
    if (config.dealEndDate) {
      validityPeriod.ele('EndDate').txt(config.dealEndDate)
    }
    
    // Commercial model
    dealTerms.ele('CommercialModelType').txt('SubscriptionModel')
    
    // Usage types
    const usage1 = dealTerms.ele('Usage')
    usage1.ele('UseType').txt('OnDemandStream')
    
    const usage2 = dealTerms.ele('Usage')
    usage2.ele('UseType').txt('NonInteractiveStream')
  }
}