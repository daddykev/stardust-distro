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
import metadataService from './assetMetadata'
import { 
  sanitizeFileName, 
  validateFileType, 
  validateFileSize 
} from '@/utils/sanitizer'

export class AssetService {
  constructor() {
    this.basePath = 'releases'
  }

  /**
   * Generate storage path for an asset with security
   */
  generatePath(userId, releaseId, assetType, fileName) {
    // Sanitize filename for security
    const sanitizedName = sanitizeFileName(fileName)
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    
    // Create secure path that prevents directory traversal
    const secureFileName = `${timestamp}_${randomString}_${sanitizedName}`
    return `${this.basePath}/${userId}/${releaseId}/${assetType}/${secureFileName}`
  }

  /**
   * Upload a single file with progress tracking, security validation, and duplicate detection
   */
  async uploadFile(file, path, onProgress = null, checkDuplicates = true) {
    try {
      // Security: Validate file type by magic numbers
      const fileValidation = await validateFileType(file)
      
      // Security: Validate file size based on type
      const maxSizeMB = ['jpeg', 'png'].includes(fileValidation.type) ? 10 : 500
      validateFileSize(file, maxSizeMB)
      
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
                name: sanitizeFileName(file.name), // Use sanitized name
                size: metadata.size,
                contentType: metadata.contentType,
                uploadedAt: metadata.timeCreated,
                fileType: fileValidation.type // Add validated file type
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
    } catch (error) {
      // Security validation failed
      console.error('File validation failed:', error)
      throw error
    }
  }

  /**
   * Upload cover image with security validation, duplicate detection, and metadata extraction
   */
  async uploadCoverImage(file, userId, releaseId, onProgress = null) {
    try {
      // Security: Pre-validate image file
      const fileValidation = await validateFileType(file)
      
      // Ensure it's actually an image
      if (!['jpeg', 'png'].includes(fileValidation.type)) {
        throw new Error('File must be a JPEG or PNG image')
      }

      // Security: Check file size (max 10MB for images)
      validateFileSize(file, 10)

      const path = this.generatePath(userId, releaseId, 'images', `cover_${file.name}`)
      const result = await this.uploadFile(file, path, onProgress, true)
      
      // Extract enhanced metadata
      if (result.url) {
        try {
          const metadata = await metadataService.getImageMetadata(
            result.url,
            file.name,
            file.size
          )
          result.metadata = metadata
          
          // Check if image meets requirements
          if (!metadata.quality?.meetsRequirements?.coverArt) {
            console.warn('Cover image does not meet 3000x3000 requirement')
            // Optionally alert the user
            const proceed = confirm(
              'This image does not meet the recommended 3000x3000 minimum resolution for cover art. ' +
              'Continue anyway?'
            )
            if (!proceed) {
              // Delete the uploaded file
              try {
                const storageRef = ref(storage, path)
                await deleteObject(storageRef)
              } catch (error) {
                console.error('Error deleting file:', error)
              }
              throw new Error('Upload cancelled due to resolution requirements')
            }
          }
          
          // Get quality badge
          result.qualityBadge = metadataService.getImageQualityBadge(metadata)
        } catch (error) {
          console.error('Failed to extract image metadata:', error)
          // Don't fail the upload if metadata extraction fails
        }
      }
      
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
            dimensions: result.metadata?.dimensions || await this.getImageDimensions(file),
            metadata: result.metadata,
            qualityBadge: result.qualityBadge
          }
        }
      }
      
      return {
        ...result,
        type: 'cover',
        dimensions: result.metadata?.dimensions || await this.getImageDimensions(file)
      }
    } catch (error) {
      console.error('Cover image upload failed:', error)
      throw error
    }
  }

  /**
   * Upload audio file with security validation, duplicate detection, audio fingerprinting, and metadata extraction
   */
  async uploadAudioFile(file, userId, releaseId, trackId, onProgress = null) {
    try {
      // Security: Pre-validate audio file
      const fileValidation = await validateFileType(file)
      
      // Ensure it's actually an audio file
      if (!['wav', 'flac', 'mp3'].includes(fileValidation.type)) {
        throw new Error('File must be WAV, FLAC, or MP3 audio')
      }

      // Security: Check file size (max 500MB for audio)
      validateFileSize(file, 500)

      const path = this.generatePath(userId, releaseId, 'audio', `track_${trackId}_${file.name}`)
      const result = await this.uploadFile(file, path, onProgress, true)
      
      // Extract enhanced metadata
      if (result.url) {
        try {
          const metadata = await metadataService.getAudioMetadata(
            result.url,
            file.name,
            file.size
          )
          result.metadata = metadata
          
          // Check audio quality
          const qualityBadge = metadataService.getAudioQualityBadge(metadata)
          result.qualityBadge = qualityBadge
          
          // Log quality warnings
          if (metadata.format?.bitrate && metadata.format.bitrate < 128000) {
            console.warn(`Low bitrate detected: ${metadataService.formatBitrate(metadata.format.bitrate)}`)
            const proceed = confirm(
              `This audio file has a low bitrate (${metadataService.formatBitrate(metadata.format.bitrate)}). ` +
              `This may result in poor audio quality. Continue anyway?`
            )
            if (!proceed) {
              // Delete the uploaded file
              try {
                const storageRef = ref(storage, path)
                await deleteObject(storageRef)
              } catch (error) {
                console.error('Error deleting file:', error)
              }
              throw new Error('Upload cancelled due to low bitrate')
            }
          }
        } catch (error) {
          console.error('Failed to extract audio metadata:', error)
          // Don't fail the upload if metadata extraction fails
        }
      }
      
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
        format: result.metadata?.format?.codec || this.getAudioFormat(fileValidation.mimeTypes[0] || file.type),
        duration: result.metadata?.format?.duration || await this.getAudioDuration(file),
        // Add enhanced metadata fields
        bitrate: result.metadata?.format?.bitrate,
        sampleRate: result.metadata?.format?.sampleRate,
        bitsPerSample: result.metadata?.format?.bitsPerSample,
        channels: result.metadata?.format?.numberOfChannels,
        channelLayout: result.metadata?.format?.channelLayout,
        lossless: result.metadata?.format?.lossless,
        fileSize: result.metadata?.format?.fileSize || file.size,
        mimeType: result.metadata?.format?.mimeType || file.type,
        isHighResolution: result.metadata?.quality?.isHighResolution || false,
        embeddedTags: result.metadata?.tags || null
      }
    } catch (error) {
      console.error('Audio file upload failed:', error)
      throw error
    }
  }

  /**
   * Upload multiple files with security validation and batch fingerprinting
   */
  async uploadMultiple(files, userId, releaseId, type = 'documents') {
    const uploads = []
    const errors = []
    
    // Security: Pre-validate all files
    for (const file of files) {
      try {
        await validateFileType(file)
        const maxSizeMB = type === 'images' ? 10 : 500
        validateFileSize(file, maxSizeMB)
      } catch (error) {
        errors.push({ file: file.name, error: error.message })
      }
    }
    
    // If any validation errors, report them
    if (errors.length > 0) {
      const errorMsg = errors.map(e => `${e.file}: ${e.error}`).join('\n')
      throw new Error(`File validation errors:\n${errorMsg}`)
    }
    
    // Upload all validated files
    for (const file of files) {
      try {
        const path = this.generatePath(userId, releaseId, type, file.name)
        const result = await this.uploadFile(file, path, null, false) // Skip individual fingerprinting
        
        // Extract metadata based on file type
        if (result.url) {
          try {
            if (type === 'images' || file.type.startsWith('image/')) {
              const metadata = await metadataService.getImageMetadata(
                result.url,
                file.name,
                file.size
              )
              result.metadata = metadata
              result.qualityBadge = metadataService.getImageQualityBadge(metadata)
            } else if (type === 'audio' || file.type.startsWith('audio/')) {
              const metadata = await metadataService.getAudioMetadata(
                result.url,
                file.name,
                file.size
              )
              result.metadata = metadata
              result.qualityBadge = metadataService.getAudioQualityBadge(metadata)
            }
          } catch (error) {
            console.error(`Failed to extract metadata for ${file.name}:`, error)
          }
        }
        
        uploads.push(result)
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        errors.push({ file: file.name, error: error.message })
      }
    }
    
    // Then calculate fingerprints in batch for efficiency
    if (uploads.length > 0) {
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
    }
    
    // Report any upload errors
    if (errors.length > 0) {
      console.warn('Some files failed to upload:', errors)
    }
    
    return uploads
  }

  /**
   * Delete an asset with security checks
   */
  async deleteAsset(path, userId) {
    try {
      // Security: Verify the path belongs to the user
      if (!path.includes(`/${userId}/`)) {
        throw new Error('Unauthorized: Cannot delete assets from other users')
      }
      
      // Security: Prevent directory traversal
      if (path.includes('..')) {
        throw new Error('Invalid path')
      }
      
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
      img.onerror = () => {
        resolve({ width: 0, height: 0 })
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
      audio.onerror = () => {
        resolve(0)
      }
      audio.src = URL.createObjectURL(file)
    })
  }

  /**
   * Get audio format from MIME type or validated type
   */
  getAudioFormat(mimeType) {
    const formats = {
      'audio/wav': 'WAV',
      'audio/x-wav': 'WAV',
      'audio/flac': 'FLAC',
      'audio/x-flac': 'FLAC',
      'audio/mpeg': 'MP3',
      'audio/mp3': 'MP3',
      'wav': 'WAV',
      'flac': 'FLAC',
      'mp3': 'MP3'
    }
    return formats[mimeType] || 'UNKNOWN'
  }

  /**
   * Validate image requirements with security
   */
  validateImage(file, requirements = {}) {
    const errors = []
    
    // Security: Validate file type first
    validateFileType(file).catch(err => {
      errors.push('Invalid file type: Must be JPEG or PNG')
    })
    
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
      // Security: Validate file first
      await validateFileType(file)
      
      // First upload to a temp location to get URL
      const tempPath = `temp/${Date.now()}_${sanitizeFileName(file.name)}`
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