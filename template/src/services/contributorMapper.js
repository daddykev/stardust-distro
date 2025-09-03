// services/contributorMapper.js

/**
 * DDEX Contributor Role Mapping Service
 * Maps internal contributor roles to DDEX-compliant role names
 */

// Performer role mappings to DDEX (keep existing mappings)
const performerToDDEX = {
  'Vocals': 'MainVocalist',
  'Lead Vocals': 'LeadVocalist',
  'Background Vocals': 'BackgroundVocalist',
  'Choir': 'Choir',
  'Guitar': 'Guitar',
  'Bass Guitar': 'BassGuitar',
  'Drums': 'Drums',
  'Keyboard': 'Keyboard',
  'Piano': 'Piano',
  'Saxophone': 'Saxophone',
  'Violin': 'Violin',
  'Orchestra': 'Orchestra',
  'DJ': 'DJ',
  'Rapper': 'Rapper',
  'Percussion': 'Percussion',
  'Synthesizer': 'Synthesizer',
  'Trumpet': 'Trumpet',
  'Cello': 'Cello'
}

// Production/Engineering role mappings to DDEX (keep existing mappings)
const productionToDDEX = {
  'Producer': 'Producer',
  'Co-Producer': 'CoProducer',
  'Executive Producer': 'ExecutiveProducer',
  'Mix Engineer': 'Mixer',
  'Mastering Engineer': 'MasteringEngineer',
  'Recording Engineer': 'RecordingEngineer',
  'Remixer': 'Remixer',
  'Arranger': 'Arranger',
  'Orchestrator': 'Orchestrator',
  'Conductor': 'Conductor',
  'Programming': 'Programmer',
  'A&R': 'AssociatedPerformer',
  'Assistant Producer': 'AssistantProducer',
  'Assistant Engineer': 'StudioPersonnel',
  'Audio Editor': 'Editor',
  'Sound Design': 'SoundDesigner'
}

// Composer/Lyricist role mappings to DDEX (keep existing mappings)
const writerToDDEX = {
  'Composer': 'Composer',
  'Lyricist': 'Lyricist',
  'Songwriter': 'ComposerLyricist',
  'Arranger': 'MusicArranger',
  'Adapter': 'Adapter',
  'Translator': 'Translator',
  'Author': 'Author',
  'Writer': 'Writer'
}

/**
 * Map a contributor to DDEX format
 */
export function mapContributorToDDEX(contributor) {
  const { name, role, category } = contributor
  
  // Determine DDEX element type based on category
  // Updated to match actual category values from ContributorCategories
  const elementType = category === 'composer_lyricist' 
    ? 'IndirectResourceContributor' 
    : 'ResourceContributor'
  
  // Map role to DDEX role
  const ddexRole = getDDEXRole(role, category)
  
  return {
    elementType,
    partyName: name,
    role: ddexRole,
    sequenceNumber: contributor.sequenceNumber || null
  }
}

/**
 * Get DDEX role from internal role and category
 */
function getDDEXRole(role, category) {
  // Updated mappings to match actual category values
  const mappings = {
    'performer': performerToDDEX,
    'producer_engineer': productionToDDEX,
    'composer_lyricist': writerToDDEX
  }
  
  const categoryMap = mappings[category]
  if (categoryMap && categoryMap[role]) {
    return categoryMap[role]
  }
  
  // Fallback to role as-is if no mapping found
  // DDEX allows custom roles when standard roles don't fit
  console.warn(`No DDEX mapping found for role "${role}" in category "${category}", using as-is`)
  return role
}

/**
 * Validate contributor data before ERN generation
 */
export function validateContributors(release) {
  const errors = []
  
  // Check DisplayArtist exists
  if (!release.basic?.displayArtist) {
    errors.push('DisplayArtist is required for the release')
  }
  
  // Check each track
  release.tracks?.forEach((track, index) => {
    if (!track.artist && !track.displayArtist && !track.metadata?.displayArtist) {
      errors.push(`Track ${index + 1} missing DisplayArtist`)
    }
    
    // Validate contributor names
    if (track.contributors) {
      track.contributors.forEach((contributor, cIndex) => {
        if (!contributor.name || contributor.name.trim() === '') {
          errors.push(`Track ${index + 1}, contributor ${cIndex + 1}: missing name`)
        }
        if (!contributor.role) {
          errors.push(`Track ${index + 1}, contributor ${cIndex + 1}: missing role`)
        }
      })
    }
  })
  
  return errors
}

/**
 * Group contributors by element type for ERN
 */
export function groupContributorsByType(contributors = []) {
  const grouped = {
    resourceContributors: [],
    indirectResourceContributors: []
  }
  
  contributors.forEach((contributor, index) => {
    const mapped = mapContributorToDDEX({
      ...contributor,
      sequenceNumber: index + 1
    })
    
    if (mapped.elementType === 'IndirectResourceContributor') {
      grouped.indirectResourceContributors.push(mapped)
    } else {
      grouped.resourceContributors.push(mapped)
    }
  })
  
  return grouped
}

export default {
  mapContributorToDDEX,
  validateContributors,
  groupContributorsByType
}