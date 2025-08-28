// Performing contributor roles from Apple Music specification
// These are contributors who perform on the recording

export const performerRoles = [
  'Accordion',
  'Acoustic Bass',
  'Acoustic Guitar',
  'Additional Vocals',
  'Alto',
  'Alto Saxophone',
  'Bagpipes',
  'Banjo',
  'Baritone',
  'Baritone Saxophone',
  'Bass',
  'Bass Clarinet',
  'Bass Guitar',
  'Bass Trombone',
  'Bassoon',
  'Bells',
  'Bongos',
  'Brass',
  'Cello',
  'Choir',
  'Chorus',
  'Clarinet',
  'Classical Guitar',
  'Clavinet',
  'Congas',
  'Contrabass',
  'Cornet',
  'Cymbals',
  'DJ Mixer',
  'DJ Scratches',
  'Dobro',
  'Double Bass',
  'Drums',
  'Electric Bass',
  'Electric Guitar',
  'Electric Piano',
  'Electronic Drums',
  'English Horn',
  'Fiddle',
  'Flugelhorn',
  'Flute',
  'French Horn',
  'Glass Harmonica',
  'Glockenspiel',
  'Grand Piano',
  'Guitar',
  'Harmonica',
  'Harp',
  'Harpsichord',
  'Horn',
  'Keyboard',
  'Lead Guitar',
  'Lead Vocals',
  'Lute',
  'Mandolin',
  'Maracas',
  'Marimba',
  'Mellotron',
  'Mezzo Soprano',
  'Moog Synthesizer',
  'Oboe',
  'Orchestra',
  'Organ',
  'Percussion',
  'Piano',
  'Piccolo',
  'Pipe Organ',
  'Primary Artist',
  'Programming',
  'Rhythm Guitar',
  'Rhodes Piano',
  'Saxophone',
  'Shaker',
  'Sitar',
  'Slide Guitar',
  'Snare Drum',
  'Solo',
  'Soprano',
  'Soprano Saxophone',
  'Steel Drums',
  'Steel Guitar',
  'Strings',
  'Synthesizer',
  'Tabla',
  'Talk Box',
  'Tambourine',
  'Tenor',
  'Tenor Saxophone',
  'Theremin',
  'Timbales',
  'Timpani',
  'Triangle',
  'Trombone',
  'Trumpet',
  'Tuba',
  'Turntables',
  'Ukulele',
  'Upright Bass',
  'Vibraphone',
  'Viola',
  'Violin',
  'Vocals',
  'Vocoder',
  'Whistle',
  'Wood Block',
  'Woodwinds',
  'Wurlitzer',
  'Xylophone'
].sort();

// Helper function to validate performer role
export function isPerformerRole(role) {
  return performerRoles.includes(role);
}

// Get all performer roles (for dropdowns)
export function getPerformerRoles() {
  return [...performerRoles];
}

// Search performer roles
export function searchPerformerRoles(query) {
  if (!query) return [];
  const searchTerm = query.toLowerCase();
  return performerRoles.filter(role => 
    role.toLowerCase().includes(searchTerm)
  );
}

export default performerRoles;