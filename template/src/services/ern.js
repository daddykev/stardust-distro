// src/services/ern.js
import { db } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

export class ERNService {
  constructor() {
    this.version = '4.3'
    this.namespace = 'http://ddex.net/xml/ern/43'
  }

  /**
   * Generate ERN for a release
   */
  async generateERN(releaseId, targetConfig = {}) {
    try {
      // Fetch release data
      const release = await this.getRelease(releaseId)
      
      // Transform release data to ERN format
      const product = this.transformToProduct(release, targetConfig)
      const resources = this.transformToResources(release.tracks || [])
      
      // Build ERN XML
      const ernXml = this.buildERN(product, resources, {
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
        version: this.version
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
      dealStartDate: this.formatDate(basic.releaseDate),
      dealEndDate: targetConfig.dealEndDate,
      
      // Territory
      territoryCode: this.mapTerritoryCode(territories, targetConfig),
      
      // Commercial models from target config
      commercialModels: targetConfig.commercialModels || [{
        type: 'PayAsYouGoModel',
        usageTypes: ['PermanentDownload']
      }],
      
      // Tracks for release resource list
      tracks: (release.tracks || []).map((track, index) => ({
        resourceReference: `A${(index + 1).toString().padStart(3, '0')}`,
        sequenceNumber: track.sequenceNumber || (index + 1)
      }))
    }
  }

  /**
   * Transform tracks to resources format
   */
  transformToResources(tracks) {
    return tracks.map((track, index) => ({
      type: 'MusicalWorkSoundRecording',
      resourceReference: `A${(index + 1).toString().padStart(3, '0')}`,
      isrc: track.isrc || `XX${Date.now()}${index}`.substr(0, 12),
      title: track.title || `Track ${index + 1}`,
      artist: track.artist || track.displayArtist || 'Unknown Artist',
      duration: this.formatDuration(track.duration || track.audio?.duration || 180),
      
      // Technical details
      codecType: track.audio?.format === 'FLAC' ? 'FLAC' : 'PCM',
      bitRate: track.audio?.bitrate || '1411',
      samplingRate: track.audio?.sampleRate || '44100',
      bitsPerSample: track.audio?.bitDepth || '16',
      channels: track.audio?.channels || '2',
      
      // File reference
      fileUri: track.audio?.url || track.audio?.fileId || `file:///${track.id}.wav`,
      
      // Contributors
      contributors: track.contributors || [],
      
      // Additional metadata
      genre: track.genre,
      parentalWarning: track.parentalWarning,
      languageOfPerformance: track.language || 'en',
      
      // Copyright (inherit from release if not specified)
      pLineYear: track.pLineYear,
      pLineText: track.pLineText,
      
      // Preview details
      previewDetails: track.preview ? {
        startPoint: track.preview.startTime || 30,
        endPoint: track.preview.startTime + track.preview.duration || 60
      } : null
    }))
  }

  /**
   * Build ERN XML
   */
  buildERN(product, resources, options = {}) {
    const messageId = this.generateMessageId()
    const createdDate = new Date().toISOString()
    
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
  
  ${this.buildResourceList(resources)}
  ${this.buildReleaseList(product, resources)}
  ${this.buildDealList(product)}
  
</ern:NewReleaseMessage>`
  }

  buildResourceList(resources) {
    return `<ResourceList>
    ${resources.map(resource => this.buildSoundRecording(resource)).join('\n    ')}
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
          <URI>${resource.fileUri}</URI>
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
            <PriceType>WholesalePricePerUnit</PriceType>
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
  formatPLineText(pLineText, pLineYear, fallbackLabel) {
    let text = (pLineText || '').replace(/^\(P\)\s*/i, '').trim()
    const year = pLineYear || new Date().getFullYear()
    
    if (!text) {
      text = `${year} ${fallbackLabel || 'Unknown'}`
    } else if (!text.startsWith(year.toString())) {
      text = `${year} ${text}`
    }
    
    return text
  }

  formatCLineText(cLineText, cLineYear, fallbackLabel) {
    let text = (cLineText || '').replace(/^[\(©C\)]+\s*/i, '').trim()
    const year = cLineYear || new Date().getFullYear()
    
    if (!text) {
      text = `${year} ${fallbackLabel || 'Unknown'}`
    } else if (!text.startsWith(year.toString())) {
      text = `${year} ${text}`
    }
    
    return text
  }

  formatDuration(seconds) {
    if (!seconds) return 'PT0S'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    let duration = 'PT'
    if (hours > 0) duration += `${hours}H`
    if (minutes > 0) duration += `${minutes}M`
    if (secs > 0 || duration === 'PT') duration += `${secs}S`
    
    return duration
  }

  formatDate(date) {
    if (!date) return new Date().toISOString().split('T')[0]
    
    if (typeof date === 'string') {
      return date.split('T')[0]
    }
    
    if (date.toDate) {
      return date.toDate().toISOString().split('T')[0]
    }
    
    if (date instanceof Date) {
      return date.toISOString().split('T')[0]
    }
    
    return new Date().toISOString().split('T')[0]
  }

  mapReleaseType(type) {
    const typeMap = {
      'Single': 'Single',
      'EP': 'EP',
      'Album': 'Album',
      'Compilation': 'Album'
    }
    return typeMap[type] || 'Album'
  }

  mapTerritoryCode(territories, targetConfig) {
    if (targetConfig.territoryCode) {
      return targetConfig.territoryCode
    }
    
    if (territories.mode === 'worldwide') {
      return 'Worldwide'
    }
    
    // If specific territories, return the first one or Worldwide
    return territories.included?.[0] || 'Worldwide'
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