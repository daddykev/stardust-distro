// functions/encryption.js
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const crypto = require('crypto');

// Use environment variable or Firebase config for the encryption key
// Set with: firebase functions:config:set encryption.key="your-32-char-key"
// Or use Secret Manager (recommended for v2)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'change-this-32-character-string!';

const algorithm = 'aes-256-gcm';

// Derive a key from the base key
function deriveKey(salt) {
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
}

exports.encryptSensitiveData = onCall(
  { 
    region: 'us-central1',
    maxInstances: 10,
    memory: '256MiB'
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to encrypt data'
      );
    }

    const { text } = request.data;
    
    if (!text) {
      throw new HttpsError(
        'invalid-argument',
        'No text provided to encrypt'
      );
    }

    try {
      const iv = crypto.randomBytes(16);
      const salt = crypto.randomBytes(64);
      const key = deriveKey(salt);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      
      // Combine salt, iv, authTag, and encrypted data
      const combined = Buffer.concat([salt, iv, authTag, encrypted]);
      
      return {
        encrypted: combined.toString('base64')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new HttpsError(
        'internal',
        'Failed to encrypt data'
      );
    }
  }
);

exports.decryptSensitiveData = onCall(
  { 
    region: 'us-central1',
    maxInstances: 10,
    memory: '256MiB'
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to decrypt data'
      );
    }

    const { encrypted } = request.data;
    
    if (!encrypted) {
      throw new HttpsError(
        'invalid-argument',
        'No encrypted data provided'
      );
    }

    try {
      const combined = Buffer.from(encrypted, 'base64');
      
      const salt = combined.slice(0, 64);
      const iv = combined.slice(64, 80);
      const authTag = combined.slice(80, 96);
      const encryptedData = combined.slice(96);
      
      const key = deriveKey(salt);
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
      
      return {
        decrypted: decrypted.toString('utf8')
      };
    } catch (error) {
      console.error('Decryption error:', error);
      throw new HttpsError(
        'internal',
        'Failed to decrypt data'
      );
    }
  }
);