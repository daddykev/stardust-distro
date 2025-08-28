// src/dictionaries/genres/amazon-201805.js
/**
 * Amazon Music Genre Dictionary
 * Version: 2018-05
 * Created: 2018-05-08
 * 
 * Source: Amazon Music Genre Specification
 * Note: Ampersands (&) must be encoded as &amp; in XML feeds
 */

export const AMAZON_GENRES = {
  version: '2018-05',
  lastUpdated: '2018-05-08',
  
  // Root genre map for quick lookup by code
  byCode: {
    // ALTERNATIVE & INDIE
    'AM-ALTERNATIVE-00': { name: 'ALTERNATIVE & INDIE', xmlNotation: 'ALTERNATIVE &amp; INDIE', path: ['Music', 'ALTERNATIVE & INDIE'], parent: null },
    'AM-ALTERNATIVE-DANCE': { name: 'ALTERNATIVE DANCE', xmlNotation: 'ALTERNATIVE &amp; INDIE/ALTERNATIVE DANCE', path: ['Music', 'ALTERNATIVE & INDIE', 'ALTERNATIVE DANCE'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-AMERICAN': { name: 'AMERICAN ALTERNATIVE', xmlNotation: 'ALTERNATIVE &amp; INDIE/AMERICAN ALTERNATIVE', path: ['Music', 'ALTERNATIVE & INDIE', 'AMERICAN ALTERNATIVE'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-BRITISH': { name: 'BRITISH ALTERNATIVE', xmlNotation: 'ALTERNATIVE &amp; INDIE/BRITISH ALTERNATIVE', path: ['Music', 'ALTERNATIVE & INDIE', 'BRITISH ALTERNATIVE'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-EMO': { name: 'EMO', xmlNotation: 'ALTERNATIVE &amp; INDIE/EMO', path: ['Music', 'ALTERNATIVE & INDIE', 'EMO'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-EXPERIMENTAL': { name: 'EXPERIMENTAL ROCK', xmlNotation: 'ALTERNATIVE &amp; INDIE/EXPERIMENTAL ROCK', path: ['Music', 'ALTERNATIVE & INDIE', 'EXPERIMENTAL ROCK'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-GARAGE': { name: 'GARAGE ROCK', xmlNotation: 'ALTERNATIVE &amp; INDIE/GARAGE ROCK', path: ['Music', 'ALTERNATIVE & INDIE', 'GARAGE ROCK'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-GOTH': { name: 'GOTH & INDUSTRIAL', xmlNotation: 'ALTERNATIVE &amp; INDIE/GOTH &amp; INDUSTRIAL', path: ['Music', 'ALTERNATIVE & INDIE', 'GOTH & INDUSTRIAL'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-GRUNGE': { name: 'GRUNGE', xmlNotation: 'ALTERNATIVE &amp; INDIE/GRUNGE', path: ['Music', 'ALTERNATIVE & INDIE', 'GRUNGE'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-HARDCORE': { name: 'HARDCORE & PUNK', xmlNotation: 'ALTERNATIVE &amp; INDIE/HARDCORE &amp; PUNK', path: ['Music', 'ALTERNATIVE & INDIE', 'HARDCORE & PUNK'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-LOFI': { name: 'LO-FI', xmlNotation: 'ALTERNATIVE &amp; INDIE/LO-FI', path: ['Music', 'ALTERNATIVE & INDIE', 'LO-FI'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-NEWWAVE': { name: 'NEW WAVE & POST-PUNK', xmlNotation: 'ALTERNATIVE &amp; INDIE/NEW WAVE &amp; POST-PUNK', path: ['Music', 'ALTERNATIVE & INDIE', 'NEW WAVE & POST-PUNK'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-NOISE': { name: 'NOISE', xmlNotation: 'ALTERNATIVE &amp; INDIE/NOISE', path: ['Music', 'ALTERNATIVE & INDIE', 'NOISE'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-PSYCHEDELIC': { name: 'PSYCHEDELIC', xmlNotation: 'ALTERNATIVE &amp; INDIE/PSYCHEDELIC', path: ['Music', 'ALTERNATIVE & INDIE', 'PSYCHEDELIC'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-SHOEGAZE': { name: 'SHOEGAZE', xmlNotation: 'ALTERNATIVE &amp; INDIE/SHOEGAZE', path: ['Music', 'ALTERNATIVE & INDIE', 'SHOEGAZE'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-SINGER': { name: 'SINGER-SONGWRITERS', xmlNotation: 'ALTERNATIVE &amp; INDIE/SINGER-SONGWRITERS', path: ['Music', 'ALTERNATIVE & INDIE', 'SINGER-SONGWRITERS'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-SKA': { name: 'SKA', xmlNotation: 'ALTERNATIVE &amp; INDIE/SKA', path: ['Music', 'ALTERNATIVE & INDIE', 'SKA'], parent: 'AM-ALTERNATIVE-00' },
    'AM-ALTERNATIVE-SPACE': { name: 'SPACE ROCK', xmlNotation: 'ALTERNATIVE &amp; INDIE/SPACE ROCK', path: ['Music', 'ALTERNATIVE & INDIE', 'SPACE ROCK'], parent: 'AM-ALTERNATIVE-00' },
    
    // BLUES
    'AM-BLUES-00': { name: 'BLUES', xmlNotation: 'BLUES', path: ['Music', 'BLUES'], parent: null },
    'AM-BLUES-ACOUSTIC': { name: 'ACOUSTIC BLUES', xmlNotation: 'BLUES/ACOUSTIC BLUES', path: ['Music', 'BLUES', 'ACOUSTIC BLUES'], parent: 'AM-BLUES-00' },
    'AM-BLUES-CHICAGO': { name: 'CHICAGO BLUES', xmlNotation: 'BLUES/CHICAGO BLUES', path: ['Music', 'BLUES', 'CHICAGO BLUES'], parent: 'AM-BLUES-00' },
    'AM-BLUES-CLASSICAL-FEMALE': { name: 'CLASSICAL FEMALE VOCAL BLUES', xmlNotation: 'BLUES/CLASSICAL FEMALE VOCAL BLUES', path: ['Music', 'BLUES', 'CLASSICAL FEMALE VOCAL BLUES'], parent: 'AM-BLUES-00' },
    'AM-BLUES-CONTEMPORARY': { name: 'CONTEMPORARY BLUES', xmlNotation: 'BLUES/CONTEMPORARY BLUES', path: ['Music', 'BLUES', 'CONTEMPORARY BLUES'], parent: 'AM-BLUES-00' },
    'AM-BLUES-DELTA': { name: 'DELTA BLUES', xmlNotation: 'BLUES/DELTA BLUES', path: ['Music', 'BLUES', 'DELTA BLUES'], parent: 'AM-BLUES-00' },
    'AM-BLUES-ELECTRIC': { name: 'ELECTRIC BLUES GUITAR', xmlNotation: 'BLUES/ELECTRIC BLUES GUITAR', path: ['Music', 'BLUES', 'ELECTRIC BLUES GUITAR'], parent: 'AM-BLUES-00' },
    'AM-BLUES-JUMP': { name: 'JUMP BLUES', xmlNotation: 'BLUES/JUMP BLUES', path: ['Music', 'BLUES', 'JUMP BLUES'], parent: 'AM-BLUES-00' },
    'AM-BLUES-MODERN': { name: 'MODERN BLUES', xmlNotation: 'BLUES/MODERN BLUES', path: ['Music', 'BLUES', 'MODERN BLUES'], parent: 'AM-BLUES-00' },
    'AM-BLUES-PIANO': { name: 'PIANO BLUES', xmlNotation: 'BLUES/PIANO BLUES', path: ['Music', 'BLUES', 'PIANO BLUES'], parent: 'AM-BLUES-00' },
    'AM-BLUES-REGIONAL': { name: 'REGIONAL BLUES', xmlNotation: 'BLUES/REGIONAL BLUES', path: ['Music', 'BLUES', 'REGIONAL BLUES'], parent: 'AM-BLUES-00' },
    'AM-BLUES-TRADITIONAL': { name: 'TRADITIONAL BLUES', xmlNotation: 'BLUES/TRADITIONAL BLUES', path: ['Music', 'BLUES', 'TRADITIONAL BLUES'], parent: 'AM-BLUES-00' },
    
    // BROADWAY & VOCALISTS
    'AM-BROADWAY-00': { name: 'BROADWAY & VOCALISTS', xmlNotation: 'BROADWAY &amp; VOCALISTS', path: ['Music', 'BROADWAY & VOCALISTS'], parent: null },
    'AM-BROADWAY-CABARET': { name: 'CABARET', xmlNotation: 'BROADWAY &amp; VOCALISTS/CABARET', path: ['Music', 'BROADWAY & VOCALISTS', 'CABARET'], parent: 'AM-BROADWAY-00' },
    'AM-BROADWAY-CLASSIC': { name: 'CLASSIC VOCALISTS', xmlNotation: 'BROADWAY &amp; VOCALISTS/CLASSIC VOCALISTS', path: ['Music', 'BROADWAY & VOCALISTS', 'CLASSIC VOCALISTS'], parent: 'AM-BROADWAY-00' },
    'AM-BROADWAY-MUSICALS': { name: 'MUSICALS', xmlNotation: 'BROADWAY &amp; VOCALISTS/MUSICALS', path: ['Music', 'BROADWAY & VOCALISTS', 'MUSICALS'], parent: 'AM-BROADWAY-00' },
    'AM-BROADWAY-TRADITIONAL': { name: 'TRADITIONAL VOCAL POP', xmlNotation: 'BROADWAY &amp; VOCALISTS/TRADITIONAL VOCAL POP', path: ['Music', 'BROADWAY & VOCALISTS', 'TRADITIONAL VOCAL POP'], parent: 'AM-BROADWAY-00' },
    
    // CHILDREN'S MUSIC
    'AM-CHILDREN-00': { name: 'CHILDREN\'S MUSIC', xmlNotation: 'CHILDREN\'S MUSIC', path: ['Music', 'CHILDREN\'S MUSIC'], parent: null },
    'AM-CHILDREN-PRENATAL': { name: 'PRENATAL', xmlNotation: 'CHILDREN\'S MUSIC/PRENATAL', path: ['Music', 'CHILDREN\'S MUSIC', 'PRENATAL'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-TODDLER': { name: 'TODDLER', xmlNotation: 'CHILDREN\'S MUSIC/TODDLER', path: ['Music', 'CHILDREN\'S MUSIC', 'TODDLER'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-INFANT': { name: 'INFANT', xmlNotation: 'CHILDREN\'S MUSIC/INFANT', path: ['Music', 'CHILDREN\'S MUSIC', 'INFANT'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-ELEMENTARY': { name: 'ELEMENTARY SCHOOL AGE', xmlNotation: 'CHILDREN\'S MUSIC/ELEMENTARY SCHOOL AGE', path: ['Music', 'CHILDREN\'S MUSIC', 'ELEMENTARY SCHOOL AGE'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-TWEEN': { name: 'TWEEN', xmlNotation: 'CHILDREN\'S MUSIC/TWEEN', path: ['Music', 'CHILDREN\'S MUSIC', 'TWEEN'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-BABY-EINSTEIN': { name: 'BABY EINSTEIN', xmlNotation: 'CHILDREN\'S MUSIC/BABY EINSTEIN', path: ['Music', 'CHILDREN\'S MUSIC', 'BABY EINSTEIN'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-BARNEY': { name: 'BARNEY', xmlNotation: 'CHILDREN\'S MUSIC/BARNEY', path: ['Music', 'CHILDREN\'S MUSIC', 'BARNEY'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-CARTOON': { name: 'CARTOON MUSIC', xmlNotation: 'CHILDREN\'S MUSIC/CARTOON MUSIC', path: ['Music', 'CHILDREN\'S MUSIC', 'CARTOON MUSIC'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-DISNEY': { name: 'DISNEY', xmlNotation: 'CHILDREN\'S MUSIC/DISNEY', path: ['Music', 'CHILDREN\'S MUSIC', 'DISNEY'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-EDUCATIONAL': { name: 'EDUCATIONAL', xmlNotation: 'CHILDREN\'S MUSIC/EDUCATIONAL', path: ['Music', 'CHILDREN\'S MUSIC', 'EDUCATIONAL'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-FOLK': { name: 'FOLK', xmlNotation: 'CHILDREN\'S MUSIC/FOLK', path: ['Music', 'CHILDREN\'S MUSIC', 'FOLK'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-FRENCH': { name: 'FRENCH LANGUAGE', xmlNotation: 'CHILDREN\'S MUSIC/FRENCH LANGUAGE', path: ['Music', 'CHILDREN\'S MUSIC', 'FRENCH LANGUAGE'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-KIDZ-BOP': { name: 'KIDZ BOP', xmlNotation: 'CHILDREN\'S MUSIC/KIDZ BOP', path: ['Music', 'CHILDREN\'S MUSIC', 'KIDZ BOP'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-LULLABIES': { name: 'LULLABIES', xmlNotation: 'CHILDREN\'S MUSIC/LULLABIES', path: ['Music', 'CHILDREN\'S MUSIC', 'LULLABIES'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-LITTLE-PEOPLE': { name: 'MUSIC FOR LITTLE PEOPLE', xmlNotation: 'CHILDREN\'S MUSIC/MUSIC FOR LITTLE PEOPLE', path: ['Music', 'CHILDREN\'S MUSIC', 'MUSIC FOR LITTLE PEOPLE'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-POKEMON': { name: 'POKEMON', xmlNotation: 'CHILDREN\'S MUSIC/POKEMON', path: ['Music', 'CHILDREN\'S MUSIC', 'POKEMON'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-NURSERY': { name: 'NURSERY RHYMES', xmlNotation: 'CHILDREN\'S MUSIC/NURSERY RHYMES', path: ['Music', 'CHILDREN\'S MUSIC', 'NURSERY RHYMES'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-RELIGIOUS': { name: 'RELIGIOUS', xmlNotation: 'CHILDREN\'S MUSIC/RELIGIOUS', path: ['Music', 'CHILDREN\'S MUSIC', 'RELIGIOUS'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-SESAME': { name: 'SESAME STREET', xmlNotation: 'CHILDREN\'S MUSIC/SESAME STREET', path: ['Music', 'CHILDREN\'S MUSIC', 'SESAME STREET'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-SING': { name: 'SING-A-LONG', xmlNotation: 'CHILDREN\'S MUSIC/SING-A-LONG', path: ['Music', 'CHILDREN\'S MUSIC', 'SING-A-LONG'], parent: 'AM-CHILDREN-00' },
    'AM-CHILDREN-SPANISH': { name: 'SPANISH LANGUAGE', xmlNotation: 'CHILDREN\'S MUSIC/SPANISH LANGUAGE', path: ['Music', 'CHILDREN\'S MUSIC', 'SPANISH LANGUAGE'], parent: 'AM-CHILDREN-00' },
    
    // CHRISTIAN
    'AM-CHRISTIAN-00': { name: 'CHRISTIAN', xmlNotation: 'CHRISTIAN', path: ['Music', 'CHRISTIAN'], parent: null },
    'AM-CHRISTIAN-ACCOMPANIMENT': { name: 'ACCOMPANIMENT', xmlNotation: 'CHRISTIAN/ACCOMPANIMENT', path: ['Music', 'CHRISTIAN', 'ACCOMPANIMENT'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-CHILDREN': { name: 'CHILDREN\'S', xmlNotation: 'CHRISTIAN/CHILDREN\'S', path: ['Music', 'CHRISTIAN', 'CHILDREN\'S'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-COMPILATIONS': { name: 'COMPILATIONS', xmlNotation: 'CHRISTIAN/COMPILATIONS', path: ['Music', 'CHRISTIAN', 'COMPILATIONS'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-COUNTRY': { name: 'COUNTRY & BLUEGRASS', xmlNotation: 'CHRISTIAN/COUNTRY &amp; BLUEGRASS', path: ['Music', 'CHRISTIAN', 'COUNTRY & BLUEGRASS'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-HARD': { name: 'HARD ROCK & METAL', xmlNotation: 'CHRISTIAN/HARD ROCK &amp; METAL', path: ['Music', 'CHRISTIAN', 'HARD ROCK & METAL'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-INSTRUMENTAL': { name: 'INSTRUMENTAL', xmlNotation: 'CHRISTIAN/INSTRUMENTAL', path: ['Music', 'CHRISTIAN', 'INSTRUMENTAL'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-LIVE': { name: 'LIVE RECORDINGS', xmlNotation: 'CHRISTIAN/LIVE RECORDINGS', path: ['Music', 'CHRISTIAN', 'LIVE RECORDINGS'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-POP': { name: 'POP & CONTEMPORARY', xmlNotation: 'CHRISTIAN/POP &amp; CONTEMPORARY', path: ['Music', 'CHRISTIAN', 'POP & CONTEMPORARY'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-PRAISE': { name: 'PRAISE & WORSHIP', xmlNotation: 'CHRISTIAN/PRAISE &amp; WORSHIP', path: ['Music', 'CHRISTIAN', 'PRAISE & WORSHIP'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-RAP': { name: 'RAP & HIP-HOP', xmlNotation: 'CHRISTIAN/RAP &amp; HIP-HOP', path: ['Music', 'CHRISTIAN', 'RAP & HIP-HOP'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-ROCK': { name: 'ROCK & ALTERNATIVE', xmlNotation: 'CHRISTIAN/ROCK &amp; ALTERNATIVE', path: ['Music', 'CHRISTIAN', 'ROCK & ALTERNATIVE'], parent: 'AM-CHRISTIAN-00' },
    'AM-CHRISTIAN-SOUTHERN': { name: 'SOUTHERN GOSPEL', xmlNotation: 'CHRISTIAN/SOUTHERN GOSPEL', path: ['Music', 'CHRISTIAN', 'SOUTHERN GOSPEL'], parent: 'AM-CHRISTIAN-00' },
    
    // CLASSIC ROCK
    'AM-CLASSIC-ROCK-00': { name: 'CLASSIC ROCK', xmlNotation: 'CLASSIC ROCK', path: ['Music', 'CLASSIC ROCK'], parent: null },
    'AM-CLASSIC-ROCK-1950S': { name: '1950S', xmlNotation: 'CLASSIC ROCK/1950S', path: ['Music', 'CLASSIC ROCK', '1950S'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-1960S': { name: '1960S', xmlNotation: 'CLASSIC ROCK/1960S', path: ['Music', 'CLASSIC ROCK', '1960S'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-1970S': { name: '1970S', xmlNotation: 'CLASSIC ROCK/1970S', path: ['Music', 'CLASSIC ROCK', '1970S'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-1980S': { name: '1980S', xmlNotation: 'CLASSIC ROCK/1980S', path: ['Music', 'CLASSIC ROCK', '1980S'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-1990S': { name: '1990S', xmlNotation: 'CLASSIC ROCK/1990S', path: ['Music', 'CLASSIC ROCK', '1990S'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-2000S': { name: '2000S', xmlNotation: 'CLASSIC ROCK/2000S', path: ['Music', 'CLASSIC ROCK', '2000S'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-AOR': { name: 'ALBUM-ORIENTED ROCK (AOR)', xmlNotation: 'CLASSIC ROCK/ALBUM-ORIENTED ROCK (AOR)', path: ['Music', 'CLASSIC ROCK', 'ALBUM-ORIENTED ROCK (AOR)'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-ARENA': { name: 'ARENA ROCK', xmlNotation: 'CLASSIC ROCK/ARENA ROCK', path: ['Music', 'CLASSIC ROCK', 'ARENA ROCK'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-BRITISH': { name: 'BRITISH INVASION', xmlNotation: 'CLASSIC ROCK/BRITISH INVASION', path: ['Music', 'CLASSIC ROCK', 'BRITISH INVASION'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-GLAM': { name: 'GLAM', xmlNotation: 'CLASSIC ROCK/GLAM', path: ['Music', 'CLASSIC ROCK', 'GLAM'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-PSYCHEDELIC': { name: 'PSYCHEDELIC ROCK', xmlNotation: 'CLASSIC ROCK/PSYCHEDELIC ROCK', path: ['Music', 'CLASSIC ROCK', 'PSYCHEDELIC ROCK'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-SOUTHERN': { name: 'SOUTHERN ROCK', xmlNotation: 'CLASSIC ROCK/SOUTHERN ROCK', path: ['Music', 'CLASSIC ROCK', 'SOUTHERN ROCK'], parent: 'AM-CLASSIC-ROCK-00' },
    'AM-CLASSIC-ROCK-SUPERGROUPS': { name: 'SUPERGROUPS', xmlNotation: 'CLASSIC ROCK/SUPERGROUPS', path: ['Music', 'CLASSIC ROCK', 'SUPERGROUPS'], parent: 'AM-CLASSIC-ROCK-00' },
    
    // CLASSICAL
    'AM-CLASSICAL-00': { name: 'CLASSICAL', xmlNotation: 'CLASSICAL', path: ['Music', 'CLASSICAL'], parent: null },
    'AM-CLASSICAL-EARLY': { name: 'EARLY MUSIC', xmlNotation: 'CLASSICAL/EARLY MUSIC', path: ['Music', 'CLASSICAL', 'EARLY MUSIC'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-RENAISSANCE': { name: 'RENAISSANCE (C. 1450-1600)', xmlNotation: 'CLASSICAL/RENAISSANCE (C. 1450-1600)', path: ['Music', 'CLASSICAL', 'RENAISSANCE (C. 1450-1600)'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-BAROQUE': { name: 'BAROQUE (C. 1600-1750)', xmlNotation: 'CLASSICAL/BAROQUE (C. 1600-1750)', path: ['Music', 'CLASSICAL', 'BAROQUE (C. 1600-1750)'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-CLASSICAL': { name: 'CLASSICAL (C. 1770-1830)', xmlNotation: 'CLASSICAL/CLASSICAL (C. 1770-1830)', path: ['Music', 'CLASSICAL', 'CLASSICAL (C. 1770-1830)'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-ROMANTIC': { name: 'ROMANTIC (C. 1820-1910)', xmlNotation: 'CLASSICAL/ROMANTIC (C. 1820-1910)', path: ['Music', 'CLASSICAL', 'ROMANTIC (C. 1820-1910)'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-MODERN': { name: 'MODERN & 21ST CENTURY', xmlNotation: 'CLASSICAL/MODERN &amp; 21ST CENTURY', path: ['Music', 'CLASSICAL', 'MODERN & 21ST CENTURY'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-ORCHESTRAL': { name: 'ORCHESTRAL', xmlNotation: 'CLASSICAL/ORCHESTRAL', path: ['Music', 'CLASSICAL', 'ORCHESTRAL'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-CHAMBER': { name: 'CHAMBER MUSIC', xmlNotation: 'CLASSICAL/CHAMBER MUSIC', path: ['Music', 'CLASSICAL', 'CHAMBER MUSIC'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-BRASS': { name: 'BRASS & WIND BANDS', xmlNotation: 'CLASSICAL/BRASS &amp; WIND BANDS', path: ['Music', 'CLASSICAL', 'BRASS & WIND BANDS'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-KEYBOARD': { name: 'KEYBOARD', xmlNotation: 'CLASSICAL/KEYBOARD', path: ['Music', 'CLASSICAL', 'KEYBOARD'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-CHILDREN': { name: 'CHILDREN\'S MUSIC', xmlNotation: 'CLASSICAL/CHILDREN\'S MUSIC', path: ['Music', 'CLASSICAL', 'CHILDREN\'S MUSIC'], parent: 'AM-CLASSICAL-00' },
    'AM-CLASSICAL-CROSSOVER': { name: 'CROSSOVER', xmlNotation: 'CLASSICAL/CROSSOVER', path: ['Music', 'CLASSICAL', 'CROSSOVER'], parent: 'AM-CLASSICAL-00' },
    
    // COMEDY
    'AM-COMEDY-00': { name: 'COMEDY', xmlNotation: 'COMEDY', path: ['Music', 'COMEDY'], parent: null },
    'AM-COMEDY-ALTERNATIVE': { name: 'ALTERNATIVE', xmlNotation: 'COMEDY/ALTERNATIVE', path: ['Music', 'COMEDY', 'ALTERNATIVE'], parent: 'AM-COMEDY-00' },
    'AM-COMEDY-IMPROVISATIONAL': { name: 'IMPROVISATIONAL', xmlNotation: 'COMEDY/IMPROVISATIONAL', path: ['Music', 'COMEDY', 'IMPROVISATIONAL'], parent: 'AM-COMEDY-00' },
    'AM-COMEDY-MOCKUMENTARY': { name: 'MOCKUMENTARY', xmlNotation: 'COMEDY/MOCKUMENTARY', path: ['Music', 'COMEDY', 'MOCKUMENTARY'], parent: 'AM-COMEDY-00' },
    'AM-COMEDY-MUSICAL': { name: 'MUSICAL', xmlNotation: 'COMEDY/MUSICAL', path: ['Music', 'COMEDY', 'MUSICAL'], parent: 'AM-COMEDY-00' },
    'AM-COMEDY-SATIRE': { name: 'SATIRE', xmlNotation: 'COMEDY/SATIRE', path: ['Music', 'COMEDY', 'SATIRE'], parent: 'AM-COMEDY-00' },
    'AM-COMEDY-SITCOMS': { name: 'SITCOMS', xmlNotation: 'COMEDY/SITCOMS', path: ['Music', 'COMEDY', 'SITCOMS'], parent: 'AM-COMEDY-00' },
    'AM-COMEDY-SKETCH': { name: 'SKETCH', xmlNotation: 'COMEDY/SKETCH', path: ['Music', 'COMEDY', 'SKETCH'], parent: 'AM-COMEDY-00' },
    'AM-COMEDY-STANDUP': { name: 'STAND-UP', xmlNotation: 'COMEDY/STAND-UP', path: ['Music', 'COMEDY', 'STAND-UP'], parent: 'AM-COMEDY-00' },
    'AM-COMEDY-TELEVISION': { name: 'TELEVISION SERIES', xmlNotation: 'COMEDY/TELEVISION SERIES', path: ['Music', 'COMEDY', 'TELEVISION SERIES'], parent: 'AM-COMEDY-00' },
    'AM-COMEDY-TROUPES': { name: 'COMEDY TROUPES', xmlNotation: 'COMEDY/COMEDY TROUPES', path: ['Music', 'COMEDY', 'COMEDY TROUPES'], parent: 'AM-COMEDY-00' },
    
    // COUNTRY
    'AM-COUNTRY-00': { name: 'COUNTRY', xmlNotation: 'COUNTRY', path: ['Music', 'COUNTRY'], parent: null },
    'AM-COUNTRY-ALT': { name: 'ALT-COUNTRY & AMERICANA', xmlNotation: 'COUNTRY/ALT-COUNTRY &amp; AMERICANA', path: ['Music', 'COUNTRY', 'ALT-COUNTRY & AMERICANA'], parent: 'AM-COUNTRY-00' },
    'AM-COUNTRY-BLUEGRASS': { name: 'BLUEGRASS', xmlNotation: 'COUNTRY/BLUEGRASS', path: ['Music', 'COUNTRY', 'BLUEGRASS'], parent: 'AM-COUNTRY-00' },
    'AM-COUNTRY-CONTEMPORARY': { name: 'CONTEMPORARY COUNTRY', xmlNotation: 'COUNTRY/CONTEMPORARY COUNTRY', path: ['Music', 'COUNTRY', 'CONTEMPORARY COUNTRY'], parent: 'AM-COUNTRY-00' },
    'AM-COUNTRY-GOSPEL': { name: 'COUNTRY GOSPEL', xmlNotation: 'COUNTRY/COUNTRY GOSPEL', path: ['Music', 'COUNTRY', 'COUNTRY GOSPEL'], parent: 'AM-COUNTRY-00' },
    'AM-COUNTRY-COWBOY': { name: 'COWBOY', xmlNotation: 'COUNTRY/COWBOY', path: ['Music', 'COUNTRY', 'COWBOY'], parent: 'AM-COUNTRY-00' },
    'AM-COUNTRY-HONKY': { name: 'HONKY-TONK', xmlNotation: 'COUNTRY/HONKY-TONK', path: ['Music', 'COUNTRY', 'HONKY-TONK'], parent: 'AM-COUNTRY-00' },
    'AM-COUNTRY-NEO': { name: 'NEO-TRADITIONAL COUNTRY', xmlNotation: 'COUNTRY/NEO-TRADITIONAL COUNTRY', path: ['Music', 'COUNTRY', 'NEO-TRADITIONAL COUNTRY'], parent: 'AM-COUNTRY-00' },
    'AM-COUNTRY-OLD': { name: 'OLD-TIMEY', xmlNotation: 'COUNTRY/OLD-TIMEY', path: ['Music', 'COUNTRY', 'OLD-TIMEY'], parent: 'AM-COUNTRY-00' },
    'AM-COUNTRY-OUTLAW': { name: 'OUTLAW & PROGRESSIVE COUNTRY', xmlNotation: 'COUNTRY/OUTLAW &amp; PROGRESSIVE COUNTRY', path: ['Music', 'COUNTRY', 'OUTLAW & PROGRESSIVE COUNTRY'], parent: 'AM-COUNTRY-00' },
    'AM-COUNTRY-TRADITIONAL': { name: 'TRADITIONAL COUNTRY', xmlNotation: 'COUNTRY/TRADITIONAL COUNTRY', path: ['Music', 'COUNTRY', 'TRADITIONAL COUNTRY'], parent: 'AM-COUNTRY-00' },
    'AM-COUNTRY-WESTERN': { name: 'WESTERN SWING', xmlNotation: 'COUNTRY/WESTERN SWING', path: ['Music', 'COUNTRY', 'WESTERN SWING'], parent: 'AM-COUNTRY-00' },
    
    // DANCE & ELECTRONIC
    'AM-DANCE-00': { name: 'DANCE & ELECTRONIC', xmlNotation: 'DANCE &amp; ELECTRONIC', path: ['Music', 'DANCE & ELECTRONIC'], parent: null },
    
    // DANCE & ELECTRONIC / HOUSE
    'AM-DANCE-HOUSE': { name: 'HOUSE', xmlNotation: 'DANCE &amp; ELECTRONIC/HOUSE', path: ['Music', 'DANCE & ELECTRONIC', 'HOUSE'], parent: 'AM-DANCE-00' },
    'AM-DANCE-HOUSE-VOCAL': { name: 'VOCAL HOUSE', xmlNotation: 'DANCE &amp; ELECTRONIC/HOUSE/VOCAL HOUSE', path: ['Music', 'DANCE & ELECTRONIC', 'HOUSE', 'VOCAL HOUSE'], parent: 'AM-DANCE-HOUSE' },
    'AM-DANCE-HOUSE-DISCO': { name: 'DISCO HOUSE', xmlNotation: 'DANCE &amp; ELECTRONIC/HOUSE/DISCO HOUSE', path: ['Music', 'DANCE & ELECTRONIC', 'HOUSE', 'DISCO HOUSE'], parent: 'AM-DANCE-HOUSE' },
    'AM-DANCE-HOUSE-PROGRESSIVE': { name: 'PROGRESSIVE HOUSE', xmlNotation: 'DANCE &amp; ELECTRONIC/HOUSE/PROGRESSIVE HOUSE', path: ['Music', 'DANCE & ELECTRONIC', 'HOUSE', 'PROGRESSIVE HOUSE'], parent: 'AM-DANCE-HOUSE' },
    'AM-DANCE-HOUSE-DEEP': { name: 'DEEP HOUSE', xmlNotation: 'DANCE &amp; ELECTRONIC/HOUSE/DEEP HOUSE', path: ['Music', 'DANCE & ELECTRONIC', 'HOUSE', 'DEEP HOUSE'], parent: 'AM-DANCE-HOUSE' },
    'AM-DANCE-HOUSE-TECH': { name: 'TECH HOUSE', xmlNotation: 'DANCE &amp; ELECTRONIC/HOUSE/TECH HOUSE', path: ['Music', 'DANCE & ELECTRONIC', 'HOUSE', 'TECH HOUSE'], parent: 'AM-DANCE-HOUSE' },
    'AM-DANCE-HOUSE-ELECTRO': { name: 'ELECTRO HOUSE', xmlNotation: 'DANCE &amp; ELECTRONIC/HOUSE/ELECTRO HOUSE', path: ['Music', 'DANCE & ELECTRONIC', 'HOUSE', 'ELECTRO HOUSE'], parent: 'AM-DANCE-HOUSE' },
    'AM-DANCE-HOUSE-HARD': { name: 'HARD HOUSE', xmlNotation: 'DANCE &amp; ELECTRONIC/HOUSE/HARD HOUSE', path: ['Music', 'DANCE & ELECTRONIC', 'HOUSE', 'HARD HOUSE'], parent: 'AM-DANCE-HOUSE' },
    
    // DANCE & ELECTRONIC / TECHNO
    'AM-DANCE-TECHNO': { name: 'TECHNO', xmlNotation: 'DANCE &amp; ELECTRONIC/TECHNO', path: ['Music', 'DANCE & ELECTRONIC', 'TECHNO'], parent: 'AM-DANCE-00' },
    'AM-DANCE-TECHNO-DETROIT': { name: 'DETROIT TECHNO', xmlNotation: 'DANCE &amp; ELECTRONIC/TECHNO/DETROIT TECHNO', path: ['Music', 'DANCE & ELECTRONIC', 'TECHNO', 'DETROIT TECHNO'], parent: 'AM-DANCE-TECHNO' },
    'AM-DANCE-TECHNO-MINIMAL': { name: 'MINIMAL TECHNO', xmlNotation: 'DANCE &amp; ELECTRONIC/TECHNO/MINIMAL TECHNO', path: ['Music', 'DANCE & ELECTRONIC', 'TECHNO', 'MINIMAL TECHNO'], parent: 'AM-DANCE-TECHNO' },
    'AM-DANCE-TECHNO-ACID': { name: 'ACID TECHNO', xmlNotation: 'DANCE &amp; ELECTRONIC/TECHNO/ACID TECHNO', path: ['Music', 'DANCE & ELECTRONIC', 'TECHNO', 'ACID TECHNO'], parent: 'AM-DANCE-TECHNO' },
    'AM-DANCE-TECHNO-HARDCORE': { name: 'HARDCORE', xmlNotation: 'DANCE &amp; ELECTRONIC/TECHNO/HARDCORE', path: ['Music', 'DANCE & ELECTRONIC', 'TECHNO', 'HARDCORE'], parent: 'AM-DANCE-TECHNO' },
    
    // DANCE & ELECTRONIC / TRANCE
    'AM-DANCE-TRANCE': { name: 'TRANCE', xmlNotation: 'DANCE &amp; ELECTRONIC/TRANCE', path: ['Music', 'DANCE & ELECTRONIC', 'TRANCE'], parent: 'AM-DANCE-00' },
    'AM-DANCE-TRANCE-GOA': { name: 'GOA & PSY-TRANCE', xmlNotation: 'DANCE &amp; ELECTRONIC/TRANCE/GOA &amp; PSY-TRANCE', path: ['Music', 'DANCE & ELECTRONIC', 'TRANCE', 'GOA & PSY-TRANCE'], parent: 'AM-DANCE-TRANCE' },
    'AM-DANCE-TRANCE-HARD': { name: 'HARD TRANCE', xmlNotation: 'DANCE &amp; ELECTRONIC/TRANCE/HARD TRANCE', path: ['Music', 'DANCE & ELECTRONIC', 'TRANCE', 'HARD TRANCE'], parent: 'AM-DANCE-TRANCE' },
    
    // DANCE & ELECTRONIC / DRUM & BASS
    'AM-DANCE-DRUM-BASS': { name: 'DRUM & BASS', xmlNotation: 'DANCE &amp; ELECTRONIC/DRUM &amp; BASS', path: ['Music', 'DANCE & ELECTRONIC', 'DRUM & BASS'], parent: 'AM-DANCE-00' },
    'AM-DANCE-DRUM-BASS-JUNGLE': { name: 'JUNGLE', xmlNotation: 'DANCE &amp; ELECTRONIC/DRUM &amp; BASS/JUNGLE', path: ['Music', 'DANCE & ELECTRONIC', 'DRUM & BASS', 'JUNGLE'], parent: 'AM-DANCE-DRUM-BASS' },
    'AM-DANCE-DRUM-BASS-LIQUID': { name: 'LIQUID', xmlNotation: 'DANCE &amp; ELECTRONIC/DRUM &amp; BASS/LIQUID', path: ['Music', 'DANCE & ELECTRONIC', 'DRUM & BASS', 'LIQUID'], parent: 'AM-DANCE-DRUM-BASS' },
    
    // DANCE & ELECTRONIC (direct children)
    'AM-DANCE-AMBIENT': { name: 'AMBIENT', xmlNotation: 'DANCE &amp; ELECTRONIC/AMBIENT', path: ['Music', 'DANCE & ELECTRONIC', 'AMBIENT'], parent: 'AM-DANCE-00' },
    'AM-DANCE-BREAKBEAT': { name: 'BREAKBEAT', xmlNotation: 'DANCE &amp; ELECTRONIC/BREAKBEAT', path: ['Music', 'DANCE & ELECTRONIC', 'BREAKBEAT'], parent: 'AM-DANCE-00' },
    'AM-DANCE-DOWNTEMPO': { name: 'DOWNTEMPO & TRIP-HOP', xmlNotation: 'DANCE &amp; ELECTRONIC/DOWNTEMPO &amp; TRIP-HOP', path: ['Music', 'DANCE & ELECTRONIC', 'DOWNTEMPO & TRIP-HOP'], parent: 'AM-DANCE-00' },
    'AM-DANCE-DUBSTEP': { name: 'DUBSTEP', xmlNotation: 'DANCE &amp; ELECTRONIC/DUBSTEP', path: ['Music', 'DANCE & ELECTRONIC', 'DUBSTEP'], parent: 'AM-DANCE-00' },
    'AM-DANCE-EUROBEAT': { name: 'EURO-BEAT', xmlNotation: 'DANCE &amp; ELECTRONIC/EURO-BEAT', path: ['Music', 'DANCE & ELECTRONIC', 'EURO-BEAT'], parent: 'AM-DANCE-00' },
    'AM-DANCE-EXPERIMENTAL': { name: 'EXPERIMENTAL', xmlNotation: 'DANCE &amp; ELECTRONIC/EXPERIMENTAL', path: ['Music', 'DANCE & ELECTRONIC', 'EXPERIMENTAL'], parent: 'AM-DANCE-00' },
    'AM-DANCE-NU-JAZZ': { name: 'NU-JAZZ', xmlNotation: 'DANCE &amp; ELECTRONIC/NU-JAZZ', path: ['Music', 'DANCE & ELECTRONIC', 'NU-JAZZ'], parent: 'AM-DANCE-00' },
    
    // DANCE & ELECTRONIC / UK GARAGE
    'AM-DANCE-UK-GARAGE': { name: 'UK GARAGE', xmlNotation: 'DANCE &amp; ELECTRONIC/UK GARAGE', path: ['Music', 'DANCE & ELECTRONIC', 'UK GARAGE'], parent: 'AM-DANCE-00' },
    'AM-DANCE-UK-GARAGE-GRIME': { name: 'GRIME', xmlNotation: 'DANCE &amp; ELECTRONIC/UK GARAGE/GRIME', path: ['Music', 'DANCE & ELECTRONIC', 'UK GARAGE', 'GRIME'], parent: 'AM-DANCE-UK-GARAGE' },
    
    // FOLK
    'AM-FOLK-00': { name: 'FOLK', xmlNotation: 'FOLK', path: ['Music', 'FOLK'], parent: null },
    'AM-FOLK-ALT': { name: 'ALT-FOLK', xmlNotation: 'FOLK/ALT-FOLK', path: ['Music', 'FOLK', 'ALT-FOLK'], parent: 'AM-FOLK-00' },
    'AM-FOLK-CELTIC': { name: 'CELTIC FOLK', xmlNotation: 'FOLK/CELTIC FOLK', path: ['Music', 'FOLK', 'CELTIC FOLK'], parent: 'AM-FOLK-00' },
    'AM-FOLK-CONTEMPORARY': { name: 'CONTEMPORARY FOLK', xmlNotation: 'FOLK/CONTEMPORARY FOLK', path: ['Music', 'FOLK', 'CONTEMPORARY FOLK'], parent: 'AM-FOLK-00' },
    'AM-FOLK-CONTEMPORARY-AMERICAN': { name: 'CONTEMPORARY AMERICAN FOLK', xmlNotation: 'FOLK/CONTEMPORARY AMERICAN FOLK', path: ['Music', 'FOLK', 'CONTEMPORARY AMERICAN FOLK'], parent: 'AM-FOLK-00' },
    'AM-FOLK-CONTEMPORARY-BRITISH': { name: 'CONTEMPORARY BRITISH FOLK', xmlNotation: 'FOLK/CONTEMPORARY BRITISH FOLK', path: ['Music', 'FOLK', 'CONTEMPORARY BRITISH FOLK'], parent: 'AM-FOLK-00' },
    'AM-FOLK-JEWISH': { name: 'JEWISH & YIDDISH MUSIC', xmlNotation: 'FOLK/JEWISH &amp; YIDDISH MUSIC', path: ['Music', 'FOLK', 'JEWISH & YIDDISH MUSIC'], parent: 'AM-FOLK-00' },
    'AM-FOLK-TRADITIONAL': { name: 'TRADITIONAL FOLK', xmlNotation: 'FOLK/TRADITIONAL FOLK', path: ['Music', 'FOLK', 'TRADITIONAL FOLK'], parent: 'AM-FOLK-00' },
    'AM-FOLK-TRADITIONAL-AMERICAN': { name: 'TRADITIONAL AMERICAN FOLK', xmlNotation: 'FOLK/TRADITIONAL AMERICAN FOLK', path: ['Music', 'FOLK', 'TRADITIONAL AMERICAN FOLK'], parent: 'AM-FOLK-00' },
    'AM-FOLK-TRADITIONAL-BRITISH': { name: 'TRADITIONAL BRITISH FOLK', xmlNotation: 'FOLK/TRADITIONAL BRITISH FOLK', path: ['Music', 'FOLK', 'TRADITIONAL BRITISH FOLK'], parent: 'AM-FOLK-00' },
    
    // GERMAN
    'AM-GERMAN-00': { name: 'GERMAN', xmlNotation: 'GERMAN', path: ['Music', 'GERMAN'], parent: null },
    'AM-GERMAN-HIP-HOP': { name: 'HIP-HOP', xmlNotation: 'GERMAN/HIP-HOP', path: ['Music', 'GERMAN', 'HIP-HOP'], parent: 'AM-GERMAN-00' },
    'AM-GERMAN-KRAUTROCK': { name: 'KRAUTROCK', xmlNotation: 'GERMAN/KRAUTROCK', path: ['Music', 'GERMAN', 'KRAUTROCK'], parent: 'AM-GERMAN-00' },
    'AM-GERMAN-LIEDERMACHER': { name: 'LIEDERMACHER', xmlNotation: 'GERMAN/LIEDERMACHER', path: ['Music', 'GERMAN', 'LIEDERMACHER'], parent: 'AM-GERMAN-00' },
    'AM-GERMAN-NEUE': { name: 'NEUE DEUTSCHE WELLE', xmlNotation: 'GERMAN/NEUE DEUTSCHE WELLE', path: ['Music', 'GERMAN', 'NEUE DEUTSCHE WELLE'], parent: 'AM-GERMAN-00' },
    'AM-GERMAN-POP': { name: 'POP', xmlNotation: 'GERMAN/POP', path: ['Music', 'GERMAN', 'POP'], parent: 'AM-GERMAN-00' },
    'AM-GERMAN-PUNK': { name: 'PUNK', xmlNotation: 'GERMAN/PUNK', path: ['Music', 'GERMAN', 'PUNK'], parent: 'AM-GERMAN-00' },
    'AM-GERMAN-ROCK': { name: 'ROCK', xmlNotation: 'GERMAN/ROCK', path: ['Music', 'GERMAN', 'ROCK'], parent: 'AM-GERMAN-00' },
    'AM-GERMAN-SCHLAGER': { name: 'SCHLAGER', xmlNotation: 'GERMAN/SCHLAGER', path: ['Music', 'GERMAN', 'SCHLAGER'], parent: 'AM-GERMAN-00' },
    'AM-GERMAN-VOLKSMUSIK': { name: 'VOLKSMUSIK', xmlNotation: 'GERMAN/VOLKSMUSIK', path: ['Music', 'GERMAN', 'VOLKSMUSIK'], parent: 'AM-GERMAN-00' },
    'AM-GERMAN-VOLKSTUMLICHE': { name: 'VOLKSTUMLICHE MUSIK', xmlNotation: 'GERMAN/VOLKSTUMLICHE MUSIK', path: ['Music', 'GERMAN', 'VOLKSTUMLICHE MUSIK'], parent: 'AM-GERMAN-00' },
    
    // GOSPEL
    'AM-GOSPEL-00': { name: 'GOSPEL', xmlNotation: 'GOSPEL', path: ['Music', 'GOSPEL'], parent: null },
    'AM-GOSPEL-ACCOMPANIMENT': { name: 'ACCOMPANIMENT', xmlNotation: 'GOSPEL/ACCOMPANIMENT', path: ['Music', 'GOSPEL', 'ACCOMPANIMENT'], parent: 'AM-GOSPEL-00' },
    'AM-GOSPEL-CHOIR': { name: 'CHOIR', xmlNotation: 'GOSPEL/CHOIR', path: ['Music', 'GOSPEL', 'CHOIR'], parent: 'AM-GOSPEL-00' },
    'AM-GOSPEL-COMPILATIONS': { name: 'COMPILATIONS', xmlNotation: 'GOSPEL/COMPILATIONS', path: ['Music', 'GOSPEL', 'COMPILATIONS'], parent: 'AM-GOSPEL-00' },
    'AM-GOSPEL-INSTRUMENTAL': { name: 'INSTRUMENTAL', xmlNotation: 'GOSPEL/INSTRUMENTAL', path: ['Music', 'GOSPEL', 'INSTRUMENTAL'], parent: 'AM-GOSPEL-00' },
    'AM-GOSPEL-RAP': { name: 'RAP & HIP-HOP', xmlNotation: 'GOSPEL/RAP &amp; HIP-HOP', path: ['Music', 'GOSPEL', 'RAP & HIP-HOP'], parent: 'AM-GOSPEL-00' },
    'AM-GOSPEL-TRADITIONAL': { name: 'TRADITIONAL', xmlNotation: 'GOSPEL/TRADITIONAL', path: ['Music', 'GOSPEL', 'TRADITIONAL'], parent: 'AM-GOSPEL-00' },
    'AM-GOSPEL-URBAN': { name: 'URBAN & CONTEMPORARY', xmlNotation: 'GOSPEL/URBAN &amp; CONTEMPORARY', path: ['Music', 'GOSPEL', 'URBAN & CONTEMPORARY'], parent: 'AM-GOSPEL-00' },
    
    // HARD ROCK & METAL
    'AM-HARD-ROCK-00': { name: 'HARD ROCK & METAL', xmlNotation: 'HARD ROCK &amp; METAL', path: ['Music', 'HARD ROCK & METAL'], parent: null },
    'AM-HARD-ROCK-ALTERNATIVE': { name: 'ALTERNATIVE METAL', xmlNotation: 'HARD ROCK &amp; METAL/ALTERNATIVE METAL', path: ['Music', 'HARD ROCK & METAL', 'ALTERNATIVE METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-BLACK': { name: 'BLACK METAL', xmlNotation: 'HARD ROCK &amp; METAL/BLACK METAL', path: ['Music', 'HARD ROCK & METAL', 'BLACK METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-DEATH': { name: 'DEATH METAL', xmlNotation: 'HARD ROCK &amp; METAL/DEATH METAL', path: ['Music', 'HARD ROCK & METAL', 'DEATH METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-DOOM': { name: 'DOOM METAL', xmlNotation: 'HARD ROCK &amp; METAL/DOOM METAL', path: ['Music', 'HARD ROCK & METAL', 'DOOM METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-GLAM': { name: 'GLAM METAL', xmlNotation: 'HARD ROCK &amp; METAL/GLAM METAL', path: ['Music', 'HARD ROCK & METAL', 'GLAM METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-GOTHIC': { name: 'GOTHIC METAL', xmlNotation: 'HARD ROCK &amp; METAL/GOTHIC METAL', path: ['Music', 'HARD ROCK & METAL', 'GOTHIC METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-GRINDCORE': { name: 'GRINDCORE', xmlNotation: 'HARD ROCK &amp; METAL/GRINDCORE', path: ['Music', 'HARD ROCK & METAL', 'GRINDCORE'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-GROOVE': { name: 'GROOVE METAL', xmlNotation: 'HARD ROCK &amp; METAL/GROOVE METAL', path: ['Music', 'HARD ROCK & METAL', 'GROOVE METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-HARD': { name: 'HARD ROCK', xmlNotation: 'HARD ROCK &amp; METAL/HARD ROCK', path: ['Music', 'HARD ROCK & METAL', 'HARD ROCK'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-HEAVY': { name: 'HEAVY METAL', xmlNotation: 'HARD ROCK &amp; METAL/HEAVY METAL', path: ['Music', 'HARD ROCK & METAL', 'HEAVY METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-METALCORE': { name: 'METALCORE', xmlNotation: 'HARD ROCK &amp; METAL/METALCORE', path: ['Music', 'HARD ROCK & METAL', 'METALCORE'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-POWER': { name: 'POWER & TRUE METAL', xmlNotation: 'HARD ROCK &amp; METAL/POWER &amp; TRUE METAL', path: ['Music', 'HARD ROCK & METAL', 'POWER & TRUE METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-PROGRESSIVE': { name: 'PROGRESSIVE METAL', xmlNotation: 'HARD ROCK &amp; METAL/PROGRESSIVE METAL', path: ['Music', 'HARD ROCK & METAL', 'PROGRESSIVE METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-RAP': { name: 'RAP & NU METAL', xmlNotation: 'HARD ROCK &amp; METAL/RAP &amp; NU METAL', path: ['Music', 'HARD ROCK & METAL', 'RAP & NU METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-SCREAMO': { name: 'SCREAMO', xmlNotation: 'HARD ROCK &amp; METAL/SCREAMO', path: ['Music', 'HARD ROCK & METAL', 'SCREAMO'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-SLUDGE': { name: 'SLUDGE METAL', xmlNotation: 'HARD ROCK &amp; METAL/SLUDGE METAL', path: ['Music', 'HARD ROCK & METAL', 'SLUDGE METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-STONER': { name: 'STONER METAL', xmlNotation: 'HARD ROCK &amp; METAL/STONER METAL', path: ['Music', 'HARD ROCK & METAL', 'STONER METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-SYMPHONIC': { name: 'SYMPHONIC METAL', xmlNotation: 'HARD ROCK &amp; METAL/SYMPHONIC METAL', path: ['Music', 'HARD ROCK & METAL', 'SYMPHONIC METAL'], parent: 'AM-HARD-ROCK-00' },
    'AM-HARD-ROCK-THRASH': { name: 'THRASH & SPEED METAL', xmlNotation: 'HARD ROCK &amp; METAL/THRASH &amp; SPEED METAL', path: ['Music', 'HARD ROCK & METAL', 'THRASH & SPEED METAL'], parent: 'AM-HARD-ROCK-00' },
    
    // HAWAIIAN
    'AM-HAWAIIAN-00': { name: 'HAWAIIAN', xmlNotation: 'HAWAIIAN', path: ['Music', 'HAWAIIAN'], parent: null },
    'AM-HAWAIIAN-CHANT': { name: 'CHANT', xmlNotation: 'HAWAIIAN/CHANT', path: ['Music', 'HAWAIIAN', 'CHANT'], parent: 'AM-HAWAIIAN-00' },
    'AM-HAWAIIAN-CONTEMPORARY': { name: 'CONTEMPORARY HAWAIIAN', xmlNotation: 'HAWAIIAN/CONTEMPORARY HAWAIIAN', path: ['Music', 'HAWAIIAN', 'CONTEMPORARY HAWAIIAN'], parent: 'AM-HAWAIIAN-00' },
    'AM-HAWAIIAN-UKULELE': { name: 'UKULELE', xmlNotation: 'HAWAIIAN/UKULELE', path: ['Music', 'HAWAIIAN', 'UKULELE'], parent: 'AM-HAWAIIAN-00' },
    'AM-HAWAIIAN-HULA': { name: 'HULA', xmlNotation: 'HAWAIIAN/HULA', path: ['Music', 'HAWAIIAN', 'HULA'], parent: 'AM-HAWAIIAN-00' },
    'AM-HAWAIIAN-JAWAIIAN': { name: 'JAWAIIAN', xmlNotation: 'HAWAIIAN/JAWAIIAN', path: ['Music', 'HAWAIIAN', 'JAWAIIAN'], parent: 'AM-HAWAIIAN-00' },
    'AM-HAWAIIAN-SLACK': { name: 'SLACK KEY', xmlNotation: 'HAWAIIAN/SLACK KEY', path: ['Music', 'HAWAIIAN', 'SLACK KEY'], parent: 'AM-HAWAIIAN-00' },
    
    // J-JAZZ
    'AM-J-JAZZ-00': { name: 'J-JAZZ', xmlNotation: 'J-JAZZ', path: ['Music', 'J-JAZZ'], parent: null },
    
    // J-POP
    'AM-J-POP-00': { name: 'J-POP', xmlNotation: 'J-POP', path: ['Music', 'J-POP'], parent: null },
    'AM-J-POP-ELECTRONICA': { name: 'ELECTRONICA', xmlNotation: 'J-POP/ELECTRONICA', path: ['Music', 'J-POP', 'ELECTRONICA'], parent: 'AM-J-POP-00' },
    'AM-J-POP-FOLK': { name: 'FOLK', xmlNotation: 'J-POP/FOLK', path: ['Music', 'J-POP', 'FOLK'], parent: 'AM-J-POP-00' },
    'AM-J-POP-HIP-HOP': { name: 'HIP-HOP', xmlNotation: 'J-POP/HIP-HOP', path: ['Music', 'J-POP', 'HIP-HOP'], parent: 'AM-J-POP-00' },
    'AM-J-POP-POP': { name: 'POP', xmlNotation: 'J-POP/POP', path: ['Music', 'J-POP', 'POP'], parent: 'AM-J-POP-00' },
    'AM-J-POP-PUNK': { name: 'PUNK & HARD CORE', xmlNotation: 'J-POP/PUNK &amp; HARD CORE', path: ['Music', 'J-POP', 'PUNK & HARD CORE'], parent: 'AM-J-POP-00' },
    'AM-J-POP-RB': { name: 'R&B', xmlNotation: 'J-POP/R&amp;B', path: ['Music', 'J-POP', 'R&B'], parent: 'AM-J-POP-00' },
    'AM-J-POP-REGGAE': { name: 'REGGAE', xmlNotation: 'J-POP/REGGAE', path: ['Music', 'J-POP', 'REGGAE'], parent: 'AM-J-POP-00' },
    'AM-J-POP-ROCK': { name: 'ROCK', xmlNotation: 'J-POP/ROCK', path: ['Music', 'J-POP', 'ROCK'], parent: 'AM-J-POP-00' },
    
    // JAPANESE BALLADS
    'AM-JAPANESE-BALLADS-00': { name: 'JAPANESE BALLADS', xmlNotation: 'JAPANESE BALLADS', path: ['Music', 'JAPANESE BALLADS'], parent: null },
    'AM-JAPANESE-BALLADS-ENKA': { name: 'ENKA', xmlNotation: 'JAPANESE BALLADS/ENKA', path: ['Music', 'JAPANESE BALLADS', 'ENKA'], parent: 'AM-JAPANESE-BALLADS-00' },
    'AM-JAPANESE-BALLADS-WAR': { name: 'JAPANESE WAR SONGS', xmlNotation: 'JAPANESE BALLADS/JAPANESE WAR SONGS', path: ['Music', 'JAPANESE BALLADS', 'JAPANESE WAR SONGS'], parent: 'AM-JAPANESE-BALLADS-00' },
    'AM-JAPANESE-BALLADS-KAYOKYOKU': { name: 'KAYOKYOKU', xmlNotation: 'JAPANESE BALLADS/KAYOKYOKU', path: ['Music', 'JAPANESE BALLADS', 'KAYOKYOKU'], parent: 'AM-JAPANESE-BALLADS-00' },
    
    // JAPANESE TRADITIONAL
    'AM-JAPANESE-TRADITIONAL-00': { name: 'JAPANESE TRADITIONAL', xmlNotation: 'JAPANESE TRADITIONAL', path: ['Music', 'JAPANESE TRADITIONAL'], parent: null },
    'AM-JAPANESE-TRADITIONAL-BUDDHIST': { name: 'BUDDHIST MUSIC', xmlNotation: 'JAPANESE TRADITIONAL/BUDDHIST MUSIC', path: ['Music', 'JAPANESE TRADITIONAL', 'BUDDHIST MUSIC'], parent: 'AM-JAPANESE-TRADITIONAL-00' },
    'AM-JAPANESE-TRADITIONAL-COMEDY': { name: 'COMEDY', xmlNotation: 'JAPANESE TRADITIONAL/COMEDY', path: ['Music', 'JAPANESE TRADITIONAL', 'COMEDY'], parent: 'AM-JAPANESE-TRADITIONAL-00' },
    'AM-JAPANESE-TRADITIONAL-FOLK': { name: 'FOLK SONGS', xmlNotation: 'JAPANESE TRADITIONAL/FOLK SONGS', path: ['Music', 'JAPANESE TRADITIONAL', 'FOLK SONGS'], parent: 'AM-JAPANESE-TRADITIONAL-00' },
    'AM-JAPANESE-TRADITIONAL-PERFORMING': { name: 'PERFORMING ARTS', xmlNotation: 'JAPANESE TRADITIONAL/PERFORMING ARTS', path: ['Music', 'JAPANESE TRADITIONAL', 'PERFORMING ARTS'], parent: 'AM-JAPANESE-TRADITIONAL-00' },
    'AM-JAPANESE-TRADITIONAL-RAKUGO': { name: 'RAKUGO', xmlNotation: 'JAPANESE TRADITIONAL/RAKUGO', path: ['Music', 'JAPANESE TRADITIONAL', 'RAKUGO'], parent: 'AM-JAPANESE-TRADITIONAL-00' },
    'AM-JAPANESE-TRADITIONAL-ROKYOKU': { name: 'ROKYOKU AND KOUDAN', xmlNotation: 'JAPANESE TRADITIONAL/ROKYOKU AND KOUDAN', path: ['Music', 'JAPANESE TRADITIONAL', 'ROKYOKU AND KOUDAN'], parent: 'AM-JAPANESE-TRADITIONAL-00' },
    
    // JAZZ
    'AM-JAZZ-00': { name: 'JAZZ', xmlNotation: 'JAZZ', path: ['Music', 'JAZZ'], parent: null },
    'AM-JAZZ-ACID': { name: 'ACID & SOUL JAZZ', xmlNotation: 'JAZZ/ACID &amp; SOUL JAZZ', path: ['Music', 'JAZZ', 'ACID & SOUL JAZZ'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-AVANT': { name: 'AVANT GARDE & FREE JAZZ', xmlNotation: 'JAZZ/AVANT GARDE &amp; FREE JAZZ', path: ['Music', 'JAZZ', 'AVANT GARDE & FREE JAZZ'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-BEBOP': { name: 'BEBOP', xmlNotation: 'JAZZ/BEBOP', path: ['Music', 'JAZZ', 'BEBOP'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-BRAZILIAN': { name: 'BRAZILIAN JAZZ', xmlNotation: 'JAZZ/BRAZILIAN JAZZ', path: ['Music', 'JAZZ', 'BRAZILIAN JAZZ'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-CONTEMPORARY': { name: 'CONTEMPORARY JAZZ', xmlNotation: 'JAZZ/CONTEMPORARY JAZZ', path: ['Music', 'JAZZ', 'CONTEMPORARY JAZZ'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-COOL': { name: 'COOL JAZZ', xmlNotation: 'JAZZ/COOL JAZZ', path: ['Music', 'JAZZ', 'COOL JAZZ'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-HARD': { name: 'HARD BOP & POST-BOP', xmlNotation: 'JAZZ/HARD BOP &amp; POST-BOP', path: ['Music', 'JAZZ', 'HARD BOP & POST-BOP'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-FUSION': { name: 'JAZZ FUSION', xmlNotation: 'JAZZ/JAZZ FUSION', path: ['Music', 'JAZZ', 'JAZZ FUSION'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-LATIN': { name: 'LATIN JAZZ', xmlNotation: 'JAZZ/LATIN JAZZ', path: ['Music', 'JAZZ', 'LATIN JAZZ'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-BIG': { name: 'BIG BAND & ORCHESTRAL JAZZ', xmlNotation: 'JAZZ/BIG BAND &amp; ORCHESTRAL JAZZ', path: ['Music', 'JAZZ', 'BIG BAND & ORCHESTRAL JAZZ'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-SMOOTH': { name: 'SMOOTH JAZZ', xmlNotation: 'JAZZ/SMOOTH JAZZ', path: ['Music', 'JAZZ', 'SMOOTH JAZZ'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-SWING': { name: 'SWING', xmlNotation: 'JAZZ/SWING', path: ['Music', 'JAZZ', 'SWING'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-TRADITIONAL': { name: 'TRADITIONAL JAZZ & RAGTIME', xmlNotation: 'JAZZ/TRADITIONAL JAZZ &amp; RAGTIME', path: ['Music', 'JAZZ', 'TRADITIONAL JAZZ & RAGTIME'], parent: 'AM-JAZZ-00' },
    'AM-JAZZ-VOCAL': { name: 'VOCAL JAZZ', xmlNotation: 'JAZZ/VOCAL JAZZ', path: ['Music', 'JAZZ', 'VOCAL JAZZ'], parent: 'AM-JAZZ-00' },
    
    // K-POP
    'AM-K-POP-00': { name: 'K-POP', xmlNotation: 'K-POP', path: ['Music', 'K-POP'], parent: null },
    
    // LATIN MUSIC
    'AM-LATIN-00': { name: 'LATIN MUSIC', xmlNotation: 'LATIN MUSIC', path: ['Music', 'LATIN MUSIC'], parent: null },
    'AM-LATIN-BACHATA': { name: 'BACHATA', xmlNotation: 'LATIN MUSIC/BACHATA', path: ['Music', 'LATIN MUSIC', 'BACHATA'], parent: 'AM-LATIN-00' },
    'AM-LATIN-BANDA': { name: 'BANDA', xmlNotation: 'LATIN MUSIC/BANDA', path: ['Music', 'LATIN MUSIC', 'BANDA'], parent: 'AM-LATIN-00' },
    'AM-LATIN-BIG-BAND': { name: 'BIG BAND', xmlNotation: 'LATIN MUSIC/BIG BAND', path: ['Music', 'LATIN MUSIC', 'BIG BAND'], parent: 'AM-LATIN-00' },
    'AM-LATIN-BOLERO': { name: 'BOLERO', xmlNotation: 'LATIN MUSIC/BOLERO', path: ['Music', 'LATIN MUSIC', 'BOLERO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-BRAZILIAN': { name: 'BRAZILIAN', xmlNotation: 'LATIN MUSIC/BRAZILIAN', path: ['Music', 'LATIN MUSIC', 'BRAZILIAN'], parent: 'AM-LATIN-00' },
    'AM-LATIN-CHRISTIAN': { name: 'CHRISTIAN', xmlNotation: 'LATIN MUSIC/CHRISTIAN', path: ['Music', 'LATIN MUSIC', 'CHRISTIAN'], parent: 'AM-LATIN-00' },
    'AM-LATIN-CONJUNTO': { name: 'CONJUNTO', xmlNotation: 'LATIN MUSIC/CONJUNTO', path: ['Music', 'LATIN MUSIC', 'CONJUNTO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-CORRIDOS': { name: 'CORRIDOS', xmlNotation: 'LATIN MUSIC/CORRIDOS', path: ['Music', 'LATIN MUSIC', 'CORRIDOS'], parent: 'AM-LATIN-00' },
    'AM-LATIN-CUBAN': { name: 'CUBAN', xmlNotation: 'LATIN MUSIC/CUBAN', path: ['Music', 'LATIN MUSIC', 'CUBAN'], parent: 'AM-LATIN-00' },
    'AM-LATIN-CUMBIA': { name: 'CUMBIA', xmlNotation: 'LATIN MUSIC/CUMBIA', path: ['Music', 'LATIN MUSIC', 'CUMBIA'], parent: 'AM-LATIN-00' },
    'AM-LATIN-DURANGUENSE': { name: 'DURANGUENSE', xmlNotation: 'LATIN MUSIC/DURANGUENSE', path: ['Music', 'LATIN MUSIC', 'DURANGUENSE'], parent: 'AM-LATIN-00' },
    'AM-LATIN-ELECTRONICA': { name: 'ELECTRONICA', xmlNotation: 'LATIN MUSIC/ELECTRONICA', path: ['Music', 'LATIN MUSIC', 'ELECTRONICA'], parent: 'AM-LATIN-00' },
    'AM-LATIN-FLAMENCO': { name: 'FLAMENCO', xmlNotation: 'LATIN MUSIC/FLAMENCO', path: ['Music', 'LATIN MUSIC', 'FLAMENCO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-GRUPERO': { name: 'GRUPERO', xmlNotation: 'LATIN MUSIC/GRUPERO', path: ['Music', 'LATIN MUSIC', 'GRUPERO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-HIP-HOP': { name: 'HIP HOP', xmlNotation: 'LATIN MUSIC/HIP HOP', path: ['Music', 'LATIN MUSIC', 'HIP HOP'], parent: 'AM-LATIN-00' },
    'AM-LATIN-POP': { name: 'LATIN POP', xmlNotation: 'LATIN MUSIC/LATIN POP', path: ['Music', 'LATIN MUSIC', 'LATIN POP'], parent: 'AM-LATIN-00' },
    'AM-LATIN-RAP': { name: 'LATIN RAP', xmlNotation: 'LATIN MUSIC/LATIN RAP', path: ['Music', 'LATIN MUSIC', 'LATIN RAP'], parent: 'AM-LATIN-00' },
    'AM-LATIN-MAMBO': { name: 'MAMBO', xmlNotation: 'LATIN MUSIC/MAMBO', path: ['Music', 'LATIN MUSIC', 'MAMBO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-MARIACHI': { name: 'MARIACHI', xmlNotation: 'LATIN MUSIC/MARIACHI', path: ['Music', 'LATIN MUSIC', 'MARIACHI'], parent: 'AM-LATIN-00' },
    'AM-LATIN-MERENGUE': { name: 'MERENGUE', xmlNotation: 'LATIN MUSIC/MERENGUE', path: ['Music', 'LATIN MUSIC', 'MERENGUE'], parent: 'AM-LATIN-00' },
    'AM-LATIN-NORTENO': { name: 'NORTENO', xmlNotation: 'LATIN MUSIC/NORTENO', path: ['Music', 'LATIN MUSIC', 'NORTENO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-NORTEÑO': { name: 'NORTEÑO', xmlNotation: 'LATIN MUSIC/NORTEÑO', path: ['Music', 'LATIN MUSIC', 'NORTEÑO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-RANCHERA': { name: 'RANCHERA', xmlNotation: 'LATIN MUSIC/RANCHERA', path: ['Music', 'LATIN MUSIC', 'RANCHERA'], parent: 'AM-LATIN-00' },
    'AM-LATIN-REGGAETON': { name: 'REGGAETON', xmlNotation: 'LATIN MUSIC/REGGAETON', path: ['Music', 'LATIN MUSIC', 'REGGAETON'], parent: 'AM-LATIN-00' },
    'AM-LATIN-ROCK': { name: 'ROCK EN ESPANOL', xmlNotation: 'LATIN MUSIC/ROCK EN ESPANOL', path: ['Music', 'LATIN MUSIC', 'ROCK EN ESPANOL'], parent: 'AM-LATIN-00' },
    'AM-LATIN-SALSA': { name: 'SALSA', xmlNotation: 'LATIN MUSIC/SALSA', path: ['Music', 'LATIN MUSIC', 'SALSA'], parent: 'AM-LATIN-00' },
    'AM-LATIN-SIERREÑO': { name: 'SIERREÑO', xmlNotation: 'LATIN MUSIC/SIERREÑO', path: ['Music', 'LATIN MUSIC', 'SIERREÑO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-SONIDERO': { name: 'SONIDERO', xmlNotation: 'LATIN MUSIC/SONIDERO', path: ['Music', 'LATIN MUSIC', 'SONIDERO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-TANGO': { name: 'TANGO', xmlNotation: 'LATIN MUSIC/TANGO', path: ['Music', 'LATIN MUSIC', 'TANGO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-TEJANO': { name: 'TEJANO', xmlNotation: 'LATIN MUSIC/TEJANO', path: ['Music', 'LATIN MUSIC', 'TEJANO'], parent: 'AM-LATIN-00' },
    'AM-LATIN-TIERRA': { name: 'TIERRA CALIENTE', xmlNotation: 'LATIN MUSIC/TIERRA CALIENTE', path: ['Music', 'LATIN MUSIC', 'TIERRA CALIENTE'], parent: 'AM-LATIN-00' },
    'AM-LATIN-TRADITIONAL': { name: 'TRADITIONAL MEXICAN', xmlNotation: 'LATIN MUSIC/TRADITIONAL MEXICAN', path: ['Music', 'LATIN MUSIC', 'TRADITIONAL MEXICAN'], parent: 'AM-LATIN-00' },
    'AM-LATIN-VALLENATO': { name: 'VALLENATO', xmlNotation: 'LATIN MUSIC/VALLENATO', path: ['Music', 'LATIN MUSIC', 'VALLENATO'], parent: 'AM-LATIN-00' },
    
    // MISCELLANEOUS
    'AM-MISC-00': { name: 'MISCELLANEOUS', xmlNotation: 'MISCELLANEOUS', path: ['Music', 'MISCELLANEOUS'], parent: null },
    'AM-MISC-ANIMAL': { name: 'ANIMAL SOUNDS', xmlNotation: 'MISCELLANEOUS/ANIMAL SOUNDS', path: ['Music', 'MISCELLANEOUS', 'ANIMAL SOUNDS'], parent: 'AM-MISC-00' },
    'AM-MISC-EXERCISE': { name: 'EXERCISE', xmlNotation: 'MISCELLANEOUS/EXERCISE', path: ['Music', 'MISCELLANEOUS', 'EXERCISE'], parent: 'AM-MISC-00' },
    'AM-MISC-EXPERIMENTAL': { name: 'EXPERIMENTAL MUSIC', xmlNotation: 'MISCELLANEOUS/EXPERIMENTAL MUSIC', path: ['Music', 'MISCELLANEOUS', 'EXPERIMENTAL MUSIC'], parent: 'AM-MISC-00' },
    'AM-MISC-GAY': { name: 'GAY & LESBIAN', xmlNotation: 'MISCELLANEOUS/GAY &amp; LESBIAN', path: ['Music', 'MISCELLANEOUS', 'GAY & LESBIAN'], parent: 'AM-MISC-00' },
    'AM-MISC-HOLIDAY': { name: 'HOLIDAY', xmlNotation: 'MISCELLANEOUS/HOLIDAY', path: ['Music', 'MISCELLANEOUS', 'HOLIDAY'], parent: 'AM-MISC-00' },
    'AM-MISC-CHRISTMAS': { name: 'CHRISTMAS', xmlNotation: 'MISCELLANEOUS/CHRISTMAS', path: ['Music', 'MISCELLANEOUS', 'CHRISTMAS'], parent: 'AM-MISC-00' },
    'AM-MISC-HALLOWEEN': { name: 'HALLOWEEN', xmlNotation: 'MISCELLANEOUS/HALLOWEEN', path: ['Music', 'MISCELLANEOUS', 'HALLOWEEN'], parent: 'AM-MISC-00' },
    'AM-MISC-INSTRUCTIONAL': { name: 'INSTRUCTIONAL', xmlNotation: 'MISCELLANEOUS/INSTRUCTIONAL', path: ['Music', 'MISCELLANEOUS', 'INSTRUCTIONAL'], parent: 'AM-MISC-00' },
    'AM-MISC-KARAOKE': { name: 'KARAOKE', xmlNotation: 'MISCELLANEOUS/KARAOKE', path: ['Music', 'MISCELLANEOUS', 'KARAOKE'], parent: 'AM-MISC-00' },
    'AM-MISC-MUSIC-BOX': { name: 'MUSIC BOX MUSIC', xmlNotation: 'MISCELLANEOUS/MUSIC BOX MUSIC', path: ['Music', 'MISCELLANEOUS', 'MUSIC BOX MUSIC'], parent: 'AM-MISC-00' },
    'AM-MISC-ANTHEMS': { name: 'NATIONAL ANTHEMS', xmlNotation: 'MISCELLANEOUS/NATIONAL ANTHEMS', path: ['Music', 'MISCELLANEOUS', 'NATIONAL ANTHEMS'], parent: 'AM-MISC-00' },
    'AM-MISC-NOSTALGIA': { name: 'NOSTALGIA', xmlNotation: 'MISCELLANEOUS/NOSTALGIA', path: ['Music', 'MISCELLANEOUS', 'NOSTALGIA'], parent: 'AM-MISC-00' },
    'AM-MISC-OTHER': { name: 'OTHER', xmlNotation: 'MISCELLANEOUS/OTHER', path: ['Music', 'MISCELLANEOUS', 'OTHER'], parent: 'AM-MISC-00' },
    'AM-MISC-PACHINKO': { name: 'PACHINKO AND SLOT MACHINE MUSIC', xmlNotation: 'MISCELLANEOUS/PACHINKO AND SLOT MACHINE MUSIC', path: ['Music', 'MISCELLANEOUS', 'PACHINKO AND SLOT MACHINE MUSIC'], parent: 'AM-MISC-00' },
    'AM-MISC-PATRIOTIC': { name: 'PATRIOTIC (U.S.A.)', xmlNotation: 'MISCELLANEOUS/PATRIOTIC (U.S.A.)', path: ['Music', 'MISCELLANEOUS', 'PATRIOTIC (U.S.A.)'], parent: 'AM-MISC-00' },
    'AM-MISC-RINGTONE': { name: 'RINGTONE', xmlNotation: 'MISCELLANEOUS/RINGTONE', path: ['Music', 'MISCELLANEOUS', 'RINGTONE'], parent: 'AM-MISC-00' },
    'AM-MISC-SELF-HELP': { name: 'SELF-HELP', xmlNotation: 'MISCELLANEOUS/SELF-HELP', path: ['Music', 'MISCELLANEOUS', 'SELF-HELP'], parent: 'AM-MISC-00' },
    'AM-MISC-SOUND': { name: 'SOUND EFFECTS', xmlNotation: 'MISCELLANEOUS/SOUND EFFECTS', path: ['Music', 'MISCELLANEOUS', 'SOUND EFFECTS'], parent: 'AM-MISC-00' },
    
    // MISCELLANEOUS / SPORTS
    'AM-MISC-SPORTS': { name: 'SPORTS', xmlNotation: 'MISCELLANEOUS/SPORTS', path: ['Music', 'MISCELLANEOUS', 'SPORTS'], parent: 'AM-MISC-00' },
    'AM-MISC-SPORTS-BASEBALL': { name: 'BASEBALL', xmlNotation: 'MISCELLANEOUS/SPORTS/BASEBALL', path: ['Music', 'MISCELLANEOUS', 'SPORTS', 'BASEBALL'], parent: 'AM-MISC-SPORTS' },
    'AM-MISC-SPORTS-MARTIAL': { name: 'MARTIAL ARTS', xmlNotation: 'MISCELLANEOUS/SPORTS/MARTIAL ARTS', path: ['Music', 'MISCELLANEOUS', 'SPORTS', 'MARTIAL ARTS'], parent: 'AM-MISC-SPORTS' },
    'AM-MISC-SPORTS-OTHER': { name: 'OTHER SPORTS', xmlNotation: 'MISCELLANEOUS/SPORTS/OTHER SPORTS', path: ['Music', 'MISCELLANEOUS', 'SPORTS', 'OTHER SPORTS'], parent: 'AM-MISC-SPORTS' },
    'AM-MISC-SPORTS-SOCCER': { name: 'SOCCER', xmlNotation: 'MISCELLANEOUS/SPORTS/SOCCER', path: ['Music', 'MISCELLANEOUS', 'SPORTS', 'SOCCER'], parent: 'AM-MISC-SPORTS' },
    
    'AM-MISC-TEST': { name: 'TEST RECORDINGS', xmlNotation: 'MISCELLANEOUS/TEST RECORDINGS', path: ['Music', 'MISCELLANEOUS', 'TEST RECORDINGS'], parent: 'AM-MISC-00' },
    'AM-MISC-WEDDING': { name: 'WEDDING MUSIC', xmlNotation: 'MISCELLANEOUS/WEDDING MUSIC', path: ['Music', 'MISCELLANEOUS', 'WEDDING MUSIC'], parent: 'AM-MISC-00' },
    
    // NEW AGE
    'AM-NEW-AGE-00': { name: 'NEW AGE', xmlNotation: 'NEW AGE', path: ['Music', 'NEW AGE'], parent: null },
    'AM-NEW-AGE-CELTIC': { name: 'CELTIC NEW AGE', xmlNotation: 'NEW AGE/CELTIC NEW AGE', path: ['Music', 'NEW AGE', 'CELTIC NEW AGE'], parent: 'AM-NEW-AGE-00' },
    'AM-NEW-AGE-ENVIRONMENTAL': { name: 'ENVIRONMENTAL NEW AGE', xmlNotation: 'NEW AGE/ENVIRONMENTAL NEW AGE', path: ['Music', 'NEW AGE', 'ENVIRONMENTAL NEW AGE'], parent: 'AM-NEW-AGE-00' },
    'AM-NEW-AGE-HEALING': { name: 'HEALING', xmlNotation: 'NEW AGE/HEALING', path: ['Music', 'NEW AGE', 'HEALING'], parent: 'AM-NEW-AGE-00' },
    'AM-NEW-AGE-MEDITATION': { name: 'MEDITATION', xmlNotation: 'NEW AGE/MEDITATION', path: ['Music', 'NEW AGE', 'MEDITATION'], parent: 'AM-NEW-AGE-00' },
    
    // OPERA & CHORAL
    'AM-OPERA-00': { name: 'OPERA & CHORAL', xmlNotation: 'OPERA &amp; CHORAL', path: ['Music', 'OPERA & CHORAL'], parent: null },
    'AM-OPERA-EARLY': { name: 'EARLY MUSIC', xmlNotation: 'OPERA &amp; CHORAL/EARLY MUSIC', path: ['Music', 'OPERA & CHORAL', 'EARLY MUSIC'], parent: 'AM-OPERA-00' },
    'AM-OPERA-RENAISSANCE': { name: 'RENAISSANCE (C. 1450-1600)', xmlNotation: 'OPERA &amp; CHORAL/RENAISSANCE (C. 1450-1600)', path: ['Music', 'OPERA & CHORAL', 'RENAISSANCE (C. 1450-1600)'], parent: 'AM-OPERA-00' },
    'AM-OPERA-BAROQUE': { name: 'BAROQUE (C. 1600-1750)', xmlNotation: 'OPERA &amp; CHORAL/BAROQUE (C. 1600-1750)', path: ['Music', 'OPERA & CHORAL', 'BAROQUE (C. 1600-1750)'], parent: 'AM-OPERA-00' },
    'AM-OPERA-CLASSICAL': { name: 'CLASSICAL (C. 1770-1830)', xmlNotation: 'OPERA &amp; CHORAL/CLASSICAL (C. 1770-1830)', path: ['Music', 'OPERA & CHORAL', 'CLASSICAL (C. 1770-1830)'], parent: 'AM-OPERA-00' },
    'AM-OPERA-ROMANTIC': { name: 'ROMANTIC (C. 1820-1910)', xmlNotation: 'OPERA &amp; CHORAL/ROMANTIC (C. 1820-1910)', path: ['Music', 'OPERA & CHORAL', 'ROMANTIC (C. 1820-1910)'], parent: 'AM-OPERA-00' },
    'AM-OPERA-MODERN': { name: 'MODERN & 21ST CENTURY', xmlNotation: 'OPERA &amp; CHORAL/MODERN &amp; 21ST CENTURY', path: ['Music', 'OPERA & CHORAL', 'MODERN & 21ST CENTURY'], parent: 'AM-OPERA-00' },
    'AM-OPERA-ARIAS': { name: 'ARIAS', xmlNotation: 'OPERA &amp; CHORAL/ARIAS', path: ['Music', 'OPERA & CHORAL', 'ARIAS'], parent: 'AM-OPERA-00' },
    'AM-OPERA-OPERETTAS': { name: 'OPERETTAS', xmlNotation: 'OPERA &amp; CHORAL/OPERETTAS', path: ['Music', 'OPERA & CHORAL', 'OPERETTAS'], parent: 'AM-OPERA-00' },
    'AM-OPERA-ORATORIOS': { name: 'ORATORIOS', xmlNotation: 'OPERA &amp; CHORAL/ORATORIOS', path: ['Music', 'OPERA & CHORAL', 'ORATORIOS'], parent: 'AM-OPERA-00' },
    'AM-OPERA-CHORAL': { name: 'CHORAL NON-OPERA', xmlNotation: 'OPERA &amp; CHORAL/CHORAL NON-OPERA', path: ['Music', 'OPERA & CHORAL', 'CHORAL NON-OPERA'], parent: 'AM-OPERA-00' },
    'AM-OPERA-ART-SONG': { name: 'ART SONG', xmlNotation: 'OPERA &amp; CHORAL/ART SONG', path: ['Music', 'OPERA & CHORAL', 'ART SONG'], parent: 'AM-OPERA-00' },
    'AM-OPERA-CROSSOVER': { name: 'CROSSOVER', xmlNotation: 'OPERA &amp; CHORAL/CROSSOVER', path: ['Music', 'OPERA & CHORAL', 'CROSSOVER'], parent: 'AM-OPERA-00' },
    'AM-OPERA-CHILDREN': { name: 'CHILDREN\'S MUSIC', xmlNotation: 'OPERA &amp; CHORAL/CHILDREN\'S MUSIC', path: ['Music', 'OPERA & CHORAL', 'CHILDREN\'S MUSIC'], parent: 'AM-OPERA-00' },
    
    // POP
    'AM-POP-00': { name: 'POP', xmlNotation: 'POP', path: ['Music', 'POP'], parent: null },
    'AM-POP-ADULT-ALT': { name: 'ADULT ALTERNATIVE', xmlNotation: 'POP/ADULT ALTERNATIVE', path: ['Music', 'POP', 'ADULT ALTERNATIVE'], parent: 'AM-POP-00' },
    'AM-POP-ADULT-CONT': { name: 'ADULT CONTEMPORARY', xmlNotation: 'POP/ADULT CONTEMPORARY', path: ['Music', 'POP', 'ADULT CONTEMPORARY'], parent: 'AM-POP-00' },
    'AM-POP-DANCE': { name: 'DANCE POP', xmlNotation: 'POP/DANCE POP', path: ['Music', 'POP', 'DANCE POP'], parent: 'AM-POP-00' },
    'AM-POP-DISCO': { name: 'DISCO', xmlNotation: 'POP/DISCO', path: ['Music', 'POP', 'DISCO'], parent: 'AM-POP-00' },
    'AM-POP-EASY': { name: 'EASY LISTENING', xmlNotation: 'POP/EASY LISTENING', path: ['Music', 'POP', 'EASY LISTENING'], parent: 'AM-POP-00' },
    'AM-POP-EURO': { name: 'EURO POP', xmlNotation: 'POP/EURO POP', path: ['Music', 'POP', 'EURO POP'], parent: 'AM-POP-00' },
    'AM-POP-OLDIES': { name: 'OLDIES', xmlNotation: 'POP/OLDIES', path: ['Music', 'POP', 'OLDIES'], parent: 'AM-POP-00' },
    'AM-POP-RB': { name: 'POP R&B', xmlNotation: 'POP/POP R&amp;B', path: ['Music', 'POP', 'POP R&B'], parent: 'AM-POP-00' },
    'AM-POP-RAP': { name: 'POP RAP', xmlNotation: 'POP/POP RAP', path: ['Music', 'POP', 'POP RAP'], parent: 'AM-POP-00' },
    'AM-POP-ROCK': { name: 'POP ROCK', xmlNotation: 'POP/POP ROCK', path: ['Music', 'POP', 'POP ROCK'], parent: 'AM-POP-00' },
    'AM-POP-SINGER': { name: 'SINGER-SONGWRITERS', xmlNotation: 'POP/SINGER-SONGWRITERS', path: ['Music', 'POP', 'SINGER-SONGWRITERS'], parent: 'AM-POP-00' },
    'AM-POP-SOFT': { name: 'SOFT ROCK', xmlNotation: 'POP/SOFT ROCK', path: ['Music', 'POP', 'SOFT ROCK'], parent: 'AM-POP-00' },
    'AM-POP-VOCAL': { name: 'VOCAL POP', xmlNotation: 'POP/VOCAL POP', path: ['Music', 'POP', 'VOCAL POP'], parent: 'AM-POP-00' },
    
    // R&B
    'AM-RB-00': { name: 'R&B', xmlNotation: 'R&amp;B', path: ['Music', 'R&B'], parent: null },
    'AM-RB-CLASSIC': { name: 'CLASSIC R&B', xmlNotation: 'R&amp;B/CLASSIC R&amp;B', path: ['Music', 'R&B', 'CLASSIC R&B'], parent: 'AM-RB-00' },
    'AM-RB-FUNK': { name: 'FUNK', xmlNotation: 'R&amp;B/FUNK', path: ['Music', 'R&B', 'FUNK'], parent: 'AM-RB-00' },
    'AM-RB-MOTOWN': { name: 'MOTOWN', xmlNotation: 'R&amp;B/MOTOWN', path: ['Music', 'R&B', 'MOTOWN'], parent: 'AM-RB-00' },
    'AM-RB-NEO-SOUL': { name: 'NEO-SOUL', xmlNotation: 'R&amp;B/NEO-SOUL', path: ['Music', 'R&B', 'NEO-SOUL'], parent: 'AM-RB-00' },
    'AM-RB-NEW-JACK': { name: 'NEW JACK', xmlNotation: 'R&amp;B/NEW JACK', path: ['Music', 'R&B', 'NEW JACK'], parent: 'AM-RB-00' },
    'AM-RB-QUIET': { name: 'QUIET STORM', xmlNotation: 'R&amp;B/QUIET STORM', path: ['Music', 'R&B', 'QUIET STORM'], parent: 'AM-RB-00' },
    'AM-RB-SOUL': { name: 'SOUL', xmlNotation: 'R&amp;B/SOUL', path: ['Music', 'R&B', 'SOUL'], parent: 'AM-RB-00' },
    'AM-RB-SOUL-NORTHERN': { name: 'NORTHERN SOUL', xmlNotation: 'R&amp;B/SOUL/NORTHERN SOUL', path: ['Music', 'R&B', 'SOUL', 'NORTHERN SOUL'], parent: 'AM-RB-SOUL' },
    'AM-RB-SOUL-PHILLY': { name: 'PHILLY SOUL', xmlNotation: 'R&amp;B/SOUL/PHILLY SOUL', path: ['Music', 'R&B', 'SOUL', 'PHILLY SOUL'], parent: 'AM-RB-SOUL' },
    'AM-RB-SOUL-SOUTHERN': { name: 'SOUTHERN SOUL', xmlNotation: 'R&amp;B/SOUL/SOUTHERN SOUL', path: ['Music', 'R&B', 'SOUL', 'SOUTHERN SOUL'], parent: 'AM-RB-SOUL' },
    'AM-RB-URBAN': { name: 'URBAN', xmlNotation: 'R&amp;B/URBAN', path: ['Music', 'R&B', 'URBAN'], parent: 'AM-RB-00' },
    
    // RAP & HIP-HOP
    'AM-RAP-00': { name: 'RAP & HIP-HOP', xmlNotation: 'RAP &amp; HIP-HOP', path: ['Music', 'RAP & HIP-HOP'], parent: null },
    'AM-RAP-EAST': { name: 'EAST COAST', xmlNotation: 'RAP &amp; HIP-HOP/EAST COAST', path: ['Music', 'RAP & HIP-HOP', 'EAST COAST'], parent: 'AM-RAP-00' },
    'AM-RAP-EXPERIMENTAL': { name: 'EXPERIMENTAL RAP', xmlNotation: 'RAP &amp; HIP-HOP/EXPERIMENTAL RAP', path: ['Music', 'RAP & HIP-HOP', 'EXPERIMENTAL RAP'], parent: 'AM-RAP-00' },
    'AM-RAP-GANGSTA': { name: 'GANGSTA & HARDCORE', xmlNotation: 'RAP &amp; HIP-HOP/GANGSTA &amp; HARDCORE', path: ['Music', 'RAP & HIP-HOP', 'GANGSTA & HARDCORE'], parent: 'AM-RAP-00' },
    'AM-RAP-ALTERNATIVE': { name: 'ALTERNATIVE', xmlNotation: 'RAP &amp; HIP-HOP/ALTERNATIVE', path: ['Music', 'RAP & HIP-HOP', 'ALTERNATIVE'], parent: 'AM-RAP-00' },
    'AM-RAP-INTERNATIONAL': { name: 'INTERNATIONAL RAP', xmlNotation: 'RAP &amp; HIP-HOP/INTERNATIONAL RAP', path: ['Music', 'RAP & HIP-HOP', 'INTERNATIONAL RAP'], parent: 'AM-RAP-00' },
    'AM-RAP-OLD': { name: 'OLD SCHOOL', xmlNotation: 'RAP &amp; HIP-HOP/OLD SCHOOL', path: ['Music', 'RAP & HIP-HOP', 'OLD SCHOOL'], parent: 'AM-RAP-00' },
    'AM-RAP-SOUTHERN': { name: 'SOUTHERN RAP', xmlNotation: 'RAP &amp; HIP-HOP/SOUTHERN RAP', path: ['Music', 'RAP & HIP-HOP', 'SOUTHERN RAP'], parent: 'AM-RAP-00' },
    'AM-RAP-WEST': { name: 'WEST COAST', xmlNotation: 'RAP &amp; HIP-HOP/WEST COAST', path: ['Music', 'RAP & HIP-HOP', 'WEST COAST'], parent: 'AM-RAP-00' },
    'AM-RAP-GERMAN': { name: 'GERMAN RAP', xmlNotation: 'RAP &amp; HIP HOP/GERMAN RAP', path: ['Music', 'RAP & HIP-HOP', 'GERMAN RAP'], parent: 'AM-RAP-00' },
    'AM-RAP-FRENCH': { name: 'FRENCH RAP', xmlNotation: 'RAP &amp; HIP HOP/FRENCH RAP', path: ['Music', 'RAP & HIP-HOP', 'FRENCH RAP'], parent: 'AM-RAP-00' },
    'AM-RAP-UK': { name: 'UK HIP HOP', xmlNotation: 'RAP &amp; HIP HOP/UK HIP HOP', path: ['Music', 'RAP & HIP-HOP', 'UK HIP HOP'], parent: 'AM-RAP-00' },
    
    // REGGAE
    'AM-REGGAE-00': { name: 'REGGAE', xmlNotation: 'REGGAE', path: ['Music', 'REGGAE'], parent: null },
    'AM-REGGAE-DANCEHALL': { name: 'DANCEHALL', xmlNotation: 'REGGAE/DANCEHALL', path: ['Music', 'REGGAE', 'DANCEHALL'], parent: 'AM-REGGAE-00' },
    'AM-REGGAE-DUB': { name: 'DUB', xmlNotation: 'REGGAE/DUB', path: ['Music', 'REGGAE', 'DUB'], parent: 'AM-REGGAE-00' },
    'AM-REGGAE-SKA': { name: 'SKA', xmlNotation: 'REGGAE/SKA', path: ['Music', 'REGGAE', 'SKA'], parent: 'AM-REGGAE-00' },
    'AM-REGGAE-ROCKSTEADY': { name: 'ROCKSTEADY', xmlNotation: 'REGGAE/ROCKSTEADY', path: ['Music', 'REGGAE', 'ROCKSTEADY'], parent: 'AM-REGGAE-00' },
    'AM-REGGAE-ROOTS': { name: 'ROOTS', xmlNotation: 'REGGAE/ROOTS', path: ['Music', 'REGGAE', 'ROOTS'], parent: 'AM-REGGAE-00' },
    
    // ROCK
    'AM-ROCK-00': { name: 'ROCK', xmlNotation: 'ROCK', path: ['Music', 'ROCK'], parent: null },
    'AM-ROCK-BLUES': { name: 'BLUES ROCK', xmlNotation: 'ROCK/BLUES ROCK', path: ['Music', 'ROCK', 'BLUES ROCK'], parent: 'AM-ROCK-00' },
    'AM-ROCK-COUNTRY': { name: 'COUNTRY ROCK', xmlNotation: 'ROCK/COUNTRY ROCK', path: ['Music', 'ROCK', 'COUNTRY ROCK'], parent: 'AM-ROCK-00' },
    'AM-ROCK-FOLK': { name: 'FOLK ROCK', xmlNotation: 'ROCK/FOLK ROCK', path: ['Music', 'ROCK', 'FOLK ROCK'], parent: 'AM-ROCK-00' },
    'AM-ROCK-FUNK': { name: 'FUNK ROCK', xmlNotation: 'ROCK/FUNK ROCK', path: ['Music', 'ROCK', 'FUNK ROCK'], parent: 'AM-ROCK-00' },
    'AM-ROCK-JAM': { name: 'JAM BANDS', xmlNotation: 'ROCK/JAM BANDS', path: ['Music', 'ROCK', 'JAM BANDS'], parent: 'AM-ROCK-00' },
    'AM-ROCK-OLDIES': { name: 'OLDIES & RETRO', xmlNotation: 'ROCK/OLDIES &amp; RETRO', path: ['Music', 'ROCK', 'OLDIES & RETRO'], parent: 'AM-ROCK-00' },
    'AM-ROCK-ROLL': { name: 'ROCK AND ROLL', xmlNotation: 'ROCK/ROCK AND ROLL', path: ['Music', 'ROCK', 'ROCK AND ROLL'], parent: 'AM-ROCK-00' },
    'AM-ROCK-ROCKABILLY': { name: 'ROCKABILLY', xmlNotation: 'ROCK/ROCKABILLY', path: ['Music', 'ROCK', 'ROCKABILLY'], parent: 'AM-ROCK-00' },
    'AM-ROCK-PROGRESSIVE': { name: 'PROGRESSIVE', xmlNotation: 'ROCK/PROGRESSIVE', path: ['Music', 'ROCK', 'PROGRESSIVE'], parent: 'AM-ROCK-00' },
    'AM-ROCK-ROOTS': { name: 'ROOTS ROCK', xmlNotation: 'ROCK/ROOTS ROCK', path: ['Music', 'ROCK', 'ROOTS ROCK'], parent: 'AM-ROCK-00' },
    'AM-ROCK-SINGER': { name: 'SINGER-SONGWRITER', xmlNotation: 'ROCK/SINGER-SONGWRITER', path: ['Music', 'ROCK', 'SINGER-SONGWRITER'], parent: 'AM-ROCK-00' },
    
    // SOUNDTRACKS
    'AM-SOUNDTRACKS-00': { name: 'SOUNDTRACKS', xmlNotation: 'SOUNDTRACKS', path: ['Music', 'SOUNDTRACKS'], parent: null },
    'AM-SOUNDTRACKS-ANIME': { name: 'ANIME', xmlNotation: 'SOUNDTRACKS/ANIME', path: ['Music', 'SOUNDTRACKS', 'ANIME'], parent: 'AM-SOUNDTRACKS-00' },
    'AM-SOUNDTRACKS-GAMES': { name: 'VIDEO GAMES', xmlNotation: 'SOUNDTRACKS/VIDEO GAMES', path: ['Music', 'SOUNDTRACKS', 'VIDEO GAMES'], parent: 'AM-SOUNDTRACKS-00' },
    'AM-SOUNDTRACKS-JP-MOVIES': { name: 'JAPANESE MOVIES', xmlNotation: 'SOUNDTRACKS/JAPANESE MOVIES', path: ['Music', 'SOUNDTRACKS', 'JAPANESE MOVIES'], parent: 'AM-SOUNDTRACKS-00' },
    'AM-SOUNDTRACKS-JP-TV': { name: 'JAPANESE TV SERIES', xmlNotation: 'SOUNDTRACKS/JAPANESE TV SERIES', path: ['Music', 'SOUNDTRACKS', 'JAPANESE TV SERIES'], parent: 'AM-SOUNDTRACKS-00' },
    'AM-SOUNDTRACKS-SCORES': { name: 'MOVIE SCORES', xmlNotation: 'SOUNDTRACKS/MOVIE SCORES', path: ['Music', 'SOUNDTRACKS', 'MOVIE SCORES'], parent: 'AM-SOUNDTRACKS-00' },
    'AM-SOUNDTRACKS-MOVIES': { name: 'MOVIE SOUNDTRACKS', xmlNotation: 'SOUNDTRACKS/MOVIE SOUNDTRACKS', path: ['Music', 'SOUNDTRACKS', 'MOVIE SOUNDTRACKS'], parent: 'AM-SOUNDTRACKS-00' },
    'AM-SOUNDTRACKS-TV': { name: 'TELEVISION SOUNDTRACKS', xmlNotation: 'SOUNDTRACKS/TELEVISION SOUNDTRACKS', path: ['Music', 'SOUNDTRACKS', 'TELEVISION SOUNDTRACKS'], parent: 'AM-SOUNDTRACKS-00' },
    
    // SPOKEN WORD
    'AM-SPOKEN-00': { name: 'SPOKEN WORD', xmlNotation: 'SPOKEN WORD', path: ['Music', 'SPOKEN WORD'], parent: null },
    'AM-SPOKEN-HISTORY': { name: 'HISTORY', xmlNotation: 'SPOKEN WORD/HISTORY', path: ['Music', 'SPOKEN WORD', 'HISTORY'], parent: 'AM-SPOKEN-00' },
    'AM-SPOKEN-INTERVIEWS': { name: 'INTERVIEWS', xmlNotation: 'SPOKEN WORD/INTERVIEWS', path: ['Music', 'SPOKEN WORD', 'INTERVIEWS'], parent: 'AM-SPOKEN-00' },
    'AM-SPOKEN-POETRY': { name: 'POETRY', xmlNotation: 'SPOKEN WORD/POETRY', path: ['Music', 'SPOKEN WORD', 'POETRY'], parent: 'AM-SPOKEN-00' },
    'AM-SPOKEN-RADIO': { name: 'RADIO', xmlNotation: 'SPOKEN WORD/RADIO', path: ['Music', 'SPOKEN WORD', 'RADIO'], parent: 'AM-SPOKEN-00' },
    'AM-SPOKEN-SPEECHES': { name: 'SPEECHES', xmlNotation: 'SPOKEN WORD/SPEECHES', path: ['Music', 'SPOKEN WORD', 'SPEECHES'], parent: 'AM-SPOKEN-00' },
    
    // VARIETE FRANCAISE
    'AM-VARIETE-00': { name: 'VARIETE FRANCAISE', xmlNotation: 'VARIETE FRANCAISE', path: ['Music', 'VARIETE FRANCAISE'], parent: null },
    
    // WORLD
    'AM-WORLD-00': { name: 'WORLD', xmlNotation: 'WORLD', path: ['Music', 'WORLD'], parent: null },
    
    // WORLD / AFRICA
    'AM-WORLD-AFRICA': { name: 'AFRICA', xmlNotation: 'WORLD/AFRICA', path: ['Music', 'WORLD', 'AFRICA'], parent: 'AM-WORLD-00' },
    'AM-WORLD-AFRICA-NORTH': { name: 'NORTH AFRICA', xmlNotation: 'WORLD/AFRICA/NORTH AFRICA', path: ['Music', 'WORLD', 'AFRICA', 'NORTH AFRICA'], parent: 'AM-WORLD-AFRICA' },
    'AM-WORLD-AFRICA-EAST': { name: 'EAST AFRICA', xmlNotation: 'WORLD/AFRICA/EAST AFRICA', path: ['Music', 'WORLD', 'AFRICA', 'EAST AFRICA'], parent: 'AM-WORLD-AFRICA' },
    'AM-WORLD-AFRICA-SOUTH': { name: 'SOUTH AFRICA', xmlNotation: 'WORLD/AFRICA/SOUTH AFRICA', path: ['Music', 'WORLD', 'AFRICA', 'SOUTH AFRICA'], parent: 'AM-WORLD-AFRICA' },
    'AM-WORLD-AFRICA-WEST': { name: 'WEST AFRICA', xmlNotation: 'WORLD/AFRICA/WEST AFRICA', path: ['Music', 'WORLD', 'AFRICA', 'WEST AFRICA'], parent: 'AM-WORLD-AFRICA' },
    
    'AM-WORLD-AUSTRALIA': { name: 'AUSTRALIA & NEW ZEALAND', xmlNotation: 'WORLD/AUSTRALIA &amp; NEW ZEALAND', path: ['Music', 'WORLD', 'AUSTRALIA & NEW ZEALAND'], parent: 'AM-WORLD-00' },
    'AM-WORLD-CARIBBEAN': { name: 'CARIBBEAN & CUBA', xmlNotation: 'WORLD/CARIBBEAN &amp; CUBA', path: ['Music', 'WORLD', 'CARIBBEAN & CUBA'], parent: 'AM-WORLD-00' },
    
    // WORLD / EUROPE
    'AM-WORLD-EUROPE': { name: 'EUROPE', xmlNotation: 'WORLD/EUROPE', path: ['Music', 'WORLD', 'EUROPE'], parent: 'AM-WORLD-00' },
    'AM-WORLD-EUROPE-BALKANS': { name: 'BALKANS', xmlNotation: 'WORLD/EUROPE/BALKANS', path: ['Music', 'WORLD', 'EUROPE', 'BALKANS'], parent: 'AM-WORLD-EUROPE' },
    'AM-WORLD-EUROPE-EASTERN': { name: 'EASTERN EUROPE', xmlNotation: 'WORLD/EUROPE/EASTERN EUROPE', path: ['Music', 'WORLD', 'EUROPE', 'EASTERN EUROPE'], parent: 'AM-WORLD-EUROPE' },
    'AM-WORLD-EUROPE-FRANCE': { name: 'FRANCE', xmlNotation: 'WORLD/EUROPE/FRANCE', path: ['Music', 'WORLD', 'EUROPE', 'FRANCE'], parent: 'AM-WORLD-EUROPE' },
    'AM-WORLD-EUROPE-GERMANY': { name: 'GERMANY', xmlNotation: 'WORLD/EUROPE/GERMANY', path: ['Music', 'WORLD', 'EUROPE', 'GERMANY'], parent: 'AM-WORLD-EUROPE' },
    'AM-WORLD-EUROPE-GREECE': { name: 'GREECE', xmlNotation: 'WORLD/EUROPE/GREECE', path: ['Music', 'WORLD', 'EUROPE', 'GREECE'], parent: 'AM-WORLD-EUROPE' },
    'AM-WORLD-EUROPE-ITALY': { name: 'ITALY', xmlNotation: 'WORLD/EUROPE/ITALY', path: ['Music', 'WORLD', 'EUROPE', 'ITALY'], parent: 'AM-WORLD-EUROPE' },
    'AM-WORLD-EUROPE-PORTUGAL': { name: 'PORTUGAL', xmlNotation: 'WORLD/EUROPE/PORTUGAL', path: ['Music', 'WORLD', 'EUROPE', 'PORTUGAL'], parent: 'AM-WORLD-EUROPE' },
    'AM-WORLD-EUROPE-SCANDINAVIA': { name: 'SCANDINAVIA', xmlNotation: 'WORLD/EUROPE/SCANDINAVIA', path: ['Music', 'WORLD', 'EUROPE', 'SCANDINAVIA'], parent: 'AM-WORLD-EUROPE' },
    'AM-WORLD-EUROPE-SPAIN': { name: 'SPAIN', xmlNotation: 'WORLD/EUROPE/SPAIN', path: ['Music', 'WORLD', 'EUROPE', 'SPAIN'], parent: 'AM-WORLD-EUROPE' },
    'AM-WORLD-EUROPE-TURKEY': { name: 'TURKEY', xmlNotation: 'WORLD/EUROPE/TURKEY', path: ['Music', 'WORLD', 'EUROPE', 'TURKEY'], parent: 'AM-WORLD-EUROPE' },
    
    // WORLD / FAR EAST & ASIA
    'AM-WORLD-FAR-EAST': { name: 'FAR EAST & ASIA', xmlNotation: 'WORLD/FAR EAST &amp; ASIA', path: ['Music', 'WORLD', 'FAR EAST & ASIA'], parent: 'AM-WORLD-00' },
    'AM-WORLD-FAR-EAST-CHINA': { name: 'CHINA', xmlNotation: 'WORLD/FAR EAST &amp; ASIA/CHINA', path: ['Music', 'WORLD', 'FAR EAST & ASIA', 'CHINA'], parent: 'AM-WORLD-FAR-EAST' },
    'AM-WORLD-FAR-EAST-INDONESIA': { name: 'INDONESIA', xmlNotation: 'WORLD/FAR EAST &amp; ASIA/INDONESIA', path: ['Music', 'WORLD', 'FAR EAST & ASIA', 'INDONESIA'], parent: 'AM-WORLD-FAR-EAST' },
    'AM-WORLD-FAR-EAST-JAPAN': { name: 'JAPAN', xmlNotation: 'WORLD/FAR EAST &amp; ASIA/JAPAN', path: ['Music', 'WORLD', 'FAR EAST & ASIA', 'JAPAN'], parent: 'AM-WORLD-FAR-EAST' },
    'AM-WORLD-FAR-EAST-KOREA': { name: 'KOREA', xmlNotation: 'WORLD/FAR EAST &amp; ASIA/KOREA', path: ['Music', 'WORLD', 'FAR EAST & ASIA', 'KOREA'], parent: 'AM-WORLD-FAR-EAST' },
    
    'AM-WORLD-INDIA': { name: 'INDIA & PAKISTAN', xmlNotation: 'WORLD/INDIA &amp; PAKISTAN', path: ['Music', 'WORLD', 'INDIA & PAKISTAN'], parent: 'AM-WORLD-00' },
    'AM-WORLD-MEXICO': { name: 'MEXICO', xmlNotation: 'WORLD/MEXICO', path: ['Music', 'WORLD', 'MEXICO'], parent: 'AM-WORLD-00' },
    'AM-WORLD-MIDDLE-EAST': { name: 'MIDDLE EAST', xmlNotation: 'WORLD/MIDDLE EAST', path: ['Music', 'WORLD', 'MIDDLE EAST'], parent: 'AM-WORLD-00' },
    'AM-WORLD-NORTH-AMERICA': { name: 'NORTH AMERICA', xmlNotation: 'WORLD/NORTH AMERICA', path: ['Music', 'WORLD', 'NORTH AMERICA'], parent: 'AM-WORLD-00' },
    'AM-WORLD-PACIFIC': { name: 'PACIFIC ISLANDS', xmlNotation: 'WORLD/PACIFIC ISLANDS', path: ['Music', 'WORLD', 'PACIFIC ISLANDS'], parent: 'AM-WORLD-00' },
    'AM-WORLD-RUSSIA': { name: 'RUSSIA & FORMER SOVIET REPUBLICS', xmlNotation: 'WORLD/RUSSIA &amp; FORMER SOVIET REPUBLICS', path: ['Music', 'WORLD', 'RUSSIA & FORMER SOVIET REPUBLICS'], parent: 'AM-WORLD-00' },
    
    // WORLD / SOUTH & CENTRAL AMERICA
    'AM-WORLD-SOUTH-AMERICA': { name: 'SOUTH & CENTRAL AMERICA', xmlNotation: 'WORLD/SOUTH &amp; CENTRAL AMERICA', path: ['Music', 'WORLD', 'SOUTH & CENTRAL AMERICA'], parent: 'AM-WORLD-00' },
    'AM-WORLD-SOUTH-AMERICA-ARGENTINA': { name: 'ARGENTINA', xmlNotation: 'WORLD/SOUTH &amp; CENTRAL AMERICA/ARGENTINA', path: ['Music', 'WORLD', 'SOUTH & CENTRAL AMERICA', 'ARGENTINA'], parent: 'AM-WORLD-SOUTH-AMERICA' },
    'AM-WORLD-SOUTH-AMERICA-BRAZIL': { name: 'BRAZIL', xmlNotation: 'WORLD/SOUTH &amp; CENTRAL AMERICA/BRAZIL', path: ['Music', 'WORLD', 'SOUTH & CENTRAL AMERICA', 'BRAZIL'], parent: 'AM-WORLD-SOUTH-AMERICA' },
    'AM-WORLD-SOUTH-AMERICA-COLOMBIA': { name: 'COLOMBIA', xmlNotation: 'WORLD/SOUTH &amp; CENTRAL AMERICA/COLOMBIA', path: ['Music', 'WORLD', 'SOUTH & CENTRAL AMERICA', 'COLOMBIA'], parent: 'AM-WORLD-SOUTH-AMERICA' },
    'AM-WORLD-SOUTH-AMERICA-PANAMA': { name: 'PANAMA', xmlNotation: 'WORLD/SOUTH &amp; CENTRAL AMERICA/PANAMA', path: ['Music', 'WORLD', 'SOUTH & CENTRAL AMERICA', 'PANAMA'], parent: 'AM-WORLD-SOUTH-AMERICA' },
    'AM-WORLD-SOUTH-AMERICA-PERU': { name: 'PERU', xmlNotation: 'WORLD/SOUTH &amp; CENTRAL AMERICA/PERU', path: ['Music', 'WORLD', 'SOUTH & CENTRAL AMERICA', 'PERU'], parent: 'AM-WORLD-SOUTH-AMERICA' },
    
    // WORLD (direct children)
    'AM-WORLD-AFRO-POP': { name: 'AFRO-POP', xmlNotation: 'WORLD/AFRO-POP', path: ['Music', 'WORLD', 'AFRO-POP'], parent: 'AM-WORLD-00' },
    'AM-WORLD-AFRO-BEAT': { name: 'AFRO-BEAT', xmlNotation: 'WORLD/AFRO-BEAT', path: ['Music', 'WORLD', 'AFRO-BEAT'], parent: 'AM-WORLD-00' },
    'AM-WORLD-BALKAN-BEAT': { name: 'BALKAN BEAT', xmlNotation: 'WORLD/BALKAN BEAT', path: ['Music', 'WORLD', 'BALKAN BEAT'], parent: 'AM-WORLD-00' },
    'AM-WORLD-BHANGRA': { name: 'BHANGRA', xmlNotation: 'WORLD/BHANGRA', path: ['Music', 'WORLD', 'BHANGRA'], parent: 'AM-WORLD-00' },
    'AM-WORLD-BOLLYWOOD': { name: 'BOLLYWOOD', xmlNotation: 'WORLD/BOLLYWOOD', path: ['Music', 'WORLD', 'BOLLYWOOD'], parent: 'AM-WORLD-00' },
    'AM-WORLD-CAJUN': { name: 'CAJUN & ZYDECO', xmlNotation: 'WORLD/CAJUN &amp; ZYDECO', path: ['Music', 'WORLD', 'CAJUN & ZYDECO'], parent: 'AM-WORLD-00' },
    'AM-WORLD-CELTIC': { name: 'CELTIC', xmlNotation: 'WORLD/CELTIC', path: ['Music', 'WORLD', 'CELTIC'], parent: 'AM-WORLD-00' },
    'AM-WORLD-INDIAN-POP': { name: 'INDIAN POP', xmlNotation: 'WORLD/INDIAN POP', path: ['Music', 'WORLD', 'INDIAN POP'], parent: 'AM-WORLD-00' },
    'AM-WORLD-KLETZMER': { name: 'KLETZMER', xmlNotation: 'WORLD/KLETZMER', path: ['Music', 'WORLD', 'KLETZMER'], parent: 'AM-WORLD-00' },
    'AM-WORLD-K-POP': { name: 'K-POP', xmlNotation: 'WORLD/K-POP', path: ['Music', 'WORLD', 'K-POP'], parent: 'AM-WORLD-00' },
    'AM-WORLD-POLKA': { name: 'POLKA', xmlNotation: 'WORLD/POLKA', path: ['Music', 'WORLD', 'POLKA'], parent: 'AM-WORLD-00' },
    'AM-WORLD-URBAN-DESI': { name: 'URBAN DESI', xmlNotation: 'WORLD/URBAN DESI', path: ['Music', 'WORLD', 'URBAN DESI'], parent: 'AM-WORLD-00' }
  },
  
  // Hierarchical structure for UI
  tree: {
    'ALTERNATIVE & INDIE': {
      code: 'AM-ALTERNATIVE-00',
      children: {
        'ALTERNATIVE DANCE': { code: 'AM-ALTERNATIVE-DANCE' },
        'AMERICAN ALTERNATIVE': { code: 'AM-ALTERNATIVE-AMERICAN' },
        'BRITISH ALTERNATIVE': { code: 'AM-ALTERNATIVE-BRITISH' },
        'EMO': { code: 'AM-ALTERNATIVE-EMO' },
        'EXPERIMENTAL ROCK': { code: 'AM-ALTERNATIVE-EXPERIMENTAL' },
        'GARAGE ROCK': { code: 'AM-ALTERNATIVE-GARAGE' },
        'GOTH & INDUSTRIAL': { code: 'AM-ALTERNATIVE-GOTH' },
        'GRUNGE': { code: 'AM-ALTERNATIVE-GRUNGE' },
        'HARDCORE & PUNK': { code: 'AM-ALTERNATIVE-HARDCORE' },
        'LO-FI': { code: 'AM-ALTERNATIVE-LOFI' },
        'NEW WAVE & POST-PUNK': { code: 'AM-ALTERNATIVE-NEWWAVE' },
        'NOISE': { code: 'AM-ALTERNATIVE-NOISE' },
        'PSYCHEDELIC': { code: 'AM-ALTERNATIVE-PSYCHEDELIC' },
        'SHOEGAZE': { code: 'AM-ALTERNATIVE-SHOEGAZE' },
        'SINGER-SONGWRITERS': { code: 'AM-ALTERNATIVE-SINGER' },
        'SKA': { code: 'AM-ALTERNATIVE-SKA' },
        'SPACE ROCK': { code: 'AM-ALTERNATIVE-SPACE' }
      }
    },
    'BLUES': {
      code: 'AM-BLUES-00',
      children: {
        'ACOUSTIC BLUES': { code: 'AM-BLUES-ACOUSTIC' },
        'CHICAGO BLUES': { code: 'AM-BLUES-CHICAGO' },
        'CLASSICAL FEMALE VOCAL BLUES': { code: 'AM-BLUES-CLASSICAL-FEMALE' },
        'CONTEMPORARY BLUES': { code: 'AM-BLUES-CONTEMPORARY' },
        'DELTA BLUES': { code: 'AM-BLUES-DELTA' },
        'ELECTRIC BLUES GUITAR': { code: 'AM-BLUES-ELECTRIC' },
        'JUMP BLUES': { code: 'AM-BLUES-JUMP' },
        'MODERN BLUES': { code: 'AM-BLUES-MODERN' },
        'PIANO BLUES': { code: 'AM-BLUES-PIANO' },
        'REGIONAL BLUES': { code: 'AM-BLUES-REGIONAL' },
        'TRADITIONAL BLUES': { code: 'AM-BLUES-TRADITIONAL' }
      }
    },
    'BROADWAY & VOCALISTS': {
      code: 'AM-BROADWAY-00',
      children: {
        'CABARET': { code: 'AM-BROADWAY-CABARET' },
        'CLASSIC VOCALISTS': { code: 'AM-BROADWAY-CLASSIC' },
        'MUSICALS': { code: 'AM-BROADWAY-MUSICALS' },
        'TRADITIONAL VOCAL POP': { code: 'AM-BROADWAY-TRADITIONAL' }
      }
    },
    'CHILDREN\'S MUSIC': {
      code: 'AM-CHILDREN-00',
      children: {
        'PRENATAL': { code: 'AM-CHILDREN-PRENATAL' },
        'TODDLER': { code: 'AM-CHILDREN-TODDLER' },
        'INFANT': { code: 'AM-CHILDREN-INFANT' },
        'ELEMENTARY SCHOOL AGE': { code: 'AM-CHILDREN-ELEMENTARY' },
        'TWEEN': { code: 'AM-CHILDREN-TWEEN' },
        'BABY EINSTEIN': { code: 'AM-CHILDREN-BABY-EINSTEIN' },
        'BARNEY': { code: 'AM-CHILDREN-BARNEY' },
        'CARTOON MUSIC': { code: 'AM-CHILDREN-CARTOON' },
        'DISNEY': { code: 'AM-CHILDREN-DISNEY' },
        'EDUCATIONAL': { code: 'AM-CHILDREN-EDUCATIONAL' },
        'FOLK': { code: 'AM-CHILDREN-FOLK' },
        'FRENCH LANGUAGE': { code: 'AM-CHILDREN-FRENCH' },
        'KIDZ BOP': { code: 'AM-CHILDREN-KIDZ-BOP' },
        'LULLABIES': { code: 'AM-CHILDREN-LULLABIES' },
        'MUSIC FOR LITTLE PEOPLE': { code: 'AM-CHILDREN-LITTLE-PEOPLE' },
        'POKEMON': { code: 'AM-CHILDREN-POKEMON' },
        'NURSERY RHYMES': { code: 'AM-CHILDREN-NURSERY' },
        'RELIGIOUS': { code: 'AM-CHILDREN-RELIGIOUS' },
        'SESAME STREET': { code: 'AM-CHILDREN-SESAME' },
        'SING-A-LONG': { code: 'AM-CHILDREN-SING' },
        'SPANISH LANGUAGE': { code: 'AM-CHILDREN-SPANISH' }
      }
    },
    'CHRISTIAN': {
      code: 'AM-CHRISTIAN-00',
      children: {
        'ACCOMPANIMENT': { code: 'AM-CHRISTIAN-ACCOMPANIMENT' },
        'CHILDREN\'S': { code: 'AM-CHRISTIAN-CHILDREN' },
        'COMPILATIONS': { code: 'AM-CHRISTIAN-COMPILATIONS' },
        'COUNTRY & BLUEGRASS': { code: 'AM-CHRISTIAN-COUNTRY' },
        'HARD ROCK & METAL': { code: 'AM-CHRISTIAN-HARD' },
        'INSTRUMENTAL': { code: 'AM-CHRISTIAN-INSTRUMENTAL' },
        'LIVE RECORDINGS': { code: 'AM-CHRISTIAN-LIVE' },
        'POP & CONTEMPORARY': { code: 'AM-CHRISTIAN-POP' },
        'PRAISE & WORSHIP': { code: 'AM-CHRISTIAN-PRAISE' },
        'RAP & HIP-HOP': { code: 'AM-CHRISTIAN-RAP' },
        'ROCK & ALTERNATIVE': { code: 'AM-CHRISTIAN-ROCK' },
        'SOUTHERN GOSPEL': { code: 'AM-CHRISTIAN-SOUTHERN' }
      }
    },
    'CLASSIC ROCK': {
      code: 'AM-CLASSIC-ROCK-00',
      children: {
        '1950S': { code: 'AM-CLASSIC-ROCK-1950S' },
        '1960S': { code: 'AM-CLASSIC-ROCK-1960S' },
        '1970S': { code: 'AM-CLASSIC-ROCK-1970S' },
        '1980S': { code: 'AM-CLASSIC-ROCK-1980S' },
        '1990S': { code: 'AM-CLASSIC-ROCK-1990S' },
        '2000S': { code: 'AM-CLASSIC-ROCK-2000S' },
        'ALBUM-ORIENTED ROCK (AOR)': { code: 'AM-CLASSIC-ROCK-AOR' },
        'ARENA ROCK': { code: 'AM-CLASSIC-ROCK-ARENA' },
        'BRITISH INVASION': { code: 'AM-CLASSIC-ROCK-BRITISH' },
        'GLAM': { code: 'AM-CLASSIC-ROCK-GLAM' },
        'PSYCHEDELIC ROCK': { code: 'AM-CLASSIC-ROCK-PSYCHEDELIC' },
        'SOUTHERN ROCK': { code: 'AM-CLASSIC-ROCK-SOUTHERN' },
        'SUPERGROUPS': { code: 'AM-CLASSIC-ROCK-SUPERGROUPS' }
      }
    },
    'CLASSICAL': {
      code: 'AM-CLASSICAL-00',
      children: {
        'EARLY MUSIC': { code: 'AM-CLASSICAL-EARLY' },
        'RENAISSANCE (C. 1450-1600)': { code: 'AM-CLASSICAL-RENAISSANCE' },
        'BAROQUE (C. 1600-1750)': { code: 'AM-CLASSICAL-BAROQUE' },
        'CLASSICAL (C. 1770-1830)': { code: 'AM-CLASSICAL-CLASSICAL' },
        'ROMANTIC (C. 1820-1910)': { code: 'AM-CLASSICAL-ROMANTIC' },
        'MODERN & 21ST CENTURY': { code: 'AM-CLASSICAL-MODERN' },
        'ORCHESTRAL': { code: 'AM-CLASSICAL-ORCHESTRAL' },
        'CHAMBER MUSIC': { code: 'AM-CLASSICAL-CHAMBER' },
        'BRASS & WIND BANDS': { code: 'AM-CLASSICAL-BRASS' },
        'KEYBOARD': { code: 'AM-CLASSICAL-KEYBOARD' },
        'CHILDREN\'S MUSIC': { code: 'AM-CLASSICAL-CHILDREN' },
        'CROSSOVER': { code: 'AM-CLASSICAL-CROSSOVER' }
      }
    },
    'COMEDY': {
      code: 'AM-COMEDY-00',
      children: {
        'ALTERNATIVE': { code: 'AM-COMEDY-ALTERNATIVE' },
        'IMPROVISATIONAL': { code: 'AM-COMEDY-IMPROVISATIONAL' },
        'MOCKUMENTARY': { code: 'AM-COMEDY-MOCKUMENTARY' },
        'MUSICAL': { code: 'AM-COMEDY-MUSICAL' },
        'SATIRE': { code: 'AM-COMEDY-SATIRE' },
        'SITCOMS': { code: 'AM-COMEDY-SITCOMS' },
        'SKETCH': { code: 'AM-COMEDY-SKETCH' },
        'STAND-UP': { code: 'AM-COMEDY-STANDUP' },
        'TELEVISION SERIES': { code: 'AM-COMEDY-TELEVISION' },
        'COMEDY TROUPES': { code: 'AM-COMEDY-TROUPES' }
      }
    },
    'COUNTRY': {
      code: 'AM-COUNTRY-00',
      children: {
        'ALT-COUNTRY & AMERICANA': { code: 'AM-COUNTRY-ALT' },
        'BLUEGRASS': { code: 'AM-COUNTRY-BLUEGRASS' },
        'CONTEMPORARY COUNTRY': { code: 'AM-COUNTRY-CONTEMPORARY' },
        'COUNTRY GOSPEL': { code: 'AM-COUNTRY-GOSPEL' },
        'COWBOY': { code: 'AM-COUNTRY-COWBOY' },
        'HONKY-TONK': { code: 'AM-COUNTRY-HONKY' },
        'NEO-TRADITIONAL COUNTRY': { code: 'AM-COUNTRY-NEO' },
        'OLD-TIMEY': { code: 'AM-COUNTRY-OLD' },
        'OUTLAW & PROGRESSIVE COUNTRY': { code: 'AM-COUNTRY-OUTLAW' },
        'TRADITIONAL COUNTRY': { code: 'AM-COUNTRY-TRADITIONAL' },
        'WESTERN SWING': { code: 'AM-COUNTRY-WESTERN' }
      }
    },
    'DANCE & ELECTRONIC': {
      code: 'AM-DANCE-00',
      children: {
        'HOUSE': { 
          code: 'AM-DANCE-HOUSE',
          children: {
            'VOCAL HOUSE': { code: 'AM-DANCE-HOUSE-VOCAL' },
            'DISCO HOUSE': { code: 'AM-DANCE-HOUSE-DISCO' },
            'PROGRESSIVE HOUSE': { code: 'AM-DANCE-HOUSE-PROGRESSIVE' },
            'DEEP HOUSE': { code: 'AM-DANCE-HOUSE-DEEP' },
            'TECH HOUSE': { code: 'AM-DANCE-HOUSE-TECH' },
            'ELECTRO HOUSE': { code: 'AM-DANCE-HOUSE-ELECTRO' },
            'HARD HOUSE': { code: 'AM-DANCE-HOUSE-HARD' }
          }
        },
        'TECHNO': { 
          code: 'AM-DANCE-TECHNO',
          children: {
            'DETROIT TECHNO': { code: 'AM-DANCE-TECHNO-DETROIT' },
            'MINIMAL TECHNO': { code: 'AM-DANCE-TECHNO-MINIMAL' },
            'ACID TECHNO': { code: 'AM-DANCE-TECHNO-ACID' },
            'HARDCORE': { code: 'AM-DANCE-TECHNO-HARDCORE' }
          }
        },
        'TRANCE': { 
          code: 'AM-DANCE-TRANCE',
          children: {
            'GOA & PSY-TRANCE': { code: 'AM-DANCE-TRANCE-GOA' },
            'HARD TRANCE': { code: 'AM-DANCE-TRANCE-HARD' }
          }
        },
        'DRUM & BASS': { 
          code: 'AM-DANCE-DRUM-BASS',
          children: {
            'JUNGLE': { code: 'AM-DANCE-DRUM-BASS-JUNGLE' },
            'LIQUID': { code: 'AM-DANCE-DRUM-BASS-LIQUID' }
          }
        },
        'AMBIENT': { code: 'AM-DANCE-AMBIENT' },
        'BREAKBEAT': { code: 'AM-DANCE-BREAKBEAT' },
        'DOWNTEMPO & TRIP-HOP': { code: 'AM-DANCE-DOWNTEMPO' },
        'DUBSTEP': { code: 'AM-DANCE-DUBSTEP' },
        'EURO-BEAT': { code: 'AM-DANCE-EUROBEAT' },
        'EXPERIMENTAL': { code: 'AM-DANCE-EXPERIMENTAL' },
        'NU-JAZZ': { code: 'AM-DANCE-NU-JAZZ' },
        'UK GARAGE': { 
          code: 'AM-DANCE-UK-GARAGE',
          children: {
            'GRIME': { code: 'AM-DANCE-UK-GARAGE-GRIME' }
          }
        }
      }
    },
    'FOLK': {
      code: 'AM-FOLK-00',
      children: {
        'ALT-FOLK': { code: 'AM-FOLK-ALT' },
        'CELTIC FOLK': { code: 'AM-FOLK-CELTIC' },
        'CONTEMPORARY FOLK': { code: 'AM-FOLK-CONTEMPORARY' },
        'CONTEMPORARY AMERICAN FOLK': { code: 'AM-FOLK-CONTEMPORARY-AMERICAN' },
        'CONTEMPORARY BRITISH FOLK': { code: 'AM-FOLK-CONTEMPORARY-BRITISH' },
        'JEWISH & YIDDISH MUSIC': { code: 'AM-FOLK-JEWISH' },
        'TRADITIONAL FOLK': { code: 'AM-FOLK-TRADITIONAL' },
        'TRADITIONAL AMERICAN FOLK': { code: 'AM-FOLK-TRADITIONAL-AMERICAN' },
        'TRADITIONAL BRITISH FOLK': { code: 'AM-FOLK-TRADITIONAL-BRITISH' }
      }
    },
    'GERMAN': {
      code: 'AM-GERMAN-00',
      children: {
        'HIP-HOP': { code: 'AM-GERMAN-HIP-HOP' },
        'KRAUTROCK': { code: 'AM-GERMAN-KRAUTROCK' },
        'LIEDERMACHER': { code: 'AM-GERMAN-LIEDERMACHER' },
        'NEUE DEUTSCHE WELLE': { code: 'AM-GERMAN-NEUE' },
        'POP': { code: 'AM-GERMAN-POP' },
        'PUNK': { code: 'AM-GERMAN-PUNK' },
        'ROCK': { code: 'AM-GERMAN-ROCK' },
        'SCHLAGER': { code: 'AM-GERMAN-SCHLAGER' },
        'VOLKSMUSIK': { code: 'AM-GERMAN-VOLKSMUSIK' },
        'VOLKSTUMLICHE MUSIK': { code: 'AM-GERMAN-VOLKSTUMLICHE' }
      }
    },
    'GOSPEL': {
      code: 'AM-GOSPEL-00',
      children: {
        'ACCOMPANIMENT': { code: 'AM-GOSPEL-ACCOMPANIMENT' },
        'CHOIR': { code: 'AM-GOSPEL-CHOIR' },
        'COMPILATIONS': { code: 'AM-GOSPEL-COMPILATIONS' },
        'INSTRUMENTAL': { code: 'AM-GOSPEL-INSTRUMENTAL' },
        'RAP & HIP-HOP': { code: 'AM-GOSPEL-RAP' },
        'TRADITIONAL': { code: 'AM-GOSPEL-TRADITIONAL' },
        'URBAN & CONTEMPORARY': { code: 'AM-GOSPEL-URBAN' }
      }
    },
    'HARD ROCK & METAL': {
      code: 'AM-HARD-ROCK-00',
      children: {
        'ALTERNATIVE METAL': { code: 'AM-HARD-ROCK-ALTERNATIVE' },
        'BLACK METAL': { code: 'AM-HARD-ROCK-BLACK' },
        'DEATH METAL': { code: 'AM-HARD-ROCK-DEATH' },
        'DOOM METAL': { code: 'AM-HARD-ROCK-DOOM' },
        'GLAM METAL': { code: 'AM-HARD-ROCK-GLAM' },
        'GOTHIC METAL': { code: 'AM-HARD-ROCK-GOTHIC' },
        'GRINDCORE': { code: 'AM-HARD-ROCK-GRINDCORE' },
        'GROOVE METAL': { code: 'AM-HARD-ROCK-GROOVE' },
        'HARD ROCK': { code: 'AM-HARD-ROCK-HARD' },
        'HEAVY METAL': { code: 'AM-HARD-ROCK-HEAVY' },
        'METALCORE': { code: 'AM-HARD-ROCK-METALCORE' },
        'POWER & TRUE METAL': { code: 'AM-HARD-ROCK-POWER' },
        'PROGRESSIVE METAL': { code: 'AM-HARD-ROCK-PROGRESSIVE' },
        'RAP & NU METAL': { code: 'AM-HARD-ROCK-RAP' },
        'SCREAMO': { code: 'AM-HARD-ROCK-SCREAMO' },
        'SLUDGE METAL': { code: 'AM-HARD-ROCK-SLUDGE' },
        'STONER METAL': { code: 'AM-HARD-ROCK-STONER' },
        'SYMPHONIC METAL': { code: 'AM-HARD-ROCK-SYMPHONIC' },
        'THRASH & SPEED METAL': { code: 'AM-HARD-ROCK-THRASH' }
      }
    },
    'HAWAIIAN': {
      code: 'AM-HAWAIIAN-00',
      children: {
        'CHANT': { code: 'AM-HAWAIIAN-CHANT' },
        'CONTEMPORARY HAWAIIAN': { code: 'AM-HAWAIIAN-CONTEMPORARY' },
        'UKULELE': { code: 'AM-HAWAIIAN-UKULELE' },
        'HULA': { code: 'AM-HAWAIIAN-HULA' },
        'JAWAIIAN': { code: 'AM-HAWAIIAN-JAWAIIAN' },
        'SLACK KEY': { code: 'AM-HAWAIIAN-SLACK' }
      }
    },
    'J-JAZZ': { code: 'AM-J-JAZZ-00', children: {} },
    'J-POP': {
      code: 'AM-J-POP-00',
      children: {
        'ELECTRONICA': { code: 'AM-J-POP-ELECTRONICA' },
        'FOLK': { code: 'AM-J-POP-FOLK' },
        'HIP-HOP': { code: 'AM-J-POP-HIP-HOP' },
        'POP': { code: 'AM-J-POP-POP' },
        'PUNK & HARD CORE': { code: 'AM-J-POP-PUNK' },
        'R&B': { code: 'AM-J-POP-RB' },
        'REGGAE': { code: 'AM-J-POP-REGGAE' },
        'ROCK': { code: 'AM-J-POP-ROCK' }
      }
    },
    'JAPANESE BALLADS': {
      code: 'AM-JAPANESE-BALLADS-00',
      children: {
        'ENKA': { code: 'AM-JAPANESE-BALLADS-ENKA' },
        'JAPANESE WAR SONGS': { code: 'AM-JAPANESE-BALLADS-WAR' },
        'KAYOKYOKU': { code: 'AM-JAPANESE-BALLADS-KAYOKYOKU' }
      }
    },
    'JAPANESE TRADITIONAL': {
      code: 'AM-JAPANESE-TRADITIONAL-00',
      children: {
        'BUDDHIST MUSIC': { code: 'AM-JAPANESE-TRADITIONAL-BUDDHIST' },
        'COMEDY': { code: 'AM-JAPANESE-TRADITIONAL-COMEDY' },
        'FOLK SONGS': { code: 'AM-JAPANESE-TRADITIONAL-FOLK' },
        'PERFORMING ARTS': { code: 'AM-JAPANESE-TRADITIONAL-PERFORMING' },
        'RAKUGO': { code: 'AM-JAPANESE-TRADITIONAL-RAKUGO' },
        'ROKYOKU AND KOUDAN': { code: 'AM-JAPANESE-TRADITIONAL-ROKYOKU' }
      }
    },
    'JAZZ': {
      code: 'AM-JAZZ-00',
      children: {
        'ACID & SOUL JAZZ': { code: 'AM-JAZZ-ACID' },
        'AVANT GARDE & FREE JAZZ': { code: 'AM-JAZZ-AVANT' },
        'BEBOP': { code: 'AM-JAZZ-BEBOP' },
        'BRAZILIAN JAZZ': { code: 'AM-JAZZ-BRAZILIAN' },
        'CONTEMPORARY JAZZ': { code: 'AM-JAZZ-CONTEMPORARY' },
        'COOL JAZZ': { code: 'AM-JAZZ-COOL' },
        'HARD BOP & POST-BOP': { code: 'AM-JAZZ-HARD' },
        'JAZZ FUSION': { code: 'AM-JAZZ-FUSION' },
        'LATIN JAZZ': { code: 'AM-JAZZ-LATIN' },
        'BIG BAND & ORCHESTRAL JAZZ': { code: 'AM-JAZZ-BIG' },
        'SMOOTH JAZZ': { code: 'AM-JAZZ-SMOOTH' },
        'SWING': { code: 'AM-JAZZ-SWING' },
        'TRADITIONAL JAZZ & RAGTIME': { code: 'AM-JAZZ-TRADITIONAL' },
        'VOCAL JAZZ': { code: 'AM-JAZZ-VOCAL' }
      }
    },
    'K-POP': { code: 'AM-K-POP-00', children: {} },
    'LATIN MUSIC': {
      code: 'AM-LATIN-00',
      children: {
        'BACHATA': { code: 'AM-LATIN-BACHATA' },
        'BANDA': { code: 'AM-LATIN-BANDA' },
        'BIG BAND': { code: 'AM-LATIN-BIG-BAND' },
        'BOLERO': { code: 'AM-LATIN-BOLERO' },
        'BRAZILIAN': { code: 'AM-LATIN-BRAZILIAN' },
        'CHRISTIAN': { code: 'AM-LATIN-CHRISTIAN' },
        'CONJUNTO': { code: 'AM-LATIN-CONJUNTO' },
        'CORRIDOS': { code: 'AM-LATIN-CORRIDOS' },
        'CUBAN': { code: 'AM-LATIN-CUBAN' },
        'CUMBIA': { code: 'AM-LATIN-CUMBIA' },
        'DURANGUENSE': { code: 'AM-LATIN-DURANGUENSE' },
        'ELECTRONICA': { code: 'AM-LATIN-ELECTRONICA' },
        'FLAMENCO': { code: 'AM-LATIN-FLAMENCO' },
        'GRUPERO': { code: 'AM-LATIN-GRUPERO' },
        'HIP HOP': { code: 'AM-LATIN-HIP-HOP' },
        'LATIN POP': { code: 'AM-LATIN-POP' },
        'LATIN RAP': { code: 'AM-LATIN-RAP' },
        'MAMBO': { code: 'AM-LATIN-MAMBO' },
        'MARIACHI': { code: 'AM-LATIN-MARIACHI' },
        'MERENGUE': { code: 'AM-LATIN-MERENGUE' },
        'NORTENO': { code: 'AM-LATIN-NORTENO' },
        'NORTEÑO': { code: 'AM-LATIN-NORTEÑO' },
        'RANCHERA': { code: 'AM-LATIN-RANCHERA' },
        'REGGAETON': { code: 'AM-LATIN-REGGAETON' },
        'ROCK EN ESPANOL': { code: 'AM-LATIN-ROCK' },
        'SALSA': { code: 'AM-LATIN-SALSA' },
        'SIERREÑO': { code: 'AM-LATIN-SIERREÑO' },
        'SONIDERO': { code: 'AM-LATIN-SONIDERO' },
        'TANGO': { code: 'AM-LATIN-TANGO' },
        'TEJANO': { code: 'AM-LATIN-TEJANO' },
        'TIERRA CALIENTE': { code: 'AM-LATIN-TIERRA' },
        'TRADITIONAL MEXICAN': { code: 'AM-LATIN-TRADITIONAL' },
        'VALLENATO': { code: 'AM-LATIN-VALLENATO' }
      }
    },
    'MISCELLANEOUS': {
      code: 'AM-MISC-00',
      children: {
        'ANIMAL SOUNDS': { code: 'AM-MISC-ANIMAL' },
        'EXERCISE': { code: 'AM-MISC-EXERCISE' },
        'EXPERIMENTAL MUSIC': { code: 'AM-MISC-EXPERIMENTAL' },
        'GAY & LESBIAN': { code: 'AM-MISC-GAY' },
        'HOLIDAY': { code: 'AM-MISC-HOLIDAY' },
        'CHRISTMAS': { code: 'AM-MISC-CHRISTMAS' },
        'HALLOWEEN': { code: 'AM-MISC-HALLOWEEN' },
        'INSTRUCTIONAL': { code: 'AM-MISC-INSTRUCTIONAL' },
        'KARAOKE': { code: 'AM-MISC-KARAOKE' },
        'MUSIC BOX MUSIC': { code: 'AM-MISC-MUSIC-BOX' },
        'NATIONAL ANTHEMS': { code: 'AM-MISC-ANTHEMS' },
        'NOSTALGIA': { code: 'AM-MISC-NOSTALGIA' },
        'OTHER': { code: 'AM-MISC-OTHER' },
        'PACHINKO AND SLOT MACHINE MUSIC': { code: 'AM-MISC-PACHINKO' },
        'PATRIOTIC (U.S.A.)': { code: 'AM-MISC-PATRIOTIC' },
        'RINGTONE': { code: 'AM-MISC-RINGTONE' },
        'SELF-HELP': { code: 'AM-MISC-SELF-HELP' },
        'SOUND EFFECTS': { code: 'AM-MISC-SOUND' },
        'SPORTS': { 
          code: 'AM-MISC-SPORTS',
          children: {
            'BASEBALL': { code: 'AM-MISC-SPORTS-BASEBALL' },
            'MARTIAL ARTS': { code: 'AM-MISC-SPORTS-MARTIAL' },
            'OTHER SPORTS': { code: 'AM-MISC-SPORTS-OTHER' },
            'SOCCER': { code: 'AM-MISC-SPORTS-SOCCER' }
          }
        },
        'TEST RECORDINGS': { code: 'AM-MISC-TEST' },
        'WEDDING MUSIC': { code: 'AM-MISC-WEDDING' }
      }
    },
    'NEW AGE': {
      code: 'AM-NEW-AGE-00',
      children: {
        'CELTIC NEW AGE': { code: 'AM-NEW-AGE-CELTIC' },
        'ENVIRONMENTAL NEW AGE': { code: 'AM-NEW-AGE-ENVIRONMENTAL' },
        'HEALING': { code: 'AM-NEW-AGE-HEALING' },
        'MEDITATION': { code: 'AM-NEW-AGE-MEDITATION' }
      }
    },
    'OPERA & CHORAL': {
      code: 'AM-OPERA-00',
      children: {
        'EARLY MUSIC': { code: 'AM-OPERA-EARLY' },
        'RENAISSANCE (C. 1450-1600)': { code: 'AM-OPERA-RENAISSANCE' },
        'BAROQUE (C. 1600-1750)': { code: 'AM-OPERA-BAROQUE' },
        'CLASSICAL (C. 1770-1830)': { code: 'AM-OPERA-CLASSICAL' },
        'ROMANTIC (C. 1820-1910)': { code: 'AM-OPERA-ROMANTIC' },
        'MODERN & 21ST CENTURY': { code: 'AM-OPERA-MODERN' },
        'ARIAS': { code: 'AM-OPERA-ARIAS' },
        'OPERETTAS': { code: 'AM-OPERA-OPERETTAS' },
        'ORATORIOS': { code: 'AM-OPERA-ORATORIOS' },
        'CHORAL NON-OPERA': { code: 'AM-OPERA-CHORAL' },
        'ART SONG': { code: 'AM-OPERA-ART-SONG' },
        'CROSSOVER': { code: 'AM-OPERA-CROSSOVER' },
        'CHILDREN\'S MUSIC': { code: 'AM-OPERA-CHILDREN' }
      }
    },
    'POP': {
      code: 'AM-POP-00',
      children: {
        'ADULT ALTERNATIVE': { code: 'AM-POP-ADULT-ALT' },
        'ADULT CONTEMPORARY': { code: 'AM-POP-ADULT-CONT' },
        'DANCE POP': { code: 'AM-POP-DANCE' },
        'DISCO': { code: 'AM-POP-DISCO' },
        'EASY LISTENING': { code: 'AM-POP-EASY' },
        'EURO POP': { code: 'AM-POP-EURO' },
        'OLDIES': { code: 'AM-POP-OLDIES' },
        'POP R&B': { code: 'AM-POP-RB' },
        'POP RAP': { code: 'AM-POP-RAP' },
        'POP ROCK': { code: 'AM-POP-ROCK' },
        'SINGER-SONGWRITERS': { code: 'AM-POP-SINGER' },
        'SOFT ROCK': { code: 'AM-POP-SOFT' },
        'VOCAL POP': { code: 'AM-POP-VOCAL' }
      }
    },
    'R&B': {
      code: 'AM-RB-00',
      children: {
        'CLASSIC R&B': { code: 'AM-RB-CLASSIC' },
        'FUNK': { code: 'AM-RB-FUNK' },
        'MOTOWN': { code: 'AM-RB-MOTOWN' },
        'NEO-SOUL': { code: 'AM-RB-NEO-SOUL' },
        'NEW JACK': { code: 'AM-RB-NEW-JACK' },
        'QUIET STORM': { code: 'AM-RB-QUIET' },
        'SOUL': { 
          code: 'AM-RB-SOUL',
          children: {
            'NORTHERN SOUL': { code: 'AM-RB-SOUL-NORTHERN' },
            'PHILLY SOUL': { code: 'AM-RB-SOUL-PHILLY' },
            'SOUTHERN SOUL': { code: 'AM-RB-SOUL-SOUTHERN' }
          }
        },
        'URBAN': { code: 'AM-RB-URBAN' }
      }
    },
    'RAP & HIP-HOP': {
      code: 'AM-RAP-00',
      children: {
        'EAST COAST': { code: 'AM-RAP-EAST' },
        'EXPERIMENTAL RAP': { code: 'AM-RAP-EXPERIMENTAL' },
        'GANGSTA & HARDCORE': { code: 'AM-RAP-GANGSTA' },
        'ALTERNATIVE': { code: 'AM-RAP-ALTERNATIVE' },
        'INTERNATIONAL RAP': { code: 'AM-RAP-INTERNATIONAL' },
        'OLD SCHOOL': { code: 'AM-RAP-OLD' },
        'SOUTHERN RAP': { code: 'AM-RAP-SOUTHERN' },
        'WEST COAST': { code: 'AM-RAP-WEST' },
        'GERMAN RAP': { code: 'AM-RAP-GERMAN' },
        'FRENCH RAP': { code: 'AM-RAP-FRENCH' },
        'UK HIP HOP': { code: 'AM-RAP-UK' }
      }
    },
    'REGGAE': {
      code: 'AM-REGGAE-00',
      children: {
        'DANCEHALL': { code: 'AM-REGGAE-DANCEHALL' },
        'DUB': { code: 'AM-REGGAE-DUB' },
        'SKA': { code: 'AM-REGGAE-SKA' },
        'ROCKSTEADY': { code: 'AM-REGGAE-ROCKSTEADY' },
        'ROOTS': { code: 'AM-REGGAE-ROOTS' }
      }
    },
    'ROCK': {
      code: 'AM-ROCK-00',
      children: {
        'BLUES ROCK': { code: 'AM-ROCK-BLUES' },
        'COUNTRY ROCK': { code: 'AM-ROCK-COUNTRY' },
        'FOLK ROCK': { code: 'AM-ROCK-FOLK' },
        'FUNK ROCK': { code: 'AM-ROCK-FUNK' },
        'JAM BANDS': { code: 'AM-ROCK-JAM' },
        'OLDIES & RETRO': { code: 'AM-ROCK-OLDIES' },
        'ROCK AND ROLL': { code: 'AM-ROCK-ROLL' },
        'ROCKABILLY': { code: 'AM-ROCK-ROCKABILLY' },
        'PROGRESSIVE': { code: 'AM-ROCK-PROGRESSIVE' },
        'ROOTS ROCK': { code: 'AM-ROCK-ROOTS' },
        'SINGER-SONGWRITER': { code: 'AM-ROCK-SINGER' }
      }
    },
    'SOUNDTRACKS': {
      code: 'AM-SOUNDTRACKS-00',
      children: {
        'ANIME': { code: 'AM-SOUNDTRACKS-ANIME' },
        'VIDEO GAMES': { code: 'AM-SOUNDTRACKS-GAMES' },
        'JAPANESE MOVIES': { code: 'AM-SOUNDTRACKS-JP-MOVIES' },
        'JAPANESE TV SERIES': { code: 'AM-SOUNDTRACKS-JP-TV' },
        'MOVIE SCORES': { code: 'AM-SOUNDTRACKS-SCORES' },
        'MOVIE SOUNDTRACKS': { code: 'AM-SOUNDTRACKS-MOVIES' },
        'TELEVISION SOUNDTRACKS': { code: 'AM-SOUNDTRACKS-TV' }
      }
    },
    'SPOKEN WORD': {
      code: 'AM-SPOKEN-00',
      children: {
        'HISTORY': { code: 'AM-SPOKEN-HISTORY' },
        'INTERVIEWS': { code: 'AM-SPOKEN-INTERVIEWS' },
        'POETRY': { code: 'AM-SPOKEN-POETRY' },
        'RADIO': { code: 'AM-SPOKEN-RADIO' },
        'SPEECHES': { code: 'AM-SPOKEN-SPEECHES' }
      }
    },
    'VARIETE FRANCAISE': { code: 'AM-VARIETE-00', children: {} },
    'WORLD': {
      code: 'AM-WORLD-00',
      children: {
        'AFRICA': { 
          code: 'AM-WORLD-AFRICA',
          children: {
            'NORTH AFRICA': { code: 'AM-WORLD-AFRICA-NORTH' },
            'EAST AFRICA': { code: 'AM-WORLD-AFRICA-EAST' },
            'SOUTH AFRICA': { code: 'AM-WORLD-AFRICA-SOUTH' },
            'WEST AFRICA': { code: 'AM-WORLD-AFRICA-WEST' }
          }
        },
        'AUSTRALIA & NEW ZEALAND': { code: 'AM-WORLD-AUSTRALIA' },
        'CARIBBEAN & CUBA': { code: 'AM-WORLD-CARIBBEAN' },
        'EUROPE': { 
          code: 'AM-WORLD-EUROPE',
          children: {
            'BALKANS': { code: 'AM-WORLD-EUROPE-BALKANS' },
            'EASTERN EUROPE': { code: 'AM-WORLD-EUROPE-EASTERN' },
            'FRANCE': { code: 'AM-WORLD-EUROPE-FRANCE' },
            'GERMANY': { code: 'AM-WORLD-EUROPE-GERMANY' },
            'GREECE': { code: 'AM-WORLD-EUROPE-GREECE' },
            'ITALY': { code: 'AM-WORLD-EUROPE-ITALY' },
            'PORTUGAL': { code: 'AM-WORLD-EUROPE-PORTUGAL' },
            'SCANDINAVIA': { code: 'AM-WORLD-EUROPE-SCANDINAVIA' },
            'SPAIN': { code: 'AM-WORLD-EUROPE-SPAIN' },
            'TURKEY': { code: 'AM-WORLD-EUROPE-TURKEY' }
          }
        },
        'FAR EAST & ASIA': { 
          code: 'AM-WORLD-FAR-EAST',
          children: {
            'CHINA': { code: 'AM-WORLD-FAR-EAST-CHINA' },
            'INDONESIA': { code: 'AM-WORLD-FAR-EAST-INDONESIA' },
            'JAPAN': { code: 'AM-WORLD-FAR-EAST-JAPAN' },
            'KOREA': { code: 'AM-WORLD-FAR-EAST-KOREA' }
          }
        },
        'INDIA & PAKISTAN': { code: 'AM-WORLD-INDIA' },
        'MEXICO': { code: 'AM-WORLD-MEXICO' },
        'MIDDLE EAST': { code: 'AM-WORLD-MIDDLE-EAST' },
        'NORTH AMERICA': { code: 'AM-WORLD-NORTH-AMERICA' },
        'PACIFIC ISLANDS': { code: 'AM-WORLD-PACIFIC' },
        'RUSSIA & FORMER SOVIET REPUBLICS': { code: 'AM-WORLD-RUSSIA' },
        'SOUTH & CENTRAL AMERICA': { 
          code: 'AM-WORLD-SOUTH-AMERICA',
          children: {
            'ARGENTINA': { code: 'AM-WORLD-SOUTH-AMERICA-ARGENTINA' },
            'BRAZIL': { code: 'AM-WORLD-SOUTH-AMERICA-BRAZIL' },
            'COLOMBIA': { code: 'AM-WORLD-SOUTH-AMERICA-COLOMBIA' },
            'PANAMA': { code: 'AM-WORLD-SOUTH-AMERICA-PANAMA' },
            'PERU': { code: 'AM-WORLD-SOUTH-AMERICA-PERU' }
          }
        },
        'AFRO-POP': { code: 'AM-WORLD-AFRO-POP' },
        'AFRO-BEAT': { code: 'AM-WORLD-AFRO-BEAT' },
        'BALKAN BEAT': { code: 'AM-WORLD-BALKAN-BEAT' },
        'BHANGRA': { code: 'AM-WORLD-BHANGRA' },
        'BOLLYWOOD': { code: 'AM-WORLD-BOLLYWOOD' },
        'CAJUN & ZYDECO': { code: 'AM-WORLD-CAJUN' },
        'CELTIC': { code: 'AM-WORLD-CELTIC' },
        'INDIAN POP': { code: 'AM-WORLD-INDIAN-POP' },
        'KLETZMER': { code: 'AM-WORLD-KLETZMER' },
        'K-POP': { code: 'AM-WORLD-K-POP' },
        'POLKA': { code: 'AM-WORLD-POLKA' },
        'URBAN DESI': { code: 'AM-WORLD-URBAN-DESI' }
      }
    }
  }
}

// Helper function to get genre by code
export function getGenreByCode(code) {
  return AMAZON_GENRES.byCode[code] || null
}

// Helper function to get genre path as string
export function getGenrePath(code) {
  const genre = getGenreByCode(code)
  return genre ? genre.path.join(' > ') : ''
}

// Helper function to get XML notation (with ampersands encoded)
export function getXmlNotation(code) {
  const genre = getGenreByCode(code)
  return genre ? genre.xmlNotation : null
}

// Helper function to search genres
export function searchGenres(query) {
  const lowerQuery = query.toLowerCase()
  return Object.entries(AMAZON_GENRES.byCode)
    .filter(([code, genre]) => 
      genre.name.toLowerCase().includes(lowerQuery) ||
      code.toLowerCase().includes(lowerQuery) ||
      (genre.xmlNotation && genre.xmlNotation.toLowerCase().includes(lowerQuery))
    )
    .map(([code, genre]) => ({ code, ...genre }))
}

export default AMAZON_GENRES