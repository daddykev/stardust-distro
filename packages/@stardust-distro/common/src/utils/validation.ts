// packages/@stardust-distro/common/src/utils/validation.ts
import { z } from 'zod';

export const ISRCSchema = z.string().regex(/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/);
export const BarcodeSchema = z.string().regex(/^[0-9]{12,14}$/);
export const EmailSchema = z.string().email();

export function validateISRC(isrc: string): boolean {
  try {
    ISRCSchema.parse(isrc);
    return true;
  } catch {
    return false;
  }
}

export function validateBarcode(barcode: string): boolean {
  try {
    BarcodeSchema.parse(barcode);
    return true;
  } catch {
    return false;
  }
}

export function generateMessageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `DDEX_${timestamp}_${random}`.toUpperCase();
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}