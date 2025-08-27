// src/dictionaries/mead/index.js

/**
 * DDEX MEAD (Media Enrichment and Description) Dictionary
 * Comprehensive metadata fields for music discovery and curation
 * Based on DDEX MEAD 1.1 standard
 */

export const MoodCategories = {
  EMOTIONAL: {
    name: 'Emotional',
    description: 'Core emotional states and feelings',
    moods: [
      'Happy', 'Sad', 'Angry', 'Peaceful', 'Energetic', 'Melancholic',
      'Romantic', 'Nostalgic', 'Uplifting', 'Dark', 'Hopeful', 'Anxious',
      'Joyful', 'Passionate', 'Dreamy', 'Mysterious', 'Triumphant', 'Longing'
    ]
  },
  ENERGY: {
    name: 'Energy Level',
    description: 'Physical and mental energy characteristics',
    moods: [
      'Calm', 'Relaxing', 'Moderate', 'Energetic', 'Intense', 'Explosive',
      'Soothing', 'Exciting', 'Aggressive', 'Gentle', 'Powerful', 'Mellow',
      'Dynamic', 'Serene', 'Vigorous', 'Tranquil'
    ]
  },
  ACTIVITY: {
    name: 'Activity Context',
    description: 'Suitable activities and contexts',
    moods: [
      'Workout', 'Study', 'Party', 'Sleep', 'Driving', 'Meditation',
      'Dancing', 'Walking', 'Running', 'Relaxing', 'Working', 'Gaming',
      'Cooking', 'Reading', 'Traveling', 'Socializing'
    ]
  },
  ATMOSPHERE: {
    name: 'Atmospheric',
    description: 'Environmental and atmospheric qualities',
    moods: [
      'Urban', 'Rural', 'Cosmic', 'Underwater', 'Cinematic', 'Theatrical',
      'Intimate', 'Epic', 'Minimal', 'Lush', 'Raw', 'Polished',
      'Vintage', 'Futuristic', 'Organic', 'Synthetic'
    ]
  }
}

export const MusicalKeys = [
  // Major Keys
  { code: 'C_MAJOR', name: 'C Major', display: 'C' },
  { code: 'CS_MAJOR', name: 'C# Major', display: 'C#/Db' },
  { code: 'D_MAJOR', name: 'D Major', display: 'D' },
  { code: 'DS_MAJOR', name: 'D# Major', display: 'D#/Eb' },
  { code: 'E_MAJOR', name: 'E Major', display: 'E' },
  { code: 'F_MAJOR', name: 'F Major', display: 'F' },
  { code: 'FS_MAJOR', name: 'F# Major', display: 'F#/Gb' },
  { code: 'G_MAJOR', name: 'G Major', display: 'G' },
  { code: 'GS_MAJOR', name: 'G# Major', display: 'G#/Ab' },
  { code: 'A_MAJOR', name: 'A Major', display: 'A' },
  { code: 'AS_MAJOR', name: 'A# Major', display: 'A#/Bb' },
  { code: 'B_MAJOR', name: 'B Major', display: 'B' },
  
  // Minor Keys
  { code: 'A_MINOR', name: 'A Minor', display: 'Am' },
  { code: 'AS_MINOR', name: 'A# Minor', display: 'A#m/Bbm' },
  { code: 'B_MINOR', name: 'B Minor', display: 'Bm' },
  { code: 'C_MINOR', name: 'C Minor', display: 'Cm' },
  { code: 'CS_MINOR', name: 'C# Minor', display: 'C#m/Dbm' },
  { code: 'D_MINOR', name: 'D Minor', display: 'Dm' },
  { code: 'DS_MINOR', name: 'D# Minor', display: 'D#m/Ebm' },
  { code: 'E_MINOR', name: 'E Minor', display: 'Em' },
  { code: 'F_MINOR', name: 'F Minor', display: 'Fm' },
  { code: 'FS_MINOR', name: 'F# Minor', display: 'F#m/Gbm' },
  { code: 'G_MINOR', name: 'G Minor', display: 'Gm' },
  { code: 'GS_MINOR', name: 'G# Minor', display: 'G#m/Abm' }
]

export const TimeSignatures = [
  { code: '4_4', name: '4/4', description: 'Common time - most popular music' },
  { code: '3_4', name: '3/4', description: 'Waltz time' },
  { code: '2_4', name: '2/4', description: 'March time' },
  { code: '6_8', name: '6/8', description: 'Compound duple meter' },
  { code: '12_8', name: '12/8', description: 'Compound quadruple meter' },
  { code: '5_4', name: '5/4', description: 'Quintuple meter' },
  { code: '7_4', name: '7/4', description: 'Septuple meter' },
  { code: '9_8', name: '9/8', description: 'Compound triple meter' },
  { code: '2_2', name: '2/2', description: 'Cut time' },
  { code: '3_8', name: '3/8', description: 'Simple triple meter' },
  { code: '7_8', name: '7/8', description: 'Irregular meter' }
]

export const VocalRegisters = [
  { code: 'SOPRANO', name: 'Soprano', description: 'Highest female voice' },
  { code: 'MEZZO_SOPRANO', name: 'Mezzo-Soprano', description: 'Middle female voice' },
  { code: 'ALTO', name: 'Alto', description: 'Lowest female voice' },
  { code: 'COUNTERTENOR', name: 'Countertenor', description: 'Highest male voice (falsetto)' },
  { code: 'TENOR', name: 'Tenor', description: 'High male voice' },
  { code: 'BARITONE', name: 'Baritone', description: 'Middle male voice' },
  { code: 'BASS', name: 'Bass', description: 'Lowest male voice' },
  { code: 'CONTRALTO', name: 'Contralto', description: 'Rare low female voice' },
  { code: 'HIGH_MALE', name: 'High Male', description: 'High male vocal range' },
  { code: 'LOW_FEMALE', name: 'Low Female', description: 'Low female vocal range' }
]

export const VocalCharacteristics = [
  { code: 'LEAD_VOCAL', name: 'Lead Vocal', description: 'Primary vocals' },
  { code: 'BACKING_VOCALS', name: 'Backing Vocals', description: 'Supporting vocals' },
  { code: 'HARMONY', name: 'Harmony', description: 'Harmonic vocals' },
  { code: 'RAP', name: 'Rap', description: 'Rhythmic spoken vocals' },
  { code: 'SPOKEN_WORD', name: 'Spoken Word', description: 'Spoken vocals' },
  { code: 'INSTRUMENTAL', name: 'Instrumental', description: 'No vocals' },
  { code: 'CHOIR', name: 'Choir', description: 'Group vocals' },
  { code: 'FALSETTO', name: 'Falsetto', description: 'High pitched vocals' },
  { code: 'GROWL', name: 'Growl', description: 'Aggressive vocal technique' },
  { code: 'WHISPER', name: 'Whisper', description: 'Soft spoken vocals' }
]

export const InstrumentCategories = {
  STRINGS: {
    name: 'Strings',
    description: 'String instruments',
    instruments: [
      { code: 'GUITAR', name: 'Guitar' },
      { code: 'BASS_GUITAR', name: 'Bass Guitar' },
      { code: 'ACOUSTIC_GUITAR', name: 'Acoustic Guitar' },
      { code: 'ELECTRIC_GUITAR', name: 'Electric Guitar' },
      { code: 'VIOLIN', name: 'Violin' },
      { code: 'CELLO', name: 'Cello' },
      { code: 'DOUBLE_BASS', name: 'Double Bass' },
      { code: 'HARP', name: 'Harp' },
      { code: 'BANJO', name: 'Banjo' },
      { code: 'MANDOLIN', name: 'Mandolin' },
      { code: 'UKULELE', name: 'Ukulele' },
      { code: 'SITAR', name: 'Sitar' }
    ]
  },
  PERCUSSION: {
    name: 'Percussion',
    description: 'Percussion and rhythm instruments',
    instruments: [
      { code: 'DRUMS', name: 'Drums' },
      { code: 'DRUM_KIT', name: 'Drum Kit' },
      { code: 'TIMPANI', name: 'Timpani' },
      { code: 'CYMBALS', name: 'Cymbals' },
      { code: 'TRIANGLE', name: 'Triangle' },
      { code: 'TAMBOURINE', name: 'Tambourine' },
      { code: 'CONGAS', name: 'Congas' },
      { code: 'BONGOS', name: 'Bongos' },
      { code: 'XYLOPHONE', name: 'Xylophone' },
      { code: 'MARIMBA', name: 'Marimba' },
      { code: 'VIBRAPHONE', name: 'Vibraphone' },
      { code: 'CAJON', name: 'Cajon' }
    ]
  },
  WIND: {
    name: 'Wind',
    description: 'Wind and brass instruments',
    instruments: [
      { code: 'FLUTE', name: 'Flute' },
      { code: 'SAXOPHONE', name: 'Saxophone' },
      { code: 'TRUMPET', name: 'Trumpet' },
      { code: 'TROMBONE', name: 'Trombone' },
      { code: 'CLARINET', name: 'Clarinet' },
      { code: 'OBOE', name: 'Oboe' },
      { code: 'BASSOON', name: 'Bassoon' },
      { code: 'FRENCH_HORN', name: 'French Horn' },
      { code: 'TUBA', name: 'Tuba' },
      { code: 'PICCOLO', name: 'Piccolo' },
      { code: 'HARMONICA', name: 'Harmonica' },
      { code: 'RECORDER', name: 'Recorder' }
    ]
  },
  KEYBOARD: {
    name: 'Keyboard',
    description: 'Keyboard and keyed instruments',
    instruments: [
      { code: 'PIANO', name: 'Piano' },
      { code: 'ELECTRIC_PIANO', name: 'Electric Piano' },
      { code: 'ORGAN', name: 'Organ' },
      { code: 'SYNTHESIZER', name: 'Synthesizer' },
      { code: 'HARPSICHORD', name: 'Harpsichord' },
      { code: 'ACCORDION', name: 'Accordion' },
      { code: 'HARMONIUM', name: 'Harmonium' },
      { code: 'CELESTA', name: 'Celesta' },
      { code: 'MELLOTRON', name: 'Mellotron' },
      { code: 'CLAVINET', name: 'Clavinet' }
    ]
  },
  ELECTRONIC: {
    name: 'Electronic',
    description: 'Electronic and digital instruments',
    instruments: [
      { code: 'DRUM_MACHINE', name: 'Drum Machine' },
      { code: 'SAMPLER', name: 'Sampler' },
      { code: 'SEQUENCER', name: 'Sequencer' },
      { code: 'VOCODER', name: 'Vocoder' },
      { code: 'THEREMIN', name: 'Theremin' },
      { code: 'TURNTABLES', name: 'Turntables' },
      { code: 'LOOP_STATION', name: 'Loop Station' },
      { code: 'MIDI_CONTROLLER', name: 'MIDI Controller' },
      { code: 'GROOVEBOX', name: 'Groovebox' }
    ]
  }
}

export const TempoDescriptions = [
  { code: 'VERY_SLOW', name: 'Very Slow', range: '< 60 BPM', description: 'Ballads, ambient' },
  { code: 'SLOW', name: 'Slow', range: '60-80 BPM', description: 'Slow songs, some hip-hop' },
  { code: 'MODERATE', name: 'Moderate', range: '80-120 BPM', description: 'Most popular music' },
  { code: 'FAST', name: 'Fast', range: '120-140 BPM', description: 'Dance, rock, uptempo pop' },
  { code: 'VERY_FAST', name: 'Very Fast', range: '> 140 BPM', description: 'Electronic dance, punk, metal' }
]

export const PlaylistSuitability = [
  { code: 'WORKOUT', name: 'Workout', description: 'High energy exercise music' },
  { code: 'STUDY', name: 'Study', description: 'Focus and concentration' },
  { code: 'PARTY', name: 'Party', description: 'Social gatherings and celebrations' },
  { code: 'CHILL', name: 'Chill', description: 'Relaxed listening' },
  { code: 'FOCUS', name: 'Focus', description: 'Deep work and productivity' },
  { code: 'SLEEP', name: 'Sleep', description: 'Bedtime and relaxation' },
  { code: 'DRIVING', name: 'Driving', description: 'Road trips and commuting' },
  { code: 'ROMANCE', name: 'Romance', description: 'Romantic moments' },
  { code: 'GAMING', name: 'Gaming', description: 'Video game background' },
  { code: 'COOKING', name: 'Cooking', description: 'Kitchen activities' },
  { code: 'MEDITATION', name: 'Meditation', description: 'Mindfulness and reflection' },
  { code: 'RUNNING', name: 'Running', description: 'Jogging and cardio' }
]

export const Seasonality = [
  { code: 'SPRING', name: 'Spring', description: 'Renewal and growth themes' },
  { code: 'SUMMER', name: 'Summer', description: 'Warm weather and vacations' },
  { code: 'FALL', name: 'Fall/Autumn', description: 'Change and reflection' },
  { code: 'WINTER', name: 'Winter', description: 'Cold weather and introspection' },
  { code: 'CHRISTMAS', name: 'Christmas/Holiday', description: 'Holiday celebrations' },
  { code: 'HALLOWEEN', name: 'Halloween', description: 'Spooky and mysterious' },
  { code: 'VALENTINE', name: "Valentine's Day", description: 'Love and romance' },
  { code: 'SUMMER_SOLSTICE', name: 'Summer Solstice', description: 'Peak summer energy' },
  { code: 'NEW_YEAR', name: 'New Year', description: 'Fresh starts and resolutions' }
]

export const ContentAdvisories = [
  { code: 'EXPLICIT_LYRICS', name: 'Explicit Lyrics', description: 'Strong language' },
  { code: 'SEXUAL_CONTENT', name: 'Sexual Content', description: 'Adult themes' },
  { code: 'VIOLENCE', name: 'Violence', description: 'Violent imagery or themes' },
  { code: 'DRUG_REFERENCES', name: 'Drug References', description: 'Substance use themes' },
  { code: 'GAMBLING', name: 'Gambling', description: 'Gambling references' },
  { code: 'HATE_SPEECH', name: 'Hate Speech', description: 'Discriminatory content' }
]

export const RecordingTechniques = [
  { code: 'STUDIO', name: 'Studio Recording', description: 'Professional studio environment' },
  { code: 'LIVE', name: 'Live Recording', description: 'Recorded during live performance' },
  { code: 'HOME', name: 'Home Recording', description: 'Recorded in home studio' },
  { code: 'FIELD', name: 'Field Recording', description: 'Recorded on location' },
  { code: 'ANALOG', name: 'Analog Recording', description: 'Recorded to analog medium' },
  { code: 'DIGITAL', name: 'Digital Recording', description: 'Recorded digitally' },
  { code: 'MULTITRACK', name: 'Multitrack', description: 'Layered recording technique' },
  { code: 'OVERDUB', name: 'Overdubbed', description: 'Additional parts added later' }
]

export const AudioCharacteristics = [
  { code: 'HIFI', name: 'Hi-Fi', description: 'High fidelity, clear sound' },
  { code: 'LOFI', name: 'Lo-Fi', description: 'Deliberately low fidelity' },
  { code: 'COMPRESSED', name: 'Compressed', description: 'Heavy dynamic range compression' },
  { code: 'DYNAMIC', name: 'Dynamic', description: 'Wide dynamic range' },
  { code: 'SATURATED', name: 'Saturated', description: 'Warm, analog-style saturation' },
  { code: 'CLEAN', name: 'Clean', description: 'Clear, unprocessed sound' },
  { code: 'DISTORTED', name: 'Distorted', description: 'Intentionally distorted' },
  { code: 'REVERB_HEAVY', name: 'Reverb Heavy', description: 'Lots of reverb/echo' }
]

// Helper functions
export const getAllMoods = () => {
  return Object.values(MoodCategories).reduce((acc, category) => {
    return acc.concat(category.moods)
  }, [])
}

export const getAllInstruments = () => {
  return Object.values(InstrumentCategories).reduce((acc, category) => {
    return acc.concat(category.instruments.map(inst => inst.name))
  }, [])
}

export const getMoodsByCategory = (categoryKey) => {
  return MoodCategories[categoryKey]?.moods || []
}

export const getInstrumentsByCategory = (categoryKey) => {
  return InstrumentCategories[categoryKey]?.instruments || []
}

export const findKeyByCode = (code) => {
  return MusicalKeys.find(key => key.code === code)
}

export const findTimeSignatureByCode = (code) => {
  return TimeSignatures.find(sig => sig.code === code)
}

// Default MEAD structure for new releases
export const defaultMeadData = {
  moods: [],
  themes: [],
  isExplicit: false,
  contentAdvisory: '',
  tempo: null,
  tempoDescription: '',
  timeSignature: '',
  harmonicStructure: '',
  vocalRegister: '',
  vocalCharacteristics: [],
  instrumentation: [],
  instrumentationDetails: '',
  recordingTechnique: '',
  audioCharacteristics: '',
  focusTrack: '',
  marketingDescription: '',
  targetAudience: [],
  playlistSuitability: [],
  seasonality: '',
  culturalReferences: [],
  chartPositions: [],
  awards: [],
  trackMead: {}
}