// src/services/assets.js
import { storage } from '../firebase'
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  getMetadata
} from 'firebase/storage'
import fingerprintService from './fingerprints'

export class AssetService {
  constructor() {
    this.basePath = 'releases'
  }

  /**
   * Generate storage path for an asset
   */
  generatePath(userId, releaseId, assetType, fileName) {
    // Clean filename
    const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const timestamp = Date.now()
    return `${this.basePath}/${userId}/${releaseId}/${assetType}/${timestamp}_${cleanName}`
  }

  /**
   * Upload a single file with progress tracking and duplicate detection
   */
  uploadFile(file, path, onProgress = null, checkDuplicates = true) {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path)
      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          if (onProgress) {
            onProgress(progress, snapshot)
          }
        },
        (error) => {
          console.error('Upload error:', error)
          reject(error)
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            const metadata = await getMetadata(uploadTask.snapshot.ref)
            
            const result = {
              url: downloadURL,
              path: path,
              name: file.name,
              size: metadata.size,
              contentType: metadata.contentType,
              uploadedAt: metadata.timeCreated
            }
            
            // Calculate fingerprint using Cloud Function after upload
            if (checkDuplicates) {
              try {
                const fingerprint = await fingerprintService.calculateFingerprint(downloadURL, {
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type
                })
                
                result.fingerprint = fingerprint
                
                // Check for duplicates
                const duplicateCheck = await fingerprintService.checkDuplicates(fingerprint)
                if (duplicateCheck.hasDuplicates) {
                  result.duplicateInfo = duplicateCheck.duplicates[0]
                }
              } catch (error) {
                console.warn('Fingerprint calculation failed:', error)
                // Don't fail the upload if fingerprinting fails
              }
            }
            
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }
      )
    })
  }

  /**
   * Upload cover image with duplicate detection
   */
  async uploadCoverImage(file, userId, releaseId, onProgress = null) {
    // Validate image
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Image must be less than 10MB')
    }

    const path = this.generatePath(userId, releaseId, 'images', `cover_${file.name}`)
    const result = await this.uploadFile(file, path, onProgress, true)
    
    // If duplicate detected, ask user
    if (result.duplicateInfo) {
      const useExisting = confirm(
        `This image appears to be a duplicate of "${result.duplicateInfo.fingerprint.fileName}". ` +
        `Would you like to use the existing image?`
      )
      
      if (useExisting && result.duplicateInfo.fingerprint.url) {
        // Delete the newly uploaded file
        try {
          const storageRef = ref(storage, path)
          await deleteObject(storageRef)
        } catch (error) {
          console.error('Error deleting duplicate:', error)
        }
        
        return {
          url: result.duplicateInfo.fingerprint.url,
          path: result.duplicateInfo.fingerprint.path || path,
          name: result.duplicateInfo.fingerprint.fileName,
          size: result.duplicateInfo.fingerprint.fileSize,
          type: 'cover',
          reused: true,
          originalFingerprint: result.duplicateInfo.fingerprint,
          dimensions: await this.getImageDimensions(file)
        }
      }
    }
    
    return {
      ...result,
      type: 'cover',
      dimensions: await this.getImageDimensions(file)
    }
  }

  /**
   * Upload audio file with duplicate detection and audio fingerprinting
   */
  async uploadAudioFile(file, userId, releaseId, trackId, onProgress = null) {
    // Validate audio format
    const validFormats = ['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mpeg', 'audio/mp3']
    if (!validFormats.includes(file.type)) {
      throw new Error('Invalid audio format. Please upload WAV, FLAC, or MP3')
    }

    // Check file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      throw new Error('Audio file must be less than 500MB')
    }

    const path = this.generatePath(userId, releaseId, 'audio', `track_${trackId}_${file.name}`)
    const result = await this.uploadFile(file, path, onProgress, true)
    
    // Check for exact duplicates first
    if (result.duplicateInfo) {
      const proceed = confirm(
        `This audio file is an exact duplicate of "${result.duplicateInfo.fingerprint.fileName}". ` +
        `Continue with upload?`
      )
      
      if (!proceed) {
        // Delete the uploaded file
        try {
          const storageRef = ref(storage, path)
          await deleteObject(storageRef)
        } catch (error) {
          console.error('Error deleting file:', error)
        }
        throw new Error('Upload cancelled due to duplicate detection')
      }
    }
    
    // Calculate audio fingerprint for similarity detection
    if (result.url) {
      try {
        const audioFingerprint = await fingerprintService.calculateAudioFingerprint(
          result.url,
          trackId,
          releaseId
        )
        
        // Check for similar audio
        if (audioFingerprint.similar && audioFingerprint.similar.length > 0) {
          const topMatch = audioFingerprint.similar[0]
          if (topMatch.similarity > 90) {
            const proceed = confirm(
              `This audio is ${topMatch.similarity}% similar to another track in your catalog. ` +
              `Continue with upload?`
            )
            
            if (!proceed) {
              // Delete the uploaded file
              try {
                const storageRef = ref(storage, path)
                await deleteObject(storageRef)
              } catch (error) {
                console.error('Error deleting file:', error)
              }
              throw new Error('Upload cancelled due to similarity detection')
            }
          }
        }
        
        result.audioFingerprint = audioFingerprint
      } catch (error) {
        console.warn('Audio fingerprint calculation failed:', error)
        // Don't fail the upload if fingerprinting fails
      }
    }
    
    return {
      ...result,
      trackId,
      format: this.getAudioFormat(file.type),
      duration: await this.getAudioDuration(file)
    }
  }

  /**
   * Upload multiple files with batch fingerprinting
   */
  async uploadMultiple(files, userId, releaseId, type = 'documents') {
    const uploads = []
    
    // First, upload all files
    for (const file of files) {
      const path = this.generatePath(userId, releaseId, type, file.name)
      const result = await this.uploadFile(file, path, null, false) // Skip individual fingerprinting
      uploads.push(result)
    }
    
    // Then calculate fingerprints in batch for efficiency
    try {
      const fingerprintResult = await fingerprintService.calculateBatchFingerprints(
        uploads.map(u => ({ 
          url: u.url, 
          name: u.name, 
          type: u.contentType 
        })),
        releaseId
      )
      
      // Add fingerprint data to uploads
      if (fingerprintResult.results) {
        fingerprintResult.results.forEach((fp, index) => {
          if (uploads[index] && fp.success) {
            uploads[index].fingerprint = fp.fingerprint
          }
        })
      }
      
      // Warn about duplicates within batch
      if (fingerprintResult.duplicatesInBatch && fingerprintResult.duplicatesInBatch.length > 0) {
        const duplicateNames = fingerprintResult.duplicatesInBatch
          .map(d => `${d.file1} and ${d.file2}`)
          .join(', ')
        
        console.warn('Duplicates detected in batch:', duplicateNames)
        
        // Optionally alert the user
        if (confirm(`Duplicate files detected in upload: ${duplicateNames}. Continue?`) === false) {
          // Clean up uploaded files
          for (const upload of uploads) {
            try {
              const storageRef = ref(storage, upload.path)
              await deleteObject(storageRef)
            } catch (error) {
              console.error('Error cleaning up:', error)
            }
          }
          throw new Error('Upload cancelled due to duplicates in batch')
        }
      }
    } catch (error) {
      console.error('Batch fingerprint calculation failed:', error)
      // Don't fail the entire upload if fingerprinting fails
    }
    
    return uploads
  }

  /**
   * Delete an asset
   */
  async deleteAsset(path) {
    try {
      const storageRef = ref(storage, path)
      await deleteObject(storageRef)
      return true
    } catch (error) {
      console.error('Error deleting asset:', error)
      throw error
    }
  }

  /**
   * Get image dimensions
   */
  getImageDimensions(file) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        })
      }
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Get audio duration (basic implementation)
   */
  getAudioDuration(file) {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration))
      }
      audio.src = URL.createObjectURL(file)
    })
  }

  /**
   * Get audio format from MIME type
   */
  getAudioFormat(mimeType) {
    const formats = {
      'audio/wav': 'WAV',
      'audio/x-wav': 'WAV',
      'audio/flac': 'FLAC',
      'audio/mpeg': 'MP3',
      'audio/mp3': 'MP3'
    }
    return formats[mimeType] || 'UNKNOWN'
  }

  /**
   * Validate image requirements
   */
  validateImage(file, requirements = {}) {
    const errors = []
    
    if (requirements.minSize && file.size < requirements.minSize) {
      errors.push(`File size must be at least ${requirements.minSize / 1024}KB`)
    }
    
    if (requirements.maxSize && file.size > requirements.maxSize) {
      errors.push(`File size must be less than ${requirements.maxSize / 1024 / 1024}MB`)
    }
    
    if (requirements.formats && !requirements.formats.includes(file.type)) {
      errors.push(`File format must be one of: ${requirements.formats.join(', ')}`)
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get release fingerprint statistics
   */
  async getReleaseFingerprintStats(releaseId) {
    try {
      return await fingerprintService.getFingerprintStats(releaseId)
    } catch (error) {
      console.error('Error getting fingerprint stats:', error)
      return null
    }
  }

  /**
   * Check if a file already exists in the catalog by its fingerprint
   */
  async checkExistingFile(file) {
    try {
      // First upload to a temp location to get URL
      const tempPath = `temp/${Date.now()}_${file.name}`
      const tempRef = ref(storage, tempPath)
      
      // Upload without progress tracking
      const snapshot = await uploadBytesResumable(tempRef, file)
      const tempUrl = await getDownloadURL(snapshot.ref)
      
      // Calculate fingerprint
      const fingerprint = await fingerprintService.calculateFingerprint(tempUrl, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
      
      // Check for duplicates
      const duplicateCheck = await fingerprintService.checkDuplicates(fingerprint)
      
      // Clean up temp file
      await deleteObject(tempRef)
      
      return {
        exists: duplicateCheck.hasDuplicates,
        duplicates: duplicateCheck.duplicates || [],
        fingerprint
      }
    } catch (error) {
      console.error('Error checking existing file:', error)
      return { exists: false, error }
    }
  }

  /**
   * Get recent uploads for a user
   */
  async getRecentUploads(userId, limit = 10) {
    try {
      return await fingerprintService.getRecentFingerprints(userId, limit)
    } catch (error) {
      console.error('Error getting recent uploads:', error)
      return []
    }
  }
}

export default new AssetService()