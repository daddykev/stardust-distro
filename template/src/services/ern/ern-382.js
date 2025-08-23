// services/ern/ern-382.js
import { create } from 'xmlbuilder2'
import { escapeUrlForXml } from '../../utils/urlUtils'

/**
 * ERN 3.8.2 Builder
 * Most common version in the industry (80%+ usage)
 * Key differences: Different namespace, simplified deal structure, no immersive audio support
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
    
    // Root element with ERN 3.8.2 namespace
    const ernMessage = doc.ele('ern:NewReleaseMessage', {
      'xmlns:ern': this.namespace,
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': this.schemaLocation,
      'MessageSchemaVersionId': 'ern/382',
      'LanguageAndScriptCode': 'en'
    })

    // Build message header
    this.buildMessageHeader(ernMessage, config)
    
    // Build update indicator (3.8.2 specific)
    if (config.messageSubType === 'Update') {
      ernMessage.ele('UpdateIndicator').txt('UpdateMessage')
    } else if (config.messageSubType === 'Initial') {
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
    
    // MessageThreadId (3.8.2 uses this instead of just MessageId)
    header.ele('MessageThreadId').txt(config.messageId)
    header.ele('MessageId').txt(config.messageId)
    
    // Sender - Note: PartyId structure is different in 3.8.2
    const sender = header.ele('MessageSender')
    sender.ele('PartyId').txt(config.senderPartyId || 'PADPIDA2023081501R')
    sender.ele('PartyName').ele('FullName').txt(config.messageSender)
    
    // Recipient
    const recipient = header.ele('MessageRecipient')
    recipient.ele('PartyId').txt(config.recipientPartyId || config.partyId)
    recipient.ele('PartyName').ele('FullName').txt(config.messageRecipient)
    
    // Dates
    header.ele('MessageCreatedDateTime').txt(new Date().toISOString())
    
    // 3.8.2 specific: MessageControlType
    header.ele('MessageControlType').txt(config.testMode ? 'TestMessage' : 'LiveMessage')
  }

  buildResourceList(parent, resources, upc, config) {
    const resourceList = parent.ele('ResourceList')
    
    // Add sound recordings
    resources.forEach(resource => {
      this.buildSoundRecording(resourceList, resource, upc)
    })
    
    // Add image resource
    this.buildImageResource(resourceList, upc, config.coverMD5, config.coverImageUrl)
  }

  buildSoundRecording(parent, resource, upc) {
    const recording = parent.ele('SoundRecording')
    
    recording.ele('SoundRecordingType').txt('MusicalWorkSoundRecording')
    recording.ele('ResourceReference').txt(resource.resourceReference)
    
    // ResourceId structure is simpler in 3.8.2
    const recordingId = recording.ele('SoundRecordingId')
    recordingId.ele('ISRC').txt(resource.isrc)
    
    // Title
    const referenceTitle = recording.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(resource.title)
    
    // Duration (format: PTxxHxxMxxS)
    const duration = `PT${Math.floor(resource.duration / 60)}M${Math.floor(resource.duration % 60)}S`
    recording.ele('Duration').txt(duration)
    
    // Artist
    const displayArtist = recording.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(resource.artist)
    displayArtist.ele('ArtistRole').txt('MainArtist')
    
    // Technical details
    const technicalDetails = recording.ele('SoundRecordingDetailsByTerritory')
    technicalDetails.ele('TerritoryCode').txt('Worldwide')
    
    const technical = technicalDetails.ele('TechnicalSoundRecordingDetails')
    technical.ele('TechnicalResourceDetailsReference').txt(`T${resource.resourceReference}`)
    technical.ele('AudioCodecType').txt(resource.format || 'WAV')
    
    const file = technical.ele('File')
    file.ele('FileName').txt(resource.fileName)
    
    // 3.8.2 uses FilePath differently
    const filePath = `resources/${resource.fileName}`
    file.ele('FilePath').txt(filePath)
    
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
    
    const imageDetailsByTerritory = image.ele('ImageDetailsByTerritory')
    imageDetailsByTerritory.ele('TerritoryCode').txt('Worldwide')
    
    const technical = imageDetailsByTerritory.ele('TechnicalImageDetails')
    technical.ele('TechnicalResourceDetailsReference').txt('TI001')
    technical.ele('ImageCodecType').txt('JPEG')
    technical.ele('ImageHeight').txt('3000')
    technical.ele('ImageWidth').txt('3000')
    
    const file = technical.ele('File')
    file.ele('FileName').txt(`${upc}.jpg`)
    file.ele('FilePath').txt(`resources/${upc}.jpg`)
    
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
    
    // Release ID structure is different in 3.8.2
    release.ele('ReleaseReference').txt(product.releaseReference)
    
    const releaseId = release.ele('ReleaseId')
    releaseId.ele('GRid').txt(product.grid || `A1-${product.upc}-${product.releaseReference}-M`)
    releaseId.ele('ICPN', { 'IsEan': 'false' }).txt(product.upc)
    
    // Release type (simplified in 3.8.2)
    release.ele('ReleaseType').txt(product.releaseType || 'Album')
    
    // Title
    const referenceTitle = release.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(product.title)
    
    // Artist
    const displayArtist = release.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(product.artist)
    displayArtist.ele('ArtistRole').txt('MainArtist')
    
    // Label
    if (product.label) {
      release.ele('LabelName').txt(product.label)
    }
    
    // Release date (3.8.2 format)
    if (product.releaseDate) {
      release.ele('GlobalOriginalReleaseDate').txt(product.releaseDate)
    }
    
    // Add release details by territory
    const releaseDetailsByTerritory = release.ele('ReleaseDetailsByTerritory')
    releaseDetailsByTerritory.ele('TerritoryCode').txt('Worldwide')
    
    // Genre (3.8.2 location)
    if (product.genre) {
      releaseDetailsByTerritory.ele('Genre').ele('GenreText').txt(product.genre)
    }
    
    // Resource references
    const resourceRefList = release.ele('ReleaseResourceReferenceList')
    
    // Add tracks
    resources.forEach((track, index) => {
      resourceRefList.ele('ReleaseResourceReference', {
        'SequenceNumber': String(index + 1)
      }).txt(track.resourceReference)
    })
    
    // Add image
    resourceRefList.ele('ReleaseResourceReference').txt('I001')
  }

  buildDealList(parent, product, config) {
    const dealList = parent.ele('DealList')
    
    const deal = dealList.ele('ReleaseDeal')
    deal.ele('DealReleaseReference').txt(product.releaseReference)
    
    // Deal terms structure is simpler in 3.8.2
    const dealTerms = deal.ele('Deal')
    
    // Territory
    const territory = dealTerms.ele('TerritoryCode')
    territory.txt(product.territoryCode || 'Worldwide')
    
    // Deal dates
    const startDate = dealTerms.ele('StartDate')
    startDate.txt(config.dealStartDate || new Date().toISOString().split('T')[0])
    
    if (config.dealEndDate) {
      dealTerms.ele('EndDate').txt(config.dealEndDate)
    }
    
    // Commercial model (simpler in 3.8.2)
    const commercialModels = config.commercialModels || [{
      type: 'PayAsYouGoModel',
      usageTypes: ['PermanentDownload']
    }]
    
    commercialModels.forEach(model => {
      // In 3.8.2, usage types are at deal level
      model.usageTypes.forEach(useType => {
        const usage = dealTerms.ele('Usage')
        usage.ele('UseType').txt(useType)
        usage.ele('CommercialModelType').txt(model.type)
        
        // Price information (if applicable)
        if (model.price && model.type === 'PayAsYouGoModel') {
          const priceInfo = usage.ele('PriceInformation')
          priceInfo.ele('PriceType').txt('WholePrice')
          const price = priceInfo.ele('Price', {
            'CurrencyCode': model.currency || 'USD'
          })
          price.txt(String(model.price))
        }
      })
    })
  }
}