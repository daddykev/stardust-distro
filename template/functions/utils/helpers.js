// functions/utils/helpers.js
const crypto = require('crypto')
const axios = require('axios')
const fs = require('fs')
const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')

const db = admin.firestore()

const { cleanForFirestore } = require('../utils/validation')

/**
 * Calculate MD5 hash of a buffer
 */
function calculateMD5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

/**
 * Add a log entry to the delivery record
 */
async function addDeliveryLog(deliveryId, logEntry) {
  try {
    const timestamp = admin.firestore.Timestamp.now()
    const log = cleanForFirestore({
      timestamp,
      level: logEntry.level || 'info',
      step: logEntry.step || 'general',
      message: logEntry.message,
      details: logEntry.details,
      duration: logEntry.duration
    })
    
    // Update the delivery document with the new log
    await db.collection('deliveries').doc(deliveryId).update({
      logs: admin.firestore.FieldValue.arrayUnion(log),
      lastLogAt: timestamp,
      currentStep: logEntry.step
    })
    
    // Also log to console for debugging
    console.log(`[${log.level.toUpperCase()}] ${deliveryId} - ${log.step}: ${log.message}`)
    
    return log
  } catch (error) {
    console.error('Error adding delivery log:', error)
  }
}

/**
 * Download file from URL to local path
 */
async function downloadFile(url, localPath) {
  const writer = fs.createWriteStream(localPath)
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  })
  
  response.data.pipe(writer)
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

/**
 * Extract file extension from URL
 */
function extractFileExtension(url) {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const parts = pathname.split('/')
    let filename = parts[parts.length - 1]
    
    // Remove URL parameters
    filename = filename.split('?')[0]
    
    // Decode URL encoding
    filename = decodeURIComponent(filename)
    
    // Handle Firebase Storage URLs that might have encoded parts
    if (filename.includes('%2F')) {
      const decodedParts = filename.split('%2F')
      filename = decodedParts[decodedParts.length - 1]
    }
    
    // Extract extension
    const extMatch = filename.match(/\.([^.]+)$/)
    if (extMatch) {
      const ext = extMatch[1].toLowerCase()
      // Map common audio formats
      if (ext === 'mp3' || ext === 'mpeg') return 'mp3'
      if (ext === 'wav' || ext === 'wave') return 'wav'
      if (ext === 'flac') return 'flac'
      if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
      if (ext === 'png') return 'png'
      return ext
    }
    
    // Default extensions based on context
    console.warn(`Could not determine extension for ${url}, defaulting to wav`)
    return 'wav'
  } catch (error) {
    console.error('Error extracting file extension:', error)
    return 'wav'
  }
}

/**
 * Extract filename from URL
 */
function extractFileName(url) {
  try {
    const parts = url.split('/')
    const fileName = parts[parts.length - 1].split('?')[0]
    return decodeURIComponent(fileName)
  } catch (error) {
    return 'unknown_file'
  }
}

/**
 * Calculate string similarity percentage
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0
  
  const len = Math.min(str1.length, str2.length)
  let matches = 0
  
  for (let i = 0; i < len; i++) {
    if (str1[i] === str2[i]) matches++
  }
  
  return Math.round((matches / len) * 100)
}

/**
 * Setup admin role for initial user
 */
const setupAdmin = onCall({
  cors: true
}, async (request) => {
  // This should only be called during initial setup
  const { email } = request.data;
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, { 
      admin: true, 
      role: 'admin' 
    });
    
    // Update user document
    await admin.firestore()
      .collection('users')
      .doc(user.uid)
      .set({
        email: user.email,
        displayName: user.displayName,
        role: 'admin',
        updatedAt: admin.firestore.Timestamp.now()
      }, { merge: true });
    
    return { 
      success: true, 
      message: 'Admin role set successfully'
    };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Proxy download external images (to bypass CSP restrictions)
 */
const downloadExternalImage = onCall(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    maxInstances: 10
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { imageUrl, fileName } = request.data;

    if (!imageUrl) {
      throw new HttpsError(
        'invalid-argument',
        'Image URL is required'
      );
    }

    try {
      console.log(`Downloading image from: ${imageUrl}`);
      
      // Fetch the image
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      // Get the image as a buffer
      const buffer = await response.arrayBuffer();
      
      // Convert to base64
      const base64 = Buffer.from(buffer).toString('base64');
      
      // Get content type
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      console.log(`Successfully downloaded image: ${buffer.byteLength} bytes`);
      
      return {
        base64,
        contentType,
        size: buffer.byteLength,
        fileName: fileName || 'image.jpg'
      };
    } catch (error) {
      console.error('Error downloading image:', error);
      throw new HttpsError(
        'internal',
        `Failed to download image: ${error.message}`
      );
    }
  }
);

module.exports = {
  calculateMD5,
  addDeliveryLog,
  downloadFile,
  extractFileExtension,
  extractFileName,
  calculateStringSimilarity,
  setupAdmin,
  downloadExternalImage
}