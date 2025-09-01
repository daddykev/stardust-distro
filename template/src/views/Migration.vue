<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useCatalog } from '../composables/useCatalog'
import batchService from '../services/batch'
import productMetadataService from '../services/productMetadata'
import metadataSynthesizer from '../services/metadataSynthesizer'
import metadataService from '../services/assetMetadata'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'

const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const { createRelease } = useCatalog()
const functions = getFunctions()

// Batch context
const batchId = ref(route.query.batchId || null)
const batch = ref(null)
const batchReleases = ref([])

// Track newly created releases
const newlyCreatedReleases = ref(new Set())

// UI State
const activeTab = ref('all') // 'all', 'incomplete', 'complete'
const selectedRelease = ref(null)
const expandedRelease = ref(null)
const isLoading = ref(false)
const error = ref(null)
const successMessage = ref(null)

// Import state
const showImportModal = ref(false)
const importType = ref('upc-list') // 'upc-list', 'csv-full', 'manual'
const csvFile = ref(null)
const upcList = ref('')
const parsedData = ref([])

// Asset upload state
const uploadProgress = ref({})
const processingAssets = ref(false)

// Metadata fetch state
const fetchingMetadata = ref(false)
const metadataProgress = ref({})

// Add helper functions for formatting
const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

const formatBitrate = (bitrate) => {
  if (!bitrate) return 'Unknown'
  return `${Math.round(bitrate / 1000)} kbps`
}

const formatSampleRate = (sampleRate) => {
  if (!sampleRate) return 'Unknown'
  return `${(sampleRate / 1000).toFixed(1)} kHz`
}

const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Computed
const incompleteBatchReleases = computed(() => 
  batchReleases.value.filter(r => !r.cataloged && !batchService.isReleaseComplete(r))
)

const completeBatchReleases = computed(() => 
  batchReleases.value.filter(r => !r.cataloged && batchService.isReleaseComplete(r))
)

const catalogedBatchReleases = computed(() => 
  batchReleases.value.filter(r => r.cataloged)
)

const filteredReleases = computed(() => {
  if (activeTab.value === 'incomplete') return incompleteBatchReleases.value
  if (activeTab.value === 'complete') return completeBatchReleases.value
  return batchReleases.value
})

const selectedReleaseCompleteness = computed(() => {
  if (!selectedRelease.value) return null
  
  return {
    hasMetadata: !!(selectedRelease.value.metadata?.title),
    hasCover: !!selectedRelease.value.coverArt,
    hasAllAudio: !!selectedRelease.value.hasAllAudio,
    tracksWithAudio: selectedRelease.value.tracks?.filter(t => t.audioFile).length || 0,
    totalTracks: selectedRelease.value.tracks?.length || 0
  }
})

// Methods
const loadBatch = async () => {
  if (!batchId.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    batch.value = await batchService.getBatch(batchId.value)
    batchReleases.value = batch.value.releases || []
  } catch (err) {
    console.error('Error loading batch:', err)
    error.value = 'Failed to load batch'
  } finally {
    isLoading.value = false
  }
}

const toggleReleaseExpansion = (release) => {
  if (expandedRelease.value?.upc === release.upc) {
    expandedRelease.value = null
    selectedRelease.value = null
  } else {
    expandedRelease.value = release
    selectedRelease.value = release
  }
}

const showImportDialog = () => {
  showImportModal.value = true
  importType.value = 'upc-list'
  upcList.value = ''
  csvFile.value = null
}

const parseUPCList = () => {
  // Parse UPC list (one per line or comma-separated)
  const upcs = upcList.value
    .split(/[\n,]/)
    .map(upc => upc.trim())
    .filter(upc => /^\d{12,14}$/.test(upc))
  
  return [...new Set(upcs)] // Remove duplicates
}

const handleCSVUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  csvFile.value = file
  
  // Read and parse CSV
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  
  // Check if it's a single-column UPC list
  const firstLine = lines[0]
  if (firstLine && !firstLine.includes(',')) {
    // Single column - treat as UPC list
    const upcs = lines
      .map(line => line.trim())
      .filter(upc => /^\d{12,14}$/.test(upc))
    
    upcList.value = upcs.join('\n')
    importType.value = 'upc-list'
  } else {
    // Full CSV - parse normally (future implementation)
    error.value = 'Full CSV import not yet implemented. Please use UPC list.'
  }
}

const startImport = async () => {
  if (importType.value === 'upc-list') {
    const upcs = parseUPCList()
    if (upcs.length === 0) {
      error.value = 'No valid UPCs found'
      return
    }
    
    showImportModal.value = false
    await fetchMetadataForUPCs(upcs)
  } else if (importType.value === 'manual') {
    // Create empty release
    const emptyRelease = {
      upc: '',
      metadata: {},
      tracks: [],
      coverArt: null,
      hasAllAudio: false
    }
    
    await batchService.addReleasesToBatch(batchId.value, [emptyRelease])
    await loadBatch()
    showImportModal.value = false
  }
}

const fetchMetadataForUPCs = async (upcs) => {
  fetchingMetadata.value = true
  error.value = null
  metadataProgress.value = { current: 0, total: upcs.length }
  
  const releases = []
  
  for (let i = 0; i < upcs.length; i++) {
    const upc = upcs[i]
    metadataProgress.value.current = i + 1
    
    try {
      // Fetch from multiple sources
      const productMetadata = await productMetadataService.getMetadata(upc, {
        sources: ['spotify', 'deezer'],
        forceRefresh: false
      })
      
      if (productMetadata && (productMetadata.extracted?.spotify || productMetadata.extracted?.deezer)) {
        // Synthesize metadata
        const synthesized = metadataSynthesizer.synthesize(productMetadata, {
          strategy: 'preferred',
          preferredSource: 'spotify'
        })
        
        if (synthesized) {
          const release = {
            upc,
            metadata: {
              title: synthesized.title,
              artist: synthesized.artist,
              label: synthesized.label,
              releaseDate: synthesized.releaseDate,
              genre: synthesized.genre,
              coverUrl: synthesized.coverArt?.xl || synthesized.coverArt?.large
            },
            tracks: synthesized.tracks.map((track, idx) => ({
              position: track.position || idx + 1,
              title: track.title,
              artist: track.artist || synthesized.artist,
              isrc: track.isrc,
              duration: track.duration?.synthesized || 0,
              audioFile: null
            })),
            coverArt: null,
            hasAllAudio: false,
            cataloged: false,
            sources: productMetadata.quality?.sources || []
          }
          
          releases.push(release)
          successMessage.value = `Found metadata for ${upc}: ${synthesized.title}`
        } else {
          // Create placeholder release with just UPC
          releases.push({
            upc,
            metadata: {},
            tracks: [],
            coverArt: null,
            hasAllAudio: false,
            cataloged: false,
            error: 'Metadata not found'
          })
        }
      } else {
        // Create placeholder release
        releases.push({
          upc,
          metadata: {},
          tracks: [],
          coverArt: null,
          hasAllAudio: false,
          cataloged: false,
          error: 'Metadata not found'
        })
      }
    } catch (err) {
      console.error(`Error fetching metadata for ${upc}:`, err)
      releases.push({
        upc,
        metadata: {},
        tracks: [],
        coverArt: null,
        hasAllAudio: false,
        cataloged: false,
        error: err.message
      })
    }
    
    // Small delay between requests
    if (i < upcs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  // Add releases to batch
  await batchService.addReleasesToBatch(batchId.value, releases)
  await loadBatch()
  
  fetchingMetadata.value = false
  metadataProgress.value = {}
  
  if (releases.length > 0) {
    successMessage.value = `Added ${releases.length} releases to batch`
    setTimeout(() => { successMessage.value = null }, 5000)
  }
}

const updateReleaseMetadata = async (field, value) => {
  if (!selectedRelease.value) return
  
  const updates = {
    metadata: {
      ...selectedRelease.value.metadata,
      [field]: value
    }
  }
  
  await batchService.updateReleaseInBatch(batchId.value, selectedRelease.value.upc, updates)
  await loadBatch()
  
  // Update selected release reference
  selectedRelease.value = batchReleases.value.find(r => r.upc === selectedRelease.value.upc)
  expandedRelease.value = selectedRelease.value
}

const handleCoverUpload = async (event) => {
  const file = event.target.files[0]
  if (!file || !selectedRelease.value) return
  
  processingAssets.value = true
  
  try {
    // Upload to Firebase Storage
    const fileName = `${selectedRelease.value.upc}_cover.${file.name.split('.').pop()}`
    const storagePath = `batches/${batchId.value}/${selectedRelease.value.upc}/${fileName}`
    const fileRef = storageRef(storage, storagePath)
    
    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)
    
    // Extract enhanced metadata
    let imageMetadata = null
    try {
      imageMetadata = await metadataService.getImageMetadata(url, fileName, file.size)
      console.log('Extracted image metadata:', imageMetadata)
    } catch (err) {
      console.warn('Failed to extract image metadata:', err)
    }
    
    // Update release with metadata
    await batchService.updateReleaseInBatch(batchId.value, selectedRelease.value.upc, {
      coverArt: {
        url,
        fileName,
        path: storagePath,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        fileType: file.type.split('/')[1]?.toUpperCase() || 'JPEG',
        dimensions: imageMetadata?.dimensions || { width: 0, height: 0 },
        colorSpace: imageMetadata?.format?.space || 'srgb',
        metadata: imageMetadata
      }
    })
    
    await loadBatch()
    selectedRelease.value = batchReleases.value.find(r => r.upc === selectedRelease.value.upc)
    expandedRelease.value = selectedRelease.value
    
    successMessage.value = 'Cover art uploaded successfully'
    setTimeout(() => { successMessage.value = null }, 3000)
  } catch (err) {
    console.error('Error uploading cover:', err)
    error.value = 'Failed to upload cover art'
  } finally {
    processingAssets.value = false
  }
}

const handleTrackAudioUpload = async (event, trackIndex) => {
  const file = event.target.files[0]
  if (!file || !selectedRelease.value) return
  
  processingAssets.value = true
  
  try {
    const track = selectedRelease.value.tracks[trackIndex]
    const fileName = `${selectedRelease.value.upc}_${String(trackIndex + 1).padStart(2, '0')}.${file.name.split('.').pop()}`
    const storagePath = `batches/${batchId.value}/${selectedRelease.value.upc}/audio/${fileName}`
    const fileRef = storageRef(storage, storagePath)
    
    // Upload with progress tracking
    uploadProgress.value[fileName] = 0
    
    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)
    
    // Extract enhanced metadata
    let audioMetadata = null
    try {
      audioMetadata = await metadataService.getAudioMetadata(url, fileName, file.size)
      console.log('Extracted audio metadata:', audioMetadata)
    } catch (err) {
      console.warn('Failed to extract audio metadata:', err)
    }
    
    // Update track with audio file and metadata
    const updatedTracks = [...selectedRelease.value.tracks]
    updatedTracks[trackIndex] = {
      ...track,
      audioFile: {
        url,
        fileName,
        path: storagePath,
        format: audioMetadata?.format?.codec || file.name.split('.').pop().toUpperCase(),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        duration: audioMetadata?.format?.duration || track.duration || 0,
        bitrate: audioMetadata?.format?.bitrate,
        sampleRate: audioMetadata?.format?.sampleRate,
        channels: audioMetadata?.format?.numberOfChannels,
        lossless: audioMetadata?.format?.lossless,
        metadata: audioMetadata
      }
    }
    
    // Check if all tracks have audio
    const hasAllAudio = updatedTracks.every(t => t.audioFile)
    
    await batchService.updateReleaseInBatch(batchId.value, selectedRelease.value.upc, {
      tracks: updatedTracks,
      hasAllAudio
    })
    
    await loadBatch()
    selectedRelease.value = batchReleases.value.find(r => r.upc === selectedRelease.value.upc)
    expandedRelease.value = selectedRelease.value
    
    delete uploadProgress.value[fileName]
    successMessage.value = `Audio uploaded for track ${trackIndex + 1}`
    setTimeout(() => { successMessage.value = null }, 3000)
  } catch (err) {
    console.error('Error uploading audio:', err)
    error.value = 'Failed to upload audio'
  } finally {
    processingAssets.value = false
  }
}

// UPDATED: Fixed image URL handling
const handleBulkAssetUpload = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return
  
  processingAssets.value = true
  error.value = null
  successMessage.value = null
  
  try {
    // Sort files into audio and images
    const audioFiles = []
    const imageFiles = []
    
    for (const file of files) {
      const fileType = file.type.toLowerCase()
      const fileName = file.name.toLowerCase()
      
      if (fileType.startsWith('audio/') || 
          fileName.endsWith('.wav') || 
          fileName.endsWith('.flac') || 
          fileName.endsWith('.mp3')) {
        audioFiles.push(file)
      } else if (fileType.startsWith('image/') || 
                 fileName.endsWith('.jpg') || 
                 fileName.endsWith('.jpeg') || 
                 fileName.endsWith('.png')) {
        imageFiles.push(file)
      } else {
        console.warn(`Skipping unsupported file type: ${file.name}`)
      }
    }
    
    console.log(`📦 Processing ${audioFiles.length} audio and ${imageFiles.length} image files`)
    
    // Process image files first
    let imagesUploaded = 0
    let imagesReplaced = 0
    
    for (const file of imageFiles) {
      // Extract UPC from filename
      // Expected formats: UPC.jpg or UPC_XX.jpg
      const match = file.name.match(/^(\d{12,14})(?:_\d{2})?\./)
      if (!match) {
        console.warn(`Skipping image with invalid naming: ${file.name}`)
        continue
      }
      
      const upc = match[1]
      const release = batchReleases.value.find(r => r.upc === upc)
      
      if (!release) {
        console.warn(`No release found for UPC ${upc}`)
        continue
      }
      
      // Check if release already has cover art
      let shouldUpload = true
      let existingCoverPath = null
      
      if (release.coverArt?.url) {
        console.log(`🖼️ Release ${upc} already has cover art. Comparing quality...`)
        
        // Upload new image to temp location first
        const tempFileName = `temp_${Date.now()}_${file.name}`
        const tempPath = `batches/${batchId.value}/temp/${tempFileName}`
        const tempRef = storageRef(storage, tempPath)
        
        await uploadBytes(tempRef, file)
        const tempUrl = await getDownloadURL(tempRef)
        
        // Extract metadata for new image
        const newMetadata = await metadataService.getImageMetadata(tempUrl, file.name, file.size)
        const newWidth = newMetadata?.dimensions?.width || 0
        const newHeight = newMetadata?.dimensions?.height || 0
        const newResolution = newWidth * newHeight
        
        // Compare with existing
        const existingWidth = release.coverArt.dimensions?.width || 0
        const existingHeight = release.coverArt.dimensions?.height || 0
        const existingResolution = existingWidth * existingHeight
        
        console.log(`  Existing: ${existingWidth}x${existingHeight} (${existingResolution} pixels)`)
        console.log(`  New: ${newWidth}x${newHeight} (${newResolution} pixels)`)
        
        if (newResolution > existingResolution) {
          console.log(`  ✅ New image is higher resolution. Replacing...`)
          existingCoverPath = release.coverArt.path
          shouldUpload = true
          imagesReplaced++
        } else {
          console.log(`  ❌ Existing image has equal or better resolution. Keeping existing.`)
          shouldUpload = false
        }
        
        // Clean up temp file
        try {
          await deleteObject(tempRef)
        } catch (err) {
          console.warn('Failed to delete temp file:', err)
        }
      }
      
      if (shouldUpload) {
        // Delete old cover FIRST if replacing
        if (existingCoverPath) {
          try {
            const oldRef = storageRef(storage, existingCoverPath)
            await deleteObject(oldRef)
            console.log(`  🗑️ Deleted old lower-resolution cover`)
          } catch (err) {
            console.warn('Failed to delete old cover:', err)
          }
        }
        
        // Use timestamp in filename to ensure uniqueness
        const timestamp = Date.now()
        const fileExtension = file.name.split('.').pop()
        const fileName = `${upc}_cover_${timestamp}.${fileExtension}`
        const storagePath = `batches/${batchId.value}/${upc}/${fileName}`
        const fileRef = storageRef(storage, storagePath)
        
        await uploadBytes(fileRef, file, {
          contentType: file.type, // Explicitly set content type
          customMetadata: {
            upc,
            source: 'bulk-upload',
            replacedExisting: existingCoverPath ? 'true' : 'false'
          }
        })
        
        // Get the download URL - this will have the proper token
        const url = await getDownloadURL(fileRef)
        console.log(`  📸 New image URL: ${url.substring(0, 100)}...`)
        
        // Extract metadata using the actual URL
        let imageMetadata = null
        try {
          imageMetadata = await metadataService.getImageMetadata(url, fileName, file.size)
          console.log(`  📊 Image metadata extracted:`, imageMetadata?.dimensions)
        } catch (err) {
          console.warn('Failed to extract image metadata:', err)
        }
        
        // Update release - store the clean URL without modifications
        await batchService.updateReleaseInBatch(batchId.value, upc, {
          coverArt: {
            url: url, // Store the clean URL from Firebase
            fileName,
            path: storagePath,
            source: 'bulk-upload',
            uploadedAt: new Date().toISOString(),
            timestamp: timestamp, // Store timestamp separately if needed for cache busting
            fileSize: file.size,
            fileType: file.type.split('/')[1]?.toUpperCase() || 'JPEG',
            dimensions: imageMetadata?.dimensions || { width: 0, height: 0 },
            colorSpace: imageMetadata?.format?.space || 'srgb',
            metadata: imageMetadata,
            replacedPrevious: !!existingCoverPath
          }
        })
        
        imagesUploaded++
        console.log(`✅ Uploaded cover art for ${upc}`)
      }
    }
    
    // Process audio files (rest of the code remains the same)
    const filesByUPC = new Map()
    const newUPCs = new Set()
    
    for (const file of audioFiles) {
      const match = file.name.match(/^(\d{12,14})_(\d{2})_(\d{2,3})\./)
      if (!match) {
        console.warn(`Skipping audio file with invalid DDEX naming: ${file.name}`)
        continue
      }
      
      const [, upc, disc, track] = match
      
      // Check if this UPC already exists in the batch
      const existingRelease = batchReleases.value.find(r => r.upc === upc)
      
      if (!existingRelease) {
        newUPCs.add(upc)
      }
      
      // Group files by UPC
      if (!filesByUPC.has(upc)) {
        filesByUPC.set(upc, [])
      }
      filesByUPC.get(upc).push({
        file,
        discNumber: parseInt(disc),
        trackNumber: parseInt(track)
      })
    }
    
    // If we found new UPCs, fetch metadata and create releases
    if (newUPCs.size > 0) {
      console.log(`🎵 Found ${newUPCs.size} new UPCs in uploaded files. Fetching metadata...`)
      successMessage.value = `Found ${newUPCs.size} new releases. Fetching metadata...`
      
      await fetchMetadataAndCreateReleases(Array.from(newUPCs))
      
      // Track these as newly created
      newUPCs.forEach(upc => newlyCreatedReleases.value.add(upc))
    }
    
    // Process all audio files
    let uploadedCount = 0
    let matchedCount = 0
    
    for (const [upc, fileInfos] of filesByUPC) {
      // Find the release
      const release = batchReleases.value.find(r => r.upc === upc)
      
      if (!release) {
        console.error(`Release not found for UPC ${upc} even after creation attempt`)
        continue
      }
      
      // Process each audio file for this release
      for (const fileInfo of fileInfos) {
        const { file, discNumber, trackNumber } = fileInfo
        
        // Find the matching track
        const trackIndex = release.tracks?.findIndex(t => 
          t.position === trackNumber || 
          (t.trackNumber === trackNumber && (!t.discNumber || t.discNumber === discNumber))
        )
        
        if (trackIndex === -1 || !release.tracks) {
          console.warn(`No track ${trackNumber} found for UPC ${upc}`)
          continue
        }
        
        // Upload the audio file
        const fileName = file.name
        const storagePath = `batches/${batchId.value}/${upc}/audio/${fileName}`
        const fileRef = storageRef(storage, storagePath)
        
        uploadProgress.value[fileName] = 0
        
        await uploadBytes(fileRef, file, {
          customMetadata: {
            upc,
            trackNumber: trackNumber.toString(),
            discNumber: discNumber.toString()
          }
        })
        
        const url = await getDownloadURL(fileRef)
        
        // Extract audio metadata
        let audioMetadata = null
        try {
          audioMetadata = await metadataService.getAudioMetadata(url, fileName, file.size)
        } catch (err) {
          console.warn('Failed to extract audio metadata:', err)
        }
        
        // Update the track with audio file and metadata
        const updatedTracks = [...release.tracks]
        updatedTracks[trackIndex] = {
          ...updatedTracks[trackIndex],
          audioFile: {
            url,
            fileName,
            path: storagePath,
            format: audioMetadata?.format?.codec || file.name.split('.').pop().toUpperCase(),
            size: file.size,
            uploadedAt: new Date().toISOString(),
            duration: audioMetadata?.format?.duration,
            bitrate: audioMetadata?.format?.bitrate,
            sampleRate: audioMetadata?.format?.sampleRate,
            channels: audioMetadata?.format?.numberOfChannels,
            lossless: audioMetadata?.format?.lossless,
            metadata: audioMetadata
          }
        }
        
        // Check if all tracks have audio
        const hasAllAudio = updatedTracks.every(t => t.audioFile)
        
        await batchService.updateReleaseInBatch(batchId.value, upc, {
          tracks: updatedTracks,
          hasAllAudio
        })
        
        delete uploadProgress.value[fileName]
        uploadedCount++
        matchedCount++
        
        console.log(`✅ Uploaded audio for ${upc} track ${trackNumber}`)
      }
    }
    
    // Reload batch to get updated data - wait a bit for Firebase Storage to propagate
    await new Promise(resolve => setTimeout(resolve, 500))
    await loadBatch()
    
    // Force a second refresh if images were replaced to ensure thumbnails update
    if (imagesReplaced > 0) {
      setTimeout(async () => {
        await loadBatch()
        // Force Vue to re-render by clearing and resetting the expanded release
        if (expandedRelease.value) {
          const currentExpanded = expandedRelease.value
          expandedRelease.value = null
          await nextTick()
          expandedRelease.value = batchReleases.value.find(r => r.upc === currentExpanded.upc)
        }
      }, 1500)
    }
    
    // Prepare success message
    let message = ''
    if (uploadedCount > 0) {
      message += `Uploaded ${uploadedCount} audio file(s)`
    }
    if (imagesUploaded > 0) {
      if (message) message += ' and '
      message += `${imagesUploaded} cover image(s)`
      if (imagesReplaced > 0) {
        message += ` (${imagesReplaced} replaced with higher resolution)`
      }
    }
    if (newUPCs.size > 0) {
      if (message) message += ', '
      message += `created ${newUPCs.size} new release(s)`
    }
    
    if (message) {
      successMessage.value = message
      setTimeout(() => { successMessage.value = null }, 7000)
    }
    
    // Auto-expand the first newly created release if any
    if (newlyCreatedReleases.value.size > 0) {
      const firstNewUPC = Array.from(newlyCreatedReleases.value)[0]
      const newRelease = batchReleases.value.find(r => r.upc === firstNewUPC)
      if (newRelease) {
        toggleReleaseExpansion(newRelease)
      }
    }
    
    // Clear the newly created set after 10 seconds
    setTimeout(() => {
      newlyCreatedReleases.value.clear()
    }, 10000)
    
  } catch (err) {
    console.error('Error in bulk upload:', err)
    error.value = `Failed to process files: ${err.message}`
  } finally {
    processingAssets.value = false
    uploadProgress.value = {}
  }
}

// Helper method for fetching metadata and creating releases
const fetchMetadataAndCreateReleases = async (upcs) => {
  const releases = []
  
  for (let i = 0; i < upcs.length; i++) {
    const upc = upcs[i]
    
    try {
      console.log(`🔍 Fetching metadata for UPC: ${upc}`)
      
      // Fetch from multiple sources
      const productMetadata = await productMetadataService.getMetadata(upc, {
        sources: ['spotify', 'deezer'],
        forceRefresh: false
      })
      
      if (productMetadata && (productMetadata.extracted?.spotify || productMetadata.extracted?.deezer)) {
        // Synthesize metadata
        const synthesized = metadataSynthesizer.synthesize(productMetadata, {
          strategy: 'preferred',
          preferredSource: 'spotify'
        })
        
        if (synthesized) {
          const release = {
            upc,
            metadata: {
              title: synthesized.title,
              artist: synthesized.artist,
              label: synthesized.label,
              releaseDate: synthesized.releaseDate,
              genre: synthesized.genre,
              coverUrl: synthesized.coverArt?.xl || synthesized.coverArt?.large
            },
            tracks: synthesized.tracks.map((track, idx) => ({
              position: track.position || idx + 1,
              title: track.title,
              artist: track.artist || synthesized.artist,
              isrc: track.isrc,
              duration: track.duration?.synthesized || 0,
              audioFile: null,
              trackNumber: track.position || idx + 1,
              discNumber: track.discNumber || 1
            })),
            coverArt: null,
            hasAllAudio: false,
            cataloged: false,
            sources: productMetadata.quality?.sources || [],
            autoCreated: true,
            createdFrom: 'bulk-asset-upload'
          }
          
          releases.push(release)
          console.log(`✅ Found metadata for ${upc}: "${synthesized.title}" by ${synthesized.artist}`)
          
          // Auto-download cover art if available
          if (synthesized.coverArt?.xl || synthesized.coverArt?.large) {
            setTimeout(async () => {
              await downloadApiArtworkForUPC(upc, synthesized.coverArt?.xl || synthesized.coverArt?.large)
            }, 1000)
          }
        } else {
          releases.push(createMinimalRelease(upc))
          console.log(`⚠️ No metadata found for ${upc}, created placeholder release`)
        }
      } else {
        releases.push(createMinimalRelease(upc))
        console.log(`⚠️ No metadata found for ${upc}, created placeholder release`)
      }
    } catch (err) {
      console.error(`Error fetching metadata for ${upc}:`, err)
      releases.push(createMinimalRelease(upc))
    }
    
    // Small delay between API requests
    if (i < upcs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  // Add releases to batch
  if (releases.length > 0) {
    await batchService.addReleasesToBatch(batchId.value, releases)
    await loadBatch()
  }
  
  return releases
}

// Helper method to create a minimal release
const createMinimalRelease = (upc) => {
  return {
    upc,
    metadata: {
      title: `Unknown Release (${upc})`,
      artist: 'Unknown Artist'
    },
    tracks: [],
    coverArt: null,
    hasAllAudio: false,
    cataloged: false,
    autoCreated: true,
    createdFrom: 'bulk-asset-upload',
    needsMetadata: true
  }
}

// Use Cloud Function to download external images
const downloadApiArtworkForUPC = async (upc, coverUrl) => {
  if (!coverUrl) return
  
  try {
    console.log(`🎨 Auto-downloading cover art for ${upc}`)
    console.log(`  Source URL: ${coverUrl}`)
    
    // Use Cloud Function to download the image
    const downloadExternalImage = httpsCallable(functions, 'downloadExternalImage')
    const result = await downloadExternalImage({ 
      imageUrl: coverUrl,
      fileName: `${upc}_cover.jpg`
    })
    
    if (!result.data || !result.data.base64) {
      throw new Error('No image data received from Cloud Function')
    }
    
    console.log(`  Received image: ${result.data.size} bytes`)
    
    // Convert base64 to blob
    const byteCharacters = atob(result.data.base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: result.data.contentType || 'image/jpeg' })
    
    // Upload to Firebase Storage
    const fileName = `${upc}_cover.jpg`
    const storagePath = `batches/${batchId.value}/${upc}/${fileName}`
    const fileRef = storageRef(storage, storagePath)
    
    await uploadBytes(fileRef, blob, {
      contentType: result.data.contentType || 'image/jpeg',
      customMetadata: {
        source: 'api-auto',
        originalUrl: coverUrl,
        autoDownloaded: 'true'
      }
    })
    
    const url = await getDownloadURL(fileRef)
    
    // Extract metadata from the uploaded image
    let imageMetadata = null
    try {
      imageMetadata = await metadataService.getImageMetadata(url, fileName, result.data.size)
    } catch (err) {
      console.warn('Failed to extract image metadata:', err)
    }
    
    // Update the release with the cover art
    await batchService.updateReleaseInBatch(batchId.value, upc, {
      coverArt: {
        url,
        fileName,
        path: storagePath,
        source: 'api-auto',
        uploadedAt: new Date().toISOString(),
        fileSize: result.data.size,
        fileType: 'JPEG',
        dimensions: imageMetadata?.dimensions || { width: 0, height: 0 },
        colorSpace: imageMetadata?.format?.space || 'srgb',
        metadata: imageMetadata
      }
    })
    
    console.log(`✅ Cover art auto-downloaded for ${upc}`)
    
    // Refresh the batch to show the new cover
    await loadBatch()
    
  } catch (err) {
    console.error(`Failed to auto-download cover for ${upc}:`, err)
  }
}

// Manual download API artwork
const downloadApiArtwork = async (release) => {
  if (!release.metadata?.coverUrl) return
  
  processingAssets.value = true
  
  try {
    // Use Cloud Function to download the image
    const downloadExternalImage = httpsCallable(functions, 'downloadExternalImage')
    const result = await downloadExternalImage({ 
      imageUrl: release.metadata.coverUrl,
      fileName: `${release.upc}_cover.jpg`
    })
    
    if (!result.data || !result.data.base64) {
      throw new Error('No image data received from Cloud Function')
    }
    
    // Convert base64 to blob
    const base64Response = await fetch(`data:${result.data.contentType};base64,${result.data.base64}`)
    const blob = await base64Response.blob()
    
    const fileName = `${release.upc}_cover.jpg`
    const storagePath = `batches/${batchId.value}/${release.upc}/${fileName}`
    const fileRef = storageRef(storage, storagePath)
    
    await uploadBytes(fileRef, blob, {
      contentType: result.data.contentType || 'image/jpeg',
      customMetadata: {
        source: 'api',
        originalUrl: release.metadata.coverUrl
      }
    })
    
    const url = await getDownloadURL(fileRef)
    
    // Extract metadata
    let imageMetadata = null
    try {
      imageMetadata = await metadataService.getImageMetadata(url, fileName, result.data.size)
    } catch (err) {
      console.warn('Failed to extract image metadata:', err)
    }
    
    await batchService.updateReleaseInBatch(batchId.value, release.upc, {
      coverArt: {
        url,
        fileName,
        path: storagePath,
        source: 'api',
        uploadedAt: new Date().toISOString(),
        fileSize: result.data.size,
        fileType: 'JPEG',
        dimensions: imageMetadata?.dimensions || { width: 0, height: 0 },
        colorSpace: imageMetadata?.format?.space || 'srgb',
        metadata: imageMetadata
      }
    })
    
    await loadBatch()
    selectedRelease.value = batchReleases.value.find(r => r.upc === release.upc)
    expandedRelease.value = selectedRelease.value
    
    successMessage.value = 'Cover art downloaded from API'
    setTimeout(() => { successMessage.value = null }, 3000)
  } catch (err) {
    console.error('Error downloading artwork:', err)
    error.value = 'Failed to download artwork'
  } finally {
    processingAssets.value = false
  }
}

const moveReleaseToCatalog = async (release) => {
  if (!batchService.isReleaseComplete(release)) {
    error.value = 'Release is not complete. Please add all required metadata and assets.'
    return
  }
  
  isLoading.value = true
  
  try {
    // Create the release in catalog
    const releaseData = {
      basic: {
        title: release.metadata.title,
        displayArtist: release.metadata.artist,
        type: detectReleaseType(release.tracks.length),
        label: release.metadata.label || '',
        barcode: release.upc,
        releaseDate: release.metadata.releaseDate
      },
      tracks: release.tracks.map((track, index) => ({
        sequenceNumber: index + 1,
        title: track.title,
        artist: track.artist,
        isrc: track.isrc || '',
        duration: track.audioFile?.duration || track.duration || 0,
        audio: track.audioFile ? {
          url: track.audioFile.url,
          format: track.audioFile.format
        } : null
      })),
      assets: {
        coverImage: release.coverArt ? {
          url: release.coverArt.url,
          name: release.coverArt.fileName
        } : null
      },
      metadata: {
        genre: release.metadata.genre || '',
        language: 'en',
        copyright: `© ${new Date().getFullYear()} ${release.metadata.label || release.metadata.artist}`,
        batchId: batchId.value,
        importedFromBatch: true
      },
      territories: {
        mode: 'worldwide',
        included: [],
        excluded: []
      }
    }
    
    const newRelease = await createRelease(releaseData)
    
    // Mark as cataloged in batch
    await batchService.markReleaseAsCataloged(batchId.value, release.upc, newRelease.id)
    await loadBatch()
    
    successMessage.value = `"${release.metadata.title}" moved to catalog`
    setTimeout(() => { successMessage.value = null }, 5000)
  } catch (err) {
    console.error('Error moving to catalog:', err)
    error.value = 'Failed to move release to catalog'
  } finally {
    isLoading.value = false
  }
}

const detectReleaseType = (trackCount) => {
  if (trackCount === 1) return 'Single'
  if (trackCount <= 6) return 'EP'
  return 'Album'
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString()
}

const removeReleaseFromBatch = async (release) => {
  // Don't remove if it's already cataloged
  if (release.cataloged) {
    error.value = 'Cannot remove a cataloged release from the batch'
    setTimeout(() => { error.value = null }, 3000)
    return
  }
  
  // Confirm deletion
  if (!confirm(`Are you sure you want to remove "${release.metadata?.title || 'Untitled'}" from this batch?`)) {
    return
  }
  
  isLoading.value = true
  error.value = null
  
  try {
    // Remove the release from the batch
    await batchService.removeReleaseFromBatch(batchId.value, release.upc)
    
    // If this was the selected/expanded release, clear it
    if (selectedRelease.value?.upc === release.upc) {
      selectedRelease.value = null
      expandedRelease.value = null
    }
    
    // Reload the batch
    await loadBatch()
    
    successMessage.value = `"${release.metadata?.title || 'Untitled'}" removed from batch`
    setTimeout(() => { successMessage.value = null }, 3000)
  } catch (err) {
    console.error('Error removing release from batch:', err)
    error.value = 'Failed to remove release from batch'
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  if (batchId.value) {
    loadBatch()
  } else {
    // Redirect to batches page
    router.push('/batches')
  }
})

// Watch for route changes
watch(() => route.query.batchId, (newBatchId) => {
  if (newBatchId && newBatchId !== batchId.value) {
    batchId.value = newBatchId
    loadBatch()
  }
})
</script>

<template>
  <div class="migration-batch section">
    <div class="container">
      <!-- Header -->
      <div class="batch-header mb-lg">
        <div class="flex justify-between items-center mb-md">
          <div>
            <router-link to="/batches" class="text-primary mb-sm inline-block">
              <font-awesome-icon icon="arrow-left" />
              Back to Batches
            </router-link>
            <h1 class="text-3xl font-bold mb-xs">
              {{ batch?.name || 'Loading...' }}
            </h1>
            <p class="text-lg text-secondary">
              {{ batch?.description || 'Import and manage releases in this batch' }}
            </p>
          </div>
          <button 
            @click="showImportDialog" 
            class="btn btn-primary"
          >
            <font-awesome-icon icon="plus" />
            Add Releases
          </button>
        </div>

        <!-- Compact KPIs -->
        <div v-if="batch" class="stats-grid">
          <div class="stat-card-compact">
            <div class="stat-value">{{ batch.stats?.totalReleases || 0 }}</div>
            <div class="stat-label">TOTAL</div>
          </div>
          <div class="stat-card-compact text-warning">
            <div class="stat-value">{{ batch.stats?.incompleteReleases || 0 }}</div>
            <div class="stat-label">INCOMPLETE</div>
          </div>
          <div class="stat-card-compact text-success">
            <div class="stat-value">{{ batch.stats?.completeReleases || 0 }}</div>
            <div class="stat-label">COMPLETE</div>
          </div>
          <div class="stat-card-compact text-info">
            <div class="stat-value">{{ batch.stats?.catalogedReleases || 0 }}</div>
            <div class="stat-label">CATALOGED</div>
          </div>
          <div class="stat-card-compact text-error">
            <div class="stat-value">{{ batch.stats?.pendingAudio || 0 }}</div>
            <div class="stat-label">NEED AUDIO</div>
          </div>
          <div class="stat-card-compact text-error">
            <div class="stat-value">{{ batch.stats?.pendingArtwork || 0 }}</div>
            <div class="stat-label">NEED ART</div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div v-if="error" class="error-banner mb-lg">
        <font-awesome-icon icon="exclamation-triangle" />
        <span>{{ error }}</span>
        <button @click="error = null" class="ml-auto">
          <font-awesome-icon icon="times" />
        </button>
      </div>

      <div v-if="successMessage" class="success-banner mb-lg">
        <font-awesome-icon icon="check-circle" />
        <span>{{ successMessage }}</span>
      </div>

      <!-- Metadata Fetch Progress -->
      <div v-if="fetchingMetadata" class="card p-xl mb-xl">
        <div class="flex items-center gap-md mb-lg">
          <font-awesome-icon icon="spinner" spin class="text-xl text-info" />
          <h4>Fetching Metadata</h4>
        </div>
        <div class="progress-section">
          <div class="flex justify-between text-sm text-secondary mb-xs">
            <span>Processing UPCs</span>
            <span>{{ metadataProgress.current || 0 }} / {{ metadataProgress.total || 0 }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill"
              :style="{ width: `${((metadataProgress.current || 0) / (metadataProgress.total || 1)) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Releases in Batch - Full Width -->
      <div class="card mb-xl">
        <div class="card-header">
          <h3>Releases in Batch</h3>
        </div>
        
        <!-- Tabs for filtering -->
        <div class="release-tabs flex border-b">
          <button 
            @click="activeTab = 'all'"
            class="tab-btn"
            :class="{ active: activeTab === 'all' }"
          >
            All ({{ batchReleases.length }})
          </button>
          <button 
            @click="activeTab = 'incomplete'"
            class="tab-btn"
            :class="{ active: activeTab === 'incomplete' }"
          >
            Incomplete ({{ incompleteBatchReleases.length }})
          </button>
          <button 
            @click="activeTab = 'complete'"
            class="tab-btn"
            :class="{ active: activeTab === 'complete' }"
          >
            Complete ({{ completeBatchReleases.length }})
          </button>
        </div>

        <div class="release-list-container">
          <!-- Empty State -->
          <div v-if="filteredReleases.length === 0" class="empty-list p-xl text-center">
            <font-awesome-icon icon="inbox" class="text-3xl text-border mb-md" />
            <p class="text-secondary">No releases in this filter</p>
          </div>

          <!-- Release List -->
          <div v-for="release in filteredReleases" :key="release.upc">
            <!-- Release Row -->
            <div 
              class="release-row"
              :class="{ 
                active: expandedRelease?.upc === release.upc,
                cataloged: release.cataloged
              }"
            >
              <div class="release-row-content">
                <!-- Cover Thumbnail -->
                <div class="release-thumbnail" @click="toggleReleaseExpansion(release)">
                  <img 
                    v-if="release.coverArt?.url"
                    :src="release.coverArt.url"
                    :alt="release.metadata?.title"
                    :key="`thumb-${release.upc}-${release.coverArt.timestamp || release.coverArt.uploadedAt}`"
                  />
                  <div v-else class="thumbnail-placeholder">
                    <font-awesome-icon icon="image" />
                  </div>
                </div>

                <!-- Release Info -->
                <div class="release-info" @click="toggleReleaseExpansion(release)">
                  <h4 class="release-title">
                    {{ release.metadata?.title || 'Untitled' }}
                    <span v-if="release.cataloged" class="badge badge-info ml-xs">
                      Cataloged
                    </span>
                    <span v-if="release.coverArt?.replacedPrevious" class="badge badge-success ml-xs">
                      Updated Art
                    </span>
                  </h4>
                  <p class="release-artist">{{ release.metadata?.artist || 'Unknown Artist' }}</p>
                  <p class="release-upc">{{ release.upc }}</p>
                </div>

                <!-- Status Indicators -->
                <div class="release-status">
                  <div class="completeness-indicators">
                    <span 
                      class="indicator"
                      :class="{ complete: release.metadata?.title }"
                      title="Metadata"
                    >
                      <font-awesome-icon icon="info-circle" />
                    </span>
                    <span 
                      class="indicator"
                      :class="{ complete: release.coverArt }"
                      title="Cover Art"
                    >
                      <font-awesome-icon icon="image" />
                    </span>
                    <span 
                      class="indicator"
                      :class="{ complete: release.hasAllAudio }"
                      title="Audio Files"
                    >
                      <font-awesome-icon icon="music" />
                    </span>
                  </div>
                  
                  <!-- Remove button -->
                  <button 
                    v-if="!release.cataloged"
                    @click.stop="removeReleaseFromBatch(release)"
                    class="btn-remove"
                    title="Remove from batch"
                    :disabled="isLoading"
                  >
                    <font-awesome-icon icon="trash" />
                  </button>
                  
                  <font-awesome-icon 
                    :icon="expandedRelease?.upc === release.upc ? 'chevron-up' : 'chevron-down'"
                    class="expand-icon"
                    @click="toggleReleaseExpansion(release)"
                  />
                </div>
              </div>
            </div>

            <!-- Expanded Details (Inline) -->
            <div v-if="expandedRelease?.upc === release.upc" class="release-details">
              <div class="details-grid">
                <!-- Metadata Section -->
                <div class="details-section">
                  <h4 class="section-title">Metadata</h4>
                  <div class="form-grid">
                    <div class="form-group">
                      <label class="form-label">Title</label>
                      <input 
                        type="text"
                        class="form-input"
                        :value="release.metadata?.title"
                        @input="updateReleaseMetadata('title', $event.target.value)"
                      />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Artist</label>
                      <input 
                        type="text"
                        class="form-input"
                        :value="release.metadata?.artist"
                        @input="updateReleaseMetadata('artist', $event.target.value)"
                      />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Label</label>
                      <input 
                        type="text"
                        class="form-input"
                        :value="release.metadata?.label"
                        @input="updateReleaseMetadata('label', $event.target.value)"
                      />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Release Date</label>
                      <input 
                        type="date"
                        class="form-input"
                        :value="release.metadata?.releaseDate"
                        @input="updateReleaseMetadata('releaseDate', $event.target.value)"
                      />
                    </div>
                  </div>
                </div>

                <!-- Assets Section -->
                <div class="details-section">
                  <h4 class="section-title">Assets</h4>
                  
                  <!-- Cover Art -->
                  <div class="asset-group">
                    <div v-if="release.coverArt" class="cover-art-display">
                      <!-- Larger cover art preview -->
                      <div class="cover-preview-large">
                        <img 
                          :src="release.coverArt.url" 
                          :alt="release.metadata?.title"
                          :key="`preview-${release.upc}-${release.coverArt.timestamp || release.coverArt.uploadedAt}`"
                        />
                        <div v-if="release.coverArt.replacedPrevious" class="upgrade-badge">
                          <font-awesome-icon icon="arrow-up" />
                          Upgraded
                        </div>
                      </div>
                      
                      <!-- Metadata badges below the image -->
                      <div class="cover-metadata-badges">
                        <div class="metadata-badge">
                          <font-awesome-icon icon="expand" />
                          {{ release.coverArt.dimensions?.width || 0 }} × {{ release.coverArt.dimensions?.height || 0 }}
                        </div>
                        <div class="metadata-badge">
                          <font-awesome-icon icon="palette" />
                          {{ (release.coverArt.colorSpace || 'srgb').toUpperCase() }}
                        </div>
                        <div class="metadata-badge">
                          <font-awesome-icon icon="image" />
                          {{ release.coverArt.fileType || 'JPEG' }}
                        </div>
                        <div class="metadata-badge">
                          <font-awesome-icon icon="file" />
                          {{ formatFileSize(release.coverArt.fileSize) }}
                        </div>
                      </div>
                      
                      <!-- Action button -->
                      <div class="cover-actions">
                        <label class="btn btn-secondary btn-sm">
                          <input 
                            type="file"
                            accept="image/*"
                            @change="handleCoverUpload"
                            style="display: none"
                            :disabled="processingAssets"
                          />
                          <font-awesome-icon icon="upload" />
                          Replace Cover Art
                        </label>
                      </div>
                    </div>
                    
                    <!-- No cover art state -->
                    <div v-else class="no-cover-art">
                      <div class="cover-placeholder">
                        <font-awesome-icon icon="image" />
                        <span>No cover art</span>
                      </div>
                      <div class="cover-actions mt-md">
                        <label class="btn btn-primary">
                          <input 
                            type="file"
                            accept="image/*"
                            @change="handleCoverUpload"
                            style="display: none"
                            :disabled="processingAssets"
                          />
                          <font-awesome-icon icon="upload" />
                          Upload Cover Art
                        </label>
                        <button 
                          v-if="release.metadata?.coverUrl"
                          @click="downloadApiArtwork(release)"
                          class="btn btn-secondary"
                          :disabled="processingAssets"
                        >
                          <font-awesome-icon icon="download" />
                          Use API Artwork
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Audio Files Status Summary -->
                  <div class="audio-summary-section">
                    <h5 class="subsection-title">Audio Files</h5>
                    <div class="audio-summary">
                      <div v-if="release.hasAllAudio" class="summary-badge complete">
                        <font-awesome-icon icon="check-circle" />
                        All {{ release.tracks?.length || 0 }} tracks have audio
                      </div>
                      <div v-else class="summary-badge incomplete">
                        <font-awesome-icon icon="exclamation-circle" />
                        {{ release.tracks?.filter(t => t.audioFile).length || 0 }} of {{ release.tracks?.length || 0 }} tracks have audio
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Tracks Section -->
                <div class="details-section tracks-section">
                  <h4 class="section-title">Tracks ({{ release.tracks?.length || 0 }})</h4>
                  <div class="tracks-enhanced-list">
                    <div 
                      v-for="(track, idx) in release.tracks"
                      :key="idx"
                      class="track-enhanced-item"
                    >
                      <div class="track-basic-info">
                        <span class="track-number">{{ track.position }}</span>
                        <div class="track-details">
                          <div class="track-main">
                            <span class="track-title">{{ track.title }}</span>
                            <span class="track-artist">{{ track.artist }}</span>
                          </div>
                          <div v-if="track.isrc" class="track-isrc">
                            ISRC: {{ track.isrc }}
                          </div>
                        </div>
                      </div>
                      
                      <div class="track-metadata">
                        <div v-if="track.audioFile" class="audio-metadata">
                          <div class="metadata-badge">
                            <font-awesome-icon icon="clock" />
                            {{ formatDuration(track.audioFile.duration || track.duration || 0) }}
                          </div>
                          <div class="metadata-badge">
                            <font-awesome-icon icon="music" />
                            {{ track.audioFile.format || 'WAV' }}
                          </div>
                          <div v-if="track.audioFile.bitrate" class="metadata-badge">
                            <font-awesome-icon icon="chart-line" />
                            {{ formatBitrate(track.audioFile.bitrate) }}
                          </div>
                          <div v-if="track.audioFile.sampleRate" class="metadata-badge">
                            <font-awesome-icon icon="wave-square" />
                            {{ formatSampleRate(track.audioFile.sampleRate) }}
                          </div>
                          <div class="metadata-badge">
                            <font-awesome-icon icon="file" />
                            {{ formatFileSize(track.audioFile.size) }}
                          </div>
                          <div v-if="track.audioFile.lossless" class="metadata-badge lossless">
                            <font-awesome-icon icon="gem" />
                            Lossless
                          </div>
                        </div>
                        
                        <label v-if="!track.audioFile" class="btn-upload-small">
                          <input 
                            type="file"
                            accept="audio/*"
                            @change="(e) => handleTrackAudioUpload(e, idx)"
                            style="display: none"
                            :disabled="processingAssets"
                          />
                          <font-awesome-icon icon="upload" />
                          Upload
                        </label>
                        
                        <span v-else class="text-success">
                          <font-awesome-icon icon="check-circle" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <!-- Action Bar -->
              <div class="details-actions">
                <button 
                  v-if="!release.cataloged && batchService.isReleaseComplete(release)"
                  @click="moveReleaseToCatalog(release)"
                  class="btn btn-success"
                  :disabled="isLoading"
                >
                  <font-awesome-icon icon="check" />
                  Move to Catalog
                </button>
                <button 
                  v-else-if="!release.cataloged"
                  class="btn btn-secondary"
                  disabled
                >
                  Complete all fields to catalog
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk Asset Upload - Updated -->
      <div class="card">
        <div class="card-header">
          <h4>Bulk Asset Upload</h4>
        </div>
        <div class="card-body">
          <p class="mb-md">
            Upload DDEX-named audio files and cover images to automatically match them to releases. 
            Files will be matched by UPC. Higher resolution images will replace existing covers automatically.
          </p>
          
          <div class="upload-drop-zone">
            <label class="drop-zone-label">
              <input 
                type="file"
                accept="audio/*,image/*"
                multiple
                @change="handleBulkAssetUpload"
                :disabled="processingAssets"
              />
              
              <div v-if="!processingAssets" class="drop-zone-content">
                <font-awesome-icon icon="upload" class="upload-icon" />
                <p class="upload-text">Drop audio and image files here or click to browse</p>
                <span class="btn btn-primary">Choose Files...</span>
                <div class="format-hints">
                  <p class="format-hint">Audio format: UPC_DD_TT.wav (e.g., 123456789012_01_01.wav)</p>
                  <p class="format-hint">Image format: UPC.jpg (e.g., 123456789012.jpg)</p>
                </div>
              </div>
              
              <div v-else class="drop-zone-content">
                <font-awesome-icon icon="spinner" spin class="upload-icon text-primary" />
                <p class="upload-text">Processing files...</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Import Modal -->
      <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3>Add Releases to Batch</h3>
            <button @click="showImportModal = false" class="btn-icon">
              <font-awesome-icon icon="times" />
            </button>
          </div>
          
          <div class="modal-body">
            <!-- Import Type Selector -->
            <div class="import-type-selector mb-xl">
              <label class="import-type-option">
                <input 
                  type="radio"
                  v-model="importType"
                  value="upc-list"
                />
                <div class="option-content">
                  <font-awesome-icon icon="list" />
                  <div>
                    <h4>UPC List</h4>
                    <p class="text-sm text-secondary">Import by UPC codes (recommended)</p>
                  </div>
                </div>
              </label>
              
              <label class="import-type-option">
                <input 
                  type="radio"
                  v-model="importType"
                  value="csv-full"
                />
                <div class="option-content">
                  <font-awesome-icon icon="file-csv" />
                  <div>
                    <h4>Full CSV</h4>
                    <p class="text-sm text-secondary">Complete metadata (coming soon)</p>
                  </div>
                </div>
              </label>
              
              <label class="import-type-option">
                <input 
                  type="radio"
                  v-model="importType"
                  value="manual"
                />
                <div class="option-content">
                  <font-awesome-icon icon="edit" />
                  <div>
                    <h4>Manual Entry</h4>
                    <p class="text-sm text-secondary">Create blank release</p>
                  </div>
                </div>
              </label>
            </div>

            <!-- UPC List Input -->
            <div v-if="importType === 'upc-list'" class="upc-input-section">
              <label class="form-label">Enter UPC Codes</label>
              <textarea 
                v-model="upcList"
                class="form-textarea"
                rows="10"
                placeholder="Enter UPC codes, one per line or comma-separated&#10;&#10;Example:&#10;123456789012&#10;234567890123&#10;345678901234"
              ></textarea>
              
              <div class="mt-md">
                <label class="btn btn-secondary btn-sm">
                  <input 
                    type="file"
                    accept=".csv,.txt"
                    @change="handleCSVUpload"
                    style="display: none"
                  />
                  <font-awesome-icon icon="upload" />
                  Upload CSV/TXT File
                </label>
              </div>
            </div>

            <!-- CSV Upload -->
            <div v-else-if="importType === 'csv-full'" class="csv-upload-section">
              <div class="upload-area">
                <label class="upload-label">
                  <input 
                    type="file"
                    accept=".csv"
                    @change="handleCSVUpload"
                    style="display: none"
                  />
                  <font-awesome-icon icon="file-csv" class="upload-icon" />
                  <p>Drop CSV file here or click to browse</p>
                  <span class="btn btn-primary">Choose CSV File</span>
                </label>
              </div>
            </div>

            <!-- Manual Entry Info -->
            <div v-else-if="importType === 'manual'" class="manual-info">
              <p class="text-secondary">
                This will create a blank release entry that you can manually populate with metadata and assets.
              </p>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="showImportModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button 
              @click="startImport"
              class="btn btn-primary"
              :disabled="importType === 'upc-list' && !upcList.trim()"
            >
              <font-awesome-icon icon="plus" />
              Add to Batch
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Enhanced track list with metadata */
.tracks-enhanced-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.track-enhanced-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.track-basic-info {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  flex: 1;
  min-width: 0;
}

.track-details {
  flex: 1;
  min-width: 0;
}

.track-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.track-metadata {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.audio-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  align-items: center;
}

.metadata-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.metadata-badge.lossless {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.metadata-badge svg {
  font-size: 10px;
  opacity: 0.7;
}

/* Updated format hints */
.format-hints {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.format-hint {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin: 0;
  font-family: var(--font-mono);
}

/* Badge for replaced images */
.badge-success {
  background-color: var(--color-success);
  color: white;
}

/* Cover art details */
.cover-details {
  display: flex;
  gap: var(--space-md);
  align-items: center;
  width: 100%;
}

.cover-metadata {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  flex: 1;
}

.metadata-row {
  display: flex;
  gap: var(--space-sm);
}

.metadata-label {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  min-width: 100px;
}

.metadata-value {
  color: var(--color-text);
  font-family: var(--font-mono);
}

.text-success {
  color: var(--color-success);
}

/* Compact Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-md);
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.stat-card-compact {
  text-align: center;
}

.stat-card-compact .stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: 1;
}

.stat-card-compact .stat-label {
  font-size: 10px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  margin-top: var(--space-xs);
  letter-spacing: 0.5px;
}

/* Release List */
.release-list-container {
  max-height: none;
}

.release-row {
  border-bottom: 1px solid var(--color-border);
  transition: all var(--transition-base);
}

.release-row:hover {
  background-color: var(--color-bg-secondary);
}

.release-row.active {
  background-color: var(--color-primary-light);
}

.release-row.cataloged {
  opacity: 0.7;
}

.release-row-content {
  display: flex;
  align-items: center;
  padding: var(--space-lg);
  gap: var(--space-lg);
}

/* Updated thumbnail and info sections for proper click handling */
.release-thumbnail {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
}

.release-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}

.release-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.release-title {
  font-weight: var(--font-semibold);
  font-size: var(--text-lg);
  margin-bottom: var(--space-xs);
}

.release-artist {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.release-upc {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

/* Updated release status section */
.release-status {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.expand-icon {
  color: var(--color-text-secondary);
  transition: transform var(--transition-base);
  cursor: pointer;
  padding: var(--space-xs);
}

/* New remove button styles */
.btn-remove {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background-color: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  padding: 0;
}

.btn-remove:hover:not(:disabled) {
  background-color: rgba(234, 67, 53, 0.1);
  color: var(--color-error);
}

.btn-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Ensure cataloged releases don't show the remove button */
.release-row.cataloged .btn-remove {
  display: none;
}

/* Expanded Details */
.release-details {
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-xl);
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xl);
  margin-bottom: var(--space-lg);
}

.details-section {
  padding: var(--space-lg);
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
}

.details-section.tracks-section {
  grid-column: span 2;
}

.section-title {
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  font-size: var(--text-sm);
  letter-spacing: 0.5px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.asset-group {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.asset-label {
  font-weight: var(--font-medium);
  min-width: 100px;
  font-size: var(--text-sm);
}

.asset-content {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
}

.asset-actions {
  display: flex;
  gap: var(--space-sm);
}

.cover-preview-small {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.cover-preview-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.track-number {
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  min-width: 24px;
}

.track-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-artist {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-isrc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
  margin-top: 2px;
  opacity: 0.8;
}

.btn-upload-small {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary);
  color: white;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-upload-small:hover {
  background-color: var(--color-primary-hover);
}

/* Details Actions */
.details-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

/* Bulk Upload Section */
.upload-drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-secondary);
  transition: all var(--transition-base);
  padding: var(--space-2xl);
}

.upload-drop-zone:hover {
  border-color: var(--color-primary);
  background-color: rgba(26, 115, 232, 0.05);
}

.drop-zone-label {
  display: block;
  cursor: pointer;
}

.drop-zone-label input[type="file"] {
  display: none;
}

.drop-zone-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.upload-icon {
  font-size: 2.5rem;
  color: var(--color-text-tertiary);
}

.upload-text {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin: 0;
}

/* Completeness Indicators */
.completeness-indicators {
  display: flex;
  gap: var(--space-sm);
}

.indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
}

.indicator.complete {
  background-color: var(--color-success);
  color: white;
}

/* Tabs */
.release-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.tab-btn {
  padding: var(--space-md) var(--space-lg);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  font-weight: var(--font-medium);
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

/* Messages */
.error-banner,
.success-banner {
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.error-banner {
  background-color: rgba(234, 67, 53, 0.1);
  border: 1px solid var(--color-error);
  color: var(--color-error);
}

.success-banner {
  background-color: rgba(52, 168, 83, 0.1);
  border: 1px solid var(--color-success);
  color: var(--color-success);
}

/* Progress Bar */
.progress-bar {
  height: 6px;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-success));
  transition: width var(--transition-base);
}

/* Badge */
.badge {
  padding: 2px 6px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: var(--font-medium);
  text-transform: uppercase;
}

.badge-info {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

/* Empty State */
.empty-list {
  padding: var(--space-3xl);
  text-align: center;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-lg);
}

.modal {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.modal-lg {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

/* Import Type Selector */
.import-type-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

.import-type-option {
  cursor: pointer;
}

.import-type-option input[type="radio"] {
  display: none;
}

.option-content {
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
  transition: all var(--transition-base);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.import-type-option input[type="radio"]:checked + .option-content {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.option-content h4 {
  font-weight: var(--font-semibold);
  margin: 0;
}

/* Upload Area */
.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  text-align: center;
  background-color: var(--color-bg-secondary);
  transition: all var(--transition-base);
}

.upload-area:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.upload-label {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.btn-icon:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
}

.cover-art-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md);
}

.cover-preview-large {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  background-color: var(--color-bg-tertiary);
}

.cover-preview-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.upgrade-badge {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  background-color: var(--color-success);
  color: white;
  padding: 4px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.cover-metadata-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  justify-content: center;
  max-width: 100%;
}

.cover-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}

.no-cover-art {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: var(--space-lg);
}

.cover-placeholder {
  width: 200px;
  height: 200px;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  color: var(--color-text-tertiary);
  background-color: var(--color-bg-secondary);
}

.cover-placeholder svg {
  font-size: 3rem;
  opacity: 0.5;
}

/* Audio Summary Section */
.audio-summary-section {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.subsection-title {
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-sm);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.audio-summary {
  display: flex;
  gap: var(--space-sm);
}

.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.summary-badge.complete {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.summary-badge.incomplete {
  background-color: rgba(251, 188, 4, 0.1);
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
  
  .details-section.tracks-section {
    grid-column: span 1;
  }
  
  .tracks-enhanced-list {
    gap: var(--space-md);
  }
  
  .track-enhanced-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-md);
  }
  
  .track-metadata {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .import-type-selector {
    grid-template-columns: 1fr;
  }
  
  .audio-metadata {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
  
  .metadata-badge {
    width: 100%;
    justify-content: space-between;
  }

  .cover-preview-large {
    width: 150px;
    height: 150px;
  }
  
  .cover-placeholder {
    width: 150px;
    height: 150px;
  }
  
  .cover-metadata-badges {
    max-width: 300px;
  }
  
  /* Adjust release status on mobile */
  .release-status {
    gap: var(--space-sm);
  }
  
  .btn-remove {
    width: 28px;
    height: 28px;
  }
}
</style>