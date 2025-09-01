// functions/services/fingerprinting.js
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const crypto = require('crypto')
const axios = require('axios')
const { Buffer } = require('buffer')

const db = admin.firestore()
const { cleanForFirestore } = require('../utils/validation')
const { calculateStringSimilarity } = require('../utils/helpers')
const { requireAuth, checkRateLimit } = require('../middleware/auth')
const { validateWith } = require('../middleware/validation')

/**
 * Calculate comprehensive file fingerprint (MD5 + SHA-256 + SHA-1)
 */
exports.calculateFileFingerprint = onCall({
  timeoutSeconds: 60,
  memory: '512MB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('calculateFileFingerprint')(request);
  await checkRateLimit(request.auth.uid, 60, 60000);
  
  const { url, fileName, fileSize, fileType } = request.data;
  
  try {
    console.log(`Calculating fingerprint for: ${fileName || url}`)
    
    // Download file
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 500 * 1024 * 1024 // 500MB max
    })
    
    const buffer = Buffer.from(response.data)
    
    // Calculate multiple hashes in parallel
    const [md5Hash, sha256Hash, sha1Hash] = await Promise.all([
      crypto.createHash('md5').update(buffer).digest('hex'),
      crypto.createHash('sha256').update(buffer).digest('hex'),
      crypto.createHash('sha1').update(buffer).digest('hex')
    ])
    
    const fingerprint = {
      url,
      fileName: fileName || 'unknown',
      fileSize: fileSize || buffer.length,
      fileType: fileType || response.headers['content-type'],
      actualSize: buffer.length,
      hashes: {
        md5: md5Hash,
        sha256: sha256Hash,
        sha1: sha1Hash
      },
      timestamp: new Date().toISOString()
    }
    
    // Store fingerprint in Firestore with cleaned data
    const fingerprintId = sha256Hash
    await db.collection('fingerprints').doc(fingerprintId).set(cleanForFirestore({
      ...fingerprint,
      userId: request.auth.uid,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }))
    
    return fingerprint
  } catch (error) {
    console.error('Error calculating fingerprint:', error)
    throw new HttpsError('internal', `Failed to calculate fingerprint: ${error.message}`)
  }
})

/**
 * Check for duplicate files across the system
 */
exports.checkDuplicates = onCall({
  timeoutSeconds: 30,
  memory: '256MB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('checkDuplicates')(request);
  await checkRateLimit(request.auth.uid, 100, 60000);
  
  const { md5, sha256, sha1, threshold = 100 } = request.data;
  
  try {
    const duplicates = []
    
    // Check SHA-256 (document ID)
    if (sha256) {
      const sha256Doc = await db.collection('fingerprints').doc(sha256).get()
      if (sha256Doc.exists) {
        duplicates.push({
          type: 'exact',
          matchType: 'sha256',
          similarity: 100,
          fingerprint: sha256Doc.data()
        })
      }
    }
    
    // Check MD5
    if (md5 && duplicates.length === 0) {
      const md5Query = await db.collection('fingerprints')
        .where('hashes.md5', '==', md5)
        .limit(5)
        .get()
      
      md5Query.forEach(doc => {
        duplicates.push({
          type: 'exact',
          matchType: 'md5',
          similarity: 100,
          fingerprint: doc.data()
        })
      })
    }
    
    // Check SHA-1
    if (sha1 && duplicates.length === 0) {
      const sha1Query = await db.collection('fingerprints')
        .where('hashes.sha1', '==', sha1)
        .limit(5)
        .get()
      
      sha1Query.forEach(doc => {
        duplicates.push({
          type: 'exact',
          matchType: 'sha1',
          similarity: 100,
          fingerprint: doc.data()
        })
      })
    }
    
    return {
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates,
      checkedHashes: { md5, sha256, sha1 }
    }
  } catch (error) {
    console.error('Error checking duplicates:', error)
    throw new HttpsError('internal', `Failed to check duplicates: ${error.message}`)
  }
})

/**
 * Calculate audio fingerprint for similarity detection
 */
exports.calculateAudioFingerprint = onCall({
  timeoutSeconds: 120,
  memory: '1GB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('calculateAudioFingerprint')(request);
  await checkRateLimit(request.auth.uid, 30, 60000); // 30 audio fingerprints per minute
  
  const { url, trackId, releaseId } = request.data;
  
  try {
    console.log(`Calculating audio fingerprint for: ${url}`)
    
    // Download audio file
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxContentLength: 500 * 1024 * 1024 // 500MB max
    })
    
    const buffer = Buffer.from(response.data)
    
    // Calculate basic hash
    const md5Hash = crypto.createHash('md5').update(buffer).digest('hex')
    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex')
    
    // Create simplified audio fingerprint based on file characteristics
    const audioFingerprint = {
      fileSize: buffer.length,
      md5: md5Hash,
      sha256: sha256Hash,
      chunkHashes: []
    }
    
    // Sample the audio at regular intervals for a simple fingerprint
    const chunkSize = Math.floor(buffer.length / 32) // 32 sample points
    for (let i = 0; i < 32; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, buffer.length)
      const chunk = buffer.slice(start, end)
      const chunkHash = crypto.createHash('md5').update(chunk).digest('hex').substring(0, 8)
      audioFingerprint.chunkHashes.push(chunkHash)
    }
    
    // Create composite fingerprint
    audioFingerprint.composite = audioFingerprint.chunkHashes.join('')
    
    // Store in Firestore
    const fingerprintDoc = cleanForFirestore({
      type: 'audio',
      url,
      trackId,
      releaseId,
      fingerprint: audioFingerprint,
      userId: request.auth.uid,
      createdAt: admin.firestore.Timestamp.now()
    })
    
    await db.collection('audioFingerprints').doc(sha256Hash).set(fingerprintDoc)
    
    // Check for similar audio
    const similar = await findSimilarAudio(audioFingerprint.composite, sha256Hash)
    
    return {
      fingerprint: audioFingerprint,
      similar: similar,
      fingerprintId: sha256Hash
    }
  } catch (error) {
    console.error('Error calculating audio fingerprint:', error)
    throw new HttpsError('internal', `Failed to calculate audio fingerprint: ${error.message}`)
  }
})

/**
 * Batch fingerprint calculation for multiple files
 */
exports.calculateBatchFingerprints = onCall({
  timeoutSeconds: 300,
  memory: '1GB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('calculateBatchFingerprints')(request);
  await checkRateLimit(request.auth.uid, 10, 60000); // 10 batch operations per minute
  
  const { files, releaseId } = request.data;
  
  try {
    console.log(`Calculating fingerprints for ${files.length} files`)
    
    const results = []
    const errors = []
    
    // Process files in parallel with concurrency limit
    const batchSize = 5
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      
      const batchResults = await Promise.allSettled(
        batch.map(async (file) => {
          try {
            const response = await axios.get(file.url, {
              responseType: 'arraybuffer',
              timeout: 30000
            })
            
            const buffer = Buffer.from(response.data)
            
            const fingerprint = {
              fileName: file.name,
              fileType: file.type,
              fileSize: buffer.length,
              hashes: {
                md5: crypto.createHash('md5').update(buffer).digest('hex'),
                sha256: crypto.createHash('sha256').update(buffer).digest('hex')
              }
            }
            
            return { success: true, file: file.name, fingerprint }
          } catch (error) {
            return { success: false, file: file.name, error: error.message }
          }
        })
      )
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value)
          } else {
            errors.push(result.value)
          }
        } else {
          errors.push({
            success: false,
            file: batch[index].name,
            error: result.reason.message
          })
        }
      })
    }
    
    // Check for duplicates within the batch
    const duplicatesInBatch = []
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        if (results[i].fingerprint.hashes.md5 === results[j].fingerprint.hashes.md5) {
          duplicatesInBatch.push({
            file1: results[i].file,
            file2: results[j].file,
            type: 'exact'
          })
        }
      }
    }
    
    // Store all fingerprints
    if (releaseId) {
      const batch = db.batch()
      
      results.forEach(result => {
        const docRef = db.collection('fingerprints').doc(result.fingerprint.hashes.sha256)
        batch.set(docRef, cleanForFirestore({
          ...result.fingerprint,
          releaseId,
          userId: request.auth.uid,
          createdAt: admin.firestore.Timestamp.now()
        }))
      })
      
      await batch.commit()
    }
    
    return {
      success: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
      duplicatesInBatch
    }
  } catch (error) {
    console.error('Error in batch fingerprint calculation:', error)
    throw new HttpsError('internal', `Failed to process batch: ${error.message}`)
  }
})

/**
 * Get fingerprint statistics for a release
 */
exports.getFingerprintStats = onCall({
  timeoutSeconds: 30,
  memory: '256MB',
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('getFingerprintStats')(request);
  await checkRateLimit(request.auth.uid, 60, 60000);
  
  const { releaseId } = request.data;
  
  try {
    const fingerprints = await db.collection('fingerprints')
      .where('releaseId', '==', releaseId)
      .get()
    
    const audioFingerprints = await db.collection('audioFingerprints')
      .where('releaseId', '==', releaseId)
      .get()
    
    const stats = {
      totalFiles: fingerprints.size + audioFingerprints.size,
      totalSize: 0,
      fileTypes: {},
      duplicates: [],
      audioTracks: audioFingerprints.size
    }
    
    const hashes = new Map()
    
    fingerprints.forEach(doc => {
      const data = doc.data()
      stats.totalSize += data.fileSize || 0
      
      const type = data.fileType || 'unknown'
      stats.fileTypes[type] = (stats.fileTypes[type] || 0) + 1
      
      // Check for duplicates
      if (data.hashes) {
        const existing = hashes.get(data.hashes.md5)
        if (existing) {
          stats.duplicates.push({
            file1: existing.fileName,
            file2: data.fileName,
            hash: data.hashes.md5
          })
        } else {
          hashes.set(data.hashes.md5, data)
        }
      }
    })
    
    return stats
  } catch (error) {
    console.error('Error getting fingerprint stats:', error)
    throw new HttpsError('internal', `Failed to get stats: ${error.message}`)
  }
})

/**
 * Helper function to find similar audio
 */
async function findSimilarAudio(compositeFingerprint, excludeId) {
  try {
    const snapshot = await db.collection('audioFingerprints')
      .where('type', '==', 'audio')
      .limit(100)
      .get()
    
    const similar = []
    
    snapshot.forEach(doc => {
      if (doc.id === excludeId) return
      
      const data = doc.data()
      if (data.fingerprint && data.fingerprint.composite) {
        const similarity = calculateStringSimilarity(
          compositeFingerprint,
          data.fingerprint.composite
        )
        
        if (similarity > 80) {
          similar.push({
            id: doc.id,
            similarity,
            trackId: data.trackId,
            releaseId: data.releaseId,
            url: data.url
          })
        }
      }
    })
    
    return similar.sort((a, b) => b.similarity - a.similarity)
  } catch (error) {
    console.error('Error finding similar audio:', error)
    return []
  }
}

module.exports = {
  calculateFileFingerprint: exports.calculateFileFingerprint,
  checkDuplicates: exports.checkDuplicates,
  calculateAudioFingerprint: exports.calculateAudioFingerprint,
  calculateBatchFingerprints: exports.calculateBatchFingerprints,
  getFingerprintStats: exports.getFingerprintStats,
  findSimilarAudio
}