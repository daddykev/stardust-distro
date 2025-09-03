// services/ern/ern-43.js
import { create } from 'xmlbuilder2'
import { escapeUrlForXml } from '../../utils/urlUtils'
import { groupContributorsByType } from '../contributorMapper'

/**
 * ERN 4.3 Builder with full contributor support and PartyList
 */
export class ERN43Builder {
  constructor() {
    this.version = '4.3'
    this.namespace = 'http://ddex.net/xml/ern/43'
    this.schemaLocation = 'http://ddex.net/xml/ern/43 http://ddex.net/xml/ern/43/release-notification.xsd'
    this.partyReferences = new Map() // Track party references
    this.partyCounter = 1
  }

  /**
   * Get or create a party reference
   */
  getPartyReference(partyName) {
    if (!partyName) return 'P999' // Fallback for missing names
    
    if (this.partyReferences.has(partyName)) {
      return this.partyReferences.get(partyName)
    }
    const reference = `P${this.partyCounter++}`
    this.partyReferences.set(partyName, reference)
    return reference
  }

  /**
   * Build ERN 4.3 message with proper structure
   */
  buildERN(product, resources, config) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
    
    // Reset party references for each message
    this.partyReferences.clear()
    this.partyCounter = 1
    
    // Determine profile version
    let profileVersion = 'SimpleAudioSingle/23'
    if (config.trackCount > 1) {
      profileVersion = 'SimpleAudioAlbum/23'
    }
    
    // Root element with required attributes including AvsVersionId
    const ernMessage = doc.ele('ern:NewReleaseMessage', {
      'xmlns:ern': this.namespace,
      'xmlns:xs': 'http://www.w3.org/2001/XMLSchema-instance',
      'MessageSchemaVersionId': 'ern/43',
      'ReleaseProfileVersionId': profileVersion,
      'AvsVersionId': '2024', // Required attribute for ERN 4.3
      'LanguageAndScriptCode': 'en',
      'UpdateIndicator': config.messageSubType === 'Update' ? 'UpdateMessage' : 'OriginalMessage',
      'xs:schemaLocation': this.schemaLocation
    })

    // Build sections in correct order
    this.buildMessageHeader(ernMessage, config)
    
    // Pre-collect all parties from the release data
    this.collectParties(product, resources.tracks || [])
    
    // Build PartyList (REQUIRED in ERN 4.3)
    this.buildPartyList(ernMessage)
    
    // Build ResourceList with tracks and images
    this.buildResourceList(ernMessage, resources.tracks || [], product.upc || product.basic?.upc || product.basic?.barcode, {
      ...config,
      coverMD5: resources.coverImage?.md5,
      coverImageUrl: resources.coverImage?.url
    })
    
    // Build ReleaseList
    this.buildReleaseList(ernMessage, product, resources.tracks || [], {
      ...config,
      coverMD5: resources.coverImage?.md5,
      coverImageUrl: resources.coverImage?.url
    })
    
    // Build DealList if needed
    if (config.includeDeals !== false) {
      this.buildDealList(ernMessage, product, config)
    }
    
    return doc.end({ prettyPrint: true })
  }

  /**
   * Collect all parties from the release
   */
  collectParties(product, tracks) {
    // Main artist
    if (product.basic?.displayArtist) {
      this.getPartyReference(product.basic.displayArtist)
    }
    
    // Track artists
    tracks.forEach(track => {
      const artistName = track.metadata?.displayArtist || track.artist
      if (artistName) {
        this.getPartyReference(artistName)
      }
      
      // Contributors
      if (track.contributors && Array.isArray(track.contributors)) {
        track.contributors.forEach(contributor => {
          if (contributor.name) {
            this.getPartyReference(contributor.name)
          }
        })
      }
    })
    
    // Label
    if (product.basic?.label) {
      this.getPartyReference(product.basic.label)
    }
  }

  /**
   * Build PartyList element (REQUIRED in ERN 4.3)
   */
  buildPartyList(parent) {
    const partyList = parent.ele('PartyList')
    
    // Add all collected parties
    this.partyReferences.forEach((reference, partyName) => {
      const party = partyList.ele('Party')
      party.ele('PartyReference').txt(reference)
      const partyNameElem = party.ele('PartyName')
      partyNameElem.ele('FullName').txt(partyName)
      
      // Add artist role if it's an artist (not a label)
      if (!partyName.includes('Records') && !partyName.includes('Label') && !partyName.includes('Music')) {
        party.ele('ArtistRole').txt('MainArtist')
      }
    })
  }

  buildMessageHeader(parent, config) {
    const header = parent.ele('MessageHeader')
    
    header.ele('MessageId').txt(config.messageId)
    header.ele('MessageCreatedDateTime').txt(new Date().toISOString())
    
    // Control type
    const controlType = config.messageSubType === 'Update' ? 
      'UpdateMessage' : 
      (config.messageSubType === 'Takedown' ? 'TakedownMessage' : 'TestMessage')
    header.ele('MessageControlType').txt(controlType)
    
    // Sender
    const sender = header.ele('MessageSender')
    sender.ele('PartyId').txt(config.senderPartyId || 'SDT')
    const senderName = sender.ele('PartyName')
    senderName.ele('FullName').txt(config.senderName || 'Alpha Pup')
    
    // Recipient
    const recipient = header.ele('MessageRecipient')
    recipient.ele('PartyId').txt(config.recipientPartyId || 'PADPIDA2014120301U')
    const recipientName = recipient.ele('PartyName')
    recipientName.ele('FullName').txt(config.recipientName || 'Stardust')
  }

  buildResourceList(parent, tracks, upc, config) {
    const resourceList = parent.ele('ResourceList')
    
    // Add SoundRecordings
    if (Array.isArray(tracks)) {
      tracks.forEach((track, index) => {
        // FIX: Use A1, A2 format instead of A001 for simpler validation
        const resourceRef = `A${index + 1}`
        this.buildSoundRecording(resourceList, track, resourceRef, index + 1, upc)
      })
    }
    
    // Add cover image if URL is provided
    if (config.coverImageUrl) {
      this.buildImage(resourceList, config, upc)
    }
  }

  buildSoundRecording(parent, track, resourceRef, trackNumber, upc) {
    const recording = parent.ele('SoundRecording')
    
    recording.ele('SoundRecordingType').txt('MusicalWorkSoundRecording')
    recording.ele('ResourceReference').txt(resourceRef)
    
    // Resource ID
    const resourceId = recording.ele('ResourceId')
    resourceId.ele('ISRC').txt(track.metadata?.isrc || track.isrc || `XX${Date.now()}${trackNumber}`)
    
    // Titles
    const referenceTitle = recording.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(track.metadata?.title || track.title || 'Untitled')
    
    recording.ele('DisplayTitleText').txt(track.metadata?.title || track.title || 'Untitled')
    
    // DisplayArtist with party reference
    const artistName = track.metadata?.displayArtist || track.artist || 'Unknown Artist'
    const artistRef = this.getPartyReference(artistName)
    
    const displayArtist = recording.ele('DisplayArtist')
    displayArtist.ele('ArtistPartyReference').txt(artistRef)
    displayArtist.ele('DisplayArtistRole').txt('MainArtist')
    
    // Contributors
    if (track.contributors && Array.isArray(track.contributors) && track.contributors.length > 0) {
      const grouped = groupContributorsByType(track.contributors)
      
      // Add ResourceContributors
      grouped.resourceContributors.forEach((contributor, idx) => {
        const contributorElem = recording.ele('ResourceContributor', {
          sequenceNumber: String(idx + 1)
        })
        const contribRef = this.getPartyReference(contributor.partyName)
        contributorElem.ele('PartyReference').txt(contribRef)
        contributorElem.ele('Role').txt(contributor.role)
      })
      
      // Add IndirectResourceContributors
      grouped.indirectResourceContributors.forEach((contributor, idx) => {
        const contributorElem = recording.ele('IndirectResourceContributor', {
          sequenceNumber: String(idx + 1)
        })
        const contribRef = this.getPartyReference(contributor.partyName)
        contributorElem.ele('PartyReference').txt(contribRef)
        contributorElem.ele('Role').txt(contributor.role)
      })
    }
    
    // Duration
    const durationSeconds = track.metadata?.duration || track.duration || 0
    const duration = `PT${Math.floor(durationSeconds / 60)}M${Math.floor(durationSeconds % 60)}S`
    recording.ele('Duration').txt(duration)
    
    recording.ele('LanguageOfPerformance').txt(track.language || 'en')
    recording.ele('IsArtistRelated').txt('true')
    
    // PLine
    const pLine = recording.ele('PLine')
    pLine.ele('Year').txt(String(new Date().getFullYear()))
    pLine.ele('PLineText').txt(`${new Date().getFullYear()} ${track.label || 'Alpha Pup'}`)
    
    // Technical details
    const techRef = `T${resourceRef}`
    const technicalDetails = recording.ele('TechnicalDetails')
    technicalDetails.ele('TechnicalResourceDetailsReference').txt(techRef)
    technicalDetails.ele('AudioCodecType').txt('PCM')
    technicalDetails.ele('BitRate').txt('1411')
    technicalDetails.ele('SamplingRate').txt('44100')
    technicalDetails.ele('BitsPerSample').txt('16')
    technicalDetails.ele('NumberOfChannels').txt('2')
    
    // File information
    const file = technicalDetails.ele('File')
    const fileName = `${upc}_01_${String(trackNumber).padStart(3, '0')}.wav`
    file.ele('FileName').txt(fileName)
    file.ele('FilePath').txt(fileName)
    
    // FIX: Always include URI for the audio file
    if (track.fileUrl || track.url) {
      file.ele('URI').txt(escapeUrlForXml(track.fileUrl || track.url))
    }
    
    // Hash sum
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(track.md5 || 'PENDING')
  }

  /**
   * Build Image resource for cover art
   */
  buildImage(parent, config, upc) {
    const image = parent.ele('Image')
    
    image.ele('ImageType').txt('FrontCoverImage')
    // FIX: Use A prefix for all resources per DDEX requirement
    image.ele('ResourceReference').txt('A_cover')
    
    // Image ID
    const imageId = image.ele('ImageId')
    imageId.ele('ProprietaryId', {
      Namespace: 'DPID:PADPIDA2023081501R'
    }).txt(`${upc}_IMG_001`)
    
    // Technical details
    const technicalDetails = image.ele('TechnicalDetails')
    technicalDetails.ele('TechnicalResourceDetailsReference').txt('TA_cover')
    technicalDetails.ele('ImageCodecType').txt('JPEG')
    technicalDetails.ele('ImageWidth').txt('3000')
    technicalDetails.ele('ImageHeight').txt('3000')
    technicalDetails.ele('ImageResolution').txt('300')
    
    // File information
    const file = technicalDetails.ele('File')
    const fileName = `${upc}.jpg`
    file.ele('FileName').txt(fileName)
    file.ele('FilePath').txt(fileName)
    
    if (config.coverImageUrl) {
      file.ele('URI').txt(escapeUrlForXml(config.coverImageUrl))
    }
    
    // Hash sum
    const hashSum = file.ele('HashSum')
    hashSum.ele('HashSumAlgorithmType').txt('MD5')
    hashSum.ele('HashSum').txt(config.coverMD5 || 'PENDING')
  }

  buildReleaseList(parent, product, tracks, config) {
    const releaseList = parent.ele('ReleaseList')
    const release = releaseList.ele('Release')
    
    // Release reference
    const releaseRef = 'R1'  // Simplified reference
    release.ele('ReleaseReference').txt(releaseRef)
    release.ele('ReleaseType').txt(product.basic?.type || 'Single')
    
    // Release ID
    const releaseId = release.ele('ReleaseId')
    releaseId.ele('ICPN', { isEan: 'true' }).txt(
      product.basic?.upc || product.basic?.barcode || product.upc
    )
    
    if (product.basic?.catalogNumber) {
      releaseId.ele('CatalogNumber', {
        Namespace: 'DPID:PADPIDA2023081501R'
      }).txt(product.basic.catalogNumber)
    }
    
    // Titles
    const referenceTitle = release.ele('ReferenceTitle')
    referenceTitle.ele('TitleText').txt(product.basic?.title || 'Untitled')
    
    release.ele('DisplayTitleText').txt(product.basic?.title || 'Untitled')
    
    // DisplayArtist with party reference
    const artistName = product.basic?.displayArtist || 'Unknown Artist'
    const artistRef = this.getPartyReference(artistName)
    
    const displayArtist = release.ele('DisplayArtist')
    displayArtist.ele('ArtistPartyReference').txt(artistRef)
    displayArtist.ele('DisplayArtistRole').txt('MainArtist')
    
    // Label
    if (product.basic?.label) {
      release.ele('LabelName').txt(product.basic.label)
    }
    
    // Genre
    if (product.metadata?.genreName || product.metadata?.genre) {
      const genre = release.ele('Genre')
      genre.ele('GenreText').txt(product.metadata.genreName || product.metadata.genre)
    }
    
    // PLine
    const pLine = release.ele('PLine')
    pLine.ele('Year').txt(String(new Date().getFullYear()))
    pLine.ele('PLineText').txt(`${new Date().getFullYear()} ${product.basic?.label || 'Alpha Pup'}`)
    
    // CLine
    const cLine = release.ele('CLine')
    cLine.ele('Year').txt(String(new Date().getFullYear()))
    cLine.ele('CLineText').txt(`${new Date().getFullYear()} ${product.basic?.label || 'Alpha Pup'}`)
    
    // Dates
    const releaseDate = product.basic?.releaseDate ?
      new Date(product.basic.releaseDate).toISOString().split('T')[0] :
      new Date().toISOString().split('T')[0]
    
    release.ele('ReleaseDate').txt(releaseDate)
    release.ele('OriginalReleaseDate').txt(product.basic?.originalReleaseDate || releaseDate)
    
    // FIX: ResourceGroup - use ReleaseResourceReference (not ResourceReference)
    const resourceGroup = release.ele('ResourceGroup')
    
    // Add tracks to ResourceGroup
    if (Array.isArray(tracks)) {
      tracks.forEach((track, index) => {
        const resourceRef = `A${index + 1}`
        const groupItem = resourceGroup.ele('ResourceGroupContentItem', {
          SequenceNumber: String(index + 1)
        })
        groupItem.ele('ResourceType').txt('SoundRecording')
        // CRITICAL FIX: Use ReleaseResourceReference here
        groupItem.ele('ReleaseResourceReference').txt(resourceRef)
      })
    }
    
    // Add cover to ResourceGroup if present
    if (config.coverImageUrl || config.coverMD5) {
      const coverItem = resourceGroup.ele('ResourceGroupContentItem', {
        SequenceNumber: String((tracks?.length || 0) + 1)
      })
      coverItem.ele('ResourceType').txt('Image')
      // CRITICAL FIX: Use ReleaseResourceReference here
      coverItem.ele('ReleaseResourceReference').txt('A_cover')
    }
    
    // ReleaseResourceReferenceList
    const resourceRefList = release.ele('ReleaseResourceReferenceList')
    
    // Add track references with simplified IDs
    if (Array.isArray(tracks)) {
      tracks.forEach((track, index) => {
        const resourceRef = `A${index + 1}`
        resourceRefList.ele('ReleaseResourceReference', {
          ReleaseResourceType: index === 0 ? 'PrimaryResource' : 'SecondaryResource'
        }).txt(resourceRef)
      })
    }
    
    // Add cover image reference if it exists
    if (config.coverImageUrl || config.coverMD5) {
      resourceRefList.ele('ReleaseResourceReference', {
        ReleaseResourceType: 'SecondaryResource'
      }).txt('A_cover')
    }
  }

  buildDealList(parent, product, config) {
    const dealList = parent.ele('DealList')
    const releaseDeal = dealList.ele('ReleaseDeal')
    
    releaseDeal.ele('DealReleaseReference').txt('R1')  // Match simplified reference
    
    const deal = releaseDeal.ele('Deal')
    deal.ele('DealId').txt('R1_DEAL_1')
    
    const dealTerms = deal.ele('DealTerms')
    
    // FIX: Correct territory structure - TerritoryCode directly under DealTerms
    dealTerms.ele('TerritoryCode').txt('Worldwide')
    
    // Validity period
    const validityPeriod = dealTerms.ele('ValidityPeriod')
    const startDate = product.basic?.releaseDate ?
      new Date(product.basic.releaseDate).toISOString().split('T')[0] :
      new Date().toISOString().split('T')[0]
    validityPeriod.ele('StartDate').txt(startDate)
    
    // Commercial model
    dealTerms.ele('CommercialModelType').txt('SubscriptionModel')
    
    // Usage types
    const usage1 = dealTerms.ele('Usage')
    usage1.ele('UseType').txt('OnDemandStream')
    
    const usage2 = dealTerms.ele('Usage')
    usage2.ele('UseType').txt('NonInteractiveStream')
  }
}

export default new ERN43Builder()