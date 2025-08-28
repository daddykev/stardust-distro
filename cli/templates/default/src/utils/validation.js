// src/utils/validation.js
import { z } from 'zod';

// UPC validation with checksum
const validateUPC = (upc) => {
  if (!/^\d{12,14}$/.test(upc)) return false;
  
  // For 12-digit UPC-A, validate checksum
  if (upc.length === 12) {
    const digits = upc.split('').map(Number);
    const sum = digits.slice(0, 11).reduce((acc, digit, index) => 
      acc + digit * (index % 2 === 0 ? 1 : 3), 0
    );
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[11];
  }
  
  return true; // For other lengths, just check format
};

// ISRC validation
const validateISRC = (isrc) => {
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc);
};

export const schemas = {
  // Release schema
  release: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title too long (max 200 characters)')
      .trim(),
    
    artist: z.string()
      .min(1, 'Artist is required')
      .max(200, 'Artist name too long')
      .trim(),
    
    label: z.string()
      .max(200, 'Label name too long')
      .trim()
      .optional(),
    
    barcode: z.string()
      .refine(validateUPC, 'Invalid UPC/EAN barcode')
      .optional()
      .or(z.literal('')),
    
    releaseDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    
    type: z.enum(['Album', 'Single', 'EP', 'Video', 'Mixed'], {
      errorMap: () => ({ message: 'Invalid release type' })
    }),
    
    status: z.enum(['draft', 'ready', 'delivered', 'archived'])
      .optional()
      .default('draft')
  }),
  
  // Track schema
  track: z.object({
    title: z.string()
      .min(1, 'Track title is required')
      .max(200, 'Track title too long')
      .trim(),
    
    isrc: z.string()
      .refine(validateISRC, 'Invalid ISRC format')
      .optional()
      .or(z.literal('')),
    
    duration: z.number()
      .min(1, 'Duration must be at least 1 second')
      .max(36000, 'Duration cannot exceed 10 hours'),
    
    sequenceNumber: z.number()
      .int()
      .min(1, 'Track number must be at least 1')
      .max(999, 'Track number cannot exceed 999'),
    
    displayArtist: z.string()
      .max(200, 'Artist name too long')
      .trim()
      .optional()
  }),
  
  // Delivery target schema
  deliveryTarget: z.object({
    name: z.string()
      .min(1, 'Target name is required')
      .max(100, 'Target name too long')
      .trim(),
    
    type: z.enum(['DSP', 'Aggregator', 'Test']),
    
    protocol: z.enum(['FTP', 'SFTP', 'S3', 'API', 'Azure', 'Storage']),
    
    ddexPartyName: z.string()
      .max(200)
      .trim()
      .optional(),
    
    ddexPartyId: z.string()
      .max(100)
      .trim()
      .optional()
  }),
  
  // Login schema
  login: z.object({
    email: z.string()
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
  }),
  
  // Signup schema
  signup: z.object({
    email: z.string()
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    
    password: z.string()
      .min(12, 'Password must be at least 12 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain uppercase, lowercase, number, and special character'
      ),
    
    confirmPassword: z.string(),
    
    displayName: z.string()
      .min(1, 'Name is required')
      .max(100, 'Name too long')
      .trim(),
    
    organizationName: z.string()
      .max(200)
      .trim()
      .optional()
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  })
};

// Helper function to validate form data
export const validateFormData = (schema, data) => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach(err => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    throw error;
  }
};