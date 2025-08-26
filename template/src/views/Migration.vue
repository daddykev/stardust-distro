<!-- src/views/Migration.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useCatalog } from '../composables/useCatalog'
import importService from '../services/import'
import MigrationStatus from '../components/MigrationStatus.vue'
import { getFunctions, httpsCallable } from 'firebase/functions'

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

// UI state
const isLoading = ref(false)
const error = ref(null)
const uploadProgress = ref({})
const showStatusModal = ref(false)

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
  const match = filename.match(/^(\d{12,14})(?:_\d{2}_\d{3})?/);
  return match ? match[1] : null;
}

const fetchDeezerMetadata = async (upc) => {
  try {
    // Use the deployed Cloud Function API
    const apiUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5001/stardust-distro/us-central1/api'
      : 'https://us-central1-stardust-distro.cloudfunctions.net/api';
    
    const response = await fetch(`${apiUrl}/deezer/album/${upc}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Deezer API error for UPC ${upc}:`, errorData);
      throw new Error(`Failed to fetch from Deezer: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.album) {
      console.warn(`Album not found on Deezer for UPC: ${upc}`);
      return null;
    }
    
    const album = data.album;
    console.log(`Found album: ${album.title} by ${album.artist.name}`);
    
    // The album already includes tracks in the response!
    const tracks = album.tracks?.data || [];
    
    // Fetch ISRCs for tracks if needed (Deezer doesn't always include them in album response)
    const trackIds = tracks.map(t => t.id);
    let isrcMap = {};
    
    if (trackIds.length > 0) {
      try {
        const isrcResponse = await fetch(`${apiUrl}/deezer/tracks/batch-isrc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ trackIds })
        });
        
        if (isrcResponse.ok) {
          const isrcData = await isrcResponse.json();
          if (isrcData.tracks) {
            isrcData.tracks.forEach(t => {
              isrcMap[t.id] = t.isrc;
            });
          }
        }
      } catch (error) {
        console.warn('Could not fetch ISRCs:', error);
        // Continue without ISRCs
      }
    }
    
    // Build release data from Deezer metadata
    return {
      upc: upc,
      title: album.title,
      artist: album.artist?.name || 'Unknown Artist',
      label: album.label || '',
      releaseDate: album.release_date || new Date().toISOString().split('T')[0],
      genre: album.genres?.data?.[0]?.name || '',
      coverUrl: album.cover_xl || album.cover_big || album.cover_medium || album.cover,
      duration: album.duration || 0,
      tracks: tracks.map((track, index) => ({
        trackNumber: index + 1, // Deezer doesn't provide track number in this response
        discNumber: 1, // Default to disc 1
        title: track.title || `Track ${index + 1}`,
        artist: track.artist?.name || album.artist?.name || 'Unknown Artist',
        isrc: isrcMap[track.id] || '',
        duration: track.duration || 0,
        preview: track.preview || null
      }))
    };
    
  } catch (error) {
    console.error(`Error fetching Deezer metadata for UPC ${upc}:`, error);
    return null;
  }
}

const processMetadatalessUpload = async () => {
  fetchingMetadata.value = true;
  error.value = null;
  deezerMetadata.value = {};
  metadataFetchProgress.value = {};
  
  try {
    // Extract unique UPCs from uploaded files
    const upcs = new Set();
    
    uploadedFiles.value.audio.forEach(file => {
      const upc = extractUPCFromFilename(file.name);
      if (upc) upcs.add(upc);
    });
    
    uploadedFiles.value.images.forEach(file => {
      const upc = extractUPCFromFilename(file.name);
      if (upc) upcs.add(upc);
    });
    
    if (upcs.size === 0) {
      error.value = 'No valid UPCs found in uploaded files. Files must follow DDEX naming convention.';
      return;
    }
    
    // Fetch metadata for each UPC
    const upcArray = Array.from(upcs);
    let successCount = 0;
    
    for (let i = 0; i < upcArray.length; i++) {
      const upc = upcArray[i];
      metadataFetchProgress.value = {
        current: i + 1,
        total: upcArray.length,
        upc: upc
      };
      
      const metadata = await fetchDeezerMetadata(upc);
      
      if (metadata) {
        deezerMetadata.value[upc] = metadata;
        successCount++;
      } else {
        console.warn(`Could not fetch metadata for UPC: ${upc}`);
      }
      
      // Add a small delay to avoid rate limiting
      if (i < upcArray.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (successCount === 0) {
      error.value = 'Could not fetch metadata for any of the uploaded files from Deezer.';
      return;
    }
    
    // Transform Deezer metadata to match our standard format
    const releases = Object.values(deezerMetadata.value);
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
        isrc: track.isrc,
        duration: track.duration
      }))
    );
    
    // Update import job
    if (!importJob.value) {
      importJob.value = await importService.createImportJob(user.value.uid, {
        mode: 'metadata-less',
        upcCount: upcs.size,
        successfulFetches: successCount
      });
    }
    
    await importService.updateImportJob(importJob.value.id, {
      deezerMetadata: deezerMetadata.value,
      parsedReleases: releases,
      status: 'metadata_fetched'
    });
    
    // Move to next step
    currentStep.value = 2;
    
  } catch (err) {
    console.error('Error processing metadata-less upload:', err);
    error.value = err.message;
  } finally {
    fetchingMetadata.value = false;
    metadataFetchProgress.value = {};
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
  isLoading.value = true
  error.value = null

  try {
    // Validate DDEX naming
    const validatedFiles = []
    const errors = []

    for (const file of files) {
      const validation = validateDDEXNaming(file.name, type)
      if (validation.valid) {
        validatedFiles.push({
          file,
          ...validation
        })
      } else {
        errors.push(`${file.name}: ${validation.error}`)
      }
    }

    if (errors.length > 0) {
      error.value = `Invalid file names:\n${errors.join('\n')}`
      if (validatedFiles.length === 0) {
        return
      }
    }

    // Upload validated files
    const uploaded = await importService.uploadBatchFiles(
      validatedFiles,
      user.value.uid,
      importJob.value?.id,
      (progress) => {
        uploadProgress.value = progress
      }
    )

    uploadedFiles.value[type].push(...uploaded)

    // Update import job if exists
    if (importJob.value) {
      await importService.updateImportJob(importJob.value.id, {
        uploadedFiles: uploadedFiles.value,
        status: 'files_uploading'
      })
    }

    // In metadata-less mode, process after files are uploaded
    if (isMetadatalessMode.value && currentStep.value === 1) {
      await processMetadatalessUpload()
    }

  } catch (err) {
    console.error('Upload error:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
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
    const match = fileName.match(/^(\d{12,14})_(\d{2})_(\d{3})\.(?:wav|flac|mp3)$/i)
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
      error: 'Audio files must be named: UPC_DiscNumber_TrackNumber.wav (e.g., 123456789012_01_001.wav)'
    }
  }

  return { valid: false, error: 'Unknown file type' }
}

// Step 3: Automatic Matching
const performMatching = async () => {
  isLoading.value = true
  error.value = null

  try {
    const releases = isMetadatalessMode.value 
      ? Object.values(deezerMetadata.value)
      : groupIntoReleases(parsedData.value)
      
    const results = {
      matched: [],
      incomplete: [],
      errors: []
    }

    for (const release of releases) {
      const matchResult = await matchReleaseWithFiles(release)
      
      if (matchResult.complete) {
        results.matched.push(matchResult)
      } else if (matchResult.hasPartialData) {
        results.incomplete.push(matchResult)
      } else {
        results.errors.push({
          release,
          error: matchResult.error || 'No matching files found'
        })
      }
    }

    matchingResults.value = results

    // Update import job
    if (importJob.value) {
      await importService.updateImportJob(importJob.value.id, {
        matchingResults: results,
        status: 'matching_complete'
      })
    }

    // Auto-create draft releases for matched items
    if (results.matched.length > 0) {
      await createDraftReleases(results.matched)
    }

  } catch (err) {
    console.error('Matching error:', err)
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
    }
  }

  // Find cover image
  const coverImage = uploadedFiles.value.images.find(img => 
    img.upc === upc && img.imageType === 'cover'
  )
  if (coverImage) {
    result.matchedFiles.coverImage = coverImage
    result.hasPartialData = true
  }

  // Find additional images
  const additionalImages = uploadedFiles.value.images.filter(img => 
    img.upc === upc && img.imageType !== 'cover'
  )
  result.matchedFiles.additionalImages = additionalImages

  // Match audio tracks
  for (const track of release.tracks) {
    const audioFile = uploadedFiles.value.audio.find(audio => 
      audio.upc === upc &&
      audio.discNumber === track.discNumber &&
      audio.trackNumber === track.trackNumber
    )
    
    if (audioFile) {
      result.matchedFiles.audioTracks.push({
        ...track,
        audioFile
      })
      result.hasPartialData = true
    } else {
      result.matchedFiles.audioTracks.push({
        ...track,
        audioFile: null,
        missing: true
      })
    }
  }

  // Check if complete
  const hasAllAudio = result.matchedFiles.audioTracks.every(t => !t.missing)
  result.complete = result.matchedFiles.coverImage && hasAllAudio

  return result
}

const createDraftReleases = async (matchedReleases) => {
  const created = []
  
  for (const match of matchedReleases) {
    try {
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
          isrc: track.isrc || '',
          duration: track.duration || 0,
          audio: track.audioFile ? {
            url: track.audioFile.url,
            format: track.audioFile.format
          } : null
        })),
        assets: {
          coverImage: match.matchedFiles.coverImage ? {
            url: match.matchedFiles.coverImage.url,
            name: match.matchedFiles.coverImage.name
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
          importMode: isMetadatalessMode.value ? 'metadata-less' : 'standard'
        },
        territories: {
          mode: 'worldwide',
          included: [],
          excluded: []
        },
        importJobId: importJob.value?.id,
        importedAt: new Date().toISOString()
      }

      const newRelease = await createRelease(releaseData)
      created.push(newRelease)
    } catch (err) {
      console.error(`Failed to create release for ${match.release.upc}:`, err)
      matchingResults.value.errors.push({
        release: match.release,
        error: err.message
      })
    }
  }

  if (created.length > 0 && importJob.value) {
    await importService.updateImportJob(importJob.value.id, {
      createdReleases: created.map(r => r.id),
      status: 'completed'
    })
  }

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
}

// Load existing import state
const loadImportState = async (job) => {
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
  // Check for any active import jobs on mount
  if (importJob.value) {
    loadImportState(importJob.value)
  }
})
</script>

<template>
  <div class="migration">
    <div class="container">
      <!-- Header -->
      <div class="migration-header">
        <div>
          <h1 class="page-title">Catalog Migration</h1>
          <p class="page-subtitle">
            {{ isMetadatalessMode ? 'Import catalog using Deezer metadata' : 'Import your existing catalog in three easy steps' }}
          </p>
        </div>
        <div class="header-actions">
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
            :class="{ 'active': isMetadatalessMode }"
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
      <div v-if="isMetadatalessMode" class="mode-indicator">
        <font-awesome-icon icon="info-circle" />
        <p>
          <strong>Metadata-less Mode:</strong> Upload DDEX-compliant files and we'll fetch metadata from Deezer automatically.
          Files must use DDEX naming: <code>UPC_DD_TTT.wav</code> for audio, <code>UPC.jpg</code> for covers.
        </p>
      </div>

      <!-- Progress -->
      <div class="migration-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${(currentStep / maxSteps) * 100}%` }"
          ></div>
        </div>
        <div class="progress-steps">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="progress-step"
            :class="{ 
              active: currentStep === index + 1,
              completed: currentStep > index + 1
            }"
          >
            <div class="step-number">
              <font-awesome-icon v-if="currentStep > index + 1" icon="check" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="step-title">{{ step }}</span>
          </div>
        </div>
      </div>

      <!-- Import Stats -->
      <div v-if="importJob || Object.keys(deezerMetadata).length > 0" class="import-stats">
        <div class="stat-card">
          <div class="stat-value">{{ importStats.totalReleases }}</div>
          <div class="stat-label">Total Releases</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ importStats.totalTracks }}</div>
          <div class="stat-label">Total Tracks</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-success">{{ importStats.matchedReleases }}</div>
          <div class="stat-label">Matched</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-warning">{{ importStats.incompleteReleases }}</div>
          <div class="stat-label">Incomplete</div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="error-banner">
        <font-awesome-icon icon="exclamation-triangle" />
        <pre>{{ error }}</pre>
      </div>

      <!-- Step Content -->
      <div class="migration-content card">
        <!-- Step 1: CSV Import (Standard Mode) or File Upload (Metadata-less Mode) -->
        <div v-if="currentStep === 1" class="step-content">
          <!-- Standard Mode: CSV Import -->
          <template v-if="!isMetadatalessMode">
            <div class="card-header">
              <h2>Step 1: Import Catalog Metadata</h2>
            </div>
            <div class="card-body">
              <div class="upload-section">
                <p class="step-description">
                  Upload a CSV file containing your catalog metadata. The file should include release information and track details.
                </p>
                
                <button @click="downloadSampleCSV" class="btn btn-secondary btn-sm mb-lg">
                  <font-awesome-icon icon="download" />
                  Download Sample CSV
                </button>

                <div v-if="!csvFile" class="csv-upload-area">
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

                <div v-else class="csv-info">
                  <div class="file-card">
                    <font-awesome-icon icon="file-csv" class="file-icon" />
                    <div class="file-details">
                      <h4>{{ csvFile.name }}</h4>
                      <p>{{ parsedData.length }} rows parsed</p>
                    </div>
                    <button @click="csvFile = null; parsedData = []" class="btn-icon">
                      <font-awesome-icon icon="times" />
                    </button>
                  </div>

                  <!-- Field Mapping -->
                  <div v-if="csvHeaders.length > 0" class="field-mapping">
                    <h3>Map CSV Fields</h3>
                    <p class="mapping-description">
                      Match your CSV columns to the required fields. Required fields are marked with *.
                    </p>
                    
                    <div class="mapping-grid">
                      <div 
                        v-for="field in requiredFields" 
                        :key="field.key"
                        class="mapping-row"
                        :class="{ required: field.required }"
                      >
                        <label class="mapping-label">
                          {{ field.label }}
                          <span v-if="field.required" class="required-mark">*</span>
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
            <div class="card-footer">
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
              <h2>Step 1: Upload DDEX-Compliant Files</h2>
            </div>
            <div class="card-body">
              <div class="file-requirements">
                <h3>File Naming Requirements</h3>
                <div class="requirement-grid">
                  <div class="requirement-card">
                    <font-awesome-icon icon="image" class="requirement-icon" />
                    <h4>Cover Images</h4>
                    <code>UPC.jpg</code>
                    <p>Example: 669158552979.jpg</p>
                  </div>
                  <div class="requirement-card">
                    <font-awesome-icon icon="images" class="requirement-icon" />
                    <h4>Additional Images</h4>
                    <code>UPC_XX.jpg</code>
                    <p>Example: 669158552979_02.jpg</p>
                  </div>
                  <div class="requirement-card">
                    <font-awesome-icon icon="music" class="requirement-icon" />
                    <h4>Audio Files</h4>
                    <code>UPC_DD_TTT.wav</code>
                    <p>Example: 669158552979_01_001.wav</p>
                    <small>DD = Disc Number (01), TTT = Track Number (001)</small>
                  </div>
                </div>
              </div>

              <div class="upload-sections">
                <!-- Audio Upload -->
                <div class="upload-section">
                  <h3>Audio Files</h3>
                  <div class="upload-area">
                    <label class="upload-label">
                      <input 
                        type="file" 
                        accept="audio/*"
                        multiple
                        @change="handleAudioUpload"
                        style="display: none"
                      />
                      <font-awesome-icon icon="music" class="upload-icon" />
                      <p>Upload audio files (WAV, FLAC, MP3)</p>
                      <span class="btn btn-primary">Choose Audio Files</span>
                    </label>
                  </div>
                  
                  <div v-if="uploadedFiles.audio.length > 0" class="uploaded-list">
                    <h4>Uploaded Audio ({{ uploadedFiles.audio.length }})</h4>
                    <div class="file-grid">
                      <div 
                        v-for="file in uploadedFiles.audio.slice(0, 10)" 
                        :key="file.name"
                        class="file-item"
                      >
                        <font-awesome-icon icon="music" />
                        <span>{{ file.name }}</span>
                      </div>
                      <div v-if="uploadedFiles.audio.length > 10" class="file-item more">
                        +{{ uploadedFiles.audio.length - 10 }} more
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Image Upload -->
                <div class="upload-section">
                  <h3>Cover Images</h3>
                  <div class="upload-area">
                    <label class="upload-label">
                      <input 
                        type="file" 
                        accept="image/*"
                        multiple
                        @change="handleImageUpload"
                        style="display: none"
                      />
                      <font-awesome-icon icon="image" class="upload-icon" />
                      <p>Upload cover images (JPG, PNG)</p>
                      <span class="btn btn-primary">Choose Images</span>
                    </label>
                  </div>
                  
                  <div v-if="uploadedFiles.images.length > 0" class="uploaded-list">
                    <h4>Uploaded Images ({{ uploadedFiles.images.length }})</h4>
                    <div class="file-grid">
                      <div 
                        v-for="file in uploadedFiles.images.slice(0, 10)" 
                        :key="file.name"
                        class="file-item"
                      >
                        <font-awesome-icon icon="image" />
                        <span>{{ file.name }}</span>
                      </div>
                      <div v-if="uploadedFiles.images.length > 10" class="file-item more">
                        +{{ uploadedFiles.images.length - 10 }} more
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Upload Progress -->
              <div v-if="Object.keys(uploadProgress).length > 0" class="upload-progress-section">
                <h4>Upload Progress</h4>
                <div 
                  v-for="(progress, file) in uploadProgress" 
                  :key="file"
                  class="progress-item"
                >
                  <span>{{ file }}</span>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
                  </div>
                </div>
              </div>

              <!-- Metadata Fetch Progress -->
              <div v-if="fetchingMetadata" class="metadata-fetch-progress">
                <h4>Fetching Metadata from Deezer</h4>
                <div class="progress-info">
                  <font-awesome-icon icon="spinner" spin />
                  <span v-if="metadataFetchProgress.upc">
                    Processing UPC {{ metadataFetchProgress.upc }}
                    ({{ metadataFetchProgress.current }} of {{ metadataFetchProgress.total }})
                  </span>
                  <span v-else>Initializing...</span>
                </div>
              </div>

              <!-- Fetched Metadata Display -->
              <div v-if="Object.keys(deezerMetadata).length > 0" class="fetched-metadata">
                <h3>Fetched Metadata</h3>
                <div class="metadata-grid">
                  <div v-for="(metadata, upc) in deezerMetadata" :key="upc" class="metadata-card">
                    <div class="metadata-header">
                      <strong>{{ metadata.title }}</strong>
                      <span class="upc-badge">{{ upc }}</span>
                    </div>
                    <p>{{ metadata.artist }}</p>
                    <p class="track-count">{{ metadata.tracks.length }} tracks</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div></div>
              <div v-if="!fetchingMetadata && Object.keys(deezerMetadata).length === 0">
                <p class="footer-hint">Upload files to fetch metadata from Deezer</p>
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
          <div class="card-header">
            <h2>Step 2: Upload Audio & Image Files</h2>
          </div>
          <div class="card-body">
            <div class="file-requirements">
              <h3>File Naming Requirements</h3>
              <div class="requirement-grid">
                <div class="requirement-card">
                  <font-awesome-icon icon="image" class="requirement-icon" />
                  <h4>Cover Images</h4>
                  <code>UPC.jpg</code>
                  <p>Example: 123456789012.jpg</p>
                </div>
                <div class="requirement-card">
                  <font-awesome-icon icon="images" class="requirement-icon" />
                  <h4>Additional Images</h4>
                  <code>UPC_XX.jpg</code>
                  <p>Example: 123456789012_02.jpg</p>
                </div>
                <div class="requirement-card">
                  <font-awesome-icon icon="music" class="requirement-icon" />
                  <h4>Audio Files</h4>
                  <code>UPC_DD_TTT.wav</code>
                  <p>Example: 123456789012_01_001.wav</p>
                  <small>DD = Disc Number (01), TTT = Track Number (001)</small>
                </div>
              </div>
            </div>

            <div class="upload-sections">
              <!-- Audio Upload -->
              <div class="upload-section">
                <h3>Audio Files</h3>
                <div class="upload-area">
                  <label class="upload-label">
                    <input 
                      type="file" 
                      accept="audio/*"
                      multiple
                      @change="handleAudioUpload"
                      style="display: none"
                    />
                    <font-awesome-icon icon="music" class="upload-icon" />
                    <p>Upload audio files (WAV, FLAC, MP3)</p>
                    <span class="btn btn-primary">Choose Audio Files</span>
                  </label>
                </div>
                
                <div v-if="uploadedFiles.audio.length > 0" class="uploaded-list">
                  <h4>Uploaded Audio ({{ uploadedFiles.audio.length }})</h4>
                  <div class="file-grid">
                    <div 
                      v-for="file in uploadedFiles.audio.slice(0, 10)" 
                      :key="file.name"
                      class="file-item"
                    >
                      <font-awesome-icon icon="music" />
                      <span>{{ file.name }}</span>
                    </div>
                    <div v-if="uploadedFiles.audio.length > 10" class="file-item more">
                      +{{ uploadedFiles.audio.length - 10 }} more
                    </div>
                  </div>
                </div>
              </div>

              <!-- Image Upload -->
              <div class="upload-section">
                <h3>Cover Images</h3>
                <div class="upload-area">
                  <label class="upload-label">
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      @change="handleImageUpload"
                      style="display: none"
                    />
                    <font-awesome-icon icon="image" class="upload-icon" />
                    <p>Upload cover images (JPG, PNG)</p>
                    <span class="btn btn-primary">Choose Images</span>
                  </label>
                </div>
                
                <div v-if="uploadedFiles.images.length > 0" class="uploaded-list">
                  <h4>Uploaded Images ({{ uploadedFiles.images.length }})</h4>
                  <div class="file-grid">
                    <div 
                      v-for="file in uploadedFiles.images.slice(0, 10)" 
                      :key="file.name"
                      class="file-item"
                    >
                      <font-awesome-icon icon="image" />
                      <span>{{ file.name }}</span>
                    </div>
                    <div v-if="uploadedFiles.images.length > 10" class="file-item more">
                      +{{ uploadedFiles.images.length - 10 }} more
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Upload Progress -->
            <div v-if="Object.keys(uploadProgress).length > 0" class="upload-progress-section">
              <h4>Upload Progress</h4>
              <div 
                v-for="(progress, file) in uploadProgress" 
                :key="file"
                class="progress-item"
              >
                <span>{{ file }}</span>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button @click="previousStep" class="btn btn-secondary">
              <font-awesome-icon icon="arrow-left" />
              Previous
            </button>
            <button 
              @click="performMatching" 
              class="btn btn-primary"
              :disabled="!canProceedStep2 || isLoading"
            >
              <font-awesome-icon v-if="isLoading" icon="spinner" spin />
              <span v-else>Match Files & Create Releases</span>
              <font-awesome-icon v-if="!isLoading" icon="arrow-right" />
            </button>
          </div>
        </div>

        <!-- Step 3 (Standard) or Step 2 (Metadata-less): Matching Results -->
        <div v-if="(currentStep === 3 && !isMetadatalessMode) || (currentStep === 2 && isMetadatalessMode)" class="step-content">
          <div class="card-header">
            <h2>{{ isMetadatalessMode ? 'Step 2' : 'Step 3' }}: Import Results</h2>
          </div>
          <div class="card-body">
            <div class="results-summary">
              <div class="result-card success" v-if="matchingResults.matched.length > 0">
                <font-awesome-icon icon="check-circle" class="result-icon" />
                <h3>Successfully Matched</h3>
                <p class="result-count">{{ matchingResults.matched.length }} releases</p>
                <p class="result-description">
                  These releases have been created as drafts in your catalog.
                </p>
                <button @click="navigateToCatalog" class="btn btn-success">
                  View in Catalog
                </button>
              </div>

              <div class="result-card warning" v-if="matchingResults.incomplete.length > 0">
                <font-awesome-icon icon="exclamation-triangle" class="result-icon" />
                <h3>Incomplete Releases</h3>
                <p class="result-count">{{ matchingResults.incomplete.length }} releases</p>
                <p class="result-description">
                  These releases are missing some files. You can complete them later.
                </p>
                <button @click="viewIncomplete" class="btn btn-secondary">
                  View Details
                </button>
              </div>

              <div class="result-card error" v-if="matchingResults.errors.length > 0">
                <font-awesome-icon icon="times-circle" class="result-icon" />
                <h3>Failed Matches</h3>
                <p class="result-count">{{ matchingResults.errors.length }} releases</p>
                <p class="result-description">
                  These releases couldn't be matched with uploaded files.
                </p>
                <div class="error-list">
                  <div v-for="error in matchingResults.errors.slice(0, 5)" :key="error.release.upc" class="error-item">
                    <strong>{{ error.release.title }}</strong> ({{ error.release.upc }})
                    <span>{{ error.error }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detailed Results Table -->
            <div v-if="matchingResults.matched.length > 0" class="results-table">
              <h3>Created Releases</h3>
              <table class="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>UPC</th>
                    <th>Tracks</th>
                    <th>Status</th>
                    <th v-if="isMetadatalessMode">Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="match in matchingResults.matched" :key="match.release.upc">
                    <td>{{ match.release.title }}</td>
                    <td>{{ match.release.artist }}</td>
                    <td>{{ match.release.upc }}</td>
                    <td>{{ match.release.tracks.length }}</td>
                    <td>
                      <span class="badge badge-success">Draft Created</span>
                    </td>
                    <td v-if="isMetadatalessMode">
                      <span class="badge badge-info">Deezer</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer">
            <button @click="previousStep" class="btn btn-secondary">
              <font-awesome-icon icon="arrow-left" />
              Back
            </button>
            <div class="footer-actions">
              <button @click="resetImport" class="btn btn-secondary">
                Import More
              </button>
              <button @click="navigateToCatalog" class="btn btn-primary">
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
.migration {
  padding: var(--space-xl) 0;
  min-height: calc(100vh - 64px);
}

.migration-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

.page-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  gap: var(--space-md);
}

/* Mode Indicator */
.mode-indicator {
  background-color: var(--color-info);
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.1), rgba(66, 133, 244, 0.05));
  border: 1px solid var(--color-info);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  margin-bottom: var(--space-xl);
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
}

.mode-indicator p {
  flex: 1;
  margin: 0;
  color: var(--color-text);
}

.mode-indicator code {
  background-color: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

/* Toggle Button Active State */
.btn.active {
  background-color: var(--color-primary);
  color: white;
}

.btn.active:hover {
  background-color: var(--color-primary-hover);
  color: white;
}

/* Progress */
.migration-progress {
  margin-bottom: var(--space-xl);
}

.progress-bar {
  height: 4px;
  background-color: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-lg);
}

.progress-fill {
  height: 100%;
  background-color: var(--color-primary);
  transition: width var(--transition-base);
}

.progress-steps {
  display: flex;
  justify-content: space-between;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

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

.step-title {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
}

/* Import Stats */
.import-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.stat-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  text-align: center;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-heading);
  margin-bottom: var(--space-xs);
}

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
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  color: var(--color-error);
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.error-banner pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
}

/* Step Content */
.step-content {
  min-height: 400px;
}

.step-description {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

/* CSV Upload */
.csv-upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3xl);
  text-align: center;
  background-color: var(--color-bg-secondary);
  transition: all var(--transition-base);
}

.csv-upload-area:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
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

.file-card {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-xl);
}

.file-icon {
  font-size: 2rem;
  color: var(--color-primary);
}

.file-details {
  flex: 1;
}

.file-details h4 {
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-xs);
}

.file-details p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

/* Field Mapping */
.field-mapping {
  background-color: var(--color-bg-secondary);
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
}

.field-mapping h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
}

.mapping-description {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.mapping-grid {
  display: grid;
  gap: var(--space-md);
}

.mapping-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--space-lg);
  align-items: center;
}

.mapping-row.required .mapping-label {
  font-weight: var(--font-medium);
}

.mapping-label {
  color: var(--color-text);
}

.required-mark {
  color: var(--color-error);
  margin-left: var(--space-xs);
}

/* File Requirements */
.file-requirements {
  margin-bottom: var(--space-xl);
}

.file-requirements h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-lg);
}

.requirement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-lg);
}

.requirement-card {
  background-color: var(--color-bg-secondary);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  text-align: center;
}

.requirement-icon {
  font-size: 2rem;
  color: var(--color-primary);
  margin-bottom: var(--space-md);
}

.requirement-card h4 {
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-sm);
}

.requirement-card code {
  display: block;
  padding: var(--space-sm);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  margin: var(--space-sm) 0;
  font-family: var(--font-mono);
  color: var(--color-primary);
}

.requirement-card p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.requirement-card small {
  display: block;
  margin-top: var(--space-xs);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

/* Upload Sections */
.upload-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-xl);
}

.upload-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
}

.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  text-align: center;
  background-color: var(--color-bg-secondary);
  transition: all var(--transition-base);
  margin-bottom: var(--space-lg);
}

.upload-area:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}

/* Uploaded Files List */
.uploaded-list h4 {
  font-weight: var(--font-medium);
  margin-bottom: var(--space-md);
  color: var(--color-text-secondary);
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-sm);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-item.more {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

/* Upload Progress */
.upload-progress-section {
  margin-top: var(--space-xl);
  padding: var(--space-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.upload-progress-section h4 {
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
}

.progress-item {
  margin-bottom: var(--space-md);
}

.progress-item span {
  display: block;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

/* Metadata Fetch Progress */
.metadata-fetch-progress {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  margin-top: var(--space-xl);
  text-align: center;
}

.metadata-fetch-progress h4 {
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-lg);
}

.progress-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  font-size: var(--text-lg);
  color: var(--color-primary);
}

/* Fetched Metadata Display */
.fetched-metadata {
  margin-top: var(--space-xl);
  padding: var(--space-xl);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.fetched-metadata h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-lg);
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-md);
}

.metadata-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}

.metadata-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.metadata-header strong {
  font-weight: var(--font-semibold);
}

.upc-badge {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
}

.metadata-card p {
  margin: var(--space-xs) 0;
  color: var(--color-text-secondary);
}

.track-count {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Results */
.results-summary {
  display: grid;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.result-card {
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  text-align: center;
}

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

.result-icon {
  font-size: 3rem;
  margin-bottom: var(--space-md);
}

.result-card.success .result-icon {
  color: var(--color-success);
}

.result-card.warning .result-icon {
  color: var(--color-warning);
}

.result-card.error .result-icon {
  color: var(--color-error);
}

.result-card h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-sm);
}

.result-count {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-sm);
}

.result-description {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.error-list {
  text-align: left;
  max-height: 200px;
  overflow-y: auto;
  margin-top: var(--space-md);
}

.error-item {
  padding: var(--space-sm);
  background-color: white;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-sm);
  font-size: var(--text-sm);
}

.error-item strong {
  display: block;
  margin-bottom: var(--space-xs);
}

.error-item span {
  color: var(--color-text-secondary);
}

/* Results Table */
.results-table {
  margin-top: var(--space-xl);
}

.results-table h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-md);
}

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

/* Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-top: 1px solid var(--color-border);
}

.footer-actions {
  display: flex;
  gap: var(--space-md);
}

.footer-hint {
  color: var(--color-text-secondary);
  font-style: italic;
  margin: 0;
}

/* Utilities */
.mb-lg {
  margin-bottom: var(--space-lg);
}

.text-success {
  color: var(--color-success);
}

.text-warning {
  color: var(--color-warning);
}

.text-error {
  color: var(--color-error);
}

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

/* Responsive */
@media (max-width: 768px) {
  .migration-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    flex-direction: column;
  }
  
  .mapping-row {
    grid-template-columns: 1fr;
  }
  
  .requirement-grid,
  .upload-sections {
    grid-template-columns: 1fr;
  }
  
  .progress-steps {
    flex-direction: column;
    gap: var(--space-lg);
  }
  
  .mode-indicator {
    flex-direction: column;
  }
  
  .metadata-grid {
    grid-template-columns: 1fr;
  }
}
</style>