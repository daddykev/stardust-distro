// src/services/mead.js
import { auth } from '../firebase'
import { escapeUrlForXml } from '../utils/urlUtils'

/**
 * MEAD 1.1 Message Generator Service
 * Generates DDEX MEAD messages for enhanced music discovery
 */
class MEADService {
  constructor() {
    this.version = '1.1'
    this.namespace = 'http://ddex.net/xml/mead/11'
  }

  /**
   * Generate MEAD message for a release
   */
  async generateMEAD(release, options = {}) {
    try {
      const messageId = this.generateMessageId(release.id)
      const timestamp = new Date().toISOString()
      
      // Build MEAD XML
      const meadXml = this.buildMEADXml({
        messageId,
        timestamp,
        release,
        senderName: options.senderName || auth.currentUser?.displayName || 'Stardust Distro',
        senderPartyId: options.senderPartyId || 'stardust-distro',
        recipientName: options.recipientName || 'DSP',
        recipientPartyId: options.recipientPartyId || 'DSP'
      })

      return {
        mead: meadXml,
        messageId,
        version: this.version,
        timestamp
      }
    } catch (error) {
      console.error('Error generating MEAD:', error)
      throw error
    }
  }

  /**
   * Build MEAD XML document
   */
  buildMEADXml(config) {
    const { messageId, timestamp, release, senderName, senderPartyId, recipientName, recipientPartyId } = config
    const mead = release.mead || {}
    const upc = release.basic?.barcode || release.basic?.upc || ''
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mead:MediaEnrichmentMessage 
  xmlns:mead="${this.namespace}"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="${this.namespace} http://ddex.net/xml/mead/11/mead-11.xsd"
  MessageSchemaVersionId="mead/11"
  LanguageAndScriptCode="en">
  
  <MessageHeader>
    <MessageId>${messageId}</MessageId>
    <MessageCreatedDateTime>${timestamp}</MessageCreatedDateTime>
    <MessageSender>
      <PartyId>${senderPartyId}</PartyId>
      <PartyName>${this.escapeXml(senderName)}</PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId>${recipientPartyId}</PartyId>
      <PartyName>${this.escapeXml(recipientName)}</PartyName>
    </MessageRecipient>
  </MessageHeader>
  
  <MediaEnrichmentList>
    <MediaEnrichment>
      <MediaEnrichmentId>${messageId}_01</MediaEnrichmentId>
      <MediaEnrichmentReference>
        <ICPN>${upc}</ICPN>
      </MediaEnrichmentReference>
      
      <!-- Release-level MEAD -->
      <ReleaseEnrichment>
        <ReleaseTitle>${this.escapeXml(release.basic?.title)}</ReleaseTitle>
        <MainArtist>${this.escapeXml(release.basic?.displayArtist)}</MainArtist>
        
        ${this.buildMoodSection(mead.moods)}
        ${this.buildMusicalCharacteristics(mead)}
        ${this.buildVocalInformation(mead)}
        ${this.buildInstrumentation(mead)}
        ${this.buildProductionInformation(mead)}
        ${this.buildDiscoveryMetadata(mead)}
        ${this.buildContentAdvisory(mead)}
        ${this.buildPlaylistSuitability(mead)}
        ${this.buildSeasonality(mead)}
        ${this.buildCulturalContext(mead)}
      </ReleaseEnrichment>
      
      ${this.buildTrackEnrichments(release)}
      
    </MediaEnrichment>
  </MediaEnrichmentList>
</mead:MediaEnrichmentMessage>`
    
    return xml
  }

  /**
   * Build mood section
   */
  buildMoodSection(moods) {
    if (!moods || moods.length === 0) return ''
    
    return `
        <MoodAndTheme>
          ${moods.map(mood => `<Mood>${this.escapeXml(mood)}</Mood>`).join('\n          ')}
        </MoodAndTheme>`
  }

  /**
   * Build musical characteristics
   */
  buildMusicalCharacteristics(mead) {
    let characteristics = []
    
    if (mead.tempo) {
      characteristics.push(`<Tempo>${mead.tempo}</Tempo>`)
    }
    if (mead.tempoDescription) {
      characteristics.push(`<TempoDescription>${this.escapeXml(mead.tempoDescription)}</TempoDescription>`)
    }
    if (mead.timeSignature) {
      characteristics.push(`<TimeSignature>${this.escapeXml(mead.timeSignature)}</TimeSignature>`)
    }
    if (mead.harmonicStructure) {
      characteristics.push(`<Key>${this.escapeXml(mead.harmonicStructure)}</Key>`)
    }
    
    if (characteristics.length === 0) return ''
    
    return `
        <MusicalCharacteristics>
          ${characteristics.join('\n          ')}
        </MusicalCharacteristics>`
  }

  /**
   * Build vocal information
   */
  buildVocalInformation(mead) {
    let vocalInfo = []
    
    if (mead.vocalRegister) {
      vocalInfo.push(`<VocalRegister>${this.escapeXml(mead.vocalRegister)}</VocalRegister>`)
    }
    
    if (mead.vocalCharacteristics && mead.vocalCharacteristics.length > 0) {
      mead.vocalCharacteristics.forEach(char => {
        vocalInfo.push(`<VocalCharacteristic>${this.escapeXml(char)}</VocalCharacteristic>`)
      })
    }
    
    if (vocalInfo.length === 0) return ''
    
    return `
        <VocalInformation>
          ${vocalInfo.join('\n          ')}
        </VocalInformation>`
  }

  /**
   * Build instrumentation
   */
  buildInstrumentation(mead) {
    if (!mead.instrumentation || mead.instrumentation.length === 0) return ''
    
    let instruments = mead.instrumentation.map(instrument => 
      `<Instrument>${this.escapeXml(instrument)}</Instrument>`
    ).join('\n          ')
    
    let details = ''
    if (mead.instrumentationDetails) {
      details = `
          <InstrumentationDetails>${this.escapeXml(mead.instrumentationDetails)}</InstrumentationDetails>`
    }
    
    return `
        <Instrumentation>
          ${instruments}${details}
        </Instrumentation>`
  }

  /**
   * Build production information
   */
  buildProductionInformation(mead) {
    let production = []
    
    if (mead.recordingTechnique) {
      production.push(`<RecordingTechnique>${this.escapeXml(mead.recordingTechnique)}</RecordingTechnique>`)
    }
    if (mead.audioCharacteristics) {
      production.push(`<AudioCharacteristics>${this.escapeXml(mead.audioCharacteristics)}</AudioCharacteristics>`)
    }
    
    if (production.length === 0) return ''
    
    return `
        <ProductionInformation>
          ${production.join('\n          ')}
        </ProductionInformation>`
  }

  /**
   * Build discovery metadata
   */
  buildDiscoveryMetadata(mead) {
    let discovery = []
    
    if (mead.focusTrack) {
      discovery.push(`<FocusTrack>${this.escapeXml(mead.focusTrack)}</FocusTrack>`)
    }
    if (mead.marketingDescription) {
      discovery.push(`<MarketingDescription>${this.escapeXml(mead.marketingDescription)}</MarketingDescription>`)
    }
    if (mead.targetAudience && mead.targetAudience.length > 0) {
      mead.targetAudience.forEach(audience => {
        discovery.push(`<TargetAudience>${this.escapeXml(audience)}</TargetAudience>`)
      })
    }
    
    if (discovery.length === 0) return ''
    
    return `
        <DiscoveryMetadata>
          ${discovery.join('\n          ')}
        </DiscoveryMetadata>`
  }

  /**
   * Build content advisory
   */
  buildContentAdvisory(mead) {
    if (!mead.isExplicit && !mead.contentAdvisory) return ''
    
    let advisory = []
    if (mead.isExplicit) {
      advisory.push('<ExplicitContent>true</ExplicitContent>')
    }
    if (mead.contentAdvisory) {
      advisory.push(`<ContentAdvisory>${this.escapeXml(mead.contentAdvisory)}</ContentAdvisory>`)
    }
    
    return `
        <ContentAdvisory>
          ${advisory.join('\n          ')}
        </ContentAdvisory>`
  }

  /**
   * Build playlist suitability
   */
  buildPlaylistSuitability(mead) {
    if (!mead.playlistSuitability || mead.playlistSuitability.length === 0) return ''
    
    return `
        <PlaylistSuitability>
          ${mead.playlistSuitability.map(playlist => 
            `<PlaylistType>${this.escapeXml(playlist)}</PlaylistType>`
          ).join('\n          ')}
        </PlaylistSuitability>`
  }

  /**
   * Build seasonality
   */
  buildSeasonality(mead) {
    if (!mead.seasonality) return ''
    
    return `
        <Seasonality>
          <Season>${this.escapeXml(mead.seasonality)}</Season>
        </Seasonality>`
  }

  /**
   * Build cultural context
   */
  buildCulturalContext(mead) {
    if (!mead.culturalReferences || mead.culturalReferences.length === 0) return ''
    
    return `
        <CulturalContext>
          ${mead.culturalReferences.map(ref => 
            `<CulturalReference>${this.escapeXml(ref)}</CulturalReference>`
          ).join('\n          ')}
        </CulturalContext>`
  }

  /**
   * Build track-level enrichments
   */
  buildTrackEnrichments(release) {
    if (!release.tracks || release.tracks.length === 0) return ''
    if (!release.mead?.trackMead) return ''
    
    let trackEnrichments = []
    
    release.tracks.forEach((track, index) => {
      const trackMead = release.mead.trackMead[track.id]
      if (!trackMead) return
      
      let enrichment = `
      <TrackEnrichment>
        <TrackReference>
          <ISRC>${track.isrc}</ISRC>
        </TrackReference>
        <TrackTitle>${this.escapeXml(track.title)}</TrackTitle>
        <TrackSequence>${index + 1}</TrackSequence>`
      
      // Add track-specific moods
      if (trackMead.moods && trackMead.moods.length > 0) {
        enrichment += `
        <MoodAndTheme>
          ${trackMead.moods.map(mood => `<Mood>${this.escapeXml(mood)}</Mood>`).join('\n          ')}
        </MoodAndTheme>`
      }
      
      // Add track-specific tempo
      if (trackMead.tempo) {
        enrichment += `
        <MusicalCharacteristics>
          <Tempo>${trackMead.tempo}</Tempo>
        </MusicalCharacteristics>`
      }
      
      // Add track-specific key
      if (trackMead.key) {
        enrichment += `
        <MusicalCharacteristics>
          <Key>${this.escapeXml(trackMead.key)}</Key>
        </MusicalCharacteristics>`
      }
      
      enrichment += `
      </TrackEnrichment>`
      
      trackEnrichments.push(enrichment)
    })
    
    return trackEnrichments.join('\n')
  }

  /**
   * Generate unique message ID
   */
  generateMessageId(releaseId) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `MEAD-${releaseId.substr(-8)}-${timestamp}-${random}`
  }

  /**
   * Escape XML special characters
   */
  escapeXml(str) {
    if (!str) return ''
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * Validate MEAD message
   */
  validateMEAD(meadXml) {
    // Basic validation
    if (!meadXml.includes('xmlns:mead')) {
      return { valid: false, error: 'Missing MEAD namespace' }
    }
    if (!meadXml.includes('<MediaEnrichmentMessage')) {
      return { valid: false, error: 'Missing MediaEnrichmentMessage root element' }
    }
    if (!meadXml.includes('<MessageId>')) {
      return { valid: false, error: 'Missing MessageId' }
    }
    return { valid: true }
  }
}

export default new MEADService()