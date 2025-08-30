// src/utils/sanitizer.js
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content (for rich text fields)
 */
export const sanitizeHTML = (dirty) => {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOW_DATA_ATTR: false
  });
};

/**
 * Sanitize plain text (removes all HTML)
 */
export const sanitizeText = (text) => {
  if (!text) return '';
  
  return DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    STRIP_COMMENTS: true,
    STRIP_CDATA_SECTIONS: true,
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false
  })
  .replace(/javascript:/gi, '')
  .replace(/data:/gi, '')
  .replace(/vbscript:/gi, '')
  .replace(/on\w+\s*=/gi, '');
};

export const testXSSPrevention = (testString) => {
  const sanitized = sanitizeText(testString);
  
  // Check if dangerous patterns are removed
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /data:text\/html/i
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(sanitized));
};

/**
 * Sanitize user input before saving to database
 */
export const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return sanitizeText(input);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        // Skip certain fields that need special handling
        if (['password', 'privateKey', 'secretKey'].includes(key)) {
          sanitized[key] = value; // Don't sanitize sensitive fields
        } else {
          sanitized[key] = sanitizeText(value);
        }
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? sanitizeInput(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return input;
};

/**
 * Validate and sanitize file names
 */
export const sanitizeFileName = (fileName) => {
  if (!fileName) return 'file';
  
  // Remove path traversal attempts and dangerous characters
  return fileName
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
};

/**
 * Validate file type by checking magic numbers (file signatures)
 */
export const validateFileType = async (file) => {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  
  const signatures = {
    jpeg: {
      bytes: [0xFF, 0xD8, 0xFF],
      mimeTypes: ['image/jpeg']
    },
    png: {
      bytes: [0x89, 0x50, 0x4E, 0x47],
      mimeTypes: ['image/png']
    },
    wav: {
      bytes: [0x52, 0x49, 0x46, 0x46], // RIFF
      mimeTypes: ['audio/wav', 'audio/x-wav']
    },
    flac: {
      bytes: [0x66, 0x4C, 0x61, 0x43], // fLaC
      mimeTypes: ['audio/flac', 'audio/x-flac']
    },
    mp3: {
      bytes: [0xFF, 0xFB], // MP3 frame sync (simplified)
      mimeTypes: ['audio/mpeg', 'audio/mp3']
    }
  };
  
  for (const [type, signature] of Object.entries(signatures)) {
    if (signature.bytes.every((byte, i) => header[i] === byte)) {
      return { 
        valid: true, 
        type,
        mimeTypes: signature.mimeTypes
      };
    }
  }
  
  throw new Error('Invalid or unsupported file type. Only JPEG, PNG, WAV, FLAC, and MP3 files are allowed.');
};

/**
 * Validate file size
 */
export const validateFileSize = (file, maxSizeMB) => {
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSizeMB}MB`);
  }
  return true;
};