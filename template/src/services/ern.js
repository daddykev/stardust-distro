// src/services/ern.js
import { db } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { escapeUrlForXml } from '../utils/urlUtils'
import { getFunctions, httpsCallable } from 'firebase/functions'

export class ERNService {
  constructor() {
    this.version = '4.3'
    this.namespace = 'http://ddex.net/xml/ern/43'
  }

  /**
   * Calculate MD5 hash for a file from URL using Cloud Function
   */
  async calculateFileMD5(url) {
    try {
      if (!url) return 'NO_URL_PROVIDED'
      
      console.log(`Calculating MD5 for: ${url}`)
      const functions = getFunctions()
      const calculateMD5 = httpsCallable(functions, 'calculateFileMD5')
      const result = await calculateMD5({ url })
      console.log(`MD5 calculated: ${result.data.md5}`)
      return result.data.md5
    } catch (error) {
      console.error('Error calculating MD5:', error)
      return 'ERROR_CALCULATING_MD5'
    }
  }

  /**
   * Generate ERN for a release
   */
  async generateERN(releaseId, targetConfig = {}) {
    try {
      // Fetch release data
      const release = await this.getRelease(releaseId)
      const upc = release.basic?.barcode || '0000000000000'
      
      // Transform release data to ERN format
      const product = this.transformToProduct(release, targetConfig)
      
      // Transform resources with MD5 calculation (now async)
      const resourceData = await this.transformToResources(
        release.tracks || [], 
        upc, 
        release.assets
      )
      
      // Build ERN XML with resources and coverMD5
      const ernXml = this.buildERN(product, resourceData, {
        messageControlType: targetConfig.testMode ? 'TestMessage' : 'LiveMessage',
        messageSender: targetConfig.senderName || release.basic?.label || 'Stardust Distro',
        messageRecipient: targetConfig.partyName || 'DSP',
        senderPartyId: targetConfig.senderPartyId,
        recipientPartyId: targetConfig.partyId
      })
      
      // Save ERN to release record
      await this.saveERN(releaseId, ernXml, targetConfig)
      
      return {
        success: true,
        ern: ernXml,
        messageId: this.extractMessageId(ernXml),
        version: this.version,
        upc: upc
      }
    } catch (error) {
      console.error('Error generating ERN:', error)
      throw error
    }
  }

  /**
   * Transform release data to product format
   */
  transformToProduct(release, targetConfig) {
    // ... keep existing implementation ...
    const basic = release.basic || {}
    const metadata = release.metadata || {}
    const territories = release.territories || {}
    
    return {
      releaseReference: `R${release.id.substr(0, 10).toUpperCase()}`,
      releaseType: this.mapReleaseType(basic.type),
      upc: basic.barcode || '0000000000000',
      catalogNumber: basic.catalogNumber,
      title: basic.title || 'Untitled',
      artist: basic.displayArtist || 'Unknown Artist',
      label: basic.label || 'Independent',
      genre: metadata.genre,
      parentalWarning: metadata.parentalWarning,
      
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
        title: track.metadata?.title,
        artist: track.metadata?.displayArtist
      }))
    }
  }

  /**
   * Transform tracks to resources with DDEX-compliant file naming and MD5 calculation
   */
  async transformToResources(tracks, upc = '0000000000000', assets) {
    const discNumber = '01' // Default to disc 01 for now
    
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
      if (track.audio?.url || track.audioUrl) {
        try {
          audioMD5 = await this.calculateFileMD5(track.audio?.url || track.audioUrl)
        } catch (error) {
          console.error(`Failed to calculate MD5 for track ${index + 1}:`, error)
        }
      }
      
      const trackTitle = track.title || track.metadata?.title || `Track ${index + 1}`
      const trackArtist = track.artist || track.metadata?.displayArtist || track.displayArtist || 'Unknown Artist'
      const trackDuration = track.duration || track.metadata?.duration || track.audio?.duration || 0
      const trackISRC = track.isrc || track.metadata?.isrc || `XX000000000${index + 1}`
      
      return {
        resourceReference: `A${(index + 1).toString().padStart(3, '0')}`,
        isrc: trackISRC,
        title: trackTitle,
        artist: trackArtist,
        duration: this.formatDuration(trackDuration),
        
        // DDEX-compliant filename for delivery
        ddexFileName: ddexFileName,
        // Original URL for downloading from Firebase Storage
        fileUri: track.audio?.url || track.audioUrl || '',
        // MD5 hash
        audioMD5: audioMD5,
        
        // Audio technical details
        codecType: audioFormat === 'WAV' ? 'PCM' : audioFormat || 'PCM',
        bitRate: track.audio?.bitrate || '1411',
        samplingRate: track.audio?.sampleRate || '44100',
        bitsPerSample: '16',
        channels: '2',
        
        // Additional metadata
        genre: track.genre || track.metadata?.genre,
        parentalWarning: track.parentalWarning || track.metadata?.parentalWarning,
        languageOfPerformance: track.language || track.metadata?.language || 'en',
        contributors: track.contributors || track.metadata?.contributors || [],
        
        // Additional fields
        label: track.label || track.metadata?.label,
        pLineYear: track.pLineYear || track.metadata?.pLineYear,
        pLineText: track.pLineText || track.metadata?.pLineText,
        
        // Preview details
        previewDetails: track.preview ? {
          startPoint: track.preview.startTime || 30,
          endPoint: track.preview.startTime + track.preview.duration || 60
        } : null
      }
    }))
    
    // Calculate MD5 for cover image
    let coverMD5 = 'PENDING'
    if (assets?.images?.[0]?.url) {
      try {
        coverMD5 = await this.calculateFileMD5(assets.images[0].url)
      } catch (error) {
        console.error('Failed to calculate MD5 for cover image:', error)
      }
    }
    
    // Return both audio resources and cover MD5
    return {
      audioResources,
      coverMD5
    }
  }

  /**
   * Build ERN XML
   */
  buildERN(product, resourceData, options = {}) {
    const messageId = this.generateMessageId()
    const createdDate = new Date().toISOString()
    
    // Extract resources and coverMD5 from resourceData
    const resources = resourceData.audioResources || resourceData
    const coverMD5 = resourceData.coverMD5 || 'PENDING'
    
    const config = {
      messageControlType: options.messageControlType || 'TestMessage',
      messageSender: options.messageSender || 'Stardust Distro',
      messageRecipient: options.messageRecipient || 'Test DSP',
      senderPartyId: options.senderPartyId,
      recipientPartyId: options.recipientPartyId,
      ...options
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="${this.namespace}" 
  xmlns:xs="http://www.w3.org/2001/XMLSchema-instance"
  MessageSchemaVersionId="ern/43"
  LanguageAndScriptCode="en">
  
  <MessageHeader>
    <MessageId>${messageId}</MessageId>
    <MessageCreatedDateTime>${createdDate}</MessageCreatedDateTime>
    <MessageControlType>${config.messageControlType}</MessageControlType>
    <MessageSender>
      ${config.senderPartyId ? `<PartyId>${config.senderPartyId}</PartyId>` : ''}
      <PartyName>
        <FullName>${this.escapeXml(config.messageSender)}</FullName>
      </PartyName>
    </MessageSender>
    <MessageRecipient>
      ${config.recipientPartyId ? `<PartyId>${config.recipientPartyId}</PartyId>` : ''}
      <PartyName>
        <FullName>${this.escapeXml(config.messageRecipient)}</FullName>
      </PartyName>
    </MessageRecipient>
  </MessageHeader>
  
  ${this.buildResourceList(resources, product.upc, coverMD5)}
  ${this.buildReleaseList(product, resources)}
  ${this.buildDealList(product)}
  
</ern:NewReleaseMessage>`
  }

  buildResourceList(resources, upc, coverMD5) {
    return `<ResourceList>
    ${resources.map(resource => this.buildSoundRecording(resource)).join('\n    ')}
    ${this.buildImageResource(upc, coverMD5)}
  </ResourceList>`
  }

  buildSoundRecording(resource) {
    const pLineYear = resource.pLineYear || new Date().getFullYear()
    const pLineText = this.formatPLineText(resource.pLineText, pLineYear, resource.label || resource.artist)
    
    return `<SoundRecording>
      <SoundRecordingType>MusicalWorkSoundRecording</SoundRecordingType>
      <ResourceReference>${resource.resourceReference}</ResourceReference>
      <ResourceId>
        <ISRC>${resource.isrc}</ISRC>
      </ResourceId>
      <ReferenceTitle>
        <TitleText>${this.escapeXml(resource.title)}</TitleText>
      </ReferenceTitle>
      <DisplayTitleText>${this.escapeXml(resource.title)}</DisplayTitleText>
      <DisplayArtist>
        <PartyName>
          <FullName>${this.escapeXml(resource.artist)}</FullName>
        </PartyName>
      </DisplayArtist>
      <Duration>${resource.duration}</Duration>
      ${resource.genre ? `<Genre>
        <GenreText>${this.escapeXml(resource.genre)}</GenreText>
      </Genre>` : ''}
      ${resource.parentalWarning ? `<ParentalWarningType>${resource.parentalWarning}</ParentalWarningType>` : ''}
      ${resource.languageOfPerformance ? `<LanguageOfPerformance>${resource.languageOfPerformance}</LanguageOfPerformance>` : ''}
      <IsArtistRelated>true</IsArtistRelated>
      <PLine>
        <Year>${pLineYear}</Year>
        <PLineText>${this.escapeXml(pLineText)}</PLineText>
      </PLine>
      ${resource.contributors && resource.contributors.length > 0 ? 
        resource.contributors
          .filter(contrib => contrib.name)
          .map(contrib => `<ResourceContributor>
        <PartyName>
          <FullName>${this.escapeXml(contrib.name)}</FullName>
        </PartyName>
        <ResourceContributorRole>${contrib.role}</ResourceContributorRole>
      </ResourceContributor>`).join('\n      ') : ''}
      <TechnicalDetails>
        <TechnicalResourceDetailsReference>T${resource.resourceReference}</TechnicalResourceDetailsReference>
        <AudioCodecType>${resource.codecType || 'PCM'}</AudioCodecType>
        <BitRate>${resource.bitRate || '1411'}</BitRate>
        <SamplingRate>${resource.samplingRate || '44100'}</SamplingRate>
        <BitsPerSample>${resource.bitsPerSample || '16'}</BitsPerSample>
        <NumberOfChannels>${resource.channels || '2'}</NumberOfChannels>
        <File>
          <FileName>${resource.ddexFileName}</FileName>
          <FilePath>${resource.ddexFileName}</FilePath>
          <URI>${escapeUrlForXml(resource.fileUri)}</URI>
          <HashSum>
            <HashSumAlgorithmType>MD5</HashSumAlgorithmType>
            <HashSum>${resource.audioMD5 || 'PENDING'}</HashSum>
          </HashSum>
        </File>
        ${resource.previewDetails ? `<PreviewDetails>
          <StartPoint>${resource.previewDetails.startPoint || '30'}</StartPoint>
          <EndPoint>${resource.previewDetails.endPoint || '60'}</EndPoint>
          <Duration>PT${(resource.previewDetails.endPoint || 60) - (resource.previewDetails.startPoint || 30)}S</Duration>
          <TopLeftCorner>0</TopLeftCorner>
          <BottomRightCorner>0</BottomRightCorner>
          <ExpressionType>Full</ExpressionType>
        </PreviewDetails>` : ''}
      </TechnicalDetails>
    </SoundRecording>`
  }

  buildImageResource(upc, coverMD5) {
    // Basic image resource for front cover with MD5
    return `<Image>
      <ImageType>FrontCoverImage</ImageType>
      <ResourceReference>I001</ResourceReference>
      <ImageId>
        <ProprietaryId Namespace="DPID:PADPIDA2023081501R">${upc}_IMG_001</ProprietaryId>
      </ImageId>
      <TechnicalDetails>
        <TechnicalResourceDetailsReference>TI001</TechnicalResourceDetailsReference>
        <ImageCodecType>JPEG</ImageCodecType>
        <ImageWidth>3000</ImageWidth>
        <ImageHeight>3000</ImageHeight>
        <ImageResolution>300</ImageResolution>
        <File>
          <FileName>${upc}.jpg</FileName>
          <FilePath>${upc}.jpg</FilePath>
          <HashSum>
            <HashSumAlgorithmType>MD5</HashSumAlgorithmType>
            <HashSum>${coverMD5}</HashSum>
          </HashSum>
        </File>
      </TechnicalDetails>
    </Image>`
  }

  buildReleaseList(product, resources) {
    const releaseDate = product.releaseDate || new Date().toISOString().split('T')[0]
    
    const pLineYear = product.pLineYear || new Date().getFullYear()
    const pLineText = this.formatPLineText(product.pLineText, pLineYear, product.label)
    
    const cLineYear = product.cLineYear || new Date().getFullYear()
    const cLineText = this.formatCLineText(product.cLineText, cLineYear, product.label)
    
    return `<ReleaseList>
    <Release>
      <ReleaseReference>${product.releaseReference}</ReleaseReference>
      <ReleaseType>${product.releaseType}</ReleaseType>
      <ReleaseId>
        <ICPN isEan="true">${product.upc}</ICPN>
        ${product.catalogNumber ? `<CatalogNumber Namespace="DPID:${product.labelDPID || 'PADPIDA2023081501R'}">${product.catalogNumber}</CatalogNumber>` : ''}
      </ReleaseId>
      <ReferenceTitle>
        <TitleText>${this.escapeXml(product.title)}</TitleText>
      </ReferenceTitle>
      <DisplayTitleText>${this.escapeXml(product.title)}</DisplayTitleText>
      <DisplayArtist>
        <PartyName>
          <FullName>${this.escapeXml(product.artist)}</FullName>
        </PartyName>
      </DisplayArtist>
      <LabelName>${this.escapeXml(product.label)}</LabelName>
      ${product.genre ? `<Genre>
        <GenreText>${this.escapeXml(product.genre)}</GenreText>
      </Genre>` : ''}
      ${product.parentalWarning ? `<ParentalWarningType>${product.parentalWarning}</ParentalWarningType>` : ''}
      <PLine>
        <Year>${pLineYear}</Year>
        <PLineText>${this.escapeXml(pLineText)}</PLineText>
      </PLine>
      <CLine>
        <Year>${cLineYear}</Year>
        <CLineText>${this.escapeXml(cLineText)}</CLineText>
      </CLine>
      <ReleaseDate>${releaseDate}</ReleaseDate>
      ${product.originalReleaseDate ? `<OriginalReleaseDate>${product.originalReleaseDate}</OriginalReleaseDate>` : ''}
      <ReleaseResourceReferenceList>
        ${product.tracks.map((track, index) => 
          `<ReleaseResourceReference ReleaseResourceType="${index === 0 ? 'PrimaryResource' : 'SecondaryResource'}">${track.resourceReference}</ReleaseResourceReference>`
        ).join('\n        ')}
        <ReleaseResourceReference ReleaseResourceType="SecondaryResource">I001</ReleaseResourceReference>
      </ReleaseResourceReferenceList>
    </Release>
  </ReleaseList>`
  }

  buildDealList(product) {
    const startDate = product.dealStartDate || new Date().toISOString().split('T')[0]
    const commercialModels = product.commercialModels || [{
      type: 'PayAsYouGoModel',
      usageTypes: ['PermanentDownload']
    }]
    
    const deals = commercialModels.map((model, index) => {
      return `<ReleaseDeal>
      <DealReleaseReference>${product.releaseReference}</DealReleaseReference>
      <Deal>
        <DealId>${product.releaseReference}_DEAL_${index + 1}</DealId>
        <DealTerms>
          <Territory>
            <TerritoryCode>${product.territoryCode}</TerritoryCode>
          </Territory>
          <ValidityPeriod>
            <StartDate>${startDate}</StartDate>
            ${product.dealEndDate ? `<EndDate>${product.dealEndDate}</EndDate>` : ''}
          </ValidityPeriod>
          <CommercialModelType>${model.type}</CommercialModelType>
          ${model.usageTypes.map(useType => `<Usage>
            <UseType>${useType}</UseType>
          </Usage>`).join('\n          ')}
          ${model.price && model.type === 'PayAsYouGoModel' ? `<PriceInformation>
            <PriceType>WholePrice</PriceType>
            <Price>
              <Amount CurrencyCode="${model.currency || 'USD'}">${model.price}</Amount>
            </Price>
          </PriceInformation>` : ''}
        </DealTerms>
      </Deal>
    </ReleaseDeal>`
    }).join('\n    ')
    
    return `<DealList>
    ${deals}
  </DealList>`
  }

  // Helper methods
  mapReleaseType(type) {
    const typeMap = {
      'Single': 'Single',
      'EP': 'EP',
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

  escapeXml(text) {
    if (!text) return ''
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
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

  async saveERN(releaseId, ernXml, targetConfig) {
    const docRef = doc(db, 'releases', releaseId)
    
    const ernData = {
      version: this.version,
      generatedAt: new Date(),
      messageId: this.extractMessageId(ernXml),
      target: targetConfig.name || 'Unknown',
      xml: ernXml
    }
    
    await updateDoc(docRef, {
      'ddex.lastGenerated': new Date(),
      'ddex.version': this.version,
      'ddex.erns': { [targetConfig.id || 'default']: ernData }
    })
    
    return ernData
  }
}

export default new ERNService()