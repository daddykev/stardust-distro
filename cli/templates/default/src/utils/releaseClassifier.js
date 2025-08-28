// src/utils/releaseClassifier.js

/**
 * Classify a release based on DDEX standards
 * Determines release type, commercial type, and appropriate ERN profile
 */
export function classifyRelease(release) {
  const tracks = release.tracks || []
  const trackCount = tracks.length
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0)
  const totalDurationMinutes = Math.floor(totalDuration / 60)
  const totalDurationFormatted = `${Math.floor(totalDuration / 60)}:${String(totalDuration % 60).padStart(2, '0')}`
  
  // Determine release type based on track count and duration
  let releaseType = 'Album'
  let commercialType = 'Album'
  let profile = 'AudioAlbum'
  let rationale = ''
  
  if (trackCount === 0) {
    releaseType = 'Unknown'
    commercialType = 'Unknown'
    profile = 'AudioAlbum'
    rationale = 'No tracks found'
  } else if (trackCount === 1) {
    releaseType = 'Single'
    commercialType = 'Single'
    profile = 'AudioSingle'
    rationale = '1 track = Single'
  } else if (trackCount >= 2 && trackCount <= 3 && totalDurationMinutes < 30) {
    releaseType = 'Single'
    commercialType = 'Single'
    profile = 'AudioSingle'
    rationale = `${trackCount} tracks under 30 minutes = Single`
  } else if (trackCount >= 4 && trackCount <= 6 && totalDurationMinutes < 30) {
    releaseType = 'EP'
    commercialType = 'EP'
    profile = 'AudioAlbum'
    rationale = `${trackCount} tracks under 30 minutes = EP`
  } else if (trackCount >= 7 || totalDurationMinutes >= 30) {
    releaseType = 'Album'
    commercialType = 'Album'
    profile = 'AudioAlbum'
    rationale = `${trackCount} tracks, ${totalDurationMinutes} minutes = Album`
  } else {
    // Default case
    releaseType = 'Album'
    commercialType = 'Album'
    profile = 'AudioAlbum'
    rationale = 'Default classification'
  }
  
  // Check for specific release types from metadata
  if (release.basic?.releaseType) {
    const userType = release.basic.releaseType.toLowerCase()
    
    if (userType.includes('compilation')) {
      releaseType = 'Compilation'
      commercialType = 'Compilation'
      profile = 'AudioAlbum'
      rationale = 'User specified: Compilation'
    } else if (userType.includes('live')) {
      releaseType = 'LiveAlbum'
      commercialType = 'Album'
      profile = 'AudioAlbum'
      rationale = 'User specified: Live Album'
    } else if (userType.includes('remix')) {
      releaseType = 'RemixAlbum'
      commercialType = 'Album'
      profile = 'AudioAlbum'
      rationale = 'User specified: Remix Album'
    } else if (userType.includes('soundtrack')) {
      releaseType = 'Soundtrack'
      commercialType = 'Album'
      profile = 'AudioAlbum'
      rationale = 'User specified: Soundtrack'
    } else if (userType.includes('mixtape')) {
      releaseType = 'Mixtape'
      commercialType = 'Album'
      profile = 'AudioAlbum'
      rationale = 'User specified: Mixtape'
    }
  }
  
  // Check for classical music (requires different handling)
  if (release.metadata?.genre?.toLowerCase().includes('classical')) {
    profile = 'ClassicalAudioAlbum'
    rationale += ' (Classical genre detected)'
  }
  
  return {
    releaseType,
    commercialType,
    profile,
    trackCount,
    totalDuration,
    totalDurationMinutes,
    totalDurationFormatted,
    rationale,
    // Additional metadata for ERN generation
    isCompilation: releaseType === 'Compilation',
    isClassical: profile === 'ClassicalAudioAlbum',
    isLive: releaseType === 'LiveAlbum',
    isSoundtrack: releaseType === 'Soundtrack'
  }
}

/**
 * Determine if a release requires specific ERN handling
 */
export function getERNRequirements(classification) {
  const requirements = {
    requiresISWC: false,
    requiresGrid: true,
    requiresICPN: true,
    requiresContributors: false,
    requiresRecordingLocation: false,
    requiresOrchestra: false
  }
  
  // Classical releases have additional requirements
  if (classification.isClassical) {
    requirements.requiresContributors = true
    requirements.requiresOrchestra = true
    requirements.requiresRecordingLocation = true
  }
  
  // Live releases benefit from recording location
  if (classification.isLive) {
    requirements.requiresRecordingLocation = true
  }
  
  // Soundtracks may need additional metadata
  if (classification.isSoundtrack) {
    requirements.requiresISWC = true
  }
  
  return requirements
}

/**
 * Validate release data for DDEX compliance
 */
export function validateReleaseForDDEX(release, classification) {
  const errors = []
  const warnings = []
  
  // Required fields
  if (!release.basic?.title) {
    errors.push('Release title is required')
  }
  
  if (!release.basic?.artist) {
    errors.push('Release artist is required')
  }
  
  if (!release.basic?.upc) {
    errors.push('UPC is required')
  } else if (!/^\d{12,14}$/.test(release.basic.upc)) {
    errors.push('UPC must be 12-14 digits')
  }
  
  if (!release.basic?.releaseDate) {
    warnings.push('Release date is recommended')
  }
  
  if (!release.basic?.label) {
    warnings.push('Label name is recommended')
  }
  
  // Track validation
  const tracks = release.tracks || []
  if (tracks.length === 0) {
    errors.push('At least one track is required')
  }
  
  tracks.forEach((track, index) => {
    const trackNum = index + 1
    
    if (!track.title) {
      errors.push(`Track ${trackNum}: Title is required`)
    }
    
    if (!track.isrc) {
      warnings.push(`Track ${trackNum}: ISRC is recommended`)
    } else if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(track.isrc)) {
      errors.push(`Track ${trackNum}: Invalid ISRC format`)
    }
    
    if (!track.duration || track.duration <= 0) {
      errors.push(`Track ${trackNum}: Duration is required`)
    }
    
    // Classical-specific validation
    if (classification.isClassical) {
      if (!track.composer) {
        warnings.push(`Track ${trackNum}: Composer is recommended for classical releases`)
      }
    }
  })
  
  // Asset validation
  if (!release.assets || release.assets.length === 0) {
    warnings.push('No assets uploaded')
  } else {
    const hasAudio = release.assets.some(a => a.type === 'audio')
    const hasCover = release.assets.some(a => a.type === 'image' && a.metadata?.imageType === 'FrontCoverImage')
    
    if (!hasAudio) {
      errors.push('Audio files are required')
    }
    
    if (!hasCover) {
      warnings.push('Cover artwork is recommended')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    classification
  }
}

/**
 * Get recommended commercial models based on release type
 */
export function getRecommendedCommercialModels(classification) {
  const models = []
  
  // All releases typically support streaming
  models.push({
    type: 'SubscriptionModel',
    usageTypes: ['OnDemandStream', 'ConditionalDownload'],
    description: 'Standard streaming subscription'
  })
  
  // Singles often use ad-supported model
  if (classification.commercialType === 'Single') {
    models.push({
      type: 'AdvertisementSupportedModel',
      usageTypes: ['OnDemandStream'],
      description: 'Free with ads'
    })
  }
  
  // Albums typically allow purchase
  if (classification.commercialType === 'Album' || classification.commercialType === 'EP') {
    models.push({
      type: 'PayAsYouGoModel',
      usageTypes: ['PermanentDownload'],
      description: 'Digital purchase'
    })
  }
  
  return models
}

/**
 * Format release metadata for ERN generation
 */
export function formatReleaseForERN(release, classification) {
  return {
    // Basic info
    title: release.basic?.title || 'Untitled',
    artist: release.basic?.artist || 'Unknown Artist',
    label: release.basic?.label || 'Independent',
    upc: release.basic?.upc || '',
    releaseDate: release.basic?.releaseDate || new Date().toISOString().split('T')[0],
    
    // Classification
    releaseType: classification.releaseType,
    profile: classification.profile,
    
    // Metadata
    genre: release.metadata?.genre || 'Pop',
    subGenre: release.metadata?.subGenre || '',
    parentalWarning: release.metadata?.parentalWarning || 'NotExplicit',
    copyrightLine: release.metadata?.copyrightLine || `© ${new Date().getFullYear()} ${release.basic?.label || 'Independent'}`,
    productionYear: release.metadata?.productionYear || new Date().getFullYear(),
    
    // Additional metadata
    language: release.metadata?.language || 'en',
    artistWebsite: release.metadata?.artistWebsite || '',
    labelWebsite: release.metadata?.labelWebsite || '',
    
    // Tracks
    tracks: (release.tracks || []).map((track, index) => ({
      ...track,
      sequenceNumber: index + 1,
      discNumber: track.discNumber || 1,
      artist: track.artist || release.basic?.artist || 'Unknown Artist',
      isrc: track.isrc || generateISRC(release.basic?.upc, index + 1)
    }))
  }
}

/**
 * Generate a placeholder ISRC if none exists
 */
function generateISRC(upc, trackNumber) {
  // Generate a dummy ISRC for testing
  // Format: CC-XXX-YY-NNNNN
  // CC = Country code (US)
  // XXX = Registrant code (XXX for unknown)
  // YY = Year (current year last 2 digits)
  // NNNNN = Unique ID (derived from UPC + track)
  
  const year = new Date().getFullYear().toString().slice(-2)
  const uniqueId = (upc ? upc.slice(-5) : '00000').padStart(5, '0')
  const trackId = trackNumber.toString().padStart(2, '0')
  
  return `USXXX${year}${uniqueId.slice(0, 3)}${trackId}`
}

export default {
  classifyRelease,
  getERNRequirements,
  validateReleaseForDDEX,
  getRecommendedCommercialModels,
  formatReleaseForERN
}