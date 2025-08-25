// src/services/fingerprints.js
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../firebase'
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore'

class FingerprintService {
  constructor() {
    this.functions = getFunctions()
    this.fingerprintCache = new Map()
  }

  /**
   * Calculate file fingerprint using Cloud Function
   */
  async calculateFingerprint(url, metadata = {}) {
    try {
      const calculateFileFingerprint = httpsCallable(this.functions, 'calculateFileFingerprint')
      const result = await calculateFileFingerprint({
        url,
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        fileType: metadata.fileType
      })
      
      // Cache the result
      if (result.data?.hashes?.sha256) {
        this.fingerprintCache.set(result.data.hashes.sha256, result.data)
      }
      
      return result.data
    } catch (error) {
      console.error('Error calculating fingerprint:', error)
      throw error
    }
  }

  /**
   * Check for duplicates using Cloud Function
   */
  async checkDuplicates(fingerprint, threshold = 100) {
    try {
      const checkDuplicates = httpsCallable(this.functions, 'checkDuplicates')
      const result = await checkDuplicates({
        md5: fingerprint.hashes?.md5,
        sha256: fingerprint.hashes?.sha256,
        sha1: fingerprint.hashes?.sha1,
        threshold
      })
      
      return result.data
    } catch (error) {
      console.error('Error checking duplicates:', error)
      throw error
    }
  }

  /**
   * Calculate audio fingerprint
   */
  async calculateAudioFingerprint(url, trackId, releaseId) {
    try {
      const calculateAudioFingerprint = httpsCallable(this.functions, 'calculateAudioFingerprint')
      const result = await calculateAudioFingerprint({
        url,
        trackId,
        releaseId
      })
      
      return result.data
    } catch (error) {
      console.error('Error calculating audio fingerprint:', error)
      throw error
    }
  }

  /**
   * Calculate fingerprints for multiple files
   */
  async calculateBatchFingerprints(files, releaseId) {
    try {
      const calculateBatchFingerprints = httpsCallable(this.functions, 'calculateBatchFingerprints')
      const result = await calculateBatchFingerprints({
        files: files.map(f => ({
          url: f.url,
          name: f.name,
          type: f.type
        })),
        releaseId
      })
      
      return result.data
    } catch (error) {
      console.error('Error calculating batch fingerprints:', error)
      throw error
    }
  }

  /**
   * Get fingerprint statistics for a release
   */
  async getFingerprintStats(releaseId) {
    try {
      const getFingerprintStats = httpsCallable(this.functions, 'getFingerprintStats')
      const result = await getFingerprintStats({ releaseId })
      return result.data
    } catch (error) {
      console.error('Error getting fingerprint stats:', error)
      throw error
    }
  }

  /**
   * Get cached fingerprint
   */
  getCachedFingerprint(sha256) {
    return this.fingerprintCache.get(sha256)
  }

  /**
   * Check if file exists in catalog by hash
   */
  async checkExistingFile(md5, sha256) {
    try {
      // Check by SHA-256 (document ID)
      if (sha256) {
        const docRef = doc(db, 'fingerprints', sha256)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          return {
            exists: true,
            data: docSnap.data(),
            matchType: 'sha256'
          }
        }
      }
      
      // Check by MD5
      if (md5) {
        const q = query(
          collection(db, 'fingerprints'),
          where('hashes.md5', '==', md5),
          limit(1)
        )
        
        const querySnapshot = await getDocs(q)
        
        if (!querySnapshot.empty) {
          return {
            exists: true,
            data: querySnapshot.docs[0].data(),
            matchType: 'md5'
          }
        }
      }
      
      return { exists: false }
    } catch (error) {
      console.error('Error checking existing file:', error)
      return { exists: false, error }
    }
  }

  /**
   * Get recent fingerprints for a user
   */
  async getRecentFingerprints(userId, limitCount = 10) {
    try {
      const q = query(
        collection(db, 'fingerprints'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
      
      const querySnapshot = await getDocs(q)
      const fingerprints = []
      
      querySnapshot.forEach(doc => {
        fingerprints.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      return fingerprints
    } catch (error) {
      console.error('Error getting recent fingerprints:', error)
      return []
    }
  }

  /**
   * Clear fingerprint cache
   */
  clearCache() {
    this.fingerprintCache.clear()
  }
}

export default new FingerprintService()