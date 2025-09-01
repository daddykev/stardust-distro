import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

class MetadataService {
  constructor() {
    // Initialize callable functions
    this.extractAudioMetadata = httpsCallable(functions, 'extractAudioMetadata')
    this.extractImageMetadata = httpsCallable(functions, 'extractImageMetadata')
  }

  /**
   * Extract enhanced metadata for an audio file
   */
  async getAudioMetadata(url, fileName, fileSize) {
    try {
      // First try to get basic metadata client-side
      const clientMetadata = await this.getClientAudioMetadata(url)
      
      // Then get comprehensive metadata from Cloud Function
      const result = await this.extractAudioMetadata({
        url,
        fileName,
        fileSize
      })
      
      // Merge client and server metadata
      return {
        ...result.data,
        client: clientMetadata
      }
    } catch (error) {
      console.error('Error extracting audio metadata:', error)
      // Fallback to client-only metadata
      try {
        const fallbackMetadata = await this.getClientAudioMetadata(url)
        return {
          format: {
            duration: fallbackMetadata.duration || 0,
            fileSize: fileSize
          },
          client: fallbackMetadata
        }
      } catch (clientError) {
        console.error('Client audio metadata also failed:', clientError)
        return {
          format: {
            duration: 0,
            fileSize: fileSize
          },
          client: null
        }
      }
    }
  }

  /**
   * Extract enhanced metadata for an image file
   */
  async getImageMetadata(url, fileName, fileSize) {
    let clientMetadata = null;
    
    try {
      // First try to get basic metadata client-side
      clientMetadata = await this.getClientImageMetadata(url)
    } catch (error) {
      console.warn('Client-side image metadata extraction failed:', error)
      clientMetadata = {
        width: 0,
        height: 0,
        complete: false
      }
    }
    
    try {
      // Then get comprehensive metadata from Cloud Function
      const result = await this.extractImageMetadata({
        url,
        fileName,
        fileSize
      })
      
      // Merge client and server metadata
      return {
        ...result.data,
        client: clientMetadata
      }
    } catch (error) {
      console.error('Error extracting image metadata:', error)
      // Fallback to client-only metadata
      return {
        dimensions: clientMetadata || { width: 0, height: 0 },
        format: {
          fileSize: fileSize
        },
        client: clientMetadata
      }
    }
  }

  /**
   * Get basic audio metadata client-side
   */
  async getClientAudioMetadata(url) {
    return new Promise((resolve) => {
      const audio = new Audio()
      
      const metadata = {
        duration: 0,
        readyState: 0,
        networkState: 0
      }
      
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata)
        audio.removeEventListener('error', onError)
        audio.src = ''
      }
      
      const onLoadedMetadata = () => {
        metadata.duration = Math.round(audio.duration)
        metadata.readyState = audio.readyState
        metadata.networkState = audio.networkState
        cleanup()
        resolve(metadata)
      }
      
      const onError = () => {
        cleanup()
        resolve(metadata)
      }
      
      audio.addEventListener('loadedmetadata', onLoadedMetadata)
      audio.addEventListener('error', onError)
      
      // Set timeout
      setTimeout(() => {
        cleanup()
        resolve(metadata)
      }, 5000)
      
      audio.src = url
    })
  }

  /**
   * Get basic image metadata client-side
   */
  async getClientImageMetadata(url) {
    return new Promise((resolve) => {
      const img = new Image()
      
      const metadata = {
        width: 0,
        height: 0,
        naturalWidth: 0,
        naturalHeight: 0,
        complete: false
      }
      
      const cleanup = () => {
        img.removeEventListener('load', onLoad)
        img.removeEventListener('error', onError)
        img.src = ''
      }
      
      const onLoad = () => {
        metadata.width = img.width
        metadata.height = img.height
        metadata.naturalWidth = img.naturalWidth
        metadata.naturalHeight = img.naturalHeight
        metadata.complete = img.complete
        cleanup()
        resolve(metadata)
      }
      
      const onError = () => {
        cleanup()
        resolve(metadata)
      }
      
      img.addEventListener('load', onLoad)
      img.addEventListener('error', onError)
      
      // Set timeout
      setTimeout(() => {
        cleanup()
        resolve(metadata)
      }, 5000)
      
      img.src = url
    })
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Format bitrate for display
   */
  formatBitrate(bitrate) {
    if (!bitrate) return 'Unknown'
    return `${Math.round(bitrate / 1000)} kbps`
  }

  /**
   * Format sample rate for display
   */
  formatSampleRate(sampleRate) {
    if (!sampleRate) return 'Unknown'
    return `${(sampleRate / 1000).toFixed(1)} kHz`
  }

  /**
   * Get quality badge for audio
   */
  getAudioQualityBadge(metadata) {
    if (!metadata?.format) return { text: 'Unknown', color: 'gray' }
    
    if (metadata.format.lossless) {
      if (metadata.format.sampleRate > 44100 || metadata.format.bitsPerSample > 16) {
        return { text: 'Hi-Res Lossless', color: 'purple' }
      }
      return { text: 'Lossless', color: 'blue' }
    }
    
    if (metadata.format.bitrate >= 320000) {
      return { text: 'High Quality', color: 'green' }
    } else if (metadata.format.bitrate >= 192000) {
      return { text: 'Good Quality', color: 'yellow' }
    }
    
    return { text: 'Compressed', color: 'orange' }
  }

  /**
   * Get quality badge for image
   */
  getImageQualityBadge(metadata) {
    if (!metadata?.dimensions) return { text: 'Unknown', color: 'gray' }
    
    const { width, height } = metadata.dimensions
    
    if (width >= 3000 && height >= 3000) {
      return { text: 'High Resolution', color: 'green' }
    } else if (width >= 1500 && height >= 1500) {
      return { text: 'Medium Resolution', color: 'yellow' }
    }
    
    return { text: 'Low Resolution', color: 'red' }
  }
}

export default new MetadataService()