<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useCatalog } from '../composables/useCatalog'
import batchService from '../services/batch'
import productMetadataService from '../services/productMetadata'
import metadataSynthesizer from '../services/metadataSynthesizer'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
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

// ADD THIS REF - it was missing!
const newlyCreatedReleases = ref(new Set())

// UI State
const activeTab = ref('overview') // 'overview', 'metadata', 'assets', 'complete'
const selectedRelease = ref(null)
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
            coverArt: null, // Will be populated if user uploads or downloads from API
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

const selectRelease = (release) => {
  selectedRelease.value = release
  
  // If this is a newly created release, highlight it
  if (newlyCreatedReleases.value.has(release.upc)) {
    activeTab.value = 'metadata'
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
    
    // Update release
    await batchService.updateReleaseInBatch(batchId.value, selectedRelease.value.upc, {
      coverArt: {
        url,
        fileName,
        path: storagePath,
        uploadedAt: new Date().toISOString()
      }
    })
    
    await loadBatch()
    selectedRelease.value = batchReleases.value.find(r => r.upc === selectedRelease.value.upc)
    
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
    
    // Update track with audio file
    const updatedTracks = [...selectedRelease.value.tracks]
    updatedTracks[trackIndex] = {
      ...track,
      audioFile: {
        url,
        fileName,
        path: storagePath,
        format: file.name.split('.').pop().toUpperCase(),
        size: file.size,
        uploadedAt: new Date().toISOString()
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

const handleBulkAudioUpload = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return
  
  processingAssets.value = true
  error.value = null
  successMessage.value = null
  
  try {
    // First, extract all unique UPCs from the files
    const filesByUPC = new Map()
    const newUPCs = new Set()
    
    for (const file of files) {
      const match = file.name.match(/^(\d{12,14})_(\d{2})_(\d{2,3})\./)
      if (!match) {
        console.warn(`Skipping file with invalid DDEX naming: ${file.name}`)
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
      
      // Track these as newly created - FIXED: now newlyCreatedReleases is defined
      newUPCs.forEach(upc => newlyCreatedReleases.value.add(upc))
    }
    
    // Now process all audio files
    let uploadedCount = 0
    let matchedCount = 0
    
    for (const [upc, fileInfos] of filesByUPC) {
      // Find the release (it should exist now, either from before or just created)
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
          // If no tracks exist yet, create a minimal track
          if (!release.tracks || release.tracks.length === 0) {
            const minimalTrack = {
              position: trackNumber,
              trackNumber: trackNumber,
              discNumber: discNumber,
              title: `Track ${trackNumber}`,
              artist: release.metadata?.artist || 'Unknown Artist',
              audioFile: null
            }
            
            await batchService.updateReleaseInBatch(batchId.value, upc, {
              tracks: [minimalTrack]
            })
            
            // Reload to get the updated release
            await loadBatch()
            const updatedRelease = batchReleases.value.find(r => r.upc === upc)
            if (updatedRelease) {
              // Now try again with the updated release
              const newTrackIndex = 0 // We just created one track
              
              // Upload the file
              const fileName = file.name
              const storagePath = `batches/${batchId.value}/${upc}/audio/${fileName}`
              const fileRef = storageRef(storage, storagePath)
              
              await uploadBytes(fileRef, file, {
                customMetadata: {
                  upc,
                  trackNumber: trackNumber.toString(),
                  discNumber: discNumber.toString()
                }
              })
              
              const url = await getDownloadURL(fileRef)
              
              await batchService.updateReleaseInBatch(batchId.value, upc, {
                tracks: [{
                  ...updatedRelease.tracks[0],
                  audioFile: {
                    url,
                    fileName,
                    path: storagePath,
                    format: file.name.split('.').pop().toUpperCase(),
                    size: file.size,
                    uploadedAt: new Date().toISOString()
                  }
                }],
                hasAllAudio: true // If it's a single, this is all the audio
              })
              
              uploadedCount++
              matchedCount++
            }
          }
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
        
        // Update the track with audio file
        const updatedTracks = [...release.tracks]
        updatedTracks[trackIndex] = {
          ...updatedTracks[trackIndex],
          audioFile: {
            url,
            fileName,
            path: storagePath,
            format: file.name.split('.').pop().toUpperCase(),
            size: file.size,
            uploadedAt: new Date().toISOString()
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
    
    // Reload batch to get updated data
    await loadBatch()
    
    // Prepare success message
    let message = `Successfully processed ${uploadedCount} audio file(s)`
    if (newUPCs.size > 0) {
      message += ` and created ${newUPCs.size} new release(s)`
    }
    if (matchedCount > 0) {
      message += `. Matched ${matchedCount} track(s).`
    }
    
    successMessage.value = message
    
    // Auto-select the first newly created release if any
    if (newlyCreatedReleases.value.size > 0) {
      const firstNewUPC = Array.from(newlyCreatedReleases.value)[0]
      const newRelease = batchReleases.value.find(r => r.upc === firstNewUPC)
      if (newRelease) {
        selectRelease(newRelease)
        activeTab.value = 'assets'
      }
    }
    
    // Clear the newly created set after 10 seconds
    setTimeout(() => {
      newlyCreatedReleases.value.clear()
    }, 10000)
    
    setTimeout(() => { successMessage.value = null }, 7000)
    
  } catch (err) {
    console.error('Error in bulk upload:', err)
    error.value = `Failed to process files: ${err.message}`
  } finally {
    processingAssets.value = false
    uploadProgress.value = {}
  }
}

// Add a new method for fetching metadata and creating releases
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
              // Add these for better matching
              trackNumber: track.position || idx + 1,
              discNumber: track.discNumber || 1
            })),
            coverArt: null,
            hasAllAudio: false,
            cataloged: false,
            sources: productMetadata.quality?.sources || [],
            autoCreated: true, // Flag to indicate this was auto-created
            createdFrom: 'bulk-audio-upload'
          }
          
          releases.push(release)
          console.log(`✅ Found metadata for ${upc}: "${synthesized.title}" by ${synthesized.artist}`)
          
          // Auto-download cover art if available
          if (synthesized.coverArt?.xl || synthesized.coverArt?.large) {
            // We'll download the cover after the release is created
            setTimeout(async () => {
              await downloadApiArtworkForUPC(upc, synthesized.coverArt?.xl || synthesized.coverArt?.large)
            }, 1000)
          }
        } else {
          // Create minimal release with just UPC
          releases.push(createMinimalRelease(upc))
          console.log(`⚠️ No metadata found for ${upc}, created placeholder release`)
        }
      } else {
        // Create minimal release
        releases.push(createMinimalRelease(upc))
        console.log(`⚠️ No metadata found for ${upc}, created placeholder release`)
      }
    } catch (err) {
      console.error(`Error fetching metadata for ${upc}:`, err)
      // Create minimal release on error
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
    tracks: [], // Will be populated as audio files are matched
    coverArt: null,
    hasAllAudio: false,
    cataloged: false,
    autoCreated: true,
    createdFrom: 'bulk-audio-upload',
    needsMetadata: true
  }
}

// UPDATED: Use Cloud Function to download external images
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
    
    // Convert base64 to blob without using fetch
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
    
    // Update the release with the cover art
    await batchService.updateReleaseInBatch(batchId.value, upc, {
      coverArt: {
        url,
        fileName,
        path: storagePath,
        source: 'api-auto',
        uploadedAt: new Date().toISOString()
      }
    })
    
    console.log(`✅ Cover art auto-downloaded for ${upc}`)
    
    // Refresh the batch to show the new cover
    await loadBatch()
    
  } catch (err) {
    console.error(`Failed to auto-download cover for ${upc}:`, err)
    // Don't throw - just log the error and continue
  }
}

// UPDATED: Also use Cloud Function for manual download
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
    
    await batchService.updateReleaseInBatch(batchId.value, release.upc, {
      coverArt: {
        url,
        fileName,
        path: storagePath,
        source: 'api',
        uploadedAt: new Date().toISOString()
      }
    })
    
    await loadBatch()
    
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
        duration: track.duration || 0,
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
      <div class="batch-header mb-xl">
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
          <div class="flex gap-md">
            <button 
              @click="showImportDialog" 
              class="btn btn-primary"
            >
              <font-awesome-icon icon="plus" />
              Add Releases
            </button>
          </div>
        </div>

        <!-- Batch Stats -->
        <div v-if="batch" class="stats-row grid grid-cols-6 gap-md">
          <div class="stat-card">
            <div class="stat-value">{{ batch.stats?.totalReleases || 0 }}</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-warning">{{ batch.stats?.incompleteReleases || 0 }}</div>
            <div class="stat-label">Incomplete</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-success">{{ batch.stats?.completeReleases || 0 }}</div>
            <div class="stat-label">Complete</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-info">{{ batch.stats?.catalogedReleases || 0 }}</div>
            <div class="stat-label">Cataloged</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-error">{{ batch.stats?.pendingAudio || 0 }}</div>
            <div class="stat-label">Need Audio</div>
          </div>
          <div class="stat-card">
            <div class="stat-value text-error">{{ batch.stats?.pendingArtwork || 0 }}</div>
            <div class="stat-label">Need Art</div>
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

      <!-- Main Content Grid -->
      <div class="grid grid-cols-12 gap-xl">
        <!-- Release List (Left) -->
        <div class="col-span-4">
          <div class="card">
            <div class="card-header">
              <h3>Releases in Batch</h3>
            </div>
            <div class="card-body p-0">
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

              <!-- Release List -->
              <div class="release-list">
                <div 
                  v-for="release in (activeTab === 'incomplete' ? incompleteBatchReleases : activeTab === 'complete' ? completeBatchReleases : batchReleases)"
                  :key="release.upc"
                  class="release-item"
                  :class="{ 
                    active: selectedRelease?.upc === release.upc,
                    cataloged: release.cataloged
                  }"
                  @click="selectRelease(release)"
                >
                  <div class="flex gap-md">
                    <!-- Cover Thumbnail -->
                    <div class="release-thumbnail">
                      <img 
                        v-if="release.coverArt?.url"
                        :src="release.coverArt.url"
                        :alt="release.metadata?.title"
                      />
                      <div v-else class="thumbnail-placeholder">
                        <font-awesome-icon icon="image" />
                      </div>
                    </div>

                    <!-- Release Info -->
                    <div class="flex-1 min-w-0">
                      <h4 class="release-title">
                        {{ release.metadata?.title || 'Untitled' }}
                        <span v-if="release.cataloged" class="badge badge-info ml-xs">
                          Cataloged
                        </span>
                      </h4>
                      <p class="release-artist">{{ release.metadata?.artist || 'Unknown Artist' }}</p>
                      <p class="release-upc">{{ release.upc }}</p>
                      
                      <!-- Completeness Indicators -->
                      <div class="completeness-indicators flex gap-xs mt-xs">
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
                    </div>
                  </div>
                </div>

                <div v-if="batchReleases.length === 0" class="empty-list p-xl text-center">
                  <font-awesome-icon icon="inbox" class="text-3xl text-border mb-md" />
                  <p class="text-secondary">No releases in batch yet</p>
                  <button @click="showImportDialog" class="btn btn-primary btn-sm mt-md">
                    Add Releases
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Bulk Upload Section -->
          <div class="card mt-lg">
            <div class="card-header">
              <h4>Bulk Audio Upload</h4>
            </div>
            <div class="card-body">
              <p class="text-sm text-secondary mb-md">
                Upload DDEX-named audio files to automatically match them to releases
              </p>
              <div class="upload-area-compact">
                <label class="upload-label-compact">
                  <input 
                    type="file"
                    accept="audio/*"
                    multiple
                    @change="handleBulkAudioUpload"
                    :disabled="processingAssets"
                  />
                  <font-awesome-icon icon="upload" />
                  <span>Upload Audio Files</span>
                </label>
              </div>
              <p class="text-xs text-tertiary mt-sm">
                Format: UPC_DD_TT.wav (e.g., 123456789012_01_01.wav)
              </p>
            </div>
          </div>
        </div>

        <!-- Release Details (Right) -->
        <div class="col-span-8">
          <div v-if="selectedRelease" class="card">
            <div class="card-header">
              <h3>{{ selectedRelease.metadata?.title || 'Release Details' }}</h3>
              <div class="release-actions">
                <button 
                  v-if="!selectedRelease.cataloged && batchService.isReleaseComplete(selectedRelease)"
                  @click="moveReleaseToCatalog(selectedRelease)"
                  class="btn btn-success btn-sm"
                  :disabled="isLoading"
                >
                  <font-awesome-icon icon="check" />
                  Move to Catalog
                </button>
              </div>
            </div>
            
            <!-- Detail Tabs -->
            <div class="detail-tabs flex border-b">
              <button 
                class="tab-btn"
                :class="{ active: activeTab === 'metadata' }"
                @click="activeTab = 'metadata'"
              >
                Metadata
              </button>
              <button 
                class="tab-btn"
                :class="{ active: activeTab === 'assets' }"
                @click="activeTab = 'assets'"
              >
                Assets
              </button>
            </div>

            <!-- Tab Content -->
            <div class="card-body">
              <!-- Metadata Tab -->
              <div v-if="activeTab === 'metadata'" class="metadata-section">
                <div class="form-group">
                  <label class="form-label">UPC</label>
                  <input 
                    type="text"
                    class="form-input"
                    :value="selectedRelease.upc"
                    @input="updateReleaseMetadata('upc', $event.target.value)"
                  />
                </div>

                <div class="grid grid-cols-2 gap-md">
                  <div class="form-group">
                    <label class="form-label">Title</label>
                    <input 
                      type="text"
                      class="form-input"
                      :value="selectedRelease.metadata?.title"
                      @input="updateReleaseMetadata('title', $event.target.value)"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Artist</label>
                    <input 
                      type="text"
                      class="form-input"
                      :value="selectedRelease.metadata?.artist"
                      @input="updateReleaseMetadata('artist', $event.target.value)"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Label</label>
                    <input 
                      type="text"
                      class="form-input"
                      :value="selectedRelease.metadata?.label"
                      @input="updateReleaseMetadata('label', $event.target.value)"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Release Date</label>
                    <input 
                      type="date"
                      class="form-input"
                      :value="selectedRelease.metadata?.releaseDate"
                      @input="updateReleaseMetadata('releaseDate', $event.target.value)"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Genre</label>
                    <input 
                      type="text"
                      class="form-input"
                      :value="selectedRelease.metadata?.genre"
                      @input="updateReleaseMetadata('genre', $event.target.value)"
                    />
                  </div>
                </div>

                <!-- Track List -->
                <div class="tracks-section mt-xl">
                  <h4 class="mb-md">Tracks ({{ selectedRelease.tracks?.length || 0 }})</h4>
                  <div class="tracks-list">
                    <div 
                      v-for="(track, idx) in selectedRelease.tracks"
                      :key="idx"
                      class="track-item"
                    >
                      <div class="track-number">{{ track.position }}</div>
                      <div class="track-info flex-1">
                        <div class="track-title">{{ track.title }}</div>
                        <div class="track-details">
                          {{ track.artist }} • {{ track.isrc || 'No ISRC' }}
                        </div>
                      </div>
                      <div class="track-status">
                        <span v-if="track.audioFile" class="text-success">
                          <font-awesome-icon icon="check-circle" />
                        </span>
                        <span v-else class="text-error">
                          <font-awesome-icon icon="times-circle" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Assets Tab -->
              <div v-if="activeTab === 'assets'" class="assets-section">
                <!-- Cover Art -->
                <div class="cover-section mb-xl">
                  <h4 class="mb-md">Cover Art</h4>
                  
                  <div v-if="selectedRelease.coverArt" class="current-cover">
                    <img 
                      :src="selectedRelease.coverArt.url"
                      :alt="selectedRelease.metadata?.title"
                      class="cover-preview"
                    />
                    <p class="text-sm text-secondary mt-sm">
                      Uploaded {{ formatDate(selectedRelease.coverArt.uploadedAt) }}
                      <span v-if="selectedRelease.coverArt.source === 'api'" class="badge badge-info ml-sm">
                        From API
                      </span>
                    </p>
                  </div>

                  <div v-else class="no-cover">
                    <div class="cover-placeholder-large">
                      <font-awesome-icon icon="image" />
                    </div>
                    
                    <div class="cover-actions mt-md">
                      <label class="btn btn-secondary btn-sm">
                        <input 
                          type="file"
                          accept="image/*"
                          @change="handleCoverUpload"
                          style="display: none"
                          :disabled="processingAssets"
                        />
                        <font-awesome-icon icon="upload" />
                        Upload Cover
                      </label>
                      
                      <button 
                        v-if="selectedRelease.metadata?.coverUrl"
                        @click="downloadApiArtwork(selectedRelease)"
                        class="btn btn-primary btn-sm"
                        :disabled="processingAssets"
                      >
                        <font-awesome-icon icon="download" />
                        Use API Cover
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Audio Files -->
                <div class="audio-section">
                  <h4 class="mb-md">Audio Files</h4>
                  
                  <div class="audio-list">
                    <div 
                      v-for="(track, idx) in selectedRelease.tracks"
                      :key="idx"
                      class="audio-item"
                    >
                      <div class="audio-info">
                        <div class="audio-title">
                          {{ track.position }}. {{ track.title }}
                        </div>
                        <div v-if="track.audioFile" class="audio-details text-sm text-secondary">
                          {{ track.audioFile.format }} • 
                          {{ (track.audioFile.size / 1024 / 1024).toFixed(2) }} MB
                        </div>
                      </div>
                      
                      <div class="audio-actions">
                        <div v-if="track.audioFile" class="text-success">
                          <font-awesome-icon icon="check-circle" />
                          Uploaded
                        </div>
                        <label v-else class="btn btn-secondary btn-sm">
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
                      </div>
                    </div>
                  </div>

                  <!-- Upload Progress -->
                  <div v-if="Object.keys(uploadProgress).length > 0" class="upload-progress-section mt-md">
                    <div 
                      v-for="(progress, fileName) in uploadProgress"
                      :key="fileName"
                      class="progress-item"
                    >
                      <div class="flex justify-between text-sm mb-xs">
                        <span>{{ fileName }}</span>
                        <span>{{ Math.round(progress) }}%</span>
                      </div>
                      <div class="progress-bar">
                        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="card">
            <div class="card-body text-center p-3xl">
              <font-awesome-icon icon="music" class="text-5xl text-border mb-lg" />
              <h3 class="text-xl font-semibold mb-md">Select a Release</h3>
              <p class="text-secondary">
                Choose a release from the list to view and edit its details
              </p>
            </div>
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
/* Grid Layout */
.grid-cols-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-xl);
}

.col-span-4 {
  grid-column: span 4;
}

.col-span-8 {
  grid-column: span 8;
}

/* Stats */
.stats-row {
  display: grid;
}

.stat-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  text-align: center;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-xs);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

/* Tabs */
.release-tabs,
.detail-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.tab-btn {
  padding: var(--space-md);
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

/* Release List */
.release-list {
  max-height: 600px;
  overflow-y: auto;
}

.release-item {
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-base);
}

.release-item:hover {
  background-color: var(--color-bg-secondary);
}

.release-item.active {
  background-color: var(--color-primary-light);
  border-left: 3px solid var(--color-primary);
}

.release-item.cataloged {
  opacity: 0.7;
  background-color: var(--color-bg-tertiary);
}

.release-thumbnail {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
}

.release-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}

.release-title {
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.release-artist {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.release-upc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

/* Completeness Indicators */
.completeness-indicators {
  display: flex;
  gap: var(--space-xs);
}

.indicator {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  transition: all var(--transition-base);
}

.indicator.complete {
  background-color: var(--color-success);
  color: white;
}

/* Release Actions */
.release-actions {
  display: flex;
  gap: var(--space-sm);
}

/* Tracks Section */
.tracks-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.track-item {
  display: flex;
  align-items: center;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
  gap: var(--space-md);
}

.track-item:last-child {
  border-bottom: none;
}

.track-number {
  width: 30px;
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
}

.track-title {
  font-weight: var(--font-medium);
  margin-bottom: var(--space-xs);
}

.track-details {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Cover Section */
.cover-preview {
  max-width: 300px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.cover-placeholder-large {
  width: 300px;
  height: 300px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  color: var(--color-text-tertiary);
}

.cover-actions {
  display: flex;
  gap: var(--space-md);
}

/* Audio Section */
.audio-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.audio-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.audio-item:last-child {
  border-bottom: none;
}

.audio-title {
  font-weight: var(--font-medium);
  margin-bottom: var(--space-xs);
}

/* Upload Areas */
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

.upload-area-compact {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  text-align: center;
  background-color: var(--color-bg-secondary);
  transition: all var(--transition-base);
}

.upload-area-compact:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.upload-label,
.upload-label-compact {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.upload-label-compact {
  flex-direction: row;
  justify-content: center;
}

.upload-icon {
  font-size: 3rem;
  color: var(--color-text-tertiary);
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

/* Badge */
.badge {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
}

.badge-info {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
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

/* Responsive */
@media (max-width: 1024px) {
  .grid-cols-12 {
    grid-template-columns: 1fr;
  }
  
  .col-span-4,
  .col-span-8 {
    grid-column: span 1;
  }
  
  .import-type-selector {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>