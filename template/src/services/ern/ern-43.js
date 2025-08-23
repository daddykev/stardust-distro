// services/ern/ern-43.js
import { create } from 'xmlbuilder2'
import { escapeUrlForXml } from '../../utils/urlUtils'

/**
 * ERN 4.3 Builder
 * Latest version with immersive audio, UGC clips, and MEAD/PIE hooks
 * Refactored from existing implementation
 */
export class ERN43Builder {
  constructor() {
    this.version = '4.3'
    this.namespace = 'http://ddex.net/xml/ern/43'
    this.schemaLocation = 'http://ddex.net/xml/ern/43 http://ddex.net/xml/ern/43/release-notification.xsd'
  }

  /**
   * Build ERN 4.3 message
   */
  buildERN(product, resources, config) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
    
    // Root element with ERN 4.3 namespace
    const ernMessage = doc.ele('ern:NewReleaseMessage', {
      'xmlns:ern': this.namespace,
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': this.schemaLocation,
      'MessageSchemaVersionId': 'ern/43',
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
    
    // Control type
    const controlType = config.messageSubType === 'Update' ? 'UpdateMessage' : 
                       config.messageSubType === 'Takedown' ? 'TakedownMessage' : 
                       'NewReleaseMessage'
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
    
    // Dates
    header.ele('MessageCreatedDateTime').txt(new Date().toISOString())
    
    // 4.3 specific: MEAD/PIE hooks
    if (config.meadUrl) {
      header.ele('MediaEnrichmentDataMessage').txt(config.meadUrl)
    }
    if (config.pieUrl) {
      header.ele('PartyEnrichmentDataMessage').txt(config.pieUrl)
    }
  }

  buildResourceList(parent, resources, upc, config) {
    const resourceList = parent.ele('ResourceList')
    
    // Add sound recordings with 4.3 enhancements
    resources.forEach(resource => {
      this.buildSoundRecording(resourceList, resource, upc, config)
    })
    
    // Add image resource
    this.buildImageResource(resourceList, upc, config.coverMD5, config.coverImageUrl)
  }

  buildSoundRecording(parent, resource, upc, config) {
    const recording = parent.ele('SoundRecording')
    
    recording.ele('SoundRecordingType').txt('MusicalWorkSoundRecording')
    recording.ele('ResourceReference').txt(resource.resourceReference)
    
    recording.ele('IsArtistRelated').txt('true')
    
    const recordingId = recording.ele('SoundRecordingId')
    const proprietaryId = recordingId.ele('ProprietaryId', {
      'Namespace': 'DPID:PADPIDA2023081501R'
    })
    proprietaryId.txt(`${upc}_${resource.resourceReference}`)
    recordingId.ele('ISRC').txt(resource.isrc)
    
    // 4.3: Immersive audio support
    if (resource.isImmersiveAudio) {
      recording.ele('IsImmersiveAudio').txt('true')
      
      if (resource.immersiveAudioType) {
        recording.ele('ImmersiveAudioType').txt(resource.immersiveAudioType) // e.g., 'DolbyAtmos'
      }
    }
    
    // Title
    const referenceTitle = recording.ele('DisplayTitle')
    referenceTitle.ele('TitleText').txt(resource.title)
    referenceTitle.ele('SubTitle').txt(resource.subtitle || '')
    
    // Duration
    const duration = `PT${Math.floor(resource.duration / 60)}M${Math.floor(resource.duration % 60)}S`
    recording.ele('Duration').txt(duration)
    
    // Artist
    const displayArtist = recording.ele('DisplayArtist')
    displayArtist.ele('PartyName').ele('FullName').txt(resource.artist)
    displayArtist.ele('ArtistRole').txt('MainArtist')
    
    // 4.3: Enhanced contributor support
    if (resource.contributors) {
      resource.contributors.forEach(contributor => {
        const indirectContributor = recording.ele('IndirectResourceContributor')
        const contribName = indirectContributor.ele('PartyName')
        contribName.ele('FullName').txt(contributor.name)
        
        // 4.3: Support for immersive audio engineers
        if (contributor.role === 'ImmersiveAudioMixer') {
          indirectContributor.ele('IndirectResourceContributorRole').txt('Mixer')
          indirectContributor.ele('ImmersiveContributorRole').txt('ImmersiveAudioMixer')
        } else {
          indirectContributor.ele('IndirectResourceContributorRole').txt(contributor.role)
        }
      })
    }
    
    // Copyright
    const copyright = recording.ele('CLine')
    copyright.ele('Year').txt(new Date().getFullYear().toString())
    copyright.ele('CLineText').txt(resource.copyrightLine || `© ${new Date().getFullYear()} ${resource.label}`)
    
    // 4.3: UGC clip authorization
    if (config.allowUGCClips) {
      const clipDetails = recording.ele('SoundRecordingEdition')
                                  .ele('TechnicalDetails')
                                  .ele('ClipDetails')
      clipDetails.ele('IsAuthorizedForUGC').txt('true')
      clipDetails.ele('MaximumClipLength').txt('PT30S') // 30 second clips
    }
    
    // Technical details
    const technicalDetails = recording.ele('SoundRecordingDetailsByTerritory')
    technicalDetails.ele('TerritoryCode').txt('Worldwide')
    
    const technical = technicalDetails.ele('TechnicalSoundRecordingDetails')
    technical.ele('TechnicalResourceDetailsReference').txt(`T${resource.resourceReference}`)
    technical.ele('AudioCodecType').txt(resource.codecType || 'WAV')
    
    // Enhanced audio metadata
    if (resource.bitDepth) {
      technical.ele('BitDepth').txt(String(resource.bitDepth))
    }
    if (resource.sampleRate) {
      technical.ele('SamplingRate').txt(String(resource.sampleRate))
    }
    if (resource.channels) {
      technical.ele('NumberOfChannels').txt(String(resource.channels))
    }
    
    const file = technical.ele('File')
    file.ele('FileName').txt(resource.fileName)
    file.ele('FilePath').txt(resource.fileName)
    
    if (resource.storageUrl) {
      file.ele('URI').txt(escapeUrlForXml(resource.storageUrl))
    }
    
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(resource.md5 || 'PENDING')
    
    // 4.3: Preview support
    if (resource.previewUrl) {
      const preview = technical.ele('Preview')
      preview.ele('StartPoint').txt('PT0S')
      preview.ele('Duration').txt('PT30S')
      preview.ele('URI').txt(escapeUrlForXml(resource.previewUrl))
    }
  }

  buildImageResource(parent, upc, coverMD5, coverImageUrl) {
    const image = parent.ele('Image')
    
    image.ele('ImageType').txt('FrontCoverImage')
    image.ele('ResourceReference').txt('I001')
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
    
    // Handle multiple release types
    const releaseTypes = product.secondaryReleaseTypes && product.secondaryReleaseTypes.length > 0
      ? [product.releaseType, ...product.secondaryReleaseTypes]
      : [product.releaseType || 'Album']
    
    releaseTypes.forEach((type, index) => {
      release.ele('ReleaseType', index === 0 ? {} : { 'Namespace': 'UserDefined' }).txt(type)
    })
    
    const releaseId = release.ele('ReleaseId')
    releaseId.ele('GRid').txt(product.grid || `A1-${product.upc}-${product.releaseReference}-M`)
    releaseId.ele('ICPN', { 'IsEan': 'false' }).txt(product.upc)
    
    // Title
    const referenceTitle = release.ele('DisplayTitle')
    referenceTitle.ele('TitleText').txt(product.title)
    referenceTitle.ele('SubTitle').txt(product.subtitle || '')
    
    // Display artist
    const displayArtist = release.ele('DisplayArtist')
    const artistName = displayArtist.ele('PartyName')
    artistName.ele('FullName').txt(product.artist)
    displayArtist.ele('ArtistRole').txt('MainArtist')
    
    // Label
    if (product.label) {
      release.ele('LabelName').txt(product.label)
    }
    
    // Parental warning
    release.ele('ParentalWarningType').txt(product.parentalWarning || 'NotExplicit')
    
    // Dates
    if (product.releaseDate) {
      release.ele('GlobalOriginalReleaseDate').txt(product.releaseDate)
    }
    
    // 4.3: Marketing comment
    if (product.marketingComment) {
      release.ele('MarketingComment').txt(product.marketingComment)
    }
    
    // Release details by territory
    const releaseDetailsByTerritory = release.ele('ReleaseDetailsByTerritory')
    releaseDetailsByTerritory.ele('TerritoryCode').txt('Worldwide')
    
    const displayArtistName = releaseDetailsByTerritory.ele('DisplayArtistName')
    displayArtistName.txt(product.artist)
    
    if (product.label) {
      releaseDetailsByTerritory.ele('LabelName').txt(product.label)
    }
    
    // Genre with sub-genre support
    if (product.genre) {
      const genre = releaseDetailsByTerritory.ele('Genre')
      genre.ele('GenreText').txt(product.genre)
      if (product.subGenre) {
        genre.ele('SubGenre').txt(product.subGenre)
      }
    }
    
    // 4.3: Release display dates (separate from deal dates)
    if (product.displayStartDate) {
      releaseDetailsByTerritory.ele('ReleaseDisplayStartDate').txt(product.displayStartDate)
    }
    
    // Resource groups
    const resourceGroupList = releaseDetailsByTerritory.ele('ResourceGroupList')
    
    // Main release group
    const mainGroup = resourceGroupList.ele('ResourceGroup')
    mainGroup.ele('ResourceGroupType').txt('ReleaseComponent')
    mainGroup.ele('SequenceNumber').txt('1')
    
    resources.forEach((track, index) => {
      const resourceItem = mainGroup.ele('ResourceGroupContentItem')
      resourceItem.ele('SequenceNumber').txt(String(index + 1))
      resourceItem.ele('ResourceType').txt('SoundRecording')
      resourceItem.ele('ReleaseResourceReference', {
        'ReleaseResourceType': index === 0 ? 'PrimaryResource' : 'SecondaryResource'
      }).txt(track.resourceReference)
    })
    
    // Add image to group
    const imageItem = mainGroup.ele('ResourceGroupContentItem')
    imageItem.ele('ResourceType').txt('Image')
    imageItem.ele('ReleaseResourceReference', {
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
    const territory = dealTerms.ele('Territory')
    territory.ele('TerritoryCode').txt(product.territoryCode || 'Worldwide')
    
    // 4.3: Exclusivity
    if (config.exclusivity) {
      territory.ele('ExclusionType').txt(config.exclusivity) // 'Exclusive' or 'NonExclusive'
    }
    
    // Deal period
    const validityPeriod = dealTerms.ele('ValidityPeriod')
    validityPeriod.ele('StartDate').txt(config.dealStartDate || new Date().toISOString().split('T')[0])
    
    if (config.dealEndDate) {
      validityPeriod.ele('EndDate').txt(config.dealEndDate)
    }
    
    // 4.3: Display dates (separate from availability)
    if (config.displayStartDate) {
      dealTerms.ele('ReleaseDisplayStartDateTime').txt(config.displayStartDate)
    }
    
    // Distribution channels
    dealTerms.ele('DistributionChannelType').txt('Internet')
    
    // Commercial models
    const commercialModels = config.commercialModels || [{
      type: 'SubscriptionModel',
      usageTypes: ['OnDemandStream', 'ConditionalDownload']
    }]
    
    commercialModels.forEach(model => {
      dealTerms.ele('CommercialModelType').txt(model.type)
      
      model.usageTypes.forEach(useType => {
        const usage = dealTerms.ele('Usage')
        usage.ele('UseType').txt(useType)
        
        // 4.3: Quality tiers
        if (useType === 'OnDemandStream' && model.qualityTier) {
          usage.ele('UserInterfaceType').txt(model.qualityTier) // 'HighQuality', 'Lossless'
        }
      })
      
      // Price information
      if (model.price) {
        const priceInfo = dealTerms.ele('PriceInformation')
        priceInfo.ele('PriceType').txt('WholePrice')
        
        const price = priceInfo.ele('Price')
        price.ele('Amount', {
          'CurrencyCode': model.currency || 'USD'
        }).txt(String(model.price))
      }
    })
    
    // 4.3: Pre-order support
    if (config.preOrderDate) {
      const preOrder = dealTerms.ele('PreOrderReleaseDate')
      preOrder.txt(config.preOrderDate)
    }
  }
}