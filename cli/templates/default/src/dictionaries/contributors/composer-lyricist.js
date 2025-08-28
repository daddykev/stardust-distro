// Composer and lyricist contributor roles from Apple Music specification
// These are contributors involved in composition and songwriting

export const composerLyricistRoles = [
  'Adapter',
  'Author',
  'Composer',
  'Composer Lyricist',
  'Contributing Artist',
  'Librettist',
  'Lyricist',
  'Music',
  'Music Arranger',
  'Music Publisher',
  'Original Artist',
  'Original Lyricist',
  'Originator',
  'Primary',
  'Publisher',
  'Score',
  'Songwriter',
  'Translator',
  'Words',
  'Writer'
].sort();

// Helper function to validate composer/lyricist role
export function isComposerLyricistRole(role) {
  return composerLyricistRoles.includes(role);
}

// Get all composer/lyricist roles
export function getComposerLyricistRoles() {
  return [...composerLyricistRoles];
}

// Search composer/lyricist roles
export function searchComposerLyricistRoles(query) {
  if (!query) return [];
  const searchTerm = query.toLowerCase();
  return composerLyricistRoles.filter(role => 
    role.toLowerCase().includes(searchTerm)
  );
}

export default composerLyricistRoles;