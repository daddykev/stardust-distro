// src/dictionaries/languages/index.js

/**
 * Language Dictionary based on ISO 639-1 and ISO 639-2
 * Used for DDEX metadata and content descriptions
 */

// Most commonly used languages in music distribution
export const MAJOR_LANGUAGES = [
  { iso1: 'en', iso2b: 'eng', iso2t: 'eng', name: 'English', nativeName: 'English' },
  { iso1: 'es', iso2b: 'spa', iso2t: 'spa', name: 'Spanish', nativeName: 'Español' },
  { iso1: 'fr', iso2b: 'fre', iso2t: 'fra', name: 'French', nativeName: 'Français' },
  { iso1: 'de', iso2b: 'ger', iso2t: 'deu', name: 'German', nativeName: 'Deutsch' },
  { iso1: 'it', iso2b: 'ita', iso2t: 'ita', name: 'Italian', nativeName: 'Italiano' },
  { iso1: 'pt', iso2b: 'por', iso2t: 'por', name: 'Portuguese', nativeName: 'Português' },
  { iso1: 'ja', iso2b: 'jpn', iso2t: 'jpn', name: 'Japanese', nativeName: '日本語' },
  { iso1: 'ko', iso2b: 'kor', iso2t: 'kor', name: 'Korean', nativeName: '한국어' },
  { iso1: 'zh', iso2b: 'chi', iso2t: 'zho', name: 'Chinese', nativeName: '中文' },
  { iso1: 'ru', iso2b: 'rus', iso2t: 'rus', name: 'Russian', nativeName: 'Русский' }
];

// Complete language list for DDEX compliance
export const LANGUAGES = [
  ...MAJOR_LANGUAGES,
  { iso1: 'ar', iso2b: 'ara', iso2t: 'ara', name: 'Arabic', nativeName: 'العربية' },
  { iso1: 'bg', iso2b: 'bul', iso2t: 'bul', name: 'Bulgarian', nativeName: 'Български' },
  { iso1: 'ca', iso2b: 'cat', iso2t: 'cat', name: 'Catalan', nativeName: 'Català' },
  { iso1: 'cs', iso2b: 'cze', iso2t: 'ces', name: 'Czech', nativeName: 'Čeština' },
  { iso1: 'da', iso2b: 'dan', iso2t: 'dan', name: 'Danish', nativeName: 'Dansk' },
  { iso1: 'nl', iso2b: 'dut', iso2t: 'nld', name: 'Dutch', nativeName: 'Nederlands' },
  { iso1: 'el', iso2b: 'gre', iso2t: 'ell', name: 'Greek', nativeName: 'Ελληνικά' },
  { iso1: 'fi', iso2b: 'fin', iso2t: 'fin', name: 'Finnish', nativeName: 'Suomi' },
  { iso1: 'he', iso2b: 'heb', iso2t: 'heb', name: 'Hebrew', nativeName: 'עברית' },
  { iso1: 'hi', iso2b: 'hin', iso2t: 'hin', name: 'Hindi', nativeName: 'हिन्दी' },
  { iso1: 'hr', iso2b: 'hrv', iso2t: 'hrv', name: 'Croatian', nativeName: 'Hrvatski' },
  { iso1: 'hu', iso2b: 'hun', iso2t: 'hun', name: 'Hungarian', nativeName: 'Magyar' },
  { iso1: 'id', iso2b: 'ind', iso2t: 'ind', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { iso1: 'is', iso2b: 'ice', iso2t: 'isl', name: 'Icelandic', nativeName: 'Íslenska' },
  { iso1: 'lt', iso2b: 'lit', iso2t: 'lit', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { iso1: 'lv', iso2b: 'lav', iso2t: 'lav', name: 'Latvian', nativeName: 'Latviešu' },
  { iso1: 'ms', iso2b: 'may', iso2t: 'msa', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { iso1: 'no', iso2b: 'nor', iso2t: 'nor', name: 'Norwegian', nativeName: 'Norsk' },
  { iso1: 'pl', iso2b: 'pol', iso2t: 'pol', name: 'Polish', nativeName: 'Polski' },
  { iso1: 'ro', iso2b: 'rum', iso2t: 'ron', name: 'Romanian', nativeName: 'Română' },
  { iso1: 'sk', iso2b: 'slo', iso2t: 'slk', name: 'Slovak', nativeName: 'Slovenčina' },
  { iso1: 'sl', iso2b: 'slv', iso2t: 'slv', name: 'Slovenian', nativeName: 'Slovenščina' },
  { iso1: 'sr', iso2b: 'srp', iso2t: 'srp', name: 'Serbian', nativeName: 'Српски' },
  { iso1: 'sv', iso2b: 'swe', iso2t: 'swe', name: 'Swedish', nativeName: 'Svenska' },
  { iso1: 'th', iso2b: 'tha', iso2t: 'tha', name: 'Thai', nativeName: 'ไทย' },
  { iso1: 'tr', iso2b: 'tur', iso2t: 'tur', name: 'Turkish', nativeName: 'Türkçe' },
  { iso1: 'uk', iso2b: 'ukr', iso2t: 'ukr', name: 'Ukrainian', nativeName: 'Українська' },
  { iso1: 'vi', iso2b: 'vie', iso2t: 'vie', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { iso1: 'af', iso2b: 'afr', iso2t: 'afr', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { iso1: 'sq', iso2b: 'alb', iso2t: 'sqi', name: 'Albanian', nativeName: 'Shqip' },
  { iso1: 'eu', iso2b: 'baq', iso2t: 'eus', name: 'Basque', nativeName: 'Euskara' },
  { iso1: 'bn', iso2b: 'ben', iso2t: 'ben', name: 'Bengali', nativeName: 'বাংলা' },
  { iso1: 'et', iso2b: 'est', iso2t: 'est', name: 'Estonian', nativeName: 'Eesti' },
  { iso1: 'fa', iso2b: 'per', iso2t: 'fas', name: 'Persian', nativeName: 'فارسی' },
  { iso1: 'ga', iso2b: 'gle', iso2t: 'gle', name: 'Irish', nativeName: 'Gaeilge' },
  { iso1: 'gl', iso2b: 'glg', iso2t: 'glg', name: 'Galician', nativeName: 'Galego' },
  { iso1: 'gu', iso2b: 'guj', iso2t: 'guj', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { iso1: 'kn', iso2b: 'kan', iso2t: 'kan', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { iso1: 'ml', iso2b: 'mal', iso2t: 'mal', name: 'Malayalam', nativeName: 'മലയാളം' },
  { iso1: 'mr', iso2b: 'mar', iso2t: 'mar', name: 'Marathi', nativeName: 'मराठी' },
  { iso1: 'pa', iso2b: 'pan', iso2t: 'pan', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { iso1: 'sw', iso2b: 'swa', iso2t: 'swa', name: 'Swahili', nativeName: 'Kiswahili' },
  { iso1: 'ta', iso2b: 'tam', iso2t: 'tam', name: 'Tamil', nativeName: 'தமிழ்' },
  { iso1: 'te', iso2b: 'tel', iso2t: 'tel', name: 'Telugu', nativeName: 'తెలుగు' },
  { iso1: 'ur', iso2b: 'urd', iso2t: 'urd', name: 'Urdu', nativeName: 'اردو' },
  { iso1: 'cy', iso2b: 'wel', iso2t: 'cym', name: 'Welsh', nativeName: 'Cymraeg' }
];

// Special language codes for DDEX
export const SPECIAL_CODES = [
  { iso1: 'und', iso2b: 'und', iso2t: 'und', name: 'Undetermined', nativeName: 'Unknown' },
  { iso1: 'mul', iso2b: 'mul', iso2t: 'mul', name: 'Multiple languages', nativeName: 'Multiple' },
  { iso1: 'zxx', iso2b: 'zxx', iso2t: 'zxx', name: 'No linguistic content', nativeName: 'None' }
];

// Helper functions
export function getLanguageByISO1(code) {
  return [...LANGUAGES, ...SPECIAL_CODES].find(l => l.iso1 === code);
}

export function getLanguageByISO2(code) {
  return [...LANGUAGES, ...SPECIAL_CODES].find(l => 
    l.iso2b === code || l.iso2t === code
  );
}

export function getLanguageOptions() {
  return LANGUAGES.map(l => ({
    value: l.iso1,
    label: `${l.name} (${l.iso1})`,
    nativeName: l.nativeName
  }));
}

export function getMajorLanguageOptions() {
  return MAJOR_LANGUAGES.map(l => ({
    value: l.iso1,
    label: `${l.name} (${l.iso1})`,
    nativeName: l.nativeName
  }));
}

// Get DDEX-compliant language code (ISO 639-2/B)
export function getDDEXLanguageCode(iso1Code) {
  const language = getLanguageByISO1(iso1Code);
  return language ? language.iso2b : 'und';
}

// Default export
export default {
  LANGUAGES,
  MAJOR_LANGUAGES,
  SPECIAL_CODES,
  getLanguageByISO1,
  getLanguageByISO2,
  getLanguageOptions,
  getMajorLanguageOptions,
  getDDEXLanguageCode
};