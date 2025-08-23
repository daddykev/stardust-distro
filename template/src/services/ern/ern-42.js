// services/ern/ern-42.js
import { create } from 'xmlbuilder2'
import { escapeUrlForXml } from '../../utils/urlUtils'

/**
 * ERN 4.2 Builder
 * Intermediate version with enhanced encoding support
 * Key difference: IsProvidedInDelivery flag is mandatory
 */
export class ERN42Builder {
  constructor() {
    this.version = '4.2'
    this.namespace = 'http://ddex.net/xml/ern/42'
    this.schemaLocation = 'http://ddex.net/xml/ern/42 http://ddex.net/xml/ern/42/release-notification.xsd'
  }

  /**
   * Build ERN 4.2 message
   */
  buildERN(product, resources, config) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
    
    // Root element with ERN 4.2 namespace
    const ernMessage = doc.ele('ern:NewReleaseMessage', {
      'xmlns:ern': this.namespace,
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': this.schemaLocation,
      'MessageSchemaVersionId': 'ern/42',
      'LanguageAndScriptCode': 'en',
      'xs:schemaLocation': this.schemaLocation
    })

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
    
    // Control type (4.2 style)
    const controlType = config.messageSubType === 'Update' ? 'UpdateMessage' : 
                       config.messageSubType === 'Takedown' ? 'TakedownMessage' : 
                       'NewReleaseMessage'
    header.ele('MessageControlType').txt(controlType)
    
    // Sender
    const sender = header.ele('MessageSender')
    sender.ele('PartyId').txt(config.senderPartyId || 'PADPIDA2023081501R')
    sender.ele('PartyName').ele('FullName').txt(config.messageSender)
    
    // Recipient
    const recipient = header.ele('MessageRecipient')
    recipient.ele('PartyId').txt(config.recipientPartyId || config.partyId)
    recipient.ele('PartyName').ele('FullName').txt(config.messageRecipient)
    
    // Dates
    header.ele('MessageCreatedDateTime').txt(new Date().toISOString())
    
    // Test/Live indicator
    if (config.testMode) {
      header.ele('IsTestMessage').txt('true')
    }
  }

  buildResourceList(parent, resources, upc, config) {
    const resourceList = parent.ele('ResourceList')
    
    // Add sound recordings with 4.2 specific flags
    resources.forEach(resource => {
      this.buildSoundRecording(resourceList, resource, upc, config)
    })
    
    // Add image resource
    this.buildImageResource(resourceList, upc, config.coverMD5, config.coverImageUrl, config)
  }

  buildSoundRecording(parent, resource, upc, config) {
    const recording = parent.ele('SoundRecording')
    
    recording.ele('SoundRecordingType').txt('MusicalWorkSoundRecording')
    recording.ele('ResourceReference').txt(resource.resourceReference)
    
    // IsArtistRelated (4.2 specific)
    recording.ele('IsArtistRelated').txt('true')
    
    const recordingId = recording.ele('SoundRecordingId')
    recordingId.ele('ISRC').txt(resource.isrc)
    
    // Resource musical work reference
    if (resource.iswc) {
      const workId = recording.ele('ResourceMusicalWorkReference')
      workId.txt(resource.iswc)
    }
    
    // Title
    const referenceTitle = recording.ele('DisplayTitle')
    referenceTitle.ele('TitleText').txt(resource.title)
    referenceTitle.ele('LanguageAndScriptCode').txt('en')
    
    // Duration
    const duration = `PT${Math.floor(resource.duration / 60)}M${Math.floor(resource.duration % 60)}S`
    recording.ele('Duration').txt(duration)
    
    // Artist
    const displayArtist = recording.ele('DisplayArtist')
    const artistName = displayArtist.ele('PartyName')
    artistName.ele('FullName').txt(resource.artist)
    artistName.ele('LanguageAndScriptCode').txt('en')
    displayArtist.ele('ArtistRole').txt('MainArtist')
    
    // Contributors (4.2 enhanced)
    if (resource.contributors) {
      resource.contributors.forEach(contributor => {
        const indirectContributor = recording.ele('IndirectResourceContributor')
        const contribName = indirectContributor.ele('PartyName')
        contribName.ele('FullName').txt(contributor.name)
        indirectContributor.ele('IndirectResourceContributorRole').txt(contributor.role)
      })
    }
    
    // Copyright
    const copyright = recording.ele('CLine')
    copyright.ele('Year').txt(new Date().getFullYear().toString())
    copyright.ele('CLineText').txt(product.copyrightLine || `© ${new Date().getFullYear()} ${product.label}`)
    
    // Technical details with 4.2 mandatory flag
    const technicalDetails = recording.ele('SoundRecordingDetailsByTerritory')
    technicalDetails.ele('TerritoryCode').txt('Worldwide')
    
    const technical = technicalDetails.ele('TechnicalSoundRecordingDetails')
    technical.ele('TechnicalResourceDetailsReference').txt(`T${resource.resourceReference}`)
    technical.ele('AudioCodecType').txt(resource.codecType || 'WAV')
    
    // 4.2 Enhanced encoding information
    if (resource.bitDepth) {
      technical.ele('BitDepth').txt(String(resource.bitDepth))
    }
    if (resource.sampleRate) {
      technical.ele('SamplingRate').txt(String(resource.sampleRate))
    }
    
    // CRITICAL FOR 4.2: IsProvidedInDelivery flag is mandatory
    technical.ele('IsProvidedInDelivery').txt('true')
    
    const file = technical.ele('File')
    file.ele('FileName').txt(resource.fileName)
    file.ele('FilePath').txt(resource.fileName)
    
    if (resource.storageUrl) {
      file.ele('URI').txt(escapeUrlForXml(resource.storageUrl))
    }
    
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(resource.md5 || 'PENDING')
  }

  buildImageResource(parent, upc, coverMD5, coverImageUrl, config) {
    const image = parent.ele('Image')
    
    image.ele('ImageType').txt('FrontCoverImage')
    image.ele('ResourceReference').txt('I001')
    
    // IsArtistRelated (4.2)
    image.ele('IsArtistRelated').txt('true')
    
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
    technical.ele('ImageResolution').txt('300')
    
    // CRITICAL FOR 4.2: IsProvidedInDelivery flag is mandatory
    technical.ele('IsProvidedInDelivery').txt('true')
    
    const file = technical.ele('File')
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
    const release = releaseList.ele('Release', {
      'IsMainRelease': 'true'
    })
    
    release.ele('ReleaseReference').txt(product.releaseReference)
    
    const releaseId = release.ele('ReleaseId')
    releaseId.ele('GRid').txt(product.grid || `A1-${product.upc}-${product.releaseReference}-M`)
    releaseId.ele('ICPN', { 'IsEan': 'false' }).txt(product.upc)
    
    // Release types (4.2 supports multiple)
    const releaseTypes = product.secondaryReleaseTypes && product.secondaryReleaseTypes.length > 0
      ? [product.releaseType, ...product.secondaryReleaseTypes]
      : [product.releaseType || 'Album']
    
    releaseTypes.forEach((type, index) => {
      release.ele('ReleaseType', index === 0 ? {} : { 'Namespace': 'UserDefined' }).txt(type)
    })
    
    // Title
    const referenceTitle = release.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(product.title)
    referenceTitle.ele('LanguageAndScriptCode').txt('en')
    
    // Artist
    const displayArtist = release.ele('DisplayArtist')
    const artistName = displayArtist.ele('PartyName')
    artistName.ele('FullName').txt(product.artist)
    artistName.ele('LanguageAndScriptCode').txt('en')
    displayArtist.ele('ArtistRole').txt('MainArtist')
    
    // Label
    if (product.label) {
      const labelName = release.ele('LabelName')
      labelName.txt(product.label)
    }
    
    // Parental warning (4.2)
    release.ele('ParentalWarningType').txt(product.parentalWarning || 'NotExplicit')
    
    // Release dates
    if (product.releaseDate) {
      release.ele('GlobalOriginalReleaseDate').txt(product.releaseDate)
    }
    
    // Release details by territory
    const releaseDetailsByTerritory = release.ele('ReleaseDetailsByTerritory')
    releaseDetailsByTerritory.ele('TerritoryCode').txt('Worldwide')
    
    const displayArtistName = releaseDetailsByTerritory.ele('DisplayArtistName')
    displayArtistName.txt(product.artist)
    
    if (product.label) {
      releaseDetailsByTerritory.ele('LabelName').txt(product.label)
    }
    
    // Genre
    if (product.genre) {
      const genre = releaseDetailsByTerritory.ele('Genre')
      genre.ele('GenreText').txt(product.genre)
    }
    
    // Resource groups for tracks
    resources.forEach((track, index) => {
      const resourceGroup = releaseDetailsByTerritory.ele('ResourceGroup')
      resourceGroup.ele('ResourceGroupType').txt('Component')
      resourceGroup.ele('SequenceNumber').txt(String(index + 1))
      
      const resourceGroupId = resourceGroup.ele('ResourceGroupContentItem')
      resourceGroupId.ele('SequenceNumber').txt(String(index + 1))
      resourceGroupId.ele('ResourceType').txt('SoundRecording')
      resourceGroupId.ele('ReleaseResourceReference', {
        'ReleaseResourceType': index === 0 ? 'PrimaryResource' : 'SecondaryResource'
      }).txt(track.resourceReference)
    })
    
    // Add image reference
    const imageGroup = releaseDetailsByTerritory.ele('ResourceGroup')
    imageGroup.ele('ResourceGroupType').txt('Component')
    const imageGroupContent = imageGroup.ele('ResourceGroupContentItem')
    imageGroupContent.ele('ResourceType').txt('Image')
    imageGroupContent.ele('ReleaseResourceReference', {
      'ReleaseResourceType': 'SecondaryResource'
    }).txt('I001')
  }

  buildDealList(parent, product, config) {
    const dealList = parent.ele('DealList')
    
    const releaseDeal = dealList.ele('ReleaseDeal')
    releaseDeal.ele('DealReleaseReference').txt(product.releaseReference)
    
    const deal = releaseDeal.ele('Deal')
    deal.ele('DealId').txt(`${product.releaseReference}_DEAL`)
    
    const dealTerms = deal.ele('DealTerms')
    
    // Territory
    dealTerms.ele('TerritoryCode').txt(product.territoryCode || 'Worldwide')
    
    // Validity period
    const validityPeriod = dealTerms.ele('ValidityPeriod')
    validityPeriod.ele('StartDate').txt(config.dealStartDate || new Date().toISOString().split('T')[0])
    
    if (config.dealEndDate) {
      validityPeriod.ele('EndDate').txt(config.dealEndDate)
    }
    
    // Distribution channels (4.2 specific)
    dealTerms.ele('DistributionChannelType').txt('Internet')
    
    // Commercial models with enhanced 4.2 structure
    const commercialModels = config.commercialModels || [{
      type: 'PayAsYouGoModel',
      usageTypes: ['PermanentDownload', 'OnDemandStream']
    }]
    
    commercialModels.forEach(model => {
      dealTerms.ele('CommercialModelType').txt(model.type)
      
      model.usageTypes.forEach(useType => {
        const usage = dealTerms.ele('Usage')
        usage.ele('UseType').txt(useType)
        
        // Distribution format type (4.2)
        if (useType === 'PermanentDownload') {
          usage.ele('DistributionFormatType').txt('HighQualityAudio')
        }
      })
      
      // Price information
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
}