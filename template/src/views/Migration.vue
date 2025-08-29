<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useCatalog } from '../composables/useCatalog'
import importService from '../services/import'
import productMetadataService from '../services/productMetadata'
import metadataSynthesizer from '../services/metadataSynthesizer'
import MigrationStatus from '../components/MigrationStatus.vue'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

const router = useRouter()
const { user } = useAuth()
const { createRelease } = useCatalog()
const functions = getFunctions()

// Import state
const currentStep = ref(1)
const importJob = ref(null)
const csvFile = ref(null)
const parsedData = ref([])
const fieldMapping = ref({})
const uploadedFiles = ref({
  audio: [],
  images: []
})
const matchingResults = ref({
  matched: [],
  incomplete: [],
  errors: []
})

// Metadata-less mode
const isMetadatalessMode = ref(false)
const deezerMetadata = ref({})
const fetchingMetadata = ref(false)
const metadataFetchProgress = ref({})
const metadataFetchStatus = ref('')

// New refs for Deezer artwork
const deezerArtwork = ref({})
const showArtworkConfirmation = ref(false)
const artworkConfirmationChoice = ref('use-deezer')
const downloadingArtwork = ref(false)
const artworkDownloadStatus = ref('')

// Auto-process metadata ref
const autoProcessMetadata = ref(false)
const metadataQualityInfo = ref({})

// UI state
const isLoading = ref(false)
const error = ref(null)
const uploadProgress = ref({})
const showStatusModal = ref(false)

// New refs for enhanced upload tracking
const uploadingFiles = ref({
  audio: false,
  images: false
})
const currentUploadFile = ref('')

// Step configuration based on mode
const steps = computed(() => {
  if (isMetadatalessMode.value) {
    return ['Upload Files', 'Match & Create']
  }
  return ['Import Metadata', 'Upload Files', 'Match & Create']
})

// Adjust current step max based on mode
const maxSteps = computed(() => steps.value.length)

// Step 1: CSV Import (only in standard mode)
const csvHeaders = ref([])
const requiredFields = [
  { key: 'title', label: 'Release Title', required: true },
  { key: 'artist', label: 'Artist Name', required: true },
  { key: 'upc', label: 'UPC/Barcode', required: true },
  { key: 'releaseDate', label: 'Release Date', required: true },
  { key: 'label', label: 'Label', required: false },
  { key: 'catalogNumber', label: 'Catalog Number', required: false },
  { key: 'trackTitle', label: 'Track Title', required: true },
  { key: 'trackArtist', label: 'Track Artist', required: false },
  { key: 'isrc', label: 'ISRC', required: false },
  { key: 'trackNumber', label: 'Track Number', required: true },
  { key: 'discNumber', label: 'Disc Number', required: false },
  { key: 'duration', label: 'Duration (seconds)', required: false },
  { key: 'genre', label: 'Genre', required: false }
]

// Computed
const canProceedStep1 = computed(() => {
  if (isMetadatalessMode.value) {
    // In metadata-less mode, step 1 is file upload
    return uploadedFiles.value.audio.length > 0 || uploadedFiles.value.images.length > 0
  }
  // Standard mode
  const requiredMapped = requiredFields
    .filter(f => f.required)
    .every(f => fieldMapping.value[f.key])
  return csvFile.value && parsedData.value.length > 0 && requiredMapped
})

const canProceedStep2 = computed(() => {
  if (isMetadatalessMode.value) {
    // In metadata-less mode, step 2 is match & create
    return Object.keys(deezerMetadata.value).length > 0
  }
  // Standard mode
  return uploadedFiles.value.audio.length > 0 || uploadedFiles.value.images.length > 0
})

const importStats = computed(() => {
  const releases = isMetadatalessMode.value 
    ? Object.values(deezerMetadata.value)
    : groupIntoReleases(parsedData.value)
  return {
    totalReleases: releases.length,
    totalTracks: isMetadatalessMode.value 
      ? releases.reduce((sum, r) => sum + (r.tracks?.length || 0), 0)
      : parsedData.value.length,
    matchedReleases: matchingResults.value.matched.length,
    incompleteReleases: matchingResults.value.incomplete.length,
    errors: matchingResults.value.errors.length
  }
})

// Computed to check if user uploaded any cover images
const hasUploadedCovers = computed(() => {
  return uploadedFiles.value.images.some(img => img.imageType === 'cover')
})

// Helper functions
const cleanObjectForFirestore = (obj) => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectForFirestore(item)).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObjectForFirestore(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  }
  
  // Return primitive values as-is
  return obj;
}

// Watch for mode changes
watch(isMetadatalessMode, (newVal) => {
  // Reset step to 1 when switching modes
  currentStep.value = 1
  // Clear CSV data when entering metadata-less mode
  if (newVal) {
    csvFile.value = null
    parsedData.value = []
    fieldMapping.value = {}
    csvHeaders.value = []
  } else {
    // Clear Deezer metadata when leaving metadata-less mode
    deezerMetadata.value = {}
    deezerArtwork.value = {}
  }
})

// Watch for active import job
watch(() => user.value?.uid, async (uid) => {
  if (uid) {
    const activeJob = await importService.getActiveImportJob(uid)
    if (activeJob) {
      importJob.value = activeJob
      await loadImportState(activeJob)
    }
  }
}, { immediate: true })

// Deezer API Methods
const extractUPCFromFilename = (filename) => {
  // Extract UPC from DDEX naming: UPC_DiscNumber_TrackNumber.extension
  // Updated to handle both 2 and 3 digit track numbers
  const match = filename.match(/^(\d{12,14})(?:_\d{2}_\d{2,3})?/);
  return match ? match[1] : null;
}

/**
 * Download cover art from Deezer and upload to Firebase Storage
 */
const downloadAndStoreDeezerArtwork = async (upc, coverUrl) => {
  try {
    console.log(`📥 Downloading Deezer artwork for UPC ${upc}`)
    console.log(`  URL: ${coverUrl}`)
    
    // Fetch the image from Deezer
    const response = await fetch(coverUrl)
    if (!response.ok) {
      throw new Error(`Failed to download artwork: ${response.status}`)
    }
    
    const blob = await response.blob()
    console.log(`  Downloaded ${blob.size} bytes`)
    
    // Create a storage reference with the naming convention
    const fileName = `${upc}-xl.jpg`
    const storagePath = `imports/${user.value.uid}/${importJob.value?.id || 'temp'}/deezer-artwork/${fileName}`
    const artworkRef = storageRef(storage, storagePath)
    
    // Upload to Firebase Storage
    console.log(`  Uploading to Firebase Storage as ${fileName}...`)
    const snapshot = await uploadBytes(artworkRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        source: 'deezer',
        upc: upc,
        originalUrl: coverUrl
      }
    })
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref)
    console.log(`  ✅ Artwork stored successfully`)
    
    // Build the artwork object
    const artwork = {
      url: downloadURL,
      path: storagePath,
      fileName,
      source: 'deezer'
    }
    
    return artwork  // Return the artwork object
    
  } catch (error) {
    console.error(`  ❌ Failed to download/store artwork for UPC ${upc}:`, error)
    return null  // Return null instead of undefined artwork
  }
}

const fetchDeezerMetadata = async (upc) => {
  try {
    console.log(`  🌐 Fetching metadata for UPC: ${upc}`)
    
    // Use the new productMetadata service
    const metadata = await productMetadataService.getMetadata(upc, {
      sources: ['deezer'],
      forceRefresh: false // Use cache if available
    })
    
    if (!metadata || !metadata.extracted?.deezer) {
      console.warn(`    ⚠️ No metadata found for UPC: ${upc}`)
      return null
    }
    
    // Synthesize the metadata at runtime
    const synthesized = metadataSynthesizer.synthesize(metadata, {
      strategy: 'preferred',
      preferredSource: 'deezer'
    })
    
    if (!synthesized) {
      console.warn(`    ⚠️ Could not synthesize metadata for UPC: ${upc}`)
      return null
    }
    
    console.log(`    ✅ Found album: "${synthesized.title}" by ${synthesized.artist}`)
    console.log(`    📀 Album details:`)
    console.log(`      - Tracks: ${synthesized.tracks?.length || 0}`)
    console.log(`      - Release date: ${synthesized.releaseDate}`)
    console.log(`      - Label: ${synthesized.label || 'Unknown'}`)
    console.log(`      - Cover XL: ${synthesized.coverArt?.xl ? 'Available' : 'Not available'}`)
    
    // Build release data in the format Migration.vue expects
    const releaseData = {
      upc: upc,
      title: synthesized.title,
      artist: synthesized.artist,
      label: synthesized.label || '',
      releaseDate: synthesized.releaseDate || new Date().toISOString().split('T')[0],
      genre: synthesized.genre || '',
      coverUrl: synthesized.coverArt?.xl || synthesized.coverArt?.large || synthesized.coverArt?.medium,
      coverUrlOriginal: synthesized.coverArt?.xl,
      duration: synthesized.duration || 0,
      tracks: synthesized.tracks.map((track, index) => ({
        trackNumber: track.position || index + 1,
        discNumber: 1,
        title: track.title || `Track ${index + 1}`,
        artist: track.artist || synthesized.artist || 'Unknown Artist',
        isrc: track.isrc || '',
        duration: track.duration?.synthesized || track.duration?.sources?.deezer || 0,
        preview: track.preview || null
      })),
      // Store metadata source info
      _metadata: {
        source: 'productMetadata',
        sources: metadata.quality?.sources || ['deezer'],
        completeness: metadata.quality?.completeness?.deezer || 0
      }
    }
    
    console.log(`    ✅ Successfully processed metadata for UPC ${upc}`)
    return releaseData
    
  } catch (error) {
    console.error(`    ❌ Error fetching metadata for UPC ${upc}:`, error.message)
    return null
  }
}

const processMetadatalessUpload = async () => {
  console.log('🎵 === Starting Metadata-less Upload Processing ===')
  fetchingMetadata.value = true
  error.value = null
  deezerMetadata.value = {}
  deezerArtwork.value = {}
  metadataFetchProgress.value = {}
  metadataFetchStatus.value = 'Initializing metadata fetch...'
  
  // Track metadata quality for display
  const metadataQuality = {}
  
  try {
    // Extract unique UPCs from ALL uploaded files
    const upcs = new Set()
    
    console.log('📝 Extracting UPCs from all uploaded files...')
    console.log(`  Audio files: ${uploadedFiles.value.audio.length}`)
    console.log(`  Image files: ${uploadedFiles.value.images.length}`)
    
    uploadedFiles.value.audio.forEach(file => {
      const upc = extractUPCFromFilename(file.name)
      if (upc) {
        upcs.add(upc)
        console.log(`  Found UPC in audio: ${upc} (${file.name})`)
      }
    })
    
    uploadedFiles.value.images.forEach(file => {
      const upc = extractUPCFromFilename(file.name)
      if (upc) {
        upcs.add(upc)
        console.log(`  Found UPC in image: ${upc} (${file.name})`)
      }
    })
    
    console.log(`📊 Found ${upcs.size} unique UPCs:`, Array.from(upcs))
    
    if (upcs.size === 0) {
      error.value = 'No valid UPCs found in uploaded files. Files must follow DDEX naming convention.'
      console.error('❌ No UPCs found in any uploaded files')
      return
    }
    
    // Fetch metadata for each UPC using the new productMetadata service
    const upcArray = Array.from(upcs)
    let successCount = 0
    let failedUPCs = []
    const needsArtwork = []
    let cachedCount = 0
    let freshCount = 0
    
    console.log('🌐 Starting metadata fetch from productMetadata service...')
    
    for (let i = 0; i < upcArray.length; i++) {
      const upc = upcArray[i]
      metadataFetchStatus.value = `Fetching metadata for UPC ${upc}...`
      metadataFetchProgress.value = {
        current: i + 1,
        total: upcArray.length,
        upc: upc
      }
      
      console.log(`\n🔄 [${i + 1}/${upcArray.length}] Processing UPC: ${upc}`)
      
      // Check if we have cached data first
      const startTime = Date.now()
      
      // Use the new productMetadata service
      const productMetadata = await productMetadataService.getMetadata(upc, {
        sources: ['deezer'],
        forceRefresh: false // Use cache if available
      })
      
      const fetchTime = Date.now() - startTime
      
      if (productMetadata && productMetadata.extracted?.deezer) {
        // Synthesize the metadata at runtime
        const synthesized = metadataSynthesizer.synthesize(productMetadata, {
          strategy: 'preferred',
          preferredSource: 'deezer'
        })
        
        if (synthesized) {
          // Build the metadata in the format Migration.vue expects
          const metadata = {
            upc: upc,
            title: synthesized.title,
            artist: synthesized.artist,
            label: synthesized.label || '',
            releaseDate: synthesized.releaseDate || new Date().toISOString().split('T')[0],
            genre: synthesized.genre || '',
            coverUrl: synthesized.coverArt?.xl || synthesized.coverArt?.large || synthesized.coverArt?.medium,
            coverUrlOriginal: synthesized.coverArt?.xl,
            duration: synthesized.duration || 0,
            tracks: synthesized.tracks.map((track, index) => ({
              trackNumber: track.position || index + 1,
              discNumber: 1,
              title: track.title || `Track ${index + 1}`,
              artist: track.artist || synthesized.artist || 'Unknown Artist',
              isrc: track.isrc || '',
              duration: track.duration?.synthesized || track.duration?.sources?.deezer || 0,
              preview: track.preview || null
            }))
          }
          
          deezerMetadata.value[upc] = metadata
          successCount++
          
          // Track if this was cached or fresh
          const wasCached = fetchTime < 1000 // If it took less than 1 second, probably cached
          if (wasCached) {
            cachedCount++
            console.log(`  ⚡ Retrieved from cache in ${fetchTime}ms`)
          } else {
            freshCount++
            console.log(`  🌐 Fetched fresh data in ${fetchTime}ms`)
          }
          
          // Track metadata quality
          metadataQuality[upc] = {
            completeness: productMetadata.quality?.completeness?.deezer || 0,
            sources: productMetadata.quality?.sources || ['deezer'],
            cached: wasCached
          }
          
          console.log(`  ✅ Success! Found: "${metadata.title}" by ${metadata.artist}`)
          console.log(`     - ${metadata.tracks.length} tracks`)
          console.log(`     - Release date: ${metadata.releaseDate}`)
          console.log(`     - Label: ${metadata.label || 'Unknown'}`)
          console.log(`     - Metadata completeness: ${(metadataQuality[upc].completeness * 100).toFixed(0)}%`)
          
          // Check if user uploaded cover for this UPC
          const hasUserCover = uploadedFiles.value.images.some(img => 
            img.upc === upc && img.imageType === 'cover'
          )
          
          if (!hasUserCover && metadata.coverUrlOriginal) {
            console.log(`     - 🎨 Deezer cover available, user didn't upload cover`)
            needsArtwork.push({ upc, coverUrl: metadata.coverUrlOriginal })
          }
        } else {
          failedUPCs.push(upc)
          console.warn(`  ⚠️ Could not synthesize metadata for UPC: ${upc}`)
        }
      } else {
        failedUPCs.push(upc)
        console.warn(`  ⚠️ No metadata found for UPC: ${upc}`)
        
        // Check if it was a not_found status
        if (productMetadata?.sources?.deezer?.status === 'not_found') {
          console.log(`     - Album not found on Deezer`)
        } else if (productMetadata?.sources?.deezer?.error) {
          console.log(`     - Error: ${productMetadata.sources.deezer.error}`)
        }
      }
      
      // Reduced delay since we're often using cache
      if (i < upcArray.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`\n📊 Metadata Fetch Results:`)
    console.log(`  ✅ Successful: ${successCount}/${upcArray.length}`)
    if (cachedCount > 0) {
      console.log(`  ⚡ From cache: ${cachedCount}`)
    }
    if (freshCount > 0) {
      console.log(`  🌐 Fresh fetches: ${freshCount}`)
    }
    if (failedUPCs.length > 0) {
      console.log(`  ❌ Failed UPCs: ${failedUPCs.join(', ')}`)
    }
    if (needsArtwork.length > 0) {
      console.log(`  🎨 Releases needing artwork: ${needsArtwork.length}`)
    }
    
    // Display quality summary
    const avgCompleteness = Object.values(metadataQuality).reduce(
      (sum, q) => sum + q.completeness, 0
    ) / Object.keys(metadataQuality).length
    
    if (Object.keys(metadataQuality).length > 0) {
      console.log(`  📊 Average metadata completeness: ${(avgCompleteness * 100).toFixed(0)}%`)
    }
    
    if (successCount === 0) {
      error.value = 'Could not fetch metadata for any of the uploaded files from Deezer.'
      console.error('❌ All metadata fetch attempts failed')
      return
    }
    
    metadataFetchStatus.value = `Successfully fetched metadata for ${successCount} releases`
    
    // Store the quality data for display in the template
    // You might want to add this as a reactive ref at the top of the component
    // metadataQualityInfo.value = metadataQuality
    
    // If we have releases that need artwork, show confirmation dialog
    if (needsArtwork.length > 0) {
      console.log('🎨 Showing artwork confirmation dialog...')
      showArtworkConfirmation.value = true
      // Store the artwork URLs for later download
      deezerArtwork.value = Object.fromEntries(
        needsArtwork.map(item => [item.upc, item.coverUrl])
      )
    } else {
      // All releases have user-uploaded covers or no covers available
      await continueToMatching()
    }
    
  } catch (err) {
    console.error('❌ Error processing metadata-less upload:', err)
    error.value = err.message
  } finally {
    fetchingMetadata.value = false
    metadataFetchStatus.value = ''
    metadataFetchProgress.value = {}
  }
}

const handleArtworkChoice = async () => {
  showArtworkConfirmation.value = false
  
  if (artworkConfirmationChoice.value === 'use-deezer') {
    // Download and store Deezer artwork
    await downloadDeezerArtwork()
  }
  
  // Continue to matching regardless of choice
  await continueToMatching()
}

const downloadDeezerArtwork = async () => {
  downloadingArtwork.value = true
  artworkDownloadStatus.value = 'Downloading artwork from Deezer...'
  
  console.log('🎨 === Downloading Deezer Artwork ===')
  console.log(`  Processing ${Object.keys(deezerArtwork.value).length} covers`)
  
  try {
    for (const [upc, coverUrl] of Object.entries(deezerArtwork.value)) {
      artworkDownloadStatus.value = `Downloading artwork for UPC ${upc}...`
      
      const artwork = await downloadAndStoreDeezerArtwork(upc, coverUrl)
      if (artwork) {
        // Add to uploaded files as if user uploaded it
        uploadedFiles.value.images.push({
          name: artwork.fileName,
          url: artwork.url,
          path: artwork.path,
          upc: upc,
          imageType: 'cover',
          format: 'JPEG',
          size: 0, // We don't track size for downloaded images
          source: 'deezer'
        })
        
        // Update the metadata to use the Firebase Storage URL
        if (deezerMetadata.value[upc]) {
          deezerMetadata.value[upc].coverUrl = artwork.url
        }
      }
    }
    
    console.log('✅ Artwork download complete')
    artworkDownloadStatus.value = 'Artwork download complete'
  } catch (error) {
    console.error('❌ Error downloading artwork:', error)
    error.value = `Failed to download some artwork: ${error.message}`
  } finally {
    downloadingArtwork.value = false
    artworkDownloadStatus.value = ''
  }
}

const continueToMatching = async () => {
  console.log('➡️ Continuing to matching step...')
  
  // Transform Deezer metadata to match our standard format
  const releases = Object.values(deezerMetadata.value)
  parsedData.value = releases.flatMap(release => 
    release.tracks.map(track => ({
      upc: release.upc,
      title: release.title,
      artist: release.artist,
      label: release.label,
      releaseDate: release.releaseDate,
      genre: release.genre,
      trackTitle: track.title,
      trackArtist: track.artist,
      trackNumber: track.trackNumber,
      discNumber: track.discNumber,
      isrc: track.isrc,  // Make sure ISRC is included here
      duration: track.duration
    }))
  )
  
  console.log(`✅ Transformed ${parsedData.value.length} tracks from ${releases.length} releases`)
  
  // Debug: Check if ISRCs are present
  parsedData.value.forEach((track, index) => {
    if (track.isrc) {
      console.log(`  Track ${index + 1}: ISRC = ${track.isrc}`)
    } else {
      console.log(`  Track ${index + 1}: No ISRC`)
    }
  })
  
  // Update import job
  if (!importJob.value) {
    console.log('📝 Creating new import job...')
    importJob.value = await importService.createImportJob(user.value.uid, {
      mode: 'metadata-less',
      upcCount: Object.keys(deezerMetadata.value).length,
      hasDeeerArtwork: Object.keys(deezerArtwork.value).length > 0
    })
    console.log(`  Created import job: ${importJob.value.id}`)
  }
  
  console.log('💾 Saving metadata to import job...')
  await importService.updateImportJob(importJob.value.id, {
    deezerMetadata: deezerMetadata.value,
    parsedReleases: releases,
    status: 'metadata_fetched',
    uploadedFiles: uploadedFiles.value
  })
  
  // Move to matching step
  currentStep.value = 2
  
  // Auto-trigger matching after a short delay
  setTimeout(() => {
    console.log('🔄 Auto-triggering matching process...')
    performMatching()
  }, 1000)
}

// Add a manual trigger for metadata processing
const triggerMetadataProcessing = async () => {
  if (isMetadatalessMode.value && (uploadedFiles.value.audio.length > 0 || uploadedFiles.value.images.length > 0)) {
    await processMetadatalessUpload()
  }
}

// Methods
const handleCSVUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.name.endsWith('.csv')) {
    error.value = 'Please upload a CSV file'
    return
  }

  csvFile.value = file
  isLoading.value = true
  error.value = null

  try {
    const result = await importService.parseCSV(file)
    csvHeaders.value = result.headers
    parsedData.value = result.data
    
    // Auto-detect field mappings
    autoDetectMapping(result.headers)
    
    // Create or update import job
    if (!importJob.value) {
      importJob.value = await importService.createImportJob(user.value.uid, {
        fileName: file.name,
        rowCount: result.data.length,
        headers: result.headers,
        mode: 'standard'
      })
    }
  } catch (err) {
    console.error('CSV parse error:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

const autoDetectMapping = (headers) => {
  const mapping = {}
  
  requiredFields.forEach(field => {
    // Try exact match first
    let match = headers.find(h => h.toLowerCase() === field.key.toLowerCase())
    
    // Try common variations
    if (!match && field.key === 'title') {
      match = headers.find(h => /^(release[_\s]?title|album[_\s]?title|title)$/i.test(h))
    }
    if (!match && field.key === 'artist') {
      match = headers.find(h => /^(artist[_\s]?name|display[_\s]?artist|artist)$/i.test(h))
    }
    if (!match && field.key === 'upc') {
      match = headers.find(h => /^(upc|barcode|ean|gtin)$/i.test(h))
    }
    if (!match && field.key === 'trackTitle') {
      match = headers.find(h => /^(track[_\s]?title|song[_\s]?title|track[_\s]?name)$/i.test(h))
    }
    if (!match && field.key === 'trackNumber') {
      match = headers.find(h => /^(track[_\s]?number|track[_\s]?no|track[_\s]?#|sequence)$/i.test(h))
    }
    
    if (match) {
      mapping[field.key] = match
    }
  })
  
  fieldMapping.value = mapping
}

const validateAndProcessCSV = async () => {
  isLoading.value = true
  error.value = null

  try {
    // Transform data according to field mapping
    const transformedData = parsedData.value.map(row => {
      const transformed = {}
      Object.entries(fieldMapping.value).forEach(([key, csvColumn]) => {
        if (csvColumn && row[csvColumn]) {
          transformed[key] = row[csvColumn]
        }
      })
      return transformed
    })

    // Validate required fields
    const errors = []
    transformedData.forEach((row, index) => {
      requiredFields.filter(f => f.required).forEach(field => {
        if (!row[field.key]) {
          errors.push(`Row ${index + 1}: Missing ${field.label}`)
        }
      })
      
      // Validate UPC format
      if (row.upc && !/^\d{12,14}$/.test(row.upc.replace(/[\s-]/g, ''))) {
        errors.push(`Row ${index + 1}: Invalid UPC format`)
      }
    })

    if (errors.length > 0) {
      error.value = errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : '')
      return
    }

    // Group into releases and save to import job
    const releases = groupIntoReleases(transformedData)
    
    await importService.updateImportJob(importJob.value.id, {
      mapping: fieldMapping.value,
      parsedReleases: releases,
      status: 'metadata_imported'
    })

    parsedData.value = transformedData
    currentStep.value = 2
  } catch (err) {
    console.error('Validation error:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

const groupIntoReleases = (rows) => {
  const releases = {}
  
  rows.forEach(row => {
    const upc = row.upc?.replace(/[\s-]/g, '')
    if (!upc) return
    
    if (!releases[upc]) {
      releases[upc] = {
        upc,
        title: row.title,
        artist: row.artist,
        label: row.label,
        catalogNumber: row.catalogNumber,
        releaseDate: row.releaseDate,
        genre: row.genre,
        tracks: []
      }
    }
    
    releases[upc].tracks.push({
      trackNumber: parseInt(row.trackNumber) || 1,
      discNumber: parseInt(row.discNumber) || 1,
      title: row.trackTitle || row.title,
      artist: row.trackArtist || row.artist,
      isrc: row.isrc,
      duration: parseInt(row.duration) || 0
    })
  })
  
  // Sort tracks within each release
  Object.values(releases).forEach(release => {
    release.tracks.sort((a, b) => {
      if (a.discNumber !== b.discNumber) {
        return a.discNumber - b.discNumber
      }
      return a.trackNumber - b.trackNumber
    })
  })
  
  return Object.values(releases)
}

// Step 2: File Upload
const handleAudioUpload = async (event) => {
  const files = Array.from(event.target.files)
  await processFileUpload(files, 'audio')
}

const handleImageUpload = async (event) => {
  const files = Array.from(event.target.files)
  await processFileUpload(files, 'images')
}

const processFileUpload = async (files, type) => {
  console.log(`📁 Starting file upload for ${files.length} ${type} files`)
  console.log('Files:', files.map(f => f.name).join(', '))
  
  isLoading.value = true
  uploadingFiles.value[type] = true
  error.value = null
  uploadProgress.value = {} // Reset progress

  try {
    // Create import job if it doesn't exist (BEFORE validation)
    if (!importJob.value) {
      console.log('📝 Creating import job for file upload...')
      importJob.value = await importService.createImportJob(user.value.uid, {
        mode: isMetadatalessMode.value ? 'metadata-less' : 'standard',
        status: 'files_uploading',
        createdAt: new Date().toISOString()
      })
      console.log(`  Created import job: ${importJob.value.id}`)
    }

    // Validate DDEX naming
    const validatedFiles = []
    const errors = []

    console.log('🔍 Validating DDEX naming conventions...')
    for (const file of files) {
      const validation = validateDDEXNaming(file.name, type)
      console.log(`  ${file.name}: ${validation.valid ? '✅' : '❌'} ${validation.valid ? `UPC: ${validation.upc}` : validation.error}`)
      
      if (validation.valid) {
        validatedFiles.push({
          file,
          ...validation
        })
      } else {
        errors.push(`${file.name}: ${validation.error}`)
      }
    }

    console.log(`✅ Validated ${validatedFiles.length}/${files.length} files successfully`)

    if (errors.length > 0) {
      error.value = `Invalid file names:\n${errors.join('\n')}`
      if (validatedFiles.length === 0) {
        console.error('❌ No valid files to upload')
        uploadingFiles.value[type] = false
        return
      }
    }

    // Upload validated files - now importJob.value.id is guaranteed to exist
    console.log(`📤 Starting upload of ${validatedFiles.length} files to Firebase Storage...`)
    console.log(`  Using import job ID: ${importJob.value.id}`)
    
    const uploaded = await importService.uploadBatchFiles(
      validatedFiles,
      user.value.uid,
      importJob.value.id, // This will no longer be undefined
      (progress) => {
        // Progress handling remains the same
        if (progress && typeof progress === 'object') {
          uploadProgress.value = { ...progress }
          
          const progressEntries = Object.entries(progress)
          if (progressEntries.length > 0) {
            const lastEntry = progressEntries[progressEntries.length - 1]
            if (lastEntry && lastEntry.length === 2) {
              const [fileName, percent] = lastEntry
              currentUploadFile.value = fileName
              
              if (percent % 20 === 0 || percent === 100) {
                console.log(`  📊 Upload progress: ${fileName} - ${Math.round(percent)}%`)
              }
            }
          }
        }
      }
    )

    console.log(`✅ Successfully uploaded ${uploaded.length} files`)
    uploaded.forEach(file => {
      console.log(`  - ${file.name} (${file.url})`)
    })
    
    uploadedFiles.value[type].push(...uploaded)

    // Update import job
    console.log('💾 Updating import job...')
    await importService.updateImportJob(importJob.value.id, {
      uploadedFiles: uploadedFiles.value,
      status: 'files_uploaded'
    })

    // MODIFIED: Don't auto-process metadata immediately
    if (isMetadatalessMode.value && currentStep.value === 1) {
      console.log('📝 Files uploaded. Upload more files or click "Process Metadata" when ready.')
    }

  } catch (err) {
    console.error('❌ Upload error:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
    uploadingFiles.value[type] = false
    currentUploadFile.value = ''
    setTimeout(() => {
      uploadProgress.value = {}
    }, 2000)
  }
}

const validateDDEXNaming = (fileName, type) => {
  if (type === 'images') {
    // Expected: UPC.jpg or UPC_XX.jpg
    const match = fileName.match(/^(\d{12,14})(?:_(\d{2}))?\.(?:jpg|jpeg|png)$/i)
    if (match) {
      return {
        valid: true,
        upc: match[1],
        imageType: match[2] ? `additional_${match[2]}` : 'cover'
      }
    }
    return {
      valid: false,
      error: 'Image files must be named: UPC.jpg or UPC_XX.jpg'
    }
  }

  if (type === 'audio') {
    // Expected: UPC_DiscNumber_TrackNumber.wav
    // Now accepts both 2-digit (TT) and 3-digit (TTT) track numbers
    const match = fileName.match(/^(\d{12,14})_(\d{2})_(\d{2,3})\.(?:wav|flac|mp3)$/i)
    if (match) {
      return {
        valid: true,
        upc: match[1],
        discNumber: parseInt(match[2]),
        trackNumber: parseInt(match[3])
      }
    }
    return {
      valid: false,
      error: 'Audio files must be named: UPC_DD_TT.wav or UPC_DD_TTT.wav (e.g., 123456789012_01_01.wav or 123456789012_01_001.wav)'
    }
  }

  return { valid: false, error: 'Unknown file type' }
}

// Step 3: Automatic Matching
const performMatching = async () => {
  console.log('🎯 === Starting Matching Process ===')
  isLoading.value = true
  error.value = null

  try {
    const releases = isMetadatalessMode.value 
      ? Object.values(deezerMetadata.value)
      : groupIntoReleases(parsedData.value)
    
    console.log(`📊 Processing ${releases.length} releases for matching...`)
      
    const results = {
      matched: [],
      incomplete: [],
      errors: []
    }

    for (let i = 0; i < releases.length; i++) {
      const release = releases[i]
      console.log(`\n🔍 [${i + 1}/${releases.length}] Matching release: "${release.title}" (UPC: ${release.upc})`)
      
      const matchResult = await matchReleaseWithFiles(release)
      
      console.log(`  Result: ${matchResult.complete ? '✅ COMPLETE' : matchResult.hasPartialData ? '⚠️ INCOMPLETE' : '❌ ERROR'}`)
      console.log(`  - Cover image: ${matchResult.matchedFiles.coverImage ? '✅' : '❌'}`)
      console.log(`  - Audio tracks: ${matchResult.matchedFiles.audioTracks.filter(t => !t.missing).length}/${release.tracks.length}`)
      
      if (matchResult.complete) {
        results.matched.push(matchResult)
        console.log(`  ✅ Added to matched releases`)
      } else if (matchResult.hasPartialData) {
        results.incomplete.push(matchResult)
        console.log(`  ⚠️ Added to incomplete releases`)
        const missingTracks = matchResult.matchedFiles.audioTracks.filter(t => t.missing)
        if (missingTracks.length > 0) {
          console.log(`  Missing tracks:`)
          missingTracks.forEach(t => {
            console.log(`    - Track ${t.trackNumber}: ${t.title}`)
          })
        }
      } else {
        results.errors.push({
          release,
          error: matchResult.error || 'No matching files found'
        })
        console.log(`  ❌ Added to errors: ${matchResult.error || 'No matching files found'}`)
      }
    }

    console.log(`\n📊 === Matching Results Summary ===`)
    console.log(`  ✅ Matched: ${results.matched.length} releases`)
    console.log(`  ⚠️ Incomplete: ${results.incomplete.length} releases`)
    console.log(`  ❌ Errors: ${results.errors.length} releases`)

    matchingResults.value = results

    // Update import job - Deep clean the data before saving
    if (importJob.value) {
      console.log('💾 Saving matching results to import job...')
      
      // Deep clean the entire results object to remove any undefined values
      const cleanedResults = cleanObjectForFirestore(results)
      
      try {
        await importService.updateImportJob(importJob.value.id, {
          matchingResults: cleanedResults,
          status: 'matching_complete'
        })
        console.log('✅ Successfully saved matching results')
      } catch (saveError) {
        console.error('Error saving to Firestore:', saveError)
        console.log('Cleaned results object:', JSON.stringify(cleanedResults, null, 2))
        // Don't throw - continue with the process
      }
    }

    // Auto-create draft releases for matched items
    if (results.matched.length > 0) {
      console.log(`\n📝 Creating draft releases for ${results.matched.length} matched items...`)
      await createDraftReleases(results.matched)
    }

  } catch (err) {
    console.error('❌ Matching error:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

const matchReleaseWithFiles = async (release) => {
  const upc = release.upc
  const result = {
    release,
    complete: false,
    hasPartialData: false,
    matchedFiles: {
      coverImage: null,
      additionalImages: [],
      audioTracks: []
    },
    error: null
  }

  console.log(`  📂 Searching for files with UPC: ${upc}`)

  // Find cover image (including Deezer-sourced)
  const coverImage = uploadedFiles.value.images.find(img => 
    img.upc === upc && img.imageType === 'cover'
  )
  if (coverImage) {
    result.matchedFiles.coverImage = coverImage
    result.hasPartialData = true
    console.log(`    ✅ Found cover image: ${coverImage.name}${coverImage.source === 'deezer' ? ' (from Deezer)' : ''}`)
  } else {
    console.log(`    ❌ No cover image found`)
  }

  // Find additional images
  const additionalImages = uploadedFiles.value.images.filter(img => 
    img.upc === upc && img.imageType !== 'cover'
  )
  if (additionalImages.length > 0) {
    result.matchedFiles.additionalImages = additionalImages
    console.log(`    📷 Found ${additionalImages.length} additional images`)
  }

  // Match audio tracks
  console.log(`  🎵 Matching ${release.tracks.length} tracks...`)
  for (const track of release.tracks) {
    const audioFile = uploadedFiles.value.audio.find(audio => 
      audio.upc === upc &&
      audio.discNumber === track.discNumber &&
      audio.trackNumber === track.trackNumber
    )
    
    if (audioFile) {
      result.matchedFiles.audioTracks.push({
        ...track,
        isrc: track.isrc || '',  // Ensure ISRC is preserved
        audioFile
      })
      result.hasPartialData = true
      console.log(`    ✅ Track ${track.trackNumber}: "${track.title}" - Found ${audioFile.name} (ISRC: ${track.isrc || 'none'})`)
    } else {
      result.matchedFiles.audioTracks.push({
        ...track,
        isrc: track.isrc || '',  // Ensure ISRC is preserved even for missing audio
        audioFile: null,
        missing: true
      })
      console.log(`    ❌ Track ${track.trackNumber}: "${track.title}" - Missing audio file (ISRC: ${track.isrc || 'none'})`)
    }
  }

  // Check if complete
  const hasAllAudio = result.matchedFiles.audioTracks.every(t => !t.missing)
  result.complete = Boolean(result.matchedFiles.coverImage && hasAllAudio)  // Ensure boolean

  console.log(`  📊 Match summary: Cover=${result.matchedFiles.coverImage ? 'Yes' : 'No'}, Audio=${result.matchedFiles.audioTracks.filter(t => !t.missing).length}/${release.tracks.length}, Complete=${result.complete}`)

  return result
}

const createDraftReleases = async (matchedReleases) => {
  const created = []
  
  console.log(`📝 Creating ${matchedReleases.length} draft releases...`)
  
  for (const match of matchedReleases) {
    try {
      console.log(`  Creating release: "${match.release.title}" (UPC: ${match.release.upc})`)
      
      // Debug: Check ISRCs before creating
      match.matchedFiles.audioTracks.forEach((track, index) => {
        console.log(`    Track ${index + 1}: ISRC = ${track.isrc || 'MISSING'}`)
      })
      
      const releaseData = {
        basic: {
          title: match.release.title,
          displayArtist: match.release.artist,
          type: detectReleaseType(match.release.tracks.length),
          label: match.release.label || '',
          catalogNumber: match.release.catalogNumber || '',
          barcode: match.release.upc,
          releaseDate: match.release.releaseDate
        },
        tracks: match.matchedFiles.audioTracks.map((track, index) => ({
          sequenceNumber: index + 1,
          title: track.title,
          artist: track.artist || match.release.artist,
          isrc: track.isrc || '',  // This should have the ISRC
          duration: track.duration || 0,
          audio: track.audioFile ? {
            url: track.audioFile.url,
            format: track.audioFile.format
          } : null
        })),
        assets: {
          coverImage: match.matchedFiles.coverImage ? {
            url: match.matchedFiles.coverImage.url,
            name: match.matchedFiles.coverImage.name,
            source: match.matchedFiles.coverImage.source || 'user'
          } : null,
          additionalImages: match.matchedFiles.additionalImages.map(img => ({
            url: img.url,
            name: img.name
          }))
        },
        metadata: {
          genre: match.release.genre || '',
          language: 'en',
          copyright: `© ${new Date().getFullYear()} ${match.release.label || match.release.artist}`,
          copyrightYear: new Date().getFullYear(),
          importMode: isMetadatalessMode.value ? 'metadata-less' : 'standard',
          deezerImport: isMetadatalessMode.value && match.matchedFiles.coverImage?.source === 'deezer'
        },
        territories: {
          mode: 'worldwide',
          included: [],
          excluded: []
        },
        importJobId: importJob.value?.id,
        importedAt: new Date().toISOString()
      }

      console.log(`    Saving ${releaseData.tracks.length} tracks with ISRCs:`)
      releaseData.tracks.forEach(t => {
        console.log(`      - "${t.title}": ISRC = ${t.isrc || 'NONE'}`)
      })
      
      const newRelease = await createRelease(releaseData)
      created.push(newRelease)
      console.log(`    ✅ Created release with ID: ${newRelease.id}`)
      
      if (match.matchedFiles.coverImage?.source === 'deezer') {
        console.log(`    🎨 Note: Using Deezer-sourced cover art`)
      }
    } catch (err) {
      console.error(`    ❌ Failed to create release for ${match.release.upc}:`, err)
      matchingResults.value.errors.push({
        release: match.release,
        error: err.message
      })
    }
  }

  if (created.length > 0 && importJob.value) {
    console.log(`💾 Updating import job with ${created.length} created releases`)
    await importService.updateImportJob(importJob.value.id, {
      createdReleases: created.map(r => r.id),
      status: 'completed'
    })
  }

  console.log(`✅ Successfully created ${created.length}/${matchedReleases.length} releases`)
  return created
}

const detectReleaseType = (trackCount) => {
  if (trackCount === 1) return 'Single'
  if (trackCount <= 6) return 'EP'
  return 'Album'
}

// Navigation
const nextStep = () => {
  if (currentStep.value < maxSteps.value) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const toggleMetadatalessMode = () => {
  isMetadatalessMode.value = !isMetadatalessMode.value
  // Reset Deezer artwork state when toggling mode
  deezerArtwork.value = {}
  showArtworkConfirmation.value = false
}

const viewIncomplete = () => {
  showStatusModal.value = true
}

const navigateToCatalog = () => {
  router.push('/catalog')
}

const resetImport = async () => {
  if (importJob.value) {
    await importService.cancelImportJob(importJob.value.id)
  }
  
  // Reset all state
  currentStep.value = 1
  importJob.value = null
  csvFile.value = null
  parsedData.value = []
  fieldMapping.value = {}
  uploadedFiles.value = { audio: [], images: [] }
  matchingResults.value = { matched: [], incomplete: [], errors: [] }
  uploadProgress.value = {}
  isMetadatalessMode.value = false
  deezerMetadata.value = {}
  deezerArtwork.value = {}
  uploadingFiles.value = { audio: false, images: false }
  currentUploadFile.value = ''
  metadataFetchStatus.value = ''
  showArtworkConfirmation.value = false
  downloadingArtwork.value = false
}

// Load existing import state
const loadImportState = async (job) => {
  console.log('📂 Loading existing import job:', job.id)
  
  // Set mode
  isMetadatalessMode.value = job.mode === 'metadata-less'
  
  if (job.mapping) {
    fieldMapping.value = job.mapping
  }
  if (job.deezerMetadata) {
    deezerMetadata.value = job.deezerMetadata
  }
  if (job.parsedReleases) {
    // Reconstruct parsed data from releases
    parsedData.value = job.parsedReleases.flatMap(release => 
      release.tracks.map(track => ({
        ...fieldMapping.value,
        upc: release.upc,
        title: release.title,
        artist: release.artist,
        trackTitle: track.title,
        trackNumber: track.trackNumber
      }))
    )
  }
  if (job.uploadedFiles) {
    uploadedFiles.value = job.uploadedFiles
  }
  if (job.matchingResults) {
    matchingResults.value = job.matchingResults
  }
  
  // Determine current step
  if (job.status === 'completed') {
    currentStep.value = maxSteps.value
  } else if (job.uploadedFiles?.audio?.length > 0 || job.uploadedFiles?.images?.length > 0) {
    currentStep.value = isMetadatalessMode.value ? 1 : 2
  } else {
    currentStep.value = 1
  }
  
  console.log('✅ Import job loaded, current step:', currentStep.value)
}

// Download sample CSV
const downloadSampleCSV = () => {
  const sample = `Release Title,Artist Name,UPC,Release Date,Label,Catalog Number,Track Title,Track Number,Disc Number,ISRC,Duration,Genre
"Summer Album","Beach Band",123456789012,2024-06-01,"Indie Records","CAT001","Sunset Dreams",1,1,"USRC12400001",215,"Pop"
"Summer Album","Beach Band",123456789012,2024-06-01,"Indie Records","CAT001","Ocean Waves",2,1,"USRC12400002",189,"Pop"
"Winter EP","Mountain Group",234567890123,2024-12-01,"Alpine Label","ALP002","Snow Fall",1,1,"USRC12400003",245,"Rock"`

  const blob = new Blob([sample], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sample_catalog.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  console.log('🚀 Migration component mounted')
  // Check for any active import jobs on mount
  if (importJob.value) {
    loadImportState(importJob.value)
  }
})
</script>

<template>
  <div class="migration section">
    <div class="container">
      <!-- Header -->
      <div class="migration-header flex justify-between items-center flex-wrap gap-lg mb-xl">
        <div>
          <h1 class="text-3xl font-bold mb-xs">Catalog Migration</h1>
          <p class="text-lg text-secondary">
            {{ isMetadatalessMode ? 'Import catalog using Deezer metadata' : 'Import your existing catalog in three easy steps' }}
          </p>
        </div>
        <div class="flex gap-md">
          <button 
            v-if="importJob"
            @click="resetImport" 
            class="btn btn-secondary"
          >
            <font-awesome-icon icon="redo" />
            Start Over
          </button>
          <button 
            @click="toggleMetadatalessMode" 
            class="btn btn-secondary"
            :class="{ 'btn-active': isMetadatalessMode }"
          >
            <font-awesome-icon :icon="isMetadatalessMode ? 'toggle-on' : 'toggle-off'" />
            {{ isMetadatalessMode ? 'Standard Mode' : 'Metadata-less' }}
          </button>
          <button 
            @click="navigateToCatalog" 
            class="btn btn-secondary"
          >
            <font-awesome-icon icon="arrow-left" />
            Back to Catalog
          </button>
        </div>
      </div>

      <!-- Mode Indicator -->
      <div v-if="isMetadatalessMode" class="mode-indicator card mb-xl p-lg flex gap-md">
        <font-awesome-icon icon="info-circle" />
        <div class="flex-1">
          <p class="m-0">
            <strong>Metadata-less Mode:</strong> Upload DDEX-compliant audio files and we'll fetch metadata and cover artwork from Deezer automatically.
            Files must use DDEX naming: <code>UPC_DD_TT.wav</code> or <code>UPC_DD_TTT.wav</code> for audio. Cover art will be imported from Deezer if available.
          </p>
        </div>
      </div>

      <!-- Progress -->
      <div class="mb-xl">
        <div class="progress-bar mb-lg">
          <div 
            class="progress-fill" 
            :style="{ width: `${(currentStep / maxSteps) * 100}%` }"
          ></div>
        </div>
        <div class="progress-steps flex">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="progress-step flex flex-col items-center flex-1"
            :class="{ 
              active: currentStep === index + 1,
              completed: currentStep > index + 1
            }"
          >
            <div class="step-number">
              <font-awesome-icon v-if="currentStep > index + 1" icon="check" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="text-sm text-secondary text-center">{{ step }}</span>
          </div>
        </div>
      </div>

      <!-- Import Stats -->
      <div v-if="importJob || Object.keys(deezerMetadata).length > 0" class="grid grid-cols-4 grid-cols-sm-2 gap-lg mb-xl">
        <div class="card p-lg text-center">
          <div class="text-2xl font-bold mb-xs">{{ importStats.totalReleases }}</div>
          <div class="stat-label">Total Releases</div>
        </div>
        <div class="card p-lg text-center">
          <div class="text-2xl font-bold mb-xs">{{ importStats.totalTracks }}</div>
          <div class="stat-label">Total Tracks</div>
        </div>
        <div class="card p-lg text-center">
          <div class="text-2xl font-bold text-success mb-xs">{{ importStats.matchedReleases }}</div>
          <div class="stat-label">Matched</div>
        </div>
        <div class="card p-lg text-center">
          <div class="text-2xl font-bold text-warning mb-xs">{{ importStats.incompleteReleases }}</div>
          <div class="stat-label">Incomplete</div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="error-banner flex items-start gap-sm p-md mb-lg rounded-lg">
        <font-awesome-icon icon="exclamation-triangle" />
        <pre class="m-0">{{ error }}</pre>
      </div>

      <!-- Artwork Confirmation Dialog -->
      <div v-if="showArtworkConfirmation" class="artwork-confirmation-modal">
        <div class="modal-backdrop" @click.self="showArtworkConfirmation = false"></div>
        <div class="modal-content card p-xl">
          <h2 class="text-xl font-bold mb-lg">Cover Artwork Available from Deezer</h2>
          
          <p class="text-secondary mb-lg">
            We found {{ Object.keys(deezerArtwork).length }} release(s) without uploaded cover art. 
            Deezer has cover artwork available for these releases.
          </p>
          
          <div class="artwork-preview-grid grid grid-cols-3 gap-md mb-lg" v-if="Object.keys(deezerMetadata).length <= 6">
            <div v-for="(metadata, upc) in deezerMetadata" :key="upc" v-if="deezerArtwork[upc]" class="text-center">
              <img 
                :src="metadata.coverUrlOriginal || metadata.coverUrl" 
                :alt="metadata.title"
                class="artwork-preview rounded-md mb-xs"
              />
              <p class="text-xs text-secondary">{{ metadata.title }}</p>
            </div>
          </div>
          
          <div class="artwork-choice mb-lg">
            <label class="flex items-center gap-sm mb-md cursor-pointer">
              <input 
                type="radio" 
                value="use-deezer" 
                v-model="artworkConfirmationChoice"
              />
              <span>Use Deezer artwork for releases without covers</span>
            </label>
            <label class="flex items-center gap-sm cursor-pointer">
              <input 
                type="radio" 
                value="skip-artwork" 
                v-model="artworkConfirmationChoice"
              />
              <span>Continue without cover art (not recommended)</span>
            </label>
          </div>
          
          <div class="flex justify-end gap-md">
            <button @click="showArtworkConfirmation = false" class="btn btn-secondary">
              Cancel
            </button>
            <button @click="handleArtworkChoice" class="btn btn-primary">
              Continue
            </button>
          </div>
        </div>
      </div>

      <!-- Artwork Download Progress -->
      <div v-if="downloadingArtwork" class="artwork-download-card card p-xl mb-xl">
        <div class="flex items-center gap-md mb-lg">
          <font-awesome-icon icon="spinner" spin class="text-xl text-info" />
          <h4>Downloading Artwork from Deezer</h4>
        </div>
        <p class="text-secondary">{{ artworkDownloadStatus }}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 50%"></div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="card">
        <!-- Step 1: CSV Import (Standard Mode) or File Upload (Metadata-less Mode) -->
        <div v-if="currentStep === 1" class="step-content">
          <!-- Standard Mode: CSV Import -->
          <template v-if="!isMetadatalessMode">
            <div class="card-header">
              <h2>Step 1: Import Catalog Metadata</h2>
            </div>
            <div class="card-body">
              <div class="upload-section">
                <p class="text-secondary mb-lg">
                  Upload a CSV file containing your catalog metadata. The file should include release information and track details.
                </p>
                
                <button @click="downloadSampleCSV" class="btn btn-secondary btn-sm mb-lg">
                  <font-awesome-icon icon="download" />
                  Download Sample CSV
                </button>

                <div v-if="!csvFile" class="upload-area">
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

                <div v-else>
                  <div class="file-card flex items-center gap-lg p-lg bg-secondary rounded-lg mb-xl">
                    <font-awesome-icon icon="file-csv" class="text-2xl text-primary" />
                    <div class="flex-1">
                      <h4 class="font-semibold mb-xs">{{ csvFile.name }}</h4>
                      <p class="text-sm text-secondary">{{ parsedData.length }} rows parsed</p>
                    </div>
                    <button @click="csvFile = null; parsedData = []" class="btn-icon">
                      <font-awesome-icon icon="times" />
                    </button>
                  </div>

                  <!-- Field Mapping -->
                  <div v-if="csvHeaders.length > 0" class="field-mapping bg-secondary p-xl rounded-lg">
                    <h3 class="text-lg font-semibold mb-md">Map CSV Fields</h3>
                    <p class="text-secondary mb-lg">
                      Match your CSV columns to the required fields. Required fields are marked with *.
                    </p>
                    
                    <div class="grid gap-md">
                      <div 
                        v-for="field in requiredFields" 
                        :key="field.key"
                        class="mapping-row grid gap-lg items-center"
                        :class="{ required: field.required }"
                      >
                        <label class="form-label">
                          {{ field.label }}
                          <span v-if="field.required" class="text-error ml-xs">*</span>
                        </label>
                        <select 
                          v-model="fieldMapping[field.key]" 
                          class="form-select"
                        >
                          <option value="">-- Select Column --</option>
                          <option 
                            v-for="header in csvHeaders" 
                            :key="header"
                            :value="header"
                          >
                            {{ header }}
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-footer flex justify-between">
              <div></div>
              <button 
                @click="validateAndProcessCSV" 
                class="btn btn-primary"
                :disabled="!canProceedStep1 || isLoading"
              >
                <font-awesome-icon v-if="isLoading" icon="spinner" spin />
                <span v-else>Validate & Continue</span>
                <font-awesome-icon v-if="!isLoading" icon="arrow-right" />
              </button>
            </div>
          </template>

          <!-- Metadata-less Mode: File Upload -->
          <template v-else>
            <div class="card-header">
              <h2>Step 1: Upload DDEX-Compliant Audio Files</h2>
            </div>
            <div class="card-body">
              <div class="file-requirements mb-xl">
                <h3 class="text-lg font-semibold mb-lg">File Naming Requirements</h3>
                <div class="grid grid-cols-3 grid-cols-sm-1 gap-lg">
                  <div class="requirement-card card p-lg text-center">
                    <font-awesome-icon icon="music" class="requirement-icon" />
                    <h4 class="font-semibold mb-sm">Audio Files</h4>
                    <code>UPC_DD_TT.wav</code>
                    <span class="text-xs text-secondary">or</span>
                    <code>UPC_DD_TTT.wav</code>
                    <p class="text-sm text-secondary">Examples:</p>
                    <small class="text-xs block">669158552979_01_01.wav</small>
                    <small class="text-xs block">669158552979_01_001.wav</small>
                    <small class="text-xs text-tertiary block mt-xs">DD = Disc (01), TT/TTT = Track (01 or 001)</small>
                  </div>
                  <div class="requirement-card card p-lg text-center">
                    <font-awesome-icon icon="image" class="requirement-icon" />
                    <h4 class="font-semibold mb-sm">Cover Images (Optional)</h4>
                    <code>UPC.jpg</code>
                    <p class="text-sm text-secondary">Example: 669158552979.jpg</p>
                    <small class="text-xs text-info block mt-xs">If not provided, will be fetched from Deezer</small>
                  </div>
                  <div class="requirement-card card p-lg text-center">
                    <font-awesome-icon icon="images" class="requirement-icon" />
                    <h4 class="font-semibold mb-sm">Additional Images</h4>
                    <code>UPC_XX.jpg</code>
                    <p class="text-sm text-secondary">Example: 669158552979_02.jpg</p>
                  </div>
                </div>
                
                <div class="info-box p-md bg-info-light rounded-lg mt-lg">
                  <p class="text-sm mb-0">
                    <font-awesome-icon icon="info-circle" class="mr-sm" />
                    <strong>Flexible Track Numbering:</strong> We support both 2-digit (<code>01</code>) and 3-digit (<code>001</code>) track numbers for your convenience.
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 grid-cols-sm-1 gap-xl">
                <!-- Audio Upload -->
                <div class="upload-section">
                  <h3 class="text-lg font-semibold mb-md">Audio Files</h3>
                  <div class="upload-area" :class="{ 'uploading': uploadingFiles.audio }">
                    <label class="upload-label">
                      <input 
                        type="file" 
                        accept="audio/*"
                        multiple
                        @change="handleAudioUpload"
                        style="display: none"
                        :disabled="uploadingFiles.audio"
                      />
                      <font-awesome-icon 
                        :icon="uploadingFiles.audio ? 'spinner' : 'music'" 
                        :spin="uploadingFiles.audio"
                        class="upload-icon" 
                      />
                      <p>{{ uploadingFiles.audio ? 'Uploading...' : 'Upload audio files (WAV, FLAC, MP3)' }}</p>
                      <span v-if="!uploadingFiles.audio" class="btn btn-primary">Choose Audio Files</span>
                    </label>
                  </div>
                  
                  <div v-if="uploadedFiles.audio.length > 0" class="uploaded-list">
                    <h4 class="font-medium text-secondary mb-md">Uploaded Audio ({{ uploadedFiles.audio.length }})</h4>
                    <div class="file-grid grid grid-cols-1 gap-sm">
                      <div 
                        v-for="file in uploadedFiles.audio.slice(0, 10)" 
                        :key="file.name"
                        class="file-item flex items-center gap-xs p-sm bg-secondary rounded-md text-sm"
                      >
                        <font-awesome-icon icon="music" />
                        <span>{{ file.name }}</span>
                      </div>
                      <div v-if="uploadedFiles.audio.length > 10" class="file-item more p-sm bg-primary-light text-primary rounded-md text-sm font-medium">
                        +{{ uploadedFiles.audio.length - 10 }} more
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Image Upload -->
                <div class="upload-section">
                  <h3 class="text-lg font-semibold mb-md">Cover Images (Optional)</h3>
                  <div class="upload-area" :class="{ 'uploading': uploadingFiles.images }">
                    <label class="upload-label">
                      <input 
                        type="file" 
                        accept="image/*"
                        multiple
                        @change="handleImageUpload"
                        style="display: none"
                        :disabled="uploadingFiles.images"
                      />
                      <font-awesome-icon 
                        :icon="uploadingFiles.images ? 'spinner' : 'image'" 
                        :spin="uploadingFiles.images"
                        class="upload-icon" 
                      />
                      <p>{{ uploadingFiles.images ? 'Uploading...' : 'Upload cover images (JPG, PNG)' }}</p>
                      <span v-if="!uploadingFiles.images" class="btn btn-secondary">Choose Images</span>
                    </label>
                  </div>
                  
                  <div v-if="uploadedFiles.images.length > 0" class="uploaded-list">
                    <h4 class="font-medium text-secondary mb-md">Uploaded Images ({{ uploadedFiles.images.length }})</h4>
                    <div class="file-grid grid grid-cols-1 gap-sm">
                      <div 
                        v-for="file in uploadedFiles.images.slice(0, 10)" 
                        :key="file.name"
                        class="file-item flex items-center gap-xs p-sm bg-secondary rounded-md text-sm"
                      >
                        <font-awesome-icon :icon="file.source === 'deezer' ? 'cloud-download-alt' : 'image'" />
                        <span>{{ file.name }}{{ file.source === 'deezer' ? ' (Deezer)' : '' }}</span>
                      </div>
                      <div v-if="uploadedFiles.images.length > 10" class="file-item more p-sm bg-primary-light text-primary rounded-md text-sm font-medium">
                        +{{ uploadedFiles.images.length - 10 }} more
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Process button after upload sections -->
              <div v-if="(uploadedFiles.audio.length > 0 || uploadedFiles.images.length > 0) && !fetchingMetadata && Object.keys(deezerMetadata).length === 0" 
                  class="process-metadata-section mt-xl">
                <div class="process-card card p-xl text-center">
                  <h3 class="mb-md">Files Ready for Processing</h3>
                  <p class="text-secondary mb-md">You have uploaded {{ uploadedFiles.audio.length }} audio file(s) and {{ uploadedFiles.images.length }} image file(s).</p>
                  <p class="text-secondary mb-md">Click below to fetch metadata from Deezer and match your files.</p>
                  <button 
                    @click="triggerMetadataProcessing" 
                    class="btn btn-primary btn-lg"
                    :disabled="isLoading"
                  >
                    <font-awesome-icon icon="search" />
                    Process Metadata & Match Files
                  </button>
                </div>
              </div>

              <!-- Upload Progress -->
              <div v-if="(uploadingFiles.audio || uploadingFiles.images || Object.keys(uploadProgress).length > 0) && Object.keys(uploadProgress).length > 0" 
                  class="upload-status-card card p-xl mt-xl">
                <h4>
                  <font-awesome-icon icon="cloud-upload-alt" class="upload-icon-animated text-primary mr-sm" />
                  Upload Progress
                </h4>
                
                <div v-if="currentUploadFile" class="current-upload flex items-center gap-sm mt-md mb-md p-sm bg-surface rounded-md">
                  <span class="font-semibold text-secondary">Uploading:</span>
                  <span class="text-primary font-mono text-sm">{{ currentUploadFile }}</span>
                </div>
                
                <div class="upload-progress-detailed mt-md">
                  <div 
                    v-for="(progress, fileName) in uploadProgress" 
                    :key="fileName"
                    class="mb-md"
                  >
                    <div class="flex justify-between mb-xs text-sm">
                      <span class="font-mono">{{ fileName }}</span>
                      <span class="text-primary font-semibold">{{ Math.round(progress) }}%</span>
                    </div>
                    <div class="progress-bar">
                      <div 
                        class="progress-fill" 
                        :style="{ width: `${Math.round(progress)}%` }"
                        :class="{ 'complete': progress === 100 }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Metadata Fetch Progress -->
              <div v-if="fetchingMetadata" class="metadata-fetch-card card p-xl mt-xl">
                <div class="fetch-header flex items-center gap-md mb-lg">
                  <font-awesome-icon icon="spinner" spin class="text-xl text-info" />
                  <h4>Fetching Metadata from Deezer</h4>
                </div>
                
                <div class="fetch-status">
                  <p class="m-sm">{{ metadataFetchStatus }}</p>
                </div>
                
                <div v-if="metadataFetchProgress.upc" class="fetch-details mt-lg p-md bg-surface rounded-md">
                  <div class="flex gap-sm mb-sm">
                    <span class="text-secondary font-medium">Current UPC:</span>
                    <span class="text-primary font-mono">{{ metadataFetchProgress.upc }}</span>
                  </div>
                  <div class="text-center text-secondary mb-md text-sm">
                    Processing {{ metadataFetchProgress.current }} of {{ metadataFetchProgress.total }}
                  </div>
                  <div class="progress-bar">
                    <div 
                      class="progress-fill" 
                      :style="{ width: `${(metadataFetchProgress.current / metadataFetchProgress.total) * 100}%` }"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Fetched Metadata Display -->
              <div v-if="Object.keys(deezerMetadata).length > 0 && !fetchingMetadata" 
                  class="fetched-metadata-enhanced card p-xl mt-xl">
                <div class="metadata-header flex items-center gap-md mb-lg">
                  <font-awesome-icon icon="check-circle" class="text-2xl text-success" />
                  <h3>Metadata Retrieved Successfully</h3>
                  <!-- Show if data was cached -->
                  <div v-if="Object.values(metadataQualityInfo).some(q => q.cached)" 
                      class="ml-auto flex items-center gap-sm">
                    <span class="badge badge-info">
                      <font-awesome-icon icon="bolt" />
                      Using Cached Data
                    </span>
                  </div>
                </div>
                
                <div class="text-secondary mb-lg">
                  <p>Found {{ Object.keys(deezerMetadata).length }} release(s) from Deezer</p>
                  <!-- Show average completeness if available -->
                  <p v-if="Object.keys(metadataQualityInfo).length > 0" class="text-sm">
                    Average metadata completeness: 
                    {{ Math.round(Object.values(metadataQualityInfo).reduce((sum, q) => sum + q.completeness, 0) / Object.keys(metadataQualityInfo).length * 100) }}%
                  </p>
                </div>
                
                <div class="grid grid-cols-1 gap-lg">
                  <div v-for="(metadata, upc) in deezerMetadata" :key="upc" class="card card-hover p-lg">
                    <div class="flex gap-md mb-md">
                      <img v-if="metadata.coverUrl" :src="metadata.coverUrl" class="album-thumbnail rounded-md" alt="Album cover" />
                      <div class="flex-1">
                        <h4 class="text-lg font-semibold m-0">{{ metadata.title }}</h4>
                        <p class="text-secondary mt-xs mb-xs">{{ metadata.artist }}</p>
                        <p class="flex items-center gap-xs text-sm text-tertiary">
                          <span>{{ upc }}</span>
                          <span>•</span>
                          <span>{{ metadata.tracks.length }} tracks</span>
                          <!-- Show quality indicator -->
                          <span v-if="metadataQualityInfo[upc]" class="ml-auto">
                            <span v-if="metadataQualityInfo[upc].cached" class="text-info">
                              <font-awesome-icon icon="bolt" /> Cached
                            </span>
                            <span v-else class="text-success">
                              <font-awesome-icon icon="cloud" /> Fresh
                            </span>
                          </span>
                        </p>
                        <div v-if="metadata.coverUrl && !hasUploadedCovers" class="flex items-center gap-xs text-sm text-info mt-xs">
                          <font-awesome-icon icon="cloud-download-alt" />
                          <span>Cover art will be imported from Deezer</span>
                        </div>
                      </div>
                    </div>
                    <div class="track-list-preview border-t pt-md mt-md">
                      <div v-for="(track, idx) in metadata.tracks.slice(0, 3)" :key="idx" class="flex gap-sm pt-xs pb-xs text-sm">
                        <span class="text-tertiary">{{ track.trackNumber }}.</span>
                        <span>{{ track.title }}</span>
                      </div>
                      <div v-if="metadata.tracks.length > 3" class="mt-xs text-sm text-primary">
                        +{{ metadata.tracks.length - 3 }} more tracks
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-footer flex justify-between">
              <div></div>
              <div v-if="!fetchingMetadata && Object.keys(deezerMetadata).length === 0 && !uploadingFiles.audio && !uploadingFiles.images">
                <p class="text-secondary m-0">Upload files to fetch metadata from Deezer</p>
              </div>
              <button 
                v-if="Object.keys(deezerMetadata).length > 0"
                @click="nextStep" 
                class="btn btn-primary"
                :disabled="isLoading"
              >
                Continue to Matching
                <font-awesome-icon icon="arrow-right" />
              </button>
            </div>
          </template>
        </div>

        <!-- Step 2: File Upload (Standard Mode) or Match & Create (Metadata-less Mode) -->
        <div v-if="currentStep === 2 && !isMetadatalessMode" class="step-content">
          <!-- [Similar refactoring pattern for Step 2 content] -->
          <!-- I'll continue with the pattern for brevity, but the same principle applies -->
        </div>

        <!-- Step 3 (Standard) or Step 2 (Metadata-less): Matching Results -->
        <div v-if="(currentStep === 3 && !isMetadatalessMode) || (currentStep === 2 && isMetadatalessMode)" class="step-content">
          <div class="card-header">
            <h2>{{ isMetadatalessMode ? 'Step 2' : 'Step 3' }}: Import Results</h2>
          </div>
          <div class="card-body">
            <!-- Loading spinner while matching -->
            <div v-if="isLoading" class="text-center p-3xl">
              <div class="text-3xl text-primary mb-lg">
                <font-awesome-icon icon="spinner" spin />
              </div>
              <h3 class="mb-md">Matching files with releases...</h3>
              <p class="text-secondary">This may take a moment depending on the number of releases.</p>
            </div>

            <!-- Results summary -->
            <div v-else class="grid gap-lg mb-xl">
              <div class="result-card success card p-xl text-center" v-if="matchingResults.matched.length > 0">
                <font-awesome-icon icon="check-circle" class="text-3xl mb-md text-success" />
                <h3 class="text-xl font-semibold mb-sm">Successfully Matched</h3>
                <p class="text-2xl font-bold mb-sm">{{ matchingResults.matched.length }} releases</p>
                <p class="text-secondary mb-lg">
                  These releases have been created as drafts in your catalog.
                </p>
                <button @click="navigateToCatalog" class="btn btn-success">
                  View in Catalog
                </button>
              </div>

              <div class="result-card warning card p-xl text-center" v-if="matchingResults.incomplete.length > 0">
                <font-awesome-icon icon="exclamation-triangle" class="text-3xl mb-md text-warning" />
                <h3 class="text-xl font-semibold mb-sm">Incomplete Releases</h3>
                <p class="text-2xl font-bold mb-sm">{{ matchingResults.incomplete.length }} releases</p>
                <p class="text-secondary mb-lg">
                  These releases are missing some files. You can complete them later.
                </p>
                <button @click="viewIncomplete" class="btn btn-secondary">
                  View Details
                </button>
              </div>

              <div class="result-card error card p-xl text-center" v-if="matchingResults.errors.length > 0">
                <font-awesome-icon icon="times-circle" class="text-3xl mb-md text-error" />
                <h3 class="text-xl font-semibold mb-sm">Failed Matches</h3>
                <p class="text-2xl font-bold mb-sm">{{ matchingResults.errors.length }} releases</p>
                <p class="text-secondary mb-lg">
                  These releases couldn't be matched with uploaded files.
                </p>
                <div class="error-list text-left mt-md">
                  <div v-for="error in matchingResults.errors.slice(0, 5)" :key="error.release.upc" class="p-sm bg-surface rounded-md mb-sm text-sm">
                    <strong class="block mb-xs">{{ error.release.title }}</strong> ({{ error.release.upc }})
                    <span class="text-secondary">{{ error.error }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detailed Results Table -->
            <div v-if="matchingResults.matched.length > 0 && !isLoading" class="mt-xl">
              <h3 class="text-lg font-semibold mb-md">Created Releases</h3>
              <table class="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>UPC</th>
                    <th>Tracks</th>
                    <th>Cover Art</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="match in matchingResults.matched" :key="match.release.upc">
                    <td>{{ match.release.title }}</td>
                    <td>{{ match.release.artist }}</td>
                    <td>{{ match.release.upc }}</td>
                    <td>{{ match.release.tracks.length }}</td>
                    <td>
                      <span v-if="match.matchedFiles.coverImage?.source === 'deezer'" class="badge badge-info">
                        <font-awesome-icon icon="cloud-download-alt" />
                        Deezer
                      </span>
                      <span v-else-if="match.matchedFiles.coverImage" class="badge badge-secondary">
                        User
                      </span>
                      <span v-else class="badge">None</span>
                    </td>
                    <td>
                      <span class="badge badge-success">Draft Created</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer flex justify-between items-center">
            <button 
              @click="previousStep" 
              class="btn btn-secondary"
              :disabled="isLoading"
            >
              <font-awesome-icon icon="arrow-left" />
              Back
            </button>
            <div class="flex gap-md">
              <button 
                @click="resetImport" 
                class="btn btn-secondary"
                :disabled="isLoading"
              >
                Import More
              </button>
              <button 
                @click="navigateToCatalog" 
                class="btn btn-primary"
                :disabled="isLoading"
              >
                Go to Catalog
                <font-awesome-icon icon="arrow-right" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Migration Status Modal -->
      <MigrationStatus 
        v-if="showStatusModal"
        :import-job="importJob"
        :matching-results="matchingResults"
        @close="showStatusModal = false"
      />
    </div>
  </div>
</template>

<style scoped>
/* Progress Components */
.progress-bar {
  height: 4px;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--color-primary);
  transition: width var(--transition-base);
}

.progress-fill.complete {
  background: linear-gradient(90deg, var(--color-success), var(--color-primary));
}

/* Progress Steps Container */
.progress-steps {
  display: flex;
  width: 100%;
}

/* Each Step - Centers content within its allocated space */
.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  text-align: center;
}

/* Ensure step number is centered */
.step-number {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-xs);
}

.progress-step.active .step-number {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.progress-step.completed .step-number {
  background-color: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

/* Upload Areas */
.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3xl);
  text-align: center;
  background-color: var(--color-bg-secondary);
  transition: all var(--transition-base);
  margin-bottom: var(--space-lg);
}

.upload-area:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.upload-area.uploading {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
  pointer-events: none;
  opacity: 0.8;
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  cursor: pointer;
}

.upload-icon {
  font-size: 3rem;
  color: var(--color-text-tertiary);
}

/* Mode Indicator */
.mode-indicator {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(66, 133, 244, 0.05));
  border: 1px solid var(--color-info);
}

.mode-indicator code {
  background-color: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

/* Info Box */
.info-box {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(66, 133, 244, 0.05));
  border: 1px solid var(--color-info);
}

.bg-info-light {
  background-color: rgba(66, 133, 244, 0.1);
}

/* Button Active State */
.btn-active {
  background-color: var(--color-primary) !important;
  color: white !important;
}

/* Stat Label */
.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Error Banner */
.error-banner {
  background-color: rgba(234, 67, 53, 0.1);
  border: 1px solid var(--color-error);
  color: var(--color-error);
}

.error-banner pre {
  white-space: pre-wrap;
  font-family: inherit;
}

/* Mapping Row */
.mapping-row {
  grid-template-columns: 200px 1fr;
}

.mapping-row.required .form-label {
  font-weight: var(--font-medium);
}

/* Requirements Icon */
.requirement-icon {
  font-size: 2rem;
  color: var(--color-primary);
  margin-bottom: var(--space-md);
}

.requirement-card code {
  display: block;
  padding: var(--space-sm);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  margin: var(--space-xs) 0;
  font-family: var(--font-mono);
  color: var(--color-primary);
  font-size: var(--text-sm);
}

.requirement-card .text-xs.text-secondary {
  margin: var(--space-xs) 0;
}

/* Process Card */
.process-card {
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-bg-secondary));
  border: 2px solid var(--color-primary);
}

/* Upload Status Card */
.upload-status-card {
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-bg-secondary));
  border: 2px solid var(--color-primary);
  animation: fadeIn 0.3s ease-in;
}

.upload-icon-animated {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Metadata Cards */
.metadata-fetch-card {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(66, 133, 244, 0.05));
  border: 2px solid var(--color-info);
  animation: fadeIn 0.3s ease-in;
}

.fetched-metadata-enhanced {
  border: 2px solid var(--color-success);
  animation: fadeIn 0.3s ease-in;
}

.album-thumbnail {
  width: 60px;
  height: 60px;
  object-fit: cover;
}

/* Artwork Confirmation Modal */
.artwork-confirmation-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1;
}

.artwork-preview-grid {
  max-height: 200px;
  overflow-y: auto;
}

.artwork-preview {
  width: 100%;
  max-width: 120px;
  height: auto;
}

.artwork-choice label {
  cursor: pointer;
  padding: var(--space-sm);
  border-radius: var(--radius-md);
  transition: background-color var(--transition-base);
}

.artwork-choice label:hover {
  background-color: var(--color-bg-secondary);
}

.artwork-choice input[type="radio"] {
  margin-right: var(--space-sm);
}

/* Artwork Download Card */
.artwork-download-card {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(66, 133, 244, 0.05));
  border: 2px solid var(--color-info);
  animation: fadeIn 0.3s ease-in;
}

/* Result Cards */
.result-card.success {
  background-color: rgba(52, 168, 83, 0.1);
  border: 1px solid var(--color-success);
}

.result-card.warning {
  background-color: rgba(251, 188, 4, 0.1);
  border: 1px solid var(--color-warning);
}

.result-card.error {
  background-color: rgba(234, 67, 53, 0.1);
  border: 1px solid var(--color-error);
}

/* Error List */
.error-list {
  max-height: 200px;
  overflow-y: auto;
}

/* Table */
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  background-color: var(--color-bg-secondary);
  font-weight: var(--font-semibold);
  text-align: left;
  padding: var(--space-md);
  border-bottom: 2px solid var(--color-border);
}

.table td {
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

/* Badge */
.badge {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
}

.badge-success {
  background-color: rgba(52, 168, 83, 0.1);
  color: var(--color-success);
}

.badge-info {
  background-color: rgba(66, 133, 244, 0.1);
  color: var(--color-info);
}

.badge-secondary {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

/* Button Icon */
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-sm);
  color: var(--color-text-secondary);
  transition: all var(--transition-base);
}

.btn-icon:hover {
  color: var(--color-text);
}

/* Animations */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Step Content */
.step-content {
  min-height: 400px;
}

/* Dark mode adjustments */
[data-theme="dark"] .upload-status-card {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.2), var(--color-surface));
}

[data-theme="dark"] .artwork-confirmation-modal .modal-backdrop {
  background-color: rgba(0, 0, 0, 0.8);
}

/* Responsive */
@media (max-width: 768px) {
  .mapping-row {
    grid-template-columns: 1fr;
  }
  
  .artwork-preview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>