// src/services/assets.js
import { storage } from '../firebase'
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  getMetadata
} from 'firebase/storage'

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
   * Upload a single file with progress tracking
   */
  uploadFile(file, path, onProgress = null) {
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
            
            resolve({
              url: downloadURL,
              path: path,
              name: file.name,
              size: metadata.size,
              contentType: metadata.contentType,
              uploadedAt: metadata.timeCreated
            })
          } catch (error) {
            reject(error)
          }
        }
      )
    })
  }

  /**
   * Upload cover image
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
    const result = await this.uploadFile(file, path, onProgress)
    
    return {
      ...result,
      type: 'cover',
      dimensions: await this.getImageDimensions(file)
    }
  }

  /**
   * Upload audio file
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
    const result = await this.uploadFile(file, path, onProgress)
    
    return {
      ...result,
      trackId,
      format: this.getAudioFormat(file.type),
      duration: await this.getAudioDuration(file)
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files, userId, releaseId, type = 'documents') {
    const uploads = []
    
    for (const file of files) {
      const path = this.generatePath(userId, releaseId, type, file.name)
      const result = await this.uploadFile(file, path)
      uploads.push(result)
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
}

export default new AssetService()