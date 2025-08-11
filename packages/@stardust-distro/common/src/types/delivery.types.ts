export interface DeliveryTarget {
  id: string;
  tenantId: string;
  name: string;
  type: 'DSP' | 'Aggregator' | 'Test';
  protocol: DeliveryProtocol;
  config: DeliveryConfig;
  requirements?: DeliveryRequirements;
  schedule: DeliverySchedule;
  active: boolean;
  lastDelivery?: Date;
  testMode: boolean;
  created: Date;
  updated: Date;
}

export type DeliveryProtocol = 'FTP' | 'SFTP' | 'S3' | 'API' | 'Azure';

export interface DeliveryConfig {
  // Base config - extended by protocol-specific configs
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface FTPConfig extends DeliveryConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  directory: string;
  passive?: boolean;
}

export interface S3Config extends DeliveryConfig {
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  prefix?: string;
}

export interface APIConfig extends DeliveryConfig {
  endpoint: string;
  authType: 'Bearer' | 'Basic' | 'OAuth2' | 'None';
  credentials?: string;
  headers?: Record<string, string>;
}

export interface DeliverySchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  timezone?: string;
  time?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

export interface Delivery {
  id: string;
  releaseId: string;
  targetId: string;
  tenantId: string;
  status: DeliveryStatus;
  package: DeliveryPackage;
  attempts: DeliveryAttempt[];
  scheduled: Date;
  started?: Date;
  completed?: Date;
  receipt?: DeliveryReceipt;
}

export enum DeliveryStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  DELIVERING = 'delivering',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}