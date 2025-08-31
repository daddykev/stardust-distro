// src/dictionaries/genres/genre-truth.js
/**
 * Genre Truth (v1.0)
 * Based on Apple Music Spec 5.3.9 (frozen as our canonical source)
 * 
 * This serves as our permanent genre taxonomy that maps to all DSPs.
 * When Apple releases new specs, they become DSP-specific maps like any other platform.
 */

export const GENRE_TRUTH = {
  version: '1.0.0',
  sourceSpec: 'Apple Music 5.3.9',
  lastUpdated: '2025-08-24',
  
  // Root genre map for quick lookup by code
  byCode: {
    'AFRICA-00': { name: 'African', path: ['Music', 'African'], parent: null },
    'AFRICAN-DANCEHALL-00': { name: 'African Dancehall', path: ['Music', 'African', 'African Dancehall'], parent: 'AFRICA-00' },
    'AFRICAN-REGGAE-00': { name: 'African Reggae', path: ['Music', 'African', 'African Reggae'], parent: 'AFRICA-00' },
    'AFRIKAANS-00': { name: 'Afrikaans', path: ['Music', 'African', 'Afrikaans'], parent: 'AFRICA-00' },
    'AFRO-HOUSE-00': { name: 'Afro House', path: ['Music', 'African', 'Afro House'], parent: 'AFRICA-00' },
    'AFRO-SOUL-00': { name: 'Afro Soul', path: ['Music', 'African', 'Afro Soul'], parent: 'AFRICA-00' },
    'AFRO-BEAT-00': { name: 'Afro-Beat', path: ['Music', 'African', 'Afro-Beat'], parent: 'AFRICA-00' },
    'AFRO-FOLK-00': { name: 'Afro-folk', path: ['Music', 'African', 'Afro-folk'], parent: 'AFRICA-00' },
    'AFRO-FUSION-00': { name: 'Afro-fusion', path: ['Music', 'African', 'Afro-fusion'], parent: 'AFRICA-00' },
    'AFRO-POP-00': { name: 'Afro-Pop', path: ['Music', 'African', 'Afro-Pop'], parent: 'AFRICA-00' },
    'AFROBEATS-00': { name: 'Afrobeats', path: ['Music', 'African', 'Afrobeats'], parent: 'AFRICA-00' },
    'ALTE-00': { name: 'Alte', path: ['Music', 'African', 'Alte'], parent: 'AFRICA-00' },
    'AMAPIANO-00': { name: 'Amapiano', path: ['Music', 'African', 'Amapiano'], parent: 'AFRICA-00' },
    
    'ALTERNATIVE-00': { name: 'Alternative', path: ['Music', 'Alternative'], parent: null },
    'CHINESE-ALT-00': { name: 'Chinese Alt', path: ['Music', 'Alternative', 'Chinese Alt'], parent: 'ALTERNATIVE-00' },
    'COLLEGE-ROCK-00': { name: 'College Rock', path: ['Music', 'Alternative', 'College Rock'], parent: 'ALTERNATIVE-00' },
    'EMO-00': { name: 'EMO', path: ['Music', 'Alternative', 'EMO'], parent: 'ALTERNATIVE-00' },
    'GOTH-ROCK-00': { name: 'Goth Rock', path: ['Music', 'Alternative', 'Goth Rock'], parent: 'ALTERNATIVE-00' },
    'GRUNGE-00': { name: 'Grunge', path: ['Music', 'Alternative', 'Grunge'], parent: 'ALTERNATIVE-00' },
    'INDIE-POP-00': { name: 'Indie Pop', path: ['Music', 'Alternative', 'Indie Pop'], parent: 'ALTERNATIVE-00' },
    'INDIE-ROCK-00': { name: 'Indie Rock', path: ['Music', 'Alternative', 'Indie Rock'], parent: 'ALTERNATIVE-00' },
    'NEW-WAVE-00': { name: 'New Wave', path: ['Music', 'Alternative', 'New Wave'], parent: 'ALTERNATIVE-00' },
    'PUNK-00': { name: 'Punk', path: ['Music', 'Alternative', 'Punk'], parent: 'ALTERNATIVE-00' },
    
    'BLUES-00': { name: 'Blues', path: ['Music', 'Blues'], parent: null },
    'ACOUSTIC-BLUES-00': { name: 'Acoustic Blues', path: ['Music', 'Blues', 'Acoustic Blues'], parent: 'BLUES-00' },
    'CHICAGO-BLUES-00': { name: 'Chicago Blues', path: ['Music', 'Blues', 'Chicago Blues'], parent: 'BLUES-00' },
    'CLASSIC-BLUES-00': { name: 'Classic Blues', path: ['Music', 'Blues', 'Classic Blues'], parent: 'BLUES-00' },
    'CONTEMPORARY-BLUES-00': { name: 'Contemporary Blues', path: ['Music', 'Blues', 'Contemporary Blues'], parent: 'BLUES-00' },
    'COUNTRY-BLUES-00': { name: 'Country Blues', path: ['Music', 'Blues', 'Country Blues'], parent: 'BLUES-00' },
    'DELTA-BLUES-00': { name: 'Delta Blues', path: ['Music', 'Blues', 'Delta Blues'], parent: 'BLUES-00' },
    'ELECTRIC-BLUES-00': { name: 'Electric Blues', path: ['Music', 'Blues', 'Electric Blues'], parent: 'BLUES-00' },
    
    'CLASSICAL-00': { name: 'Classical', path: ['Music', 'Classical'], parent: null },
    'ART-SONG-00': { name: 'Art Song', path: ['Music', 'Classical', 'Art Song'], parent: 'CLASSICAL-00' },
    'AVANT-GARDE-00': { name: 'Avant-Garde', path: ['Music', 'Classical', 'Avant-Garde'], parent: 'CLASSICAL-00' },
    'BAROQUE-00': { name: 'Baroque Era', path: ['Music', 'Classical', 'Baroque Era'], parent: 'CLASSICAL-00' },
    'CHAMBER-MUSIC-00': { name: 'Chamber Music', path: ['Music', 'Classical', 'Chamber Music'], parent: 'CLASSICAL-00' },
    'CHORAL-00': { name: 'Choral', path: ['Music', 'Classical', 'Choral'], parent: 'CLASSICAL-00' },
    'CLASSICAL-CROSSOVER-00': { name: 'Classical Crossover', path: ['Music', 'Classical', 'Classical Crossover'], parent: 'CLASSICAL-00' },
    'OPERA-00': { name: 'Opera', path: ['Music', 'Classical', 'Opera'], parent: 'CLASSICAL-00' },
    'ORCHESTRAL-00': { name: 'Orchestral', path: ['Music', 'Classical', 'Orchestral'], parent: 'CLASSICAL-00' },
    
    'COUNTRY-00': { name: 'Country', path: ['Music', 'Country'], parent: null },
    'ALTERNATIVE-COUNTRY-00': { name: 'Alternative Country', path: ['Music', 'Country', 'Alternative Country'], parent: 'COUNTRY-00' },
    'AMERICANA-00': { name: 'Americana', path: ['Music', 'Country', 'Americana'], parent: 'COUNTRY-00' },
    'BLUEGRASS-00': { name: 'Bluegrass', path: ['Music', 'Country', 'Bluegrass'], parent: 'COUNTRY-00' },
    'CONTEMPORARY-COUNTRY-00': { name: 'Contemporary Country', path: ['Music', 'Country', 'Contemporary Country'], parent: 'COUNTRY-00' },
    'COUNTRY-GOSPEL-00': { name: 'Country Gospel', path: ['Music', 'Country', 'Country Gospel'], parent: 'COUNTRY-00' },
    'HONKY-TONK-00': { name: 'Honky Tonk', path: ['Music', 'Country', 'Honky Tonk'], parent: 'COUNTRY-00' },
    'OUTLAW-COUNTRY-00': { name: 'Outlaw Country', path: ['Music', 'Country', 'Outlaw Country'], parent: 'COUNTRY-00' },
    'TRADITIONAL-COUNTRY-00': { name: 'Traditional Country', path: ['Music', 'Country', 'Traditional Country'], parent: 'COUNTRY-00' },
    
    'DANCE-00': { name: 'Dance', path: ['Music', 'Dance'], parent: null },
    'BREAKBEAT-00': { name: 'Breakbeat', path: ['Music', 'Dance', 'Breakbeat'], parent: 'DANCE-00' },
    'GARAGE-00': { name: 'Garage', path: ['Music', 'Dance', 'Garage'], parent: 'DANCE-00' },
    'HARDCORE-00': { name: 'Hardcore', path: ['Music', 'Dance', 'Hardcore'], parent: 'DANCE-00' },
    'HOUSE-00': { name: 'House', path: ['Music', 'Dance', 'House'], parent: 'DANCE-00' },
    'JUNGLE-DRUM-N-BASS-00': { name: 'Jungle/Drum\'n\'bass', path: ['Music', 'Dance', 'Jungle/Drum\'n\'bass'], parent: 'DANCE-00' },
    'TECHNO-00': { name: 'Techno', path: ['Music', 'Dance', 'Techno'], parent: 'DANCE-00' },
    'TRANCE-00': { name: 'Trance', path: ['Music', 'Dance', 'Trance'], parent: 'DANCE-00' },
    
    'ELECTRONIC-00': { name: 'Electronic', path: ['Music', 'Electronic'], parent: null },
    'AMBIENT-00': { name: 'Ambient', path: ['Music', 'Electronic', 'Ambient'], parent: 'ELECTRONIC-00' },
    'BASS-00': { name: 'Bass', path: ['Music', 'Electronic', 'Bass'], parent: 'ELECTRONIC-00' },
    'DOWNTEMPO-00': { name: 'Downtempo', path: ['Music', 'Electronic', 'Downtempo'], parent: 'ELECTRONIC-00' },
    'DUBSTEP-00': { name: 'Dubstep', path: ['Music', 'Electronic', 'Dubstep'], parent: 'ELECTRONIC-00' },
    'ELECTRONICA-00': { name: 'Electronica', path: ['Music', 'Electronic', 'Electronica'], parent: 'ELECTRONIC-00' },
    'IDM-EXPERIMENTAL-00': { name: 'IDM/Experimental', path: ['Music', 'Electronic', 'IDM/Experimental'], parent: 'ELECTRONIC-00' },
    'INDUSTRIAL-00': { name: 'Industrial', path: ['Music', 'Electronic', 'Industrial'], parent: 'ELECTRONIC-00' },
    
    'HIP-HOP-RAP-00': { name: 'Hip Hop/Rap', path: ['Music', 'Hip Hop/Rap'], parent: null },
    'ALTERNATIVE-RAP-00': { name: 'Alternative Rap', path: ['Music', 'Hip Hop/Rap', 'Alternative Rap'], parent: 'HIP-HOP-RAP-00' },
    'DIRTY-SOUTH-00': { name: 'Dirty South', path: ['Music', 'Hip Hop/Rap', 'Dirty South'], parent: 'HIP-HOP-RAP-00' },
    'EAST-COAST-RAP-00': { name: 'East Coast Rap', path: ['Music', 'Hip Hop/Rap', 'East Coast Rap'], parent: 'HIP-HOP-RAP-00' },
    'GANGSTA-RAP-00': { name: 'Gangsta Rap', path: ['Music', 'Hip Hop/Rap', 'Gangsta Rap'], parent: 'HIP-HOP-RAP-00' },
    'HARDCORE-RAP-00': { name: 'Hardcore Rap', path: ['Music', 'Hip Hop/Rap', 'Hardcore Rap'], parent: 'HIP-HOP-RAP-00' },
    'HIP-HOP-00': { name: 'Hip-Hop', path: ['Music', 'Hip Hop/Rap', 'Hip-Hop'], parent: 'HIP-HOP-RAP-00' },
    'OLD-SCHOOL-RAP-00': { name: 'Old School Rap', path: ['Music', 'Hip Hop/Rap', 'Old School Rap'], parent: 'HIP-HOP-RAP-00' },
    'RAP-00': { name: 'Rap', path: ['Music', 'Hip Hop/Rap', 'Rap'], parent: 'HIP-HOP-RAP-00' },
    'UNDERGROUND-RAP-00': { name: 'Underground Rap', path: ['Music', 'Hip Hop/Rap', 'Underground Rap'], parent: 'HIP-HOP-RAP-00' },
    'WEST-COAST-RAP-00': { name: 'West Coast Rap', path: ['Music', 'Hip Hop/Rap', 'West Coast Rap'], parent: 'HIP-HOP-RAP-00' },
    
    'JAZZ-00': { name: 'Jazz', path: ['Music', 'Jazz'], parent: null },
    'AVANT-GARDE-JAZZ-00': { name: 'Avant-Garde Jazz', path: ['Music', 'Jazz', 'Avant-Garde Jazz'], parent: 'JAZZ-00' },
    'BEBOP-00': { name: 'Bebop', path: ['Music', 'Jazz', 'Bebop'], parent: 'JAZZ-00' },
    'BIG-BAND-00': { name: 'Big Band', path: ['Music', 'Jazz', 'Big Band'], parent: 'JAZZ-00' },
    'CONTEMPORARY-JAZZ-00': { name: 'Contemporary Jazz', path: ['Music', 'Jazz', 'Contemporary Jazz'], parent: 'JAZZ-00' },
    'COOL-00': { name: 'Cool Jazz', path: ['Music', 'Jazz', 'Cool Jazz'], parent: 'JAZZ-00' },
    'CROSSOVER-JAZZ-00': { name: 'Crossover Jazz', path: ['Music', 'Jazz', 'Crossover Jazz'], parent: 'JAZZ-00' },
    'DIXIELAND-00': { name: 'Dixieland', path: ['Music', 'Jazz', 'Dixieland'], parent: 'JAZZ-00' },
    'FUSION-00': { name: 'Fusion', path: ['Music', 'Jazz', 'Fusion'], parent: 'JAZZ-00' },
    'HARD-BOP-00': { name: 'Hard Bop', path: ['Music', 'Jazz', 'Hard Bop'], parent: 'JAZZ-00' },
    'LATIN-JAZZ-00': { name: 'Latin Jazz', path: ['Music', 'Jazz', 'Latin Jazz'], parent: 'JAZZ-00' },
    'MAINSTREAM-JAZZ-00': { name: 'Mainstream Jazz', path: ['Music', 'Jazz', 'Mainstream Jazz'], parent: 'JAZZ-00' },
    'RAGTIME-00': { name: 'Ragtime', path: ['Music', 'Jazz', 'Ragtime'], parent: 'JAZZ-00' },
    'SMOOTH-JAZZ-00': { name: 'Smooth Jazz', path: ['Music', 'Jazz', 'Smooth Jazz'], parent: 'JAZZ-00' },
    'TRAD-JAZZ-00': { name: 'Trad Jazz', path: ['Music', 'Jazz', 'Trad Jazz'], parent: 'JAZZ-00' },
    'VOCAL-JAZZ-00': { name: 'Vocal Jazz', path: ['Music', 'Jazz', 'Vocal Jazz'], parent: 'JAZZ-00' },
    
    'LATIN-00': { name: 'Latin', path: ['Music', 'Latin'], parent: null },
    'ALTERNATIVO-ROCK-LATINO-00': { name: 'Alternative & Rock in Spanish', path: ['Music', 'Latin', 'Alternative & Rock in Spanish'], parent: 'LATIN-00' },
    'BALADAS-Y-BOLEROS-00': { name: 'Baladas y Boleros', path: ['Music', 'Latin', 'Baladas y Boleros'], parent: 'LATIN-00' },
    'CONTEMPORARY-LATIN-00': { name: 'Contemporary Latin', path: ['Music', 'Latin', 'Contemporary Latin'], parent: 'LATIN-00' },
    'LATIN-JAZZ-01': { name: 'Latin Jazz', path: ['Music', 'Latin', 'Latin Jazz'], parent: 'LATIN-00' },
    'REGGAETON-Y-HIP-HOP-00': { name: 'Latin Urban', path: ['Music', 'Latin', 'Latin Urban'], parent: 'LATIN-00' },
    'POP-LATINO-00': { name: 'Pop in Spanish', path: ['Music', 'Latin', 'Pop in Spanish'], parent: 'LATIN-00' },
    'RAICES-00': { name: 'Raices', path: ['Music', 'Latin', 'Raices'], parent: 'LATIN-00' },
    'REGIONAL-MEXICANO-00': { name: 'Regional Mexicano', path: ['Music', 'Latin', 'Regional Mexicano'], parent: 'LATIN-00' },
    'SALSA-Y-TROPICAL-00': { name: 'Salsa y Tropical', path: ['Music', 'Latin', 'Salsa y Tropical'], parent: 'LATIN-00' },
    
    'POP-00': { name: 'Pop', path: ['Music', 'Pop'], parent: null },
    'ADULT-CONTEMPORARY-00': { name: 'Adult Contemporary', path: ['Music', 'Pop', 'Adult Contemporary'], parent: 'POP-00' },
    'BRITPOP-00': { name: 'Britpop', path: ['Music', 'Pop', 'Britpop'], parent: 'POP-00' },
    'K-POP-00': { name: 'K-Pop', path: ['Music', 'Pop', 'K-Pop'], parent: 'POP-00' },
    'OLDIES-00': { name: 'Oldies', path: ['Music', 'Pop', 'Oldies'], parent: 'POP-00' },
    'POP-ROCK-00': { name: 'Pop/Rock', path: ['Music', 'Pop', 'Pop/Rock'], parent: 'POP-00' },
    'SOFT-ROCK-00': { name: 'Soft Rock', path: ['Music', 'Pop', 'Soft Rock'], parent: 'POP-00' },
    'TEEN-POP-00': { name: 'Teen Pop', path: ['Music', 'Pop', 'Teen Pop'], parent: 'POP-00' },
    
    'R-B-SOUL-00': { name: 'R&B/Soul', path: ['Music', 'R&B/Soul'], parent: null },
    'CONTEMPORARY-R-B-00': { name: 'Contemporary R&B', path: ['Music', 'R&B/Soul', 'Contemporary R&B'], parent: 'R-B-SOUL-00' },
    'DISCO-00': { name: 'Disco', path: ['Music', 'R&B/Soul', 'Disco'], parent: 'R-B-SOUL-00' },
    'DOO-WOP-00': { name: 'Doo Wop', path: ['Music', 'R&B/Soul', 'Doo Wop'], parent: 'R-B-SOUL-00' },
    'FUNK-00': { name: 'Funk', path: ['Music', 'R&B/Soul', 'Funk'], parent: 'R-B-SOUL-00' },
    'MOTOWN-00': { name: 'Motown', path: ['Music', 'R&B/Soul', 'Motown'], parent: 'R-B-SOUL-00' },
    'NEO-SOUL-00': { name: 'Neo-Soul', path: ['Music', 'R&B/Soul', 'Neo-Soul'], parent: 'R-B-SOUL-00' },
    'SOUL-00': { name: 'Soul', path: ['Music', 'R&B/Soul', 'Soul'], parent: 'R-B-SOUL-00' },
    
    'REGGAE-00': { name: 'Reggae', path: ['Music', 'Reggae'], parent: null },
    'DUB-00': { name: 'Dub', path: ['Music', 'Reggae', 'Dub'], parent: 'REGGAE-00' },
    'LOVERS-ROCK-00': { name: 'Lovers Rock', path: ['Music', 'Reggae', 'Lovers Rock'], parent: 'REGGAE-00' },
    'DANCEHALL-00': { name: 'Modern Dancehall', path: ['Music', 'Reggae', 'Modern Dancehall'], parent: 'REGGAE-00' },
    'ROOTS-REGGAE-00': { name: 'Roots Reggae', path: ['Music', 'Reggae', 'Roots Reggae'], parent: 'REGGAE-00' },
    'SKA-00': { name: 'Ska', path: ['Music', 'Reggae', 'Ska'], parent: 'REGGAE-00' },
    
    'ROCK-00': { name: 'Rock', path: ['Music', 'Rock'], parent: null },
    'ADULT-ALTERNATIVE-00': { name: 'Adult Alternative', path: ['Music', 'Rock', 'Adult Alternative'], parent: 'ROCK-00' },
    'AMERICAN-TRAD-ROCK-00': { name: 'American Trad Rock', path: ['Music', 'Rock', 'American Trad Rock'], parent: 'ROCK-00' },
    'ARENA-ROCK-00': { name: 'Arena Rock', path: ['Music', 'Rock', 'Arena Rock'], parent: 'ROCK-00' },
    'BLUES-ROCK-00': { name: 'Blues-Rock', path: ['Music', 'Rock', 'Blues-Rock'], parent: 'ROCK-00' },
    'BRITISH-INVASION-00': { name: 'British Invasion', path: ['Music', 'Rock', 'British Invasion'], parent: 'ROCK-00' },
    'DEATH-METAL-BLACK-METAL-00': { name: 'Death Metal/Black Metal', path: ['Music', 'Rock', 'Death Metal/Black Metal'], parent: 'ROCK-00' },
    'GLAM-ROCK-00': { name: 'Glam Rock', path: ['Music', 'Rock', 'Glam Rock'], parent: 'ROCK-00' },
    'HAIR-METAL-00': { name: 'Hair Metal', path: ['Music', 'Rock', 'Hair Metal'], parent: 'ROCK-00' },
    'HARD-ROCK-00': { name: 'Hard Rock', path: ['Music', 'Rock', 'Hard Rock'], parent: 'ROCK-00' },
    'HEAVY-METAL-00': { name: 'Heavy Metal', path: ['Music', 'Rock', 'Heavy Metal'], parent: 'ROCK-00' },
    'JAM-BANDS-00': { name: 'Jam Bands', path: ['Music', 'Rock', 'Jam Bands'], parent: 'ROCK-00' },
    'PROG-ROCK-ART-ROCK-00': { name: 'Prog-Rock/Art Rock', path: ['Music', 'Rock', 'Prog-Rock/Art Rock'], parent: 'ROCK-00' },
    'PSYCHEDELIC-00': { name: 'Psychedelic', path: ['Music', 'Rock', 'Psychedelic'], parent: 'ROCK-00' },
    'ROCK-ROLL-00': { name: 'Rock & Roll', path: ['Music', 'Rock', 'Rock & Roll'], parent: 'ROCK-00' },
    'ROCKABILLY-00': { name: 'Rockabilly', path: ['Music', 'Rock', 'Rockabilly'], parent: 'ROCK-00' },
    'ROOTS-ROCK-00': { name: 'Roots Rock', path: ['Music', 'Rock', 'Roots Rock'], parent: 'ROCK-00' },
    'SINGER-SONGWRITER-01': { name: 'Singer/Songwriter', path: ['Music', 'Rock', 'Singer/Songwriter'], parent: 'ROCK-00' },
    'SOUTHERN-ROCK-00': { name: 'Southern Rock', path: ['Music', 'Rock', 'Southern Rock'], parent: 'ROCK-00' },
    'SURF-00': { name: 'Surf', path: ['Music', 'Rock', 'Surf'], parent: 'ROCK-00' },
    'TEX-MEX-00': { name: 'Tex-Mex', path: ['Music', 'Rock', 'Tex-Mex'], parent: 'ROCK-00' },
    
    'SINGER-SONGWRITER-00': { name: 'Singer/Songwriter', path: ['Music', 'Singer/Songwriter'], parent: null },
    'ALTERNATIVE-FOLK-00': { name: 'Alternative Folk', path: ['Music', 'Singer/Songwriter', 'Alternative Folk'], parent: 'SINGER-SONGWRITER-00' },
    'CONTEMPORARY-FOLK-00': { name: 'Contemporary Folk', path: ['Music', 'Singer/Songwriter', 'Contemporary Folk'], parent: 'SINGER-SONGWRITER-00' },
    'CONTEMPORARY-SINGER-SONGWRITER-00': { name: 'Contemporary Singer/Songwriter', path: ['Music', 'Singer/Songwriter', 'Contemporary Singer/Songwriter'], parent: 'SINGER-SONGWRITER-00' },
    'FOLK-ROCK-00': { name: 'Folk-Rock', path: ['Music', 'Singer/Songwriter', 'Folk-Rock'], parent: 'SINGER-SONGWRITER-00' },
    'NEW-ACOUSTIC-00': { name: 'New Acoustic', path: ['Music', 'Singer/Songwriter', 'New Acoustic'], parent: 'SINGER-SONGWRITER-00' },
    'TRADITIONAL-FOLK-00': { name: 'Traditional Folk', path: ['Music', 'Singer/Songwriter', 'Traditional Folk'], parent: 'SINGER-SONGWRITER-00' },
    
    'SOUNDTRACK-00': { name: 'Soundtrack', path: ['Music', 'Soundtrack'], parent: null },
    'FOREIGN-CINEMA-00': { name: 'Foreign Cinema', path: ['Music', 'Soundtrack', 'Foreign Cinema'], parent: 'SOUNDTRACK-00' },
    'MUSICALS-00': { name: 'Musicals', path: ['Music', 'Soundtrack', 'Musicals'], parent: 'SOUNDTRACK-00' },
    'ORIGINAL-SCORE-00': { name: 'Original Score', path: ['Music', 'Soundtrack', 'Original Score'], parent: 'SOUNDTRACK-00' },
    'SOUND-EFFECT-00': { name: 'Sound Effects', path: ['Music', 'Soundtrack', 'Sound Effects'], parent: 'SOUNDTRACK-00' },
    'FILM-SOUNDTRACK-00': { name: 'Soundtrack', path: ['Music', 'Soundtrack', 'Soundtrack'], parent: 'SOUNDTRACK-00' },
    'TV-SOUNDTRACK-00': { name: 'TV Soundtrack', path: ['Music', 'Soundtrack', 'TV Soundtrack'], parent: 'SOUNDTRACK-00' },
    'VIDEOGAME-00': { name: 'Video Game', path: ['Music', 'Soundtrack', 'Video Game'], parent: 'SOUNDTRACK-00' },
    
    'WORLD-00': { name: 'Worldwide', path: ['Music', 'Worldwide'], parent: null },
    'ASIA-00': { name: 'Asia', path: ['Music', 'Worldwide', 'Asia'], parent: 'WORLD-00' },
    'AUSTRALIA-00': { name: 'Australia', path: ['Music', 'Worldwide', 'Australia'], parent: 'WORLD-00' },
    'CAJUN-00': { name: 'Cajun', path: ['Music', 'Worldwide', 'Cajun'], parent: 'WORLD-00' },
    'CALYPSO-00': { name: 'Calypso', path: ['Music', 'Worldwide', 'Calypso'], parent: 'WORLD-00' },
    'CARIBBEAN-00': { name: 'Caribbean', path: ['Music', 'Worldwide', 'Caribbean'], parent: 'WORLD-00' },
    'CELTIC-00': { name: 'Celtic', path: ['Music', 'Worldwide', 'Celtic'], parent: 'WORLD-00' },
    'CELTIC-FOLK-00': { name: 'Celtic Folk', path: ['Music', 'Worldwide', 'Celtic Folk'], parent: 'WORLD-00' },
    'CONTEMPORARY-CELTIC-00': { name: 'Contemporary Celtic', path: ['Music', 'Worldwide', 'Contemporary Celtic'], parent: 'WORLD-00' },
    'EUROPE-00': { name: 'Europe', path: ['Music', 'Worldwide', 'Europe'], parent: 'WORLD-00' },
    'FADO-00': { name: 'Fado', path: ['Music', 'Worldwide', 'Fado'], parent: 'WORLD-00' },
    'FLAMENCO-00': { name: 'Flamenco', path: ['Music', 'Worldwide', 'Flamenco'], parent: 'WORLD-00' },
    'FRANCE-00': { name: 'France', path: ['Music', 'Worldwide', 'France'], parent: 'WORLD-00' },
    'HAWAII-00': { name: 'Hawaii', path: ['Music', 'Worldwide', 'Hawaii'], parent: 'WORLD-00' },
    'IBERIA-00': { name: 'Iberia', path: ['Music', 'Worldwide', 'Iberia'], parent: 'WORLD-00' },
    'ISRAELI-00': { name: 'Israeli', path: ['Music', 'Worldwide', 'Israeli'], parent: 'WORLD-00' },
    'JAPAN-00': { name: 'Japan', path: ['Music', 'Worldwide', 'Japan'], parent: 'WORLD-00' },
    'NORTH-AMERICA-00': { name: 'North America', path: ['Music', 'Worldwide', 'North America'], parent: 'WORLD-00' },
    'POLKA-00': { name: 'Polka', path: ['Music', 'Worldwide', 'Polka'], parent: 'WORLD-00' },
    'SOCA-00': { name: 'Soca', path: ['Music', 'Worldwide', 'Soca'], parent: 'WORLD-00' },
    'SOUTH-AFRICA-00': { name: 'South Africa', path: ['Music', 'Worldwide', 'South Africa'], parent: 'WORLD-00' },
    'SOUTH-AMERICA-00': { name: 'South America', path: ['Music', 'Worldwide', 'South America'], parent: 'WORLD-00' },
    'TANGO-00': { name: 'Tango', path: ['Music', 'Worldwide', 'Tango'], parent: 'WORLD-00' },
    'TRADITIONAL-CELTIC-00': { name: 'Traditional Celtic', path: ['Music', 'Worldwide', 'Traditional Celtic'], parent: 'WORLD-00' },
    'WORLDBEAT-00': { name: 'Worldbeat', path: ['Music', 'Worldwide', 'Worldbeat'], parent: 'WORLD-00' },
    'ZYDECO-00': { name: 'Zydeco', path: ['Music', 'Worldwide', 'Zydeco'], parent: 'WORLD-00' },
    
    // Additional top-level genres
    'ANIME-00': { name: 'Anime', path: ['Music', 'Anime'], parent: null },
    'BRAZILIAN-00': { name: 'Brazilian', path: ['Music', 'Brazilian'], parent: null },
    'CHILDREN-MUSIC-00': { name: 'Children\'s Music', path: ['Music', 'Children\'s Music'], parent: null },
    'CHINESE-00': { name: 'Chinese', path: ['Music', 'Chinese'], parent: null },
    'CHRISTIAN-GOSPEL-00': { name: 'Christian & Gospel', path: ['Music', 'Christian & Gospel'], parent: null },
    'COMEDY-00': { name: 'Comedy', path: ['Music', 'Comedy'], parent: null },
    'CUBAN-00': { name: 'Cuban', path: ['Music', 'Cuban'], parent: null },
    'DISNEY-00': { name: 'Disney', path: ['Music', 'Disney'], parent: null },
    'EASY-LISTENING-00': { name: 'Easy Listening', path: ['Music', 'Easy Listening'], parent: null },
    'ENKA-00': { name: 'Enka', path: ['Music', 'Enka'], parent: null },
    'FITNESS-WORKOUT-00': { name: 'Fitness & Workout', path: ['Music', 'Fitness & Workout'], parent: null },
    'FOLK-00': { name: 'Folk', path: ['Music', 'Folk'], parent: null },
    'FRENCH-POP-00': { name: 'French Pop', path: ['Music', 'French Pop'], parent: null },
    'GERMAN-FOLK-00': { name: 'German Folk', path: ['Music', 'German Folk'], parent: null },
    'GERMAN-POP-00': { name: 'German Pop', path: ['Music', 'German Pop'], parent: null },
    'HOLIDAY-00': { name: 'Holiday', path: ['Music', 'Holiday'], parent: null },
    'INDIAN-00': { name: 'Indian', path: ['Music', 'Indian'], parent: null },
    'INSPIRATIONAL-00': { name: 'Inspirational', path: ['Music', 'Inspirational'], parent: null },
    'INSTRUMENTAL-00': { name: 'Instrumental', path: ['Music', 'Instrumental'], parent: null },
    'J-POP-00': { name: 'J-Pop', path: ['Music', 'J-Pop'], parent: null },
    'JEWISH-MUSIC-00': { name: 'Jewish', path: ['Music', 'Jewish'], parent: null },
    'KARAOKE-00': { name: 'Karaoke', path: ['Music', 'Karaoke'], parent: null },
    'KAYOKYOKU-00': { name: 'Kayokyoku', path: ['Music', 'Kayokyoku'], parent: null },
    'KOREAN-00': { name: 'Korean', path: ['Music', 'Korean'], parent: null },
    'MARCHING-BANDS-00': { name: 'Marching Bands', path: ['Music', 'Marching Bands'], parent: null },
    'MIDDLE-EAST-00': { name: 'Arabic', path: ['Music', 'Arabic'], parent: null },
    'NEW-AGE-00': { name: 'New Age', path: ['Music', 'New Age'], parent: null },
    'RUSSIAN-00': { name: 'Russian', path: ['Music', 'Russian'], parent: null },
    'SPOKEN-WORD-00': { name: 'Spoken Word', path: ['Music', 'Spoken Word'], parent: null },
    'TARAB-00': { name: 'Tarab', path: ['Music', 'Tarab'], parent: null },
    'TURKISH-00': { name: 'Turkish', path: ['Music', 'Turkish'], parent: null },
    'VOCAL-00': { name: 'Vocal', path: ['Music', 'Vocal'], parent: null }
  },
  
  // Hierarchical structure for UI
  tree: {
    'African': {
      code: 'AFRICA-00',
      children: {
        'African Dancehall': { code: 'AFRICAN-DANCEHALL-00' },
        'African Reggae': { code: 'AFRICAN-REGGAE-00' },
        'Afrikaans': { code: 'AFRIKAANS-00' },
        'Afro House': { code: 'AFRO-HOUSE-00' },
        'Afro Soul': { code: 'AFRO-SOUL-00' },
        'Afro-Beat': { code: 'AFRO-BEAT-00' },
        'Afro-folk': { code: 'AFRO-FOLK-00' },
        'Afro-fusion': { code: 'AFRO-FUSION-00' },
        'Afro-Pop': { code: 'AFRO-POP-00' },
        'Afrobeats': { code: 'AFROBEATS-00' },
        'Alte': { code: 'ALTE-00' },
        'Amapiano': { code: 'AMAPIANO-00' }
      }
    },
    'Alternative': {
      code: 'ALTERNATIVE-00',
      children: {
        'Chinese Alt': { code: 'CHINESE-ALT-00' },
        'College Rock': { code: 'COLLEGE-ROCK-00' },
        'EMO': { code: 'EMO-00' },
        'Goth Rock': { code: 'GOTH-ROCK-00' },
        'Grunge': { code: 'GRUNGE-00' },
        'Indie Pop': { code: 'INDIE-POP-00' },
        'Indie Rock': { code: 'INDIE-ROCK-00' },
        'New Wave': { code: 'NEW-WAVE-00' },
        'Punk': { code: 'PUNK-00' }
      }
    },
    'Blues': {
      code: 'BLUES-00',
      children: {
        'Acoustic Blues': { code: 'ACOUSTIC-BLUES-00' },
        'Chicago Blues': { code: 'CHICAGO-BLUES-00' },
        'Classic Blues': { code: 'CLASSIC-BLUES-00' },
        'Contemporary Blues': { code: 'CONTEMPORARY-BLUES-00' },
        'Country Blues': { code: 'COUNTRY-BLUES-00' },
        'Delta Blues': { code: 'DELTA-BLUES-00' },
        'Electric Blues': { code: 'ELECTRIC-BLUES-00' }
      }
    },
    'Classical': {
      code: 'CLASSICAL-00',
      children: {
        'Art Song': { code: 'ART-SONG-00' },
        'Avant-Garde': { code: 'AVANT-GARDE-00' },
        'Baroque Era': { code: 'BAROQUE-00' },
        'Chamber Music': { code: 'CHAMBER-MUSIC-00' },
        'Choral': { code: 'CHORAL-00' },
        'Classical Crossover': { code: 'CLASSICAL-CROSSOVER-00' },
        'Opera': { code: 'OPERA-00' },
        'Orchestral': { code: 'ORCHESTRAL-00' }
      }
    },
    'Country': {
      code: 'COUNTRY-00',
      children: {
        'Alternative Country': { code: 'ALTERNATIVE-COUNTRY-00' },
        'Americana': { code: 'AMERICANA-00' },
        'Bluegrass': { code: 'BLUEGRASS-00' },
        'Contemporary Country': { code: 'CONTEMPORARY-COUNTRY-00' },
        'Country Gospel': { code: 'COUNTRY-GOSPEL-00' },
        'Honky Tonk': { code: 'HONKY-TONK-00' },
        'Outlaw Country': { code: 'OUTLAW-COUNTRY-00' },
        'Traditional Country': { code: 'TRADITIONAL-COUNTRY-00' }
      }
    },
    'Dance': {
      code: 'DANCE-00',
      children: {
        'Breakbeat': { code: 'BREAKBEAT-00' },
        'Garage': { code: 'GARAGE-00' },
        'Hardcore': { code: 'HARDCORE-00' },
        'House': { code: 'HOUSE-00' },
        'Jungle/Drum\'n\'bass': { code: 'JUNGLE-DRUM-N-BASS-00' },
        'Techno': { code: 'TECHNO-00' },
        'Trance': { code: 'TRANCE-00' }
      }
    },
    'Electronic': {
      code: 'ELECTRONIC-00',
      children: {
        'Ambient': { code: 'AMBIENT-00' },
        'Bass': { code: 'BASS-00' },
        'Downtempo': { code: 'DOWNTEMPO-00' },
        'Dubstep': { code: 'DUBSTEP-00' },
        'Electronica': { code: 'ELECTRONICA-00' },
        'IDM/Experimental': { code: 'IDM-EXPERIMENTAL-00' },
        'Industrial': { code: 'INDUSTRIAL-00' }
      }
    },
    'Hip Hop/Rap': {
      code: 'HIP-HOP-RAP-00',
      children: {
        'Alternative Rap': { code: 'ALTERNATIVE-RAP-00' },
        'Dirty South': { code: 'DIRTY-SOUTH-00' },
        'East Coast Rap': { code: 'EAST-COAST-RAP-00' },
        'Gangsta Rap': { code: 'GANGSTA-RAP-00' },
        'Hardcore Rap': { code: 'HARDCORE-RAP-00' },
        'Hip-Hop': { code: 'HIP-HOP-00' },
        'Old School Rap': { code: 'OLD-SCHOOL-RAP-00' },
        'Rap': { code: 'RAP-00' },
        'Underground Rap': { code: 'UNDERGROUND-RAP-00' },
        'West Coast Rap': { code: 'WEST-COAST-RAP-00' }
      }
    },
    'Jazz': {
      code: 'JAZZ-00',
      children: {
        'Avant-Garde Jazz': { code: 'AVANT-GARDE-JAZZ-00' },
        'Bebop': { code: 'BEBOP-00' },
        'Big Band': { code: 'BIG-BAND-00' },
        'Contemporary Jazz': { code: 'CONTEMPORARY-JAZZ-00' },
        'Cool Jazz': { code: 'COOL-00' },
        'Crossover Jazz': { code: 'CROSSOVER-JAZZ-00' },
        'Dixieland': { code: 'DIXIELAND-00' },
        'Fusion': { code: 'FUSION-00' },
        'Hard Bop': { code: 'HARD-BOP-00' },
        'Latin Jazz': { code: 'LATIN-JAZZ-00' },
        'Mainstream Jazz': { code: 'MAINSTREAM-JAZZ-00' },
        'Ragtime': { code: 'RAGTIME-00' },
        'Smooth Jazz': { code: 'SMOOTH-JAZZ-00' },
        'Trad Jazz': { code: 'TRAD-JAZZ-00' },
        'Vocal Jazz': { code: 'VOCAL-JAZZ-00' }
      }
    },
    'Latin': {
      code: 'LATIN-00',
      children: {
        'Alternative & Rock in Spanish': { code: 'ALTERNATIVO-ROCK-LATINO-00' },
        'Baladas y Boleros': { code: 'BALADAS-Y-BOLEROS-00' },
        'Contemporary Latin': { code: 'CONTEMPORARY-LATIN-00' },
        'Latin Jazz': { code: 'LATIN-JAZZ-01' },
        'Latin Urban': { code: 'REGGAETON-Y-HIP-HOP-00' },
        'Pop in Spanish': { code: 'POP-LATINO-00' },
        'Raices': { code: 'RAICES-00' },
        'Regional Mexicano': { code: 'REGIONAL-MEXICANO-00' },
        'Salsa y Tropical': { code: 'SALSA-Y-TROPICAL-00' }
      }
    },
    'Pop': {
      code: 'POP-00',
      children: {
        'Adult Contemporary': { code: 'ADULT-CONTEMPORARY-00' },
        'Britpop': { code: 'BRITPOP-00' },
        'K-Pop': { code: 'K-POP-00' },
        'Oldies': { code: 'OLDIES-00' },
        'Pop/Rock': { code: 'POP-ROCK-00' },
        'Soft Rock': { code: 'SOFT-ROCK-00' },
        'Teen Pop': { code: 'TEEN-POP-00' }
      }
    },
    'R&B/Soul': {
      code: 'R-B-SOUL-00',
      children: {
        'Contemporary R&B': { code: 'CONTEMPORARY-R-B-00' },
        'Disco': { code: 'DISCO-00' },
        'Doo Wop': { code: 'DOO-WOP-00' },
        'Funk': { code: 'FUNK-00' },
        'Motown': { code: 'MOTOWN-00' },
        'Neo-Soul': { code: 'NEO-SOUL-00' },
        'Soul': { code: 'SOUL-00' }
      }
    },
    'Reggae': {
      code: 'REGGAE-00',
      children: {
        'Dub': { code: 'DUB-00' },
        'Lovers Rock': { code: 'LOVERS-ROCK-00' },
        'Modern Dancehall': { code: 'DANCEHALL-00' },
        'Roots Reggae': { code: 'ROOTS-REGGAE-00' },
        'Ska': { code: 'SKA-00' }
      }
    },
    'Rock': {
      code: 'ROCK-00',
      children: {
        'Adult Alternative': { code: 'ADULT-ALTERNATIVE-00' },
        'American Trad Rock': { code: 'AMERICAN-TRAD-ROCK-00' },
        'Arena Rock': { code: 'ARENA-ROCK-00' },
        'Blues-Rock': { code: 'BLUES-ROCK-00' },
        'British Invasion': { code: 'BRITISH-INVASION-00' },
        'Death Metal/Black Metal': { code: 'DEATH-METAL-BLACK-METAL-00' },
        'Glam Rock': { code: 'GLAM-ROCK-00' },
        'Hair Metal': { code: 'HAIR-METAL-00' },
        'Hard Rock': { code: 'HARD-ROCK-00' },
        'Heavy Metal': { code: 'HEAVY-METAL-00' },
        'Jam Bands': { code: 'JAM-BANDS-00' },
        'Prog-Rock/Art Rock': { code: 'PROG-ROCK-ART-ROCK-00' },
        'Psychedelic': { code: 'PSYCHEDELIC-00' },
        'Rock & Roll': { code: 'ROCK-ROLL-00' },
        'Rockabilly': { code: 'ROCKABILLY-00' },
        'Roots Rock': { code: 'ROOTS-ROCK-00' },
        'Singer/Songwriter': { code: 'SINGER-SONGWRITER-01' },
        'Southern Rock': { code: 'SOUTHERN-ROCK-00' },
        'Surf': { code: 'SURF-00' },
        'Tex-Mex': { code: 'TEX-MEX-00' }
      }
    },
    'Singer/Songwriter': {
      code: 'SINGER-SONGWRITER-00',
      children: {
        'Alternative Folk': { code: 'ALTERNATIVE-FOLK-00' },
        'Contemporary Folk': { code: 'CONTEMPORARY-FOLK-00' },
        'Contemporary Singer/Songwriter': { code: 'CONTEMPORARY-SINGER-SONGWRITER-00' },
        'Folk-Rock': { code: 'FOLK-ROCK-00' },
        'New Acoustic': { code: 'NEW-ACOUSTIC-00' },
        'Traditional Folk': { code: 'TRADITIONAL-FOLK-00' }
      }
    },
    'Soundtrack': {
      code: 'SOUNDTRACK-00',
      children: {
        'Foreign Cinema': { code: 'FOREIGN-CINEMA-00' },
        'Musicals': { code: 'MUSICALS-00' },
        'Original Score': { code: 'ORIGINAL-SCORE-00' },
        'Sound Effects': { code: 'SOUND-EFFECT-00' },
        'Soundtrack': { code: 'FILM-SOUNDTRACK-00' },
        'TV Soundtrack': { code: 'TV-SOUNDTRACK-00' },
        'Video Game': { code: 'VIDEOGAME-00' }
      }
    },
    'Worldwide': {
      code: 'WORLD-00',
      children: {
        'Asia': { code: 'ASIA-00' },
        'Australia': { code: 'AUSTRALIA-00' },
        'Cajun': { code: 'CAJUN-00' },
        'Calypso': { code: 'CALYPSO-00' },
        'Caribbean': { code: 'CARIBBEAN-00' },
        'Celtic': { code: 'CELTIC-00' },
        'Celtic Folk': { code: 'CELTIC-FOLK-00' },
        'Contemporary Celtic': { code: 'CONTEMPORARY-CELTIC-00' },
        'Europe': { code: 'EUROPE-00' },
        'Fado': { code: 'FADO-00' },
        'Flamenco': { code: 'FLAMENCO-00' },
        'France': { code: 'FRANCE-00' },
        'Hawaii': { code: 'HAWAII-00' },
        'Iberia': { code: 'IBERIA-00' },
        'Israeli': { code: 'ISRAELI-00' },
        'Japan': { code: 'JAPAN-00' },
        'North America': { code: 'NORTH-AMERICA-00' },
        'Polka': { code: 'POLKA-00' },
        'Soca': { code: 'SOCA-00' },
        'South Africa': { code: 'SOUTH-AFRICA-00' },
        'South America': { code: 'SOUTH-AMERICA-00' },
        'Tango': { code: 'TANGO-00' },
        'Traditional Celtic': { code: 'TRADITIONAL-CELTIC-00' },
        'Worldbeat': { code: 'WORLDBEAT-00' },
        'Zydeco': { code: 'ZYDECO-00' }
      }
    },
    // Additional top-level genres (no children)
    'Anime': { code: 'ANIME-00', children: {} },
    'Arabic': { code: 'MIDDLE-EAST-00', children: {} },
    'Brazilian': { code: 'BRAZILIAN-00', children: {} },
    'Children\'s Music': { code: 'CHILDREN-MUSIC-00', children: {} },
    'Chinese': { code: 'CHINESE-00', children: {} },
    'Christian & Gospel': { code: 'CHRISTIAN-GOSPEL-00', children: {} },
    'Comedy': { code: 'COMEDY-00', children: {} },
    'Cuban': { code: 'CUBAN-00', children: {} },
    'Disney': { code: 'DISNEY-00', children: {} },
    'Easy Listening': { code: 'EASY-LISTENING-00', children: {} },
    'Enka': { code: 'ENKA-00', children: {} },
    'Fitness & Workout': { code: 'FITNESS-WORKOUT-00', children: {} },
    'Folk': { code: 'FOLK-00', children: {} },
    'French Pop': { code: 'FRENCH-POP-00', children: {} },
    'German Folk': { code: 'GERMAN-FOLK-00', children: {} },
    'German Pop': { code: 'GERMAN-POP-00', children: {} },
    'Holiday': { code: 'HOLIDAY-00', children: {} },
    'Indian': { code: 'INDIAN-00', children: {} },
    'Inspirational': { code: 'INSPIRATIONAL-00', children: {} },
    'Instrumental': { code: 'INSTRUMENTAL-00', children: {} },
    'J-Pop': { code: 'J-POP-00', children: {} },
    'Jewish': { code: 'JEWISH-MUSIC-00', children: {} },
    'Karaoke': { code: 'KARAOKE-00', children: {} },
    'Kayokyoku': { code: 'KAYOKYOKU-00', children: {} },
    'Korean': { code: 'KOREAN-00', children: {} },
    'Marching Bands': { code: 'MARCHING-BANDS-00', children: {} },
    'New Age': { code: 'NEW-AGE-00', children: {} },
    'Russian': { code: 'RUSSIAN-00', children: {} },
    'Spoken Word': { code: 'SPOKEN-WORD-00', children: {} },
    'Tarab': { code: 'TARAB-00', children: {} },
    'Turkish': { code: 'TURKISH-00', children: {} },
    'Vocal': { code: 'VOCAL-00', children: {} }
  }
}

// Helper function to get genre by code
export function getGenreByCode(code) {
  return GENRE_TRUTH.byCode[code] || null
}

// Helper function to get genre path as string
export function getGenrePath(code) {
  const genre = getGenreByCode(code)
  return genre ? genre.path.join(' > ') : ''
}

// Helper function to search genres
export function searchGenres(query) {
  const lowerQuery = query.toLowerCase()
  return Object.entries(GENRE_TRUTH.byCode)
    .filter(([code, genre]) => 
      genre.name.toLowerCase().includes(lowerQuery) ||
      code.toLowerCase().includes(lowerQuery)
    )
    .map(([code, genre]) => ({ code, ...genre }))
}

// Helper function to get parent genres
export function getParentGenres() {
  return Object.entries(GENRE_TRUTH.tree)
    .map(([name, data]) => ({
      name,
      code: data.code,
      hasChildren: Object.keys(data.children || {}).length > 0
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Helper function to get subgenres for a parent
export function getSubgenres(parentCode) {
  const parentGenre = GENRE_TRUTH.byCode[parentCode]
  if (!parentGenre) return []
  
  // Find in tree structure
  for (const [name, data] of Object.entries(GENRE_TRUTH.tree)) {
    if (data.code === parentCode) {
      return Object.entries(data.children || {})
        .map(([childName, childData]) => ({
          name: childName,
          code: childData.code,
          parent: parentCode
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }
  }
  
  return []
}

export default GENRE_TRUTH