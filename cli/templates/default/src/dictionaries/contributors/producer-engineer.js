// Production and engineering contributor roles from Apple Music specification
// These are non-performing contributors involved in production and technical aspects

export const producerEngineerRoles = [
  'A&R',
  'Arranger',
  'Art Direction',
  'Artist Development',
  'Assistant Engineer',
  'Assistant Mastering Engineer',
  'Assistant Mix Engineer',
  'Assistant Producer',
  'Assistant Recording Engineer',
  'Associated Performer',
  'Audio Director',
  'Audio Editor',
  'Audio Post Production',
  'Co-Producer',
  'Compiler',
  'Conductor',
  'Creative Director',
  'Design',
  'Digital Editor',
  'Director',
  'Editing',
  'Engineer',
  'Executive Producer',
  'Featured Artist',
  'Graphic Design',
  'Illustration',
  'Liner Notes',
  'Mastering',
  'Mastering Engineer',
  'Mix Engineer',
  'Mixer',
  'Mixing',
  'Music Director',
  'Music Supervisor',
  'Orchestra Contractor',
  'Orchestrator',
  'Package Design',
  'Performer',
  'Photography',
  'Post Production',
  'Producer',
  'Production',
  'Production Assistant',
  'Production Coordinator',
  'Production Manager',
  'Programming',
  'Project Coordinator',
  'Recording',
  'Recording Arranger',
  'Recording Engineer',
  'Recording Producer',
  'Remastering',
  'Remixer',
  'Restoration',
  'Sound Design',
  'Sound Editor',
  'Sound Effects',
  'Sound Engineer',
  'Studio Personnel',
  'Supervisor',
  'Technical Producer',
  'Tracking',
  'Tracking Engineer',
  'Transfer',
  'Video Director',
  'Video Editor',
  'Video Producer',
  'Visual Effects',
  'Vocal Arranger',
  'Vocal Coach',
  'Vocal Engineer',
  'Vocal Producer'
].sort();

// Helper function to validate producer/engineer role
export function isProducerEngineerRole(role) {
  return producerEngineerRoles.includes(role);
}

// Get all producer/engineer roles
export function getProducerEngineerRoles() {
  return [...producerEngineerRoles];
}

// Search producer/engineer roles
export function searchProducerEngineerRoles(query) {
  if (!query) return [];
  const searchTerm = query.toLowerCase();
  return producerEngineerRoles.filter(role => 
    role.toLowerCase().includes(searchTerm)
  );
}

export default producerEngineerRoles;