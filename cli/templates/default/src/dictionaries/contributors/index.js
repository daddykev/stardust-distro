// Contributor roles dictionary service
// Aggregates all contributor role types and provides unified API

import { 
  performerRoles, 
  searchPerformerRoles,
  isPerformerRole 
} from './performer';

import { 
  producerEngineerRoles, 
  searchProducerEngineerRoles,
  isProducerEngineerRole 
} from './producer-engineer';

import { 
  composerLyricistRoles, 
  searchComposerLyricistRoles,
  isComposerLyricistRole 
} from './composer-lyricist';

// Role categories
export const ContributorCategories = {
  PERFORMER: 'performer',
  PRODUCER_ENGINEER: 'producer_engineer', 
  COMPOSER_LYRICIST: 'composer_lyricist'
};

// Get all roles for a category
export function getRolesByCategory(category) {
  switch (category) {
    case ContributorCategories.PERFORMER:
      return performerRoles;
    case ContributorCategories.PRODUCER_ENGINEER:
      return producerEngineerRoles;
    case ContributorCategories.COMPOSER_LYRICIST:
      return composerLyricistRoles;
    default:
      return [];
  }
}

// Get all contributor roles
export function getAllContributorRoles() {
  return {
    performer: performerRoles,
    producerEngineer: producerEngineerRoles,
    composerLyricist: composerLyricistRoles,
    all: [...performerRoles, ...producerEngineerRoles, ...composerLyricistRoles].sort()
  };
}

// Categorize a role
export function categorizeRole(role) {
  if (isPerformerRole(role)) {
    return ContributorCategories.PERFORMER;
  }
  if (isProducerEngineerRole(role)) {
    return ContributorCategories.PRODUCER_ENGINEER;
  }
  if (isComposerLyricistRole(role)) {
    return ContributorCategories.COMPOSER_LYRICIST;
  }
  return null;
}

// Search all roles
export function searchContributorRoles(query, category = null) {
  if (!query) return [];
  
  if (category) {
    switch (category) {
      case ContributorCategories.PERFORMER:
        return searchPerformerRoles(query);
      case ContributorCategories.PRODUCER_ENGINEER:
        return searchProducerEngineerRoles(query);
      case ContributorCategories.COMPOSER_LYRICIST:
        return searchComposerLyricistRoles(query);
      default:
        return [];
    }
  }
  
  // Search all categories
  return [
    ...searchPerformerRoles(query).map(role => ({ role, category: ContributorCategories.PERFORMER })),
    ...searchProducerEngineerRoles(query).map(role => ({ role, category: ContributorCategories.PRODUCER_ENGINEER })),
    ...searchComposerLyricistRoles(query).map(role => ({ role, category: ContributorCategories.COMPOSER_LYRICIST }))
  ];
}

// Validate contributor object
export function validateContributor(contributor) {
  const errors = [];
  
  if (!contributor.name || contributor.name.trim() === '') {
    errors.push('Contributor name is required');
  }
  
  if (!contributor.role || contributor.role.trim() === '') {
    errors.push('Contributor role is required');
  }
  
  const category = categorizeRole(contributor.role);
  if (!category) {
    errors.push(`Invalid role: ${contributor.role}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    category
  };
}

// Format contributor for display
export function formatContributor(contributor) {
  const category = categorizeRole(contributor.role);
  const categoryLabel = category ? category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
  
  return {
    ...contributor,
    category,
    categoryLabel,
    displayName: `${contributor.name} (${contributor.role})`
  };
}

// Group contributors by category
export function groupContributorsByCategory(contributors) {
  const grouped = {
    [ContributorCategories.PERFORMER]: [],
    [ContributorCategories.PRODUCER_ENGINEER]: [],
    [ContributorCategories.COMPOSER_LYRICIST]: [],
    unknown: []
  };
  
  contributors.forEach(contributor => {
    const category = categorizeRole(contributor.role);
    if (category) {
      grouped[category].push(contributor);
    } else {
      grouped.unknown.push(contributor);
    }
  });
  
  return grouped;
}

// Common contributor role shortcuts
export const CommonRoles = {
  PRODUCER: 'Producer',
  MIXING_ENGINEER: 'Mix Engineer',
  MASTERING_ENGINEER: 'Mastering Engineer',
  COMPOSER: 'Composer',
  LYRICIST: 'Lyricist',
  VOCALIST: 'Vocals',
  GUITARIST: 'Guitar',
  BASSIST: 'Bass Guitar',
  DRUMMER: 'Drums',
  KEYBOARDIST: 'Keyboard',
  FEATURED_ARTIST: 'Featured Artist'
};

export default {
  ContributorCategories,
  CommonRoles,
  getAllContributorRoles,
  getRolesByCategory,
  categorizeRole,
  searchContributorRoles,
  validateContributor,
  formatContributor,
  groupContributorsByCategory
};