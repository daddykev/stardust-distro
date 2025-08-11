// packages/@stardust-distro/common/src/constants/index.ts
export const SUPPORTED_AUDIO_FORMATS = ['WAV', 'FLAC', 'MP3'] as const;
export const SUPPORTED_IMAGE_FORMATS = ['JPEG', 'PNG'] as const;
export const SUPPORTED_ERN_VERSIONS = ['3.8.2', '4.2', '4.3'] as const;

export const DEFAULT_ERN_VERSION = '4.3';
export const DEFAULT_TERRITORY = 'Worldwide';

export const MAX_FILE_SIZE = {
  AUDIO: 500 * 1024 * 1024, // 500MB
  IMAGE: 10 * 1024 * 1024,  // 10MB
  DOCUMENT: 50 * 1024 * 1024 // 50MB
} as const;

export const IMAGE_REQUIREMENTS = {
  FRONT_COVER: {
    minWidth: 1400,
    minHeight: 1400,
    maxWidth: 4000,
    maxHeight: 4000,
    aspectRatio: 1
  },
  ARTIST_IMAGE: {
    minWidth: 800,
    minHeight: 800
  }
} as const;

export const DELIVERY_PROTOCOLS = {
  FTP: 'FTP',
  SFTP: 'SFTP',
  S3: 'S3',
  AZURE: 'Azure',
  API: 'API'
} as const;