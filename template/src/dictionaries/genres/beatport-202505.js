// src/dictionaries/genres/beatport-202505.js
/**
 * Beatport Genre Dictionary
 * Version: 2025-05
 * 
 * Source: Official Beatport Genre Listing (Website)
 * This matches exactly what Beatport accepts for deliveries
 */

export const BEATPORT_GENRES = {
  version: '2025-05',
  lastUpdated: '2025-08-24',
  
  // Root genre map for quick lookup by code
  byCode: {
    // 140 / Deep Dubstep / Grime
    'BP-140-00': { name: '140 / Deep Dubstep / Grime', xmlNotation: '140 / Deep Dubstep / Grime', path: ['Music', '140 / Deep Dubstep / Grime'], parent: null },
    'BP-140-GRIME': { name: 'Grime', xmlNotation: '140 / Deep Dubstep / Grime | Grime', path: ['Music', '140 / Deep Dubstep / Grime', 'Grime'], parent: 'BP-140-00' },
    
    // Afro House
    'BP-AFRO-HOUSE-00': { name: 'Afro House', xmlNotation: 'Afro House', path: ['Music', 'Afro House'], parent: null },
    'BP-AFRO-HOUSE-LATIN': { name: 'Afro / Latin', xmlNotation: 'Afro House | Afro / Latin', path: ['Music', 'Afro House', 'Afro / Latin'], parent: 'BP-AFRO-HOUSE-00' },
    'BP-AFRO-HOUSE-MELODIC': { name: 'Afro Melodic', xmlNotation: 'Afro House | Afro Melodic', path: ['Music', 'Afro House', 'Afro Melodic'], parent: 'BP-AFRO-HOUSE-00' },
    'BP-AFRO-HOUSE-3STEP': { name: '3Step', xmlNotation: 'Afro House | 3Step', path: ['Music', 'Afro House', '3Step'], parent: 'BP-AFRO-HOUSE-00' },
    
    // Amapiano (CORRECTED: Gqom is a subgenre of Amapiano)
    'BP-AMAPIANO-00': { name: 'Amapiano', xmlNotation: 'Amapiano', path: ['Music', 'Amapiano'], parent: null },
    'BP-AMAPIANO-GQOM': { name: 'Gqom', xmlNotation: 'Amapiano | Gqom', path: ['Music', 'Amapiano', 'Gqom'], parent: 'BP-AMAPIANO-00' },
    
    // Ambient / Experimental
    'BP-AMBIENT-00': { name: 'Ambient / Experimental', xmlNotation: 'Ambient / Experimental', path: ['Music', 'Ambient / Experimental'], parent: null },
    
    // Bass / Club (Editorial only)
    'BP-BASS-CLUB-00': { name: 'Bass / Club', xmlNotation: null, path: ['Music', 'Bass / Club'], parent: null, editorial: true },
    'BP-BASS-CLUB-UK-FUNKY': { name: 'UK Funky', xmlNotation: null, path: ['Music', 'Bass / Club', 'UK Funky'], parent: 'BP-BASS-CLUB-00', editorial: true },
    'BP-BASS-CLUB-GLOBAL': { name: 'Global Club', xmlNotation: null, path: ['Music', 'Bass / Club', 'Global Club'], parent: 'BP-BASS-CLUB-00', editorial: true },
    'BP-BASS-CLUB-JERSEY': { name: 'Jersey Club', xmlNotation: null, path: ['Music', 'Bass / Club', 'Jersey Club'], parent: 'BP-BASS-CLUB-00', editorial: true },
    'BP-BASS-CLUB-JUKE': { name: 'Juke / Footwork', xmlNotation: null, path: ['Music', 'Bass / Club', 'Juke / Footwork'], parent: 'BP-BASS-CLUB-00', editorial: true },
    'BP-BASS-CLUB-REGGAE': { name: 'Reggae / Dancehall', xmlNotation: null, path: ['Music', 'Bass / Club', 'Reggae / Dancehall'], parent: 'BP-BASS-CLUB-00', editorial: true },
    
    // Bass House
    'BP-BASS-HOUSE-00': { name: 'Bass House', xmlNotation: 'Bass House', path: ['Music', 'Bass House'], parent: null },
    
    // Breaks / Breakbeat / UK Bass
    'BP-BREAKS-00': { name: 'Breaks / Breakbeat / UK Bass', xmlNotation: 'Breaks / Breakbeat / UK Bass', path: ['Music', 'Breaks / Breakbeat / UK Bass'], parent: null },
    'BP-BREAKS-GLITCH': { name: 'Glitch Hop', xmlNotation: 'Breaks / Breakbeat / UK Bass | Glitch Hop', path: ['Music', 'Breaks / Breakbeat / UK Bass', 'Glitch Hop'], parent: 'BP-BREAKS-00' },
    
    // Brazilian Funk
    'BP-BRAZILIAN-FUNK-00': { name: 'Brazilian Funk', xmlNotation: 'Brazilian Funk', path: ['Music', 'Brazilian Funk'], parent: null },
    'BP-BRAZILIAN-FUNK-CARIOCA': { name: 'Carioca Funk', xmlNotation: 'Brazilian Funk | Carioca Funk', path: ['Music', 'Brazilian Funk', 'Carioca Funk'], parent: 'BP-BRAZILIAN-FUNK-00' },
    'BP-BRAZILIAN-FUNK-MANDELAO': { name: 'Mandelao Funk', xmlNotation: 'Brazilian Funk | Mandelao Funk', path: ['Music', 'Brazilian Funk', 'Mandelao Funk'], parent: 'BP-BRAZILIAN-FUNK-00' },
    'BP-BRAZILIAN-FUNK-BH': { name: 'BH Funk', xmlNotation: 'Brazilian Funk | BH Funk', path: ['Music', 'Brazilian Funk', 'BH Funk'], parent: 'BP-BRAZILIAN-FUNK-00' },
    'BP-BRAZILIAN-FUNK-MELODIC': { name: 'Melodic Funk', xmlNotation: 'Brazilian Funk | Melodic Funk', path: ['Music', 'Brazilian Funk', 'Melodic Funk'], parent: 'BP-BRAZILIAN-FUNK-00' },
    
    // Dance / Pop
    'BP-DANCE-POP-00': { name: 'Dance / Pop', xmlNotation: 'Dance / Pop', path: ['Music', 'Dance / Pop'], parent: null },
    'BP-DANCE-POP-AFRO': { name: 'Afro Pop', xmlNotation: 'Dance / Pop | Afro Pop', path: ['Music', 'Dance / Pop', 'Afro Pop'], parent: 'BP-DANCE-POP-00' },
    'BP-DANCE-POP-POP': { name: 'Pop', xmlNotation: 'Dance / Pop | Pop', path: ['Music', 'Dance / Pop', 'Pop'], parent: 'BP-DANCE-POP-00' },
    'BP-DANCE-POP-TROPICAL': { name: 'Tropical House', xmlNotation: 'Dance / Pop | Tropical House', path: ['Music', 'Dance / Pop', 'Tropical House'], parent: 'BP-DANCE-POP-00' },
    
    // Deep House
    'BP-DEEP-HOUSE-00': { name: 'Deep House', xmlNotation: 'Deep House', path: ['Music', 'Deep House'], parent: null },
    
    // DJ Tools
    'BP-DJ-TOOLS-00': { name: 'DJ Tools', xmlNotation: 'DJ Tools', path: ['Music', 'DJ Tools'], parent: null },
    'BP-DJ-TOOLS-LOOPS': { name: 'Loops', xmlNotation: 'DJ Tools | Loops', path: ['Music', 'DJ Tools', 'Loops'], parent: 'BP-DJ-TOOLS-00' },
    'BP-DJ-TOOLS-ACAPELLAS': { name: 'Acapellas', xmlNotation: 'DJ Tools | Acapellas', path: ['Music', 'DJ Tools', 'Acapellas'], parent: 'BP-DJ-TOOLS-00' },
    'BP-DJ-TOOLS-BATTLE': { name: 'Battle Tools', xmlNotation: 'DJ Tools | Battle Tools', path: ['Music', 'DJ Tools', 'Battle Tools'], parent: 'BP-DJ-TOOLS-00' },
    
    // Downtempo
    'BP-DOWNTEMPO-00': { name: 'Downtempo', xmlNotation: 'Downtempo', path: ['Music', 'Downtempo'], parent: null },
    
    // Drum & Bass
    'BP-DRUM-BASS-00': { name: 'Drum & Bass', xmlNotation: 'Drum &amp; Bass', path: ['Music', 'Drum & Bass'], parent: null },
    'BP-DRUM-BASS-LIQUID': { name: 'Liquid', xmlNotation: 'Drum &amp; Bass | Liquid', path: ['Music', 'Drum & Bass', 'Liquid'], parent: 'BP-DRUM-BASS-00' },
    'BP-DRUM-BASS-JUMP': { name: 'Jump Up', xmlNotation: 'Drum &amp; Bass | Jump Up', path: ['Music', 'Drum & Bass', 'Jump Up'], parent: 'BP-DRUM-BASS-00' },
    'BP-DRUM-BASS-JUNGLE': { name: 'Jungle', xmlNotation: 'Drum &amp; Bass | Jungle', path: ['Music', 'Drum & Bass', 'Jungle'], parent: 'BP-DRUM-BASS-00' },
    'BP-DRUM-BASS-DEEP': { name: 'Deep', xmlNotation: 'Drum &amp; Bass | Deep', path: ['Music', 'Drum & Bass', 'Deep'], parent: 'BP-DRUM-BASS-00' },
    'BP-DRUM-BASS-HALFTIME': { name: 'Halftime', xmlNotation: 'Drum &amp; Bass | Halftime', path: ['Music', 'Drum & Bass', 'Halftime'], parent: 'BP-DRUM-BASS-00' },
    
    // Dubstep
    'BP-DUBSTEP-00': { name: 'Dubstep', xmlNotation: 'Dubstep', path: ['Music', 'Dubstep'], parent: null },
    'BP-DUBSTEP-MELODIC': { name: 'Melodic Dubstep', xmlNotation: 'Dubstep | Melodic Dubstep', path: ['Music', 'Dubstep', 'Melodic Dubstep'], parent: 'BP-DUBSTEP-00' },
    'BP-DUBSTEP-MIDTEMPO': { name: 'Midtempo', xmlNotation: 'Dubstep | Midtempo', path: ['Music', 'Dubstep', 'Midtempo'], parent: 'BP-DUBSTEP-00' },
    
    // Electro (Classic / Detroit / Modern)
    'BP-ELECTRO-00': { name: 'Electro (Classic / Detroit / Modern)', xmlNotation: 'Electro (Classic / Detroit / Modern)', path: ['Music', 'Electro (Classic / Detroit / Modern)'], parent: null },
    
    // Electronica
    'BP-ELECTRONICA-00': { name: 'Electronica', xmlNotation: 'Electronica', path: ['Music', 'Electronica'], parent: null },
    
    // Funky House
    'BP-FUNKY-HOUSE-00': { name: 'Funky House', xmlNotation: 'Funky House', path: ['Music', 'Funky House'], parent: null },
    
    // Hard Dance / Hardcore / Neo Rave
    'BP-HARD-DANCE-00': { name: 'Hard Dance / Hardcore / Neo Rave', xmlNotation: 'Hard Dance / Hardcore / Neo Rave', path: ['Music', 'Hard Dance / Hardcore / Neo Rave'], parent: null },
    'BP-HARD-DANCE-HARDSTYLE': { name: 'Hardstyle', xmlNotation: 'Hard Dance / Hardcore / Neo Rave | Hardstyle', path: ['Music', 'Hard Dance / Hardcore / Neo Rave', 'Hardstyle'], parent: 'BP-HARD-DANCE-00' },
    'BP-HARD-DANCE-HARD-HOUSE': { name: 'Hard House', xmlNotation: 'Hard Dance / Hardcore / Neo Rave | Hard House', path: ['Music', 'Hard Dance / Hardcore / Neo Rave', 'Hard House'], parent: 'BP-HARD-DANCE-00' },
    'BP-HARD-DANCE-UPTEMPO': { name: 'Uptempo', xmlNotation: 'Hard Dance / Hardcore / Neo Rave | Uptempo', path: ['Music', 'Hard Dance / Hardcore / Neo Rave', 'Uptempo'], parent: 'BP-HARD-DANCE-00' },
    'BP-HARD-DANCE-TERROR': { name: 'Terror', xmlNotation: 'Hard Dance / Hardcore / Neo Rave | Terror', path: ['Music', 'Hard Dance / Hardcore / Neo Rave', 'Terror'], parent: 'BP-HARD-DANCE-00' },
    'BP-HARD-DANCE-UK-HARDCORE': { name: 'UK / Happy Hardcore', xmlNotation: 'Hard Dance / Hardcore / Neo Rave | UK / Happy Hardcore', path: ['Music', 'Hard Dance / Hardcore / Neo Rave', 'UK / Happy Hardcore'], parent: 'BP-HARD-DANCE-00' },
    'BP-HARD-DANCE-FRENCHCORE': { name: 'Frenchcore', xmlNotation: 'Hard Dance / Hardcore / Neo Rave | Frenchcore', path: ['Music', 'Hard Dance / Hardcore / Neo Rave', 'Frenchcore'], parent: 'BP-HARD-DANCE-00' },
    'BP-HARD-DANCE-NEO-RAVE': { name: 'Neo Rave', xmlNotation: 'Hard Dance / Hardcore / Neo Rave | Neo Rave', path: ['Music', 'Hard Dance / Hardcore / Neo Rave', 'Neo Rave'], parent: 'BP-HARD-DANCE-00' },
    
    // Hard Techno
    'BP-HARD-TECHNO-00': { name: 'Hard Techno', xmlNotation: 'Hard Techno', path: ['Music', 'Hard Techno'], parent: null },
    
    // House
    'BP-HOUSE-00': { name: 'House', xmlNotation: 'House', path: ['Music', 'House'], parent: null },
    'BP-HOUSE-ACID': { name: 'Acid', xmlNotation: 'House | Acid', path: ['Music', 'House', 'Acid'], parent: 'BP-HOUSE-00' },
    'BP-HOUSE-SOULFUL': { name: 'Soulful', xmlNotation: 'House | Soulful', path: ['Music', 'House', 'Soulful'], parent: 'BP-HOUSE-00' },
    
    // Indie Dance
    'BP-INDIE-DANCE-00': { name: 'Indie Dance', xmlNotation: 'Indie Dance', path: ['Music', 'Indie Dance'], parent: null },
    'BP-INDIE-DANCE-DARK': { name: 'Dark Disco', xmlNotation: 'Indie Dance | Dark Disco', path: ['Music', 'Indie Dance', 'Dark Disco'], parent: 'BP-INDIE-DANCE-00' },
    
    // Jackin House
    'BP-JACKIN-HOUSE-00': { name: 'Jackin House', xmlNotation: 'Jackin House', path: ['Music', 'Jackin House'], parent: null },
    
    // Mainstage
    'BP-MAINSTAGE-00': { name: 'Mainstage', xmlNotation: 'Mainstage', path: ['Music', 'Mainstage'], parent: null },
    'BP-MAINSTAGE-BIG-ROOM': { name: 'Big Room', xmlNotation: 'Mainstage | Big Room', path: ['Music', 'Mainstage', 'Big Room'], parent: 'BP-MAINSTAGE-00' },
    'BP-MAINSTAGE-ELECTRO': { name: 'Electro House', xmlNotation: 'Mainstage | Electro House', path: ['Music', 'Mainstage', 'Electro House'], parent: 'BP-MAINSTAGE-00' },
    'BP-MAINSTAGE-FUTURE': { name: 'Future House', xmlNotation: 'Mainstage | Future House', path: ['Music', 'Mainstage', 'Future House'], parent: 'BP-MAINSTAGE-00' },
    'BP-MAINSTAGE-SPEED': { name: 'Speed House', xmlNotation: 'Mainstage | Speed House', path: ['Music', 'Mainstage', 'Speed House'], parent: 'BP-MAINSTAGE-00' },
    'BP-MAINSTAGE-FUTURE-RAVE': { name: 'Future Rave', xmlNotation: 'Mainstage | Future Rave', path: ['Music', 'Mainstage', 'Future Rave'], parent: 'BP-MAINSTAGE-00' },
    
    // Melodic House & Techno
    'BP-MELODIC-00': { name: 'Melodic House & Techno', xmlNotation: 'Melodic House &amp; Techno', path: ['Music', 'Melodic House & Techno'], parent: null },
    'BP-MELODIC-HOUSE': { name: 'Melodic House', xmlNotation: 'Melodic House &amp; Techno | Melodic House', path: ['Music', 'Melodic House & Techno', 'Melodic House'], parent: 'BP-MELODIC-00' },
    'BP-MELODIC-TECHNO': { name: 'Melodic Techno', xmlNotation: 'Melodic House &amp; Techno | Melodic Techno', path: ['Music', 'Melodic House & Techno', 'Melodic Techno'], parent: 'BP-MELODIC-00' },
    
    // Minimal / Deep Tech
    'BP-MINIMAL-00': { name: 'Minimal / Deep Tech', xmlNotation: 'Minimal / Deep Tech', path: ['Music', 'Minimal / Deep Tech'], parent: null },
    'BP-MINIMAL-BOUNCE': { name: 'Bounce', xmlNotation: 'Minimal / Deep Tech | Bounce', path: ['Music', 'Minimal / Deep Tech', 'Bounce'], parent: 'BP-MINIMAL-00' },
    'BP-MINIMAL-DEEP': { name: 'Deep Tech', xmlNotation: 'Minimal / Deep Tech | Deep Tech', path: ['Music', 'Minimal / Deep Tech', 'Deep Tech'], parent: 'BP-MINIMAL-00' },
    
    // Nu Disco / Disco
    'BP-NU-DISCO-00': { name: 'Nu Disco / Disco', xmlNotation: 'Nu Disco / Disco', path: ['Music', 'Nu Disco / Disco'], parent: null },
    'BP-NU-DISCO-FUNK': { name: 'Funk / Soul', xmlNotation: 'Nu Disco / Disco | Funk / Soul', path: ['Music', 'Nu Disco / Disco', 'Funk / Soul'], parent: 'BP-NU-DISCO-00' },
    'BP-NU-DISCO-ITALO': { name: 'Italo', xmlNotation: 'Nu Disco / Disco | Italo', path: ['Music', 'Nu Disco / Disco', 'Italo'], parent: 'BP-NU-DISCO-00' },
    
    // Organic House
    'BP-ORGANIC-HOUSE-00': { name: 'Organic House', xmlNotation: 'Organic House', path: ['Music', 'Organic House'], parent: null },
    
    // Progressive House
    'BP-PROGRESSIVE-HOUSE-00': { name: 'Progressive House', xmlNotation: 'Progressive House', path: ['Music', 'Progressive House'], parent: null },
    
    // Psy-Trance
    'BP-PSY-TRANCE-00': { name: 'Psy-Trance', xmlNotation: 'Psy-Trance', path: ['Music', 'Psy-Trance'], parent: null },
    'BP-PSY-TRANCE-FULL-ON': { name: 'Full-On', xmlNotation: 'Psy-Trance | Full-On', path: ['Music', 'Psy-Trance', 'Full-On'], parent: 'BP-PSY-TRANCE-00' },
    'BP-PSY-TRANCE-PROGRESSIVE': { name: 'Progressive Psy', xmlNotation: 'Psy-Trance | Progressive Psy', path: ['Music', 'Psy-Trance', 'Progressive Psy'], parent: 'BP-PSY-TRANCE-00' },
    'BP-PSY-TRANCE-PSYCHEDELIC': { name: 'Psychedelic', xmlNotation: 'Psy-Trance | Psychedelic', path: ['Music', 'Psy-Trance', 'Psychedelic'], parent: 'BP-PSY-TRANCE-00' },
    'BP-PSY-TRANCE-DARK': { name: 'Dark & Forest', xmlNotation: 'Psy-Trance | Dark &amp; Forest', path: ['Music', 'Psy-Trance', 'Dark & Forest'], parent: 'BP-PSY-TRANCE-00' },
    'BP-PSY-TRANCE-GOA': { name: 'Goa Trance', xmlNotation: 'Psy-Trance | Goa Trance', path: ['Music', 'Psy-Trance', 'Goa Trance'], parent: 'BP-PSY-TRANCE-00' },
    'BP-PSY-TRANCE-PSYCORE': { name: 'Psycore & Hi-Tech', xmlNotation: 'Psy-Trance | Psycore &amp; Hi-Tech', path: ['Music', 'Psy-Trance', 'Psycore & Hi-Tech'], parent: 'BP-PSY-TRANCE-00' },
    
    // Tech House
    'BP-TECH-HOUSE-00': { name: 'Tech House', xmlNotation: 'Tech House', path: ['Music', 'Tech House'], parent: null },
    'BP-TECH-HOUSE-LATIN': { name: 'Latin Tech', xmlNotation: 'Tech House | Latin Tech', path: ['Music', 'Tech House', 'Latin Tech'], parent: 'BP-TECH-HOUSE-00' },
    
    // Techno (Peak Time / Driving)
    'BP-TECHNO-PEAK-00': { name: 'Techno (Peak Time / Driving)', xmlNotation: 'Techno (Peak Time / Driving)', path: ['Music', 'Techno (Peak Time / Driving)'], parent: null },
    'BP-TECHNO-DRIVING': { name: 'Driving', xmlNotation: 'Techno (Peak Time / Driving) | Driving', path: ['Music', 'Techno (Peak Time / Driving)', 'Driving'], parent: 'BP-TECHNO-PEAK-00' },
    'BP-TECHNO-PEAK-TIME': { name: 'Peak Time', xmlNotation: 'Techno (Peak Time / Driving) | Peak Time', path: ['Music', 'Techno (Peak Time / Driving)', 'Peak Time'], parent: 'BP-TECHNO-PEAK-00' },
    
    // Techno (Raw / Deep / Hypnotic)
    'BP-TECHNO-RAW-00': { name: 'Techno (Raw / Deep / Hypnotic)', xmlNotation: 'Techno (Raw / Deep / Hypnotic)', path: ['Music', 'Techno (Raw / Deep / Hypnotic)'], parent: null },
    'BP-TECHNO-RAW-BROKEN': { name: 'Broken', xmlNotation: 'Techno (Raw / Deep / Hypnotic) | Broken', path: ['Music', 'Techno (Raw / Deep / Hypnotic)', 'Broken'], parent: 'BP-TECHNO-RAW-00' },
    'BP-TECHNO-RAW-DEEP': { name: 'Deep / Hypnotic', xmlNotation: 'Techno (Raw / Deep / Hypnotic) | Deep / Hypnotic', path: ['Music', 'Techno (Raw / Deep / Hypnotic)', 'Deep / Hypnotic'], parent: 'BP-TECHNO-RAW-00' },
    'BP-TECHNO-RAW-DUB': { name: 'Dub', xmlNotation: 'Techno (Raw / Deep / Hypnotic) | Dub', path: ['Music', 'Techno (Raw / Deep / Hypnotic)', 'Dub'], parent: 'BP-TECHNO-RAW-00' },
    'BP-TECHNO-RAW-EBM': { name: 'EBM', xmlNotation: 'Techno (Raw / Deep / Hypnotic) | EBM', path: ['Music', 'Techno (Raw / Deep / Hypnotic)', 'EBM'], parent: 'BP-TECHNO-RAW-00' },
    'BP-TECHNO-RAW-RAW': { name: 'Raw', xmlNotation: 'Techno (Raw / Deep / Hypnotic) | Raw', path: ['Music', 'Techno (Raw / Deep / Hypnotic)', 'Raw'], parent: 'BP-TECHNO-RAW-00' },
    
    // Trance (Main Floor)
    'BP-TRANCE-MAIN-00': { name: 'Trance (Main Floor)', xmlNotation: 'Trance (Main Floor)', path: ['Music', 'Trance (Main Floor)'], parent: null },
    'BP-TRANCE-MAIN-PROGRESSIVE': { name: 'Progressive Trance', xmlNotation: 'Trance (Main Floor) | Progressive Trance', path: ['Music', 'Trance (Main Floor)', 'Progressive Trance'], parent: 'BP-TRANCE-MAIN-00' },
    'BP-TRANCE-MAIN-TECH': { name: 'Tech Trance', xmlNotation: 'Trance (Main Floor) | Tech Trance', path: ['Music', 'Trance (Main Floor)', 'Tech Trance'], parent: 'BP-TRANCE-MAIN-00' },
    'BP-TRANCE-MAIN-UPLIFTING': { name: 'Uplifting Trance', xmlNotation: 'Trance (Main Floor) | Uplifting Trance', path: ['Music', 'Trance (Main Floor)', 'Uplifting Trance'], parent: 'BP-TRANCE-MAIN-00' },
    'BP-TRANCE-MAIN-VOCAL': { name: 'Vocal Trance', xmlNotation: 'Trance (Main Floor) | Vocal Trance', path: ['Music', 'Trance (Main Floor)', 'Vocal Trance'], parent: 'BP-TRANCE-MAIN-00' },
    'BP-TRANCE-MAIN-HARD': { name: 'Hard Trance', xmlNotation: 'Trance (Main Floor) | Hard Trance', path: ['Music', 'Trance (Main Floor)', 'Hard Trance'], parent: 'BP-TRANCE-MAIN-00' },
    
    // Trance (Raw / Deep / Hypnotic)
    'BP-TRANCE-RAW-00': { name: 'Trance (Raw / Deep / Hypnotic)', xmlNotation: 'Trance (Raw / Deep / Hypnotic)', path: ['Music', 'Trance (Raw / Deep / Hypnotic)'], parent: null },
    'BP-TRANCE-RAW-RAW': { name: 'Raw Trance', xmlNotation: 'Trance (Raw / Deep / Hypnotic) | Raw Trance', path: ['Music', 'Trance (Raw / Deep / Hypnotic)', 'Raw Trance'], parent: 'BP-TRANCE-RAW-00' },
    'BP-TRANCE-RAW-DEEP': { name: 'Deep Trance', xmlNotation: 'Trance (Raw / Deep / Hypnotic) | Deep Trance', path: ['Music', 'Trance (Raw / Deep / Hypnotic)', 'Deep Trance'], parent: 'BP-TRANCE-RAW-00' },
    'BP-TRANCE-RAW-HYPNOTIC': { name: 'Hypnotic Trance', xmlNotation: 'Trance (Raw / Deep / Hypnotic) | Hypnotic Trance', path: ['Music', 'Trance (Raw / Deep / Hypnotic)', 'Hypnotic Trance'], parent: 'BP-TRANCE-RAW-00' },
    
    // Trap / Future Bass (CORRECTED: Added Baile Funk subgenre)
    'BP-TRAP-00': { name: 'Trap / Future Bass', xmlNotation: 'Trap / Future Bass', path: ['Music', 'Trap / Future Bass'], parent: null },
    'BP-TRAP-TRAP': { name: 'Trap', xmlNotation: 'Trap / Future Bass | Trap', path: ['Music', 'Trap / Future Bass', 'Trap'], parent: 'BP-TRAP-00' },
    'BP-TRAP-BAILE': { name: 'Baile Funk', xmlNotation: 'Trap / Future Bass | Baile Funk', path: ['Music', 'Trap / Future Bass', 'Baile Funk'], parent: 'BP-TRAP-00' },
    
    // UK Garage / Bassline
    'BP-UK-GARAGE-00': { name: 'UK Garage / Bassline', xmlNotation: 'UK Garage / Bassline', path: ['Music', 'UK Garage / Bassline'], parent: null },
    'BP-UK-GARAGE-UK': { name: 'UK Garage', xmlNotation: 'UK Garage / Bassline | UK Garage', path: ['Music', 'UK Garage / Bassline', 'UK Garage'], parent: 'BP-UK-GARAGE-00' },
    'BP-UK-GARAGE-BASSLINE': { name: 'Bassline', xmlNotation: 'UK Garage / Bassline | Bassline', path: ['Music', 'UK Garage / Bassline', 'Bassline'], parent: 'BP-UK-GARAGE-00' }
  },
  
  // Hierarchical structure for UI
  tree: {
    '140 / Deep Dubstep / Grime': {
      code: 'BP-140-00',
      children: {
        'Grime': { code: 'BP-140-GRIME' }
      }
    },
    'Afro House': {
      code: 'BP-AFRO-HOUSE-00',
      children: {
        'Afro / Latin': { code: 'BP-AFRO-HOUSE-LATIN' },
        'Afro Melodic': { code: 'BP-AFRO-HOUSE-MELODIC' },
        '3Step': { code: 'BP-AFRO-HOUSE-3STEP' }
      }
    },
    'Amapiano': {
      code: 'BP-AMAPIANO-00',
      children: {
        'Gqom': { code: 'BP-AMAPIANO-GQOM' }
      }
    },
    'Ambient / Experimental': { code: 'BP-AMBIENT-00', children: {} },
    'Bass / Club': {
      code: 'BP-BASS-CLUB-00',
      editorial: true,
      children: {
        'UK Funky': { code: 'BP-BASS-CLUB-UK-FUNKY', editorial: true },
        'Global Club': { code: 'BP-BASS-CLUB-GLOBAL', editorial: true },
        'Jersey Club': { code: 'BP-BASS-CLUB-JERSEY', editorial: true },
        'Juke / Footwork': { code: 'BP-BASS-CLUB-JUKE', editorial: true },
        'Reggae / Dancehall': { code: 'BP-BASS-CLUB-REGGAE', editorial: true }
      }
    },
    'Bass House': { code: 'BP-BASS-HOUSE-00', children: {} },
    'Breaks / Breakbeat / UK Bass': {
      code: 'BP-BREAKS-00',
      children: {
        'Glitch Hop': { code: 'BP-BREAKS-GLITCH' }
      }
    },
    'Brazilian Funk': {
      code: 'BP-BRAZILIAN-FUNK-00',
      children: {
        'Carioca Funk': { code: 'BP-BRAZILIAN-FUNK-CARIOCA' },
        'Mandelao Funk': { code: 'BP-BRAZILIAN-FUNK-MANDELAO' },
        'BH Funk': { code: 'BP-BRAZILIAN-FUNK-BH' },
        'Melodic Funk': { code: 'BP-BRAZILIAN-FUNK-MELODIC' }
      }
    },
    'Dance / Pop': {
      code: 'BP-DANCE-POP-00',
      children: {
        'Afro Pop': { code: 'BP-DANCE-POP-AFRO' },
        'Pop': { code: 'BP-DANCE-POP-POP' },
        'Tropical House': { code: 'BP-DANCE-POP-TROPICAL' }
      }
    },
    'Deep House': { code: 'BP-DEEP-HOUSE-00', children: {} },
    'DJ Tools': {
      code: 'BP-DJ-TOOLS-00',
      children: {
        'Loops': { code: 'BP-DJ-TOOLS-LOOPS' },
        'Acapellas': { code: 'BP-DJ-TOOLS-ACAPELLAS' },
        'Battle Tools': { code: 'BP-DJ-TOOLS-BATTLE' }
      }
    },
    'Downtempo': { code: 'BP-DOWNTEMPO-00', children: {} },
    'Drum & Bass': {
      code: 'BP-DRUM-BASS-00',
      children: {
        'Liquid': { code: 'BP-DRUM-BASS-LIQUID' },
        'Jump Up': { code: 'BP-DRUM-BASS-JUMP' },
        'Jungle': { code: 'BP-DRUM-BASS-JUNGLE' },
        'Deep': { code: 'BP-DRUM-BASS-DEEP' },
        'Halftime': { code: 'BP-DRUM-BASS-HALFTIME' }
      }
    },
    'Dubstep': {
      code: 'BP-DUBSTEP-00',
      children: {
        'Melodic Dubstep': { code: 'BP-DUBSTEP-MELODIC' },
        'Midtempo': { code: 'BP-DUBSTEP-MIDTEMPO' }
      }
    },
    'Electro (Classic / Detroit / Modern)': { code: 'BP-ELECTRO-00', children: {} },
    'Electronica': { code: 'BP-ELECTRONICA-00', children: {} },
    'Funky House': { code: 'BP-FUNKY-HOUSE-00', children: {} },
    'Hard Dance / Hardcore / Neo Rave': {
      code: 'BP-HARD-DANCE-00',
      children: {
        'Hardstyle': { code: 'BP-HARD-DANCE-HARDSTYLE' },
        'Hard House': { code: 'BP-HARD-DANCE-HARD-HOUSE' },
        'Uptempo': { code: 'BP-HARD-DANCE-UPTEMPO' },
        'Terror': { code: 'BP-HARD-DANCE-TERROR' },
        'UK / Happy Hardcore': { code: 'BP-HARD-DANCE-UK-HARDCORE' },
        'Frenchcore': { code: 'BP-HARD-DANCE-FRENCHCORE' },
        'Neo Rave': { code: 'BP-HARD-DANCE-NEO-RAVE' }
      }
    },
    'Hard Techno': { code: 'BP-HARD-TECHNO-00', children: {} },
    'House': {
      code: 'BP-HOUSE-00',
      children: {
        'Acid': { code: 'BP-HOUSE-ACID' },
        'Soulful': { code: 'BP-HOUSE-SOULFUL' }
      }
    },
    'Indie Dance': {
      code: 'BP-INDIE-DANCE-00',
      children: {
        'Dark Disco': { code: 'BP-INDIE-DANCE-DARK' }
      }
    },
    'Jackin House': { code: 'BP-JACKIN-HOUSE-00', children: {} },
    'Mainstage': {
      code: 'BP-MAINSTAGE-00',
      children: {
        'Big Room': { code: 'BP-MAINSTAGE-BIG-ROOM' },
        'Electro House': { code: 'BP-MAINSTAGE-ELECTRO' },
        'Future House': { code: 'BP-MAINSTAGE-FUTURE' },
        'Speed House': { code: 'BP-MAINSTAGE-SPEED' },
        'Future Rave': { code: 'BP-MAINSTAGE-FUTURE-RAVE' }
      }
    },
    'Melodic House & Techno': {
      code: 'BP-MELODIC-00',
      children: {
        'Melodic House': { code: 'BP-MELODIC-HOUSE' },
        'Melodic Techno': { code: 'BP-MELODIC-TECHNO' }
      }
    },
    'Minimal / Deep Tech': {
      code: 'BP-MINIMAL-00',
      children: {
        'Bounce': { code: 'BP-MINIMAL-BOUNCE' },
        'Deep Tech': { code: 'BP-MINIMAL-DEEP' }
      }
    },
    'Nu Disco / Disco': {
      code: 'BP-NU-DISCO-00',
      children: {
        'Funk / Soul': { code: 'BP-NU-DISCO-FUNK' },
        'Italo': { code: 'BP-NU-DISCO-ITALO' }
      }
    },
    'Organic House': { code: 'BP-ORGANIC-HOUSE-00', children: {} },
    'Progressive House': { code: 'BP-PROGRESSIVE-HOUSE-00', children: {} },
    'Psy-Trance': {
      code: 'BP-PSY-TRANCE-00',
      children: {
        'Full-On': { code: 'BP-PSY-TRANCE-FULL-ON' },
        'Progressive Psy': { code: 'BP-PSY-TRANCE-PROGRESSIVE' },
        'Psychedelic': { code: 'BP-PSY-TRANCE-PSYCHEDELIC' },
        'Dark & Forest': { code: 'BP-PSY-TRANCE-DARK' },
        'Goa Trance': { code: 'BP-PSY-TRANCE-GOA' },
        'Psycore & Hi-Tech': { code: 'BP-PSY-TRANCE-PSYCORE' }
      }
    },
    'Tech House': {
      code: 'BP-TECH-HOUSE-00',
      children: {
        'Latin Tech': { code: 'BP-TECH-HOUSE-LATIN' }
      }
    },
    'Techno (Peak Time / Driving)': {
      code: 'BP-TECHNO-PEAK-00',
      children: {
        'Driving': { code: 'BP-TECHNO-DRIVING' },
        'Peak Time': { code: 'BP-TECHNO-PEAK-TIME' }
      }
    },
    'Techno (Raw / Deep / Hypnotic)': {
      code: 'BP-TECHNO-RAW-00',
      children: {
        'Broken': { code: 'BP-TECHNO-RAW-BROKEN' },
        'Deep / Hypnotic': { code: 'BP-TECHNO-RAW-DEEP' },
        'Dub': { code: 'BP-TECHNO-RAW-DUB' },
        'EBM': { code: 'BP-TECHNO-RAW-EBM' },
        'Raw': { code: 'BP-TECHNO-RAW-RAW' }
      }
    },
    'Trance (Main Floor)': {
      code: 'BP-TRANCE-MAIN-00',
      children: {
        'Progressive Trance': { code: 'BP-TRANCE-MAIN-PROGRESSIVE' },
        'Tech Trance': { code: 'BP-TRANCE-MAIN-TECH' },
        'Uplifting Trance': { code: 'BP-TRANCE-MAIN-UPLIFTING' },
        'Vocal Trance': { code: 'BP-TRANCE-MAIN-VOCAL' },
        'Hard Trance': { code: 'BP-TRANCE-MAIN-HARD' }
      }
    },
    'Trance (Raw / Deep / Hypnotic)': {
      code: 'BP-TRANCE-RAW-00',
      children: {
        'Raw Trance': { code: 'BP-TRANCE-RAW-RAW' },
        'Deep Trance': { code: 'BP-TRANCE-RAW-DEEP' },
        'Hypnotic Trance': { code: 'BP-TRANCE-RAW-HYPNOTIC' }
      }
    },
    'Trap / Future Bass': {
      code: 'BP-TRAP-00',
      children: {
        'Trap': { code: 'BP-TRAP-TRAP' },
        'Baile Funk': { code: 'BP-TRAP-BAILE' }
      }
    },
    'UK Garage / Bassline': {
      code: 'BP-UK-GARAGE-00',
      children: {
        'UK Garage': { code: 'BP-UK-GARAGE-UK' },
        'Bassline': { code: 'BP-UK-GARAGE-BASSLINE' }
      }
    }
  }
}

// Helper function to get genre by code
export function getGenreByCode(code) {
  return BEATPORT_GENRES.byCode[code] || null
}

// Helper function to get genre path as string
export function getGenrePath(code) {
  const genre = getGenreByCode(code)
  return genre ? genre.path.join(' > ') : ''
}

// Helper function to get XML notation
export function getXmlNotation(code) {
  const genre = getGenreByCode(code)
  return genre ? genre.xmlNotation : null
}

// Helper function to search genres
export function searchGenres(query) {
  const lowerQuery = query.toLowerCase()
  return Object.entries(BEATPORT_GENRES.byCode)
    .filter(([code, genre]) => 
      genre.name.toLowerCase().includes(lowerQuery) ||
      code.toLowerCase().includes(lowerQuery) ||
      (genre.xmlNotation && genre.xmlNotation.toLowerCase().includes(lowerQuery))
    )
    .map(([code, genre]) => ({ code, ...genre }))
}

// Helper function to check if genre is editorial only
export function isEditorialOnly(code) {
  const genre = getGenreByCode(code)
  return genre ? !!genre.editorial : false
}

export default BEATPORT_GENRES