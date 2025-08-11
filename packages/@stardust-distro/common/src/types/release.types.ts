// packages/@stardust-distro/common/src/types/release.types.ts
export interface Release {
  id: string;
  tenantId: string;
  type: ReleaseType;
  status: ReleaseStatus;
  metadata: ReleaseMetadata;
  tracks: Track[];
  assets: ReleaseAssets;
  territories: TerritoryConfiguration;
  rights: RightsConfiguration;
  ddex: DDEXConfiguration;
  created: Date;
  updated: Date;
  createdBy: string;
}

export enum ReleaseType {
  ALBUM = 'Album',
  SINGLE = 'Single',
  VIDEO = 'Video',
  MIXED = 'Mixed'
}

export enum ReleaseStatus {
  DRAFT = 'draft',
  READY = 'ready',
  DELIVERED = 'delivered',
  ARCHIVED = 'archived'
}

export interface ReleaseMetadata {
  title: string;
  displayArtist: string;
  releaseDate: Date;
  label: string;
  catalogNumber?: string;
  barcode?: string;
  genre: string[];
  language: string;
  parentalWarning?: boolean;
  copyright?: string;
  productionYear?: number;
}

export interface Track {
  id: string;
  sequenceNumber: number;
  isrc: string;
  metadata: TrackMetadata;
  audio: AudioConfiguration;
  preview?: PreviewConfiguration;
}

export interface TrackMetadata {
  title: string;
  displayArtist: string;
  duration: number;
  contributors: Contributor[];
  writers?: Writer[];
  publishers?: Publisher[];
  genre?: string[];
  language?: string;
  parentalWarning?: boolean;
}

export interface Contributor {
  name: string;
  role: ContributorRole;
  isni?: string;
  ipi?: string;
}

export enum ContributorRole {
  PRODUCER = 'Producer',
  WRITER = 'Writer',
  COMPOSER = 'Composer',
  ARRANGER = 'Arranger',
  PERFORMER = 'Performer'
}