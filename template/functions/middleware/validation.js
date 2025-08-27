// functions/middleware/validation.js
const { HttpsError } = require('firebase-functions/v2/https');
const { schemas, validateRequest } = require('../utils/validation');

/**
 * Middleware factory for request validation
 */
function validateWith(schemaName) {
  return (request) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      throw new HttpsError('internal', `Validation schema '${schemaName}' not found`);
    }
    
    const validation = validateRequest(schema, request.data);
    
    if (!validation.valid) {
      const errorMessage = validation.errors
        ?.map(e => `${e.path}: ${e.message}`)
        .join(', ') || 'Validation failed';
      
      throw new HttpsError('invalid-argument', errorMessage);
    }
    
    // Replace request data with validated and sanitized data
    request.data = validation.data;
    
    return request;
  };
}

/**
 * Sanitize all string inputs in an object
 */
function sanitizeInputs(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Basic XSS prevention
      sanitized[key] = value
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeInputs(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate file upload parameters
 */
function validateFileUpload(file) {
  const maxSize = file.type === 'audio' ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
  
  if (!file.url && !file.content) {
    throw new HttpsError('invalid-argument', 'File must have URL or content');
  }
  
  if (file.size && file.size > maxSize) {
    throw new HttpsError(
      'invalid-argument',
      `File too large. Max size: ${maxSize / 1024 / 1024}MB`
    );
  }
  
  // Validate file extensions
  const validExtensions = {
    audio: ['wav', 'flac', 'mp3'],
    image: ['jpg', 'jpeg', 'png'],
    'text/xml': ['xml']
  };
  
  if (file.name) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = validExtensions[file.type];
    
    if (validExts && !validExts.includes(ext)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid file extension. Allowed: ${validExts.join(', ')}`
      );
    }
  }
  
  return true;
}

module.exports = {
  validateWith,
  sanitizeInputs,
  validateFileUpload
};