// functions/utils/validation.js
const { z } = require('zod');

/**
 * Validation schemas for Cloud Functions
 * Mirrors frontend validation with backend-specific additions
 */

// Helper validators
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
  
  return true;
};

const validateISRC = (isrc) => {
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc);
};

// Create sanitized string schema with configurable max length
const createSanitizedString = (maxLength = 255) => {
  return z.string()
    .max(maxLength)
    .transform((val) => {
      return val
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    });
};

// Schema definitions
const schemas = {
  // File MD5 calculation
  calculateMD5: z.object({
    url: z.string().url('Invalid URL format').max(2048)
  }),
  
  // Delivery schemas
  deliverFTP: z.object({
    target: z.object({
      host: z.string().max(255),
      port: z.number().int().min(1).max(65535).optional(),
      username: z.string().max(100),
      password: z.string().max(100),
      directory: z.string().max(500).optional(),
      secure: z.boolean().optional()
    }),
    package: z.object({
      deliveryId: z.string(),
      files: z.array(z.object({
        name: createSanitizedString(255),
        url: z.string().url().optional(),
        content: z.string().optional(),
        type: z.enum(['audio', 'image', 'text/xml']),
        needsDownload: z.boolean()
      })).max(1000) // Limit files to prevent DoS
    })
  }),
  
  // Similar for other protocols
  deliverS3: z.object({
    target: z.object({
      bucket: z.string().regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/),
      region: z.string().max(50),
      accessKeyId: z.string().max(128),
      secretAccessKey: z.string().max(128),
      prefix: z.string().max(500).optional()
    }),
    package: z.object({
      deliveryId: z.string(),
      files: z.array(z.any()).max(1000)
    })
  }),
  
  deliverSFTP: z.object({
    target: z.object({
      host: z.string().max(255),
      port: z.number().int().min(1).max(65535).optional(),
      username: z.string().max(100),
      password: z.string().max(100).optional(),
      privateKey: z.string().max(4096).optional(),
      passphrase: z.string().max(255).optional(),
      directory: z.string().max(500).optional()
    }),
    package: z.object({
      deliveryId: z.string(),
      files: z.array(z.any()).max(1000)
    })
  }),
  
  deliverAPI: z.object({
    target: z.object({
      endpoint: z.string().url().max(2048),
      method: z.enum(['POST', 'PUT', 'PATCH']).optional(),
      headers: z.record(z.string()).optional(),
      auth: z.object({
        type: z.enum(['Bearer', 'Basic', 'OAuth2']).optional(),
        credentials: z.any().optional()
      }).optional()
    }),
    package: z.object({
      deliveryId: z.string(),
      files: z.array(z.any()).max(1000)
    })
  }),
  
  deliverAzure: z.object({
    target: z.object({
      accountName: z.string().max(100),
      accountKey: z.string().max(255),
      containerName: z.string().max(100),
      prefix: z.string().max(500).optional()
    }),
    package: z.object({
      deliveryId: z.string(),
      files: z.array(z.any()).max(1000)
    })
  }),
  
  // Analytics request
  getDeliveryAnalytics: z.object({
    tenantId: z.string().max(128),
    startDate: z.date().optional(),
    endDate: z.date().optional()
  }),
  
  // Test connection - make config validation more flexible
  testDeliveryConnection: z.object({
    protocol: z.enum(['FTP', 'SFTP', 'S3', 'API', 'Azure', 'storage']),
    config: z.any(), // Allow any config for testing
    testMode: z.literal(true)
  }),
  
  // Fingerprinting
  calculateFileFingerprint: z.object({
    url: z.string().url().max(2048),
    fileName: createSanitizedString(255).optional(),
    fileSize: z.number().max(500 * 1024 * 1024).optional(), // 500MB max
    fileType: z.string().max(50).optional()
  }),
  
  checkDuplicates: z.object({
    md5: z.string().length(32).optional(),
    sha256: z.string().length(64).optional(),
    sha1: z.string().length(40).optional(),
    threshold: z.number().min(0).max(100).optional()
  }),
  
  calculateAudioFingerprint: z.object({
    url: z.string().url().max(2048),
    trackId: z.string().max(128).optional(),
    releaseId: z.string().max(128).optional()
  }),
  
  calculateBatchFingerprints: z.object({
    files: z.array(z.object({
      url: z.string().url(),
      name: createSanitizedString(255),
      type: z.string().max(50)
    })).max(100), // Limit batch size
    releaseId: z.string().max(128).optional()
  }),
  
  getFingerprintStats: z.object({
    releaseId: z.string().max(128)
  })
};

/**
 * Validate request data against schema
 */
function validateRequest(schema, data) {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    return { 
      valid: false, 
      errors: error.errors?.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    };
  }
}

/**
 * Clean object for Firestore (remove undefined values)
 */
function cleanForFirestore(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

module.exports = {
  schemas,
  validateRequest,
  cleanForFirestore,
  createSanitizedString
};