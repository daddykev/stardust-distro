// src/services/import.js
import { db, storage } from '../firebase'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore'
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage'

export class ImportService {
  constructor() {
    this.collection = 'importJobs'
  }

  /**
   * Parse CSV file
   */
  parseCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const text = e.target.result
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length === 0) {
            throw new Error('CSV file is empty')
          }
          
          // Parse headers
          const headers = this.parseCSVLine(lines[0])
          
          // Parse data rows
          const data = []
          for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i])
            if (values.length === headers.length) {
              const row = {}
              headers.forEach((header, index) => {
                row[header] = values[index]
              })
              data.push(row)
            }
          }
          
          resolve({ headers, data })
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read CSV file'))
      reader.readAsText(file)
    })
  }

  /**
   * Parse a single CSV line handling quotes
   */
  parseCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  /**
   * Create a new import job
   */
  async createImportJob(userId, metadata) {
    try {
      const job = {
        userId,
        status: 'started',
        metadata,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      const docRef = await addDoc(collection(db, this.collection), job)
      return { id: docRef.id, ...job }
    } catch (error) {
      console.error('Error creating import job:', error)
      throw error
    }
  }

  cleanObjectForFirestore(obj) {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObjectForFirestore(item)).filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.cleanObjectForFirestore(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  /**
   * Update import job
   */
  async updateImportJob(jobId, updates) {
    try {
      // Clean the updates object before sending to Firestore
      const cleanedUpdates = this.cleanObjectForFirestore(updates);
      
      await updateDoc(doc(db, 'importJobs', jobId), {
        ...cleanedUpdates,
        updatedAt: serverTimestamp()
      });
      
      console.log('Import job updated successfully');
    } catch (error) {
      console.error('Error updating import job:', error);
      throw error;
    }
  }

  /**
   * Get active import job for user
   */
  async getActiveImportJob(userId) {
    try {
      const q = query(
        collection(db, this.collection),
        where('userId', '==', userId),
        where('status', 'in', ['started', 'metadata_imported', 'files_uploading', 'matching_complete'])
      )
      
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        return { id: doc.id, ...doc.data() }
      }
      return null
    } catch (error) {
      console.error('Error getting active import job:', error)
      return null
    }
  }

  /**
   * Upload batch files with DDEX naming
   */
  async uploadBatchFiles(files, userId, jobId, onProgress) {
    const uploaded = []
    const totalFiles = files.length
    let processedFiles = 0
    
    for (const fileData of files) {
      const { file, upc, discNumber, trackNumber, imageType } = fileData
      
      // Generate storage path
      const path = this.generateStoragePath(userId, jobId, file, {
        upc,
        discNumber,
        trackNumber,
        imageType
      })
      
      try {
        const url = await this.uploadFile(file, path, (progress) => {
          const overallProgress = ((processedFiles + progress / 100) / totalFiles) * 100
          if (onProgress) {
            onProgress(overallProgress)
          }
        })
        
        uploaded.push({
          name: file.name,
          url,
          path,
          upc,
          discNumber,
          trackNumber,
          imageType,
          format: this.getFileFormat(file),
          size: file.size
        })
        
        processedFiles++
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
      }
    }
    
    return uploaded
  }

  /**
   * Upload single file
   */
  uploadFile(file, path, onProgress) {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path)
      const uploadTask = uploadBytesResumable(storageRef, file)
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          if (onProgress) {
            onProgress(progress)
          }
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(downloadURL)
        }
      )
    })
  }

  /**
   * Generate storage path for imported files
   */
  generateStoragePath(userId, jobId, file, metadata) {
    const timestamp = Date.now()
    const folder = metadata.imageType ? 'images' : 'audio'
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `imports/${userId}/${jobId}/${folder}/${timestamp}_${cleanName}`
  }

  /**
   * Get file format from file
   */
  getFileFormat(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const formats = {
      'wav': 'WAV',
      'flac': 'FLAC',
      'mp3': 'MP3',
      'jpg': 'JPEG',
      'jpeg': 'JPEG',
      'png': 'PNG'
    }
    return formats[ext] || ext.toUpperCase()
  }

  /**
   * Cancel import job
   */
  async cancelImportJob(jobId) {
    try {
      await this.updateImportJob(jobId, {
        status: 'cancelled'
      })
      return true
    } catch (error) {
      console.error('Error cancelling import job:', error)
      throw error
    }
  }

  /**
   * Get incomplete imports for user
   */
  async getIncompleteImports(userId) {
    try {
      const q = query(
        collection(db, this.collection),
        where('userId', '==', userId),
        where('status', 'in', ['started', 'metadata_imported', 'files_uploading'])
      )
      
      const snapshot = await getDocs(q)
      const imports = []
      
      snapshot.forEach(doc => {
        imports.push({ id: doc.id, ...doc.data() })
      })
      
      return imports
    } catch (error) {
      console.error('Error getting incomplete imports:', error)
      return []
    }
  }
}

export default new ImportService()