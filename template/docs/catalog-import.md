# Catalog Import & Migration Guide 📦

Complete guide for importing your existing catalog into Stardust Distro using our comprehensive dual-mode import system.

## Table of Contents
1. [Import Modes Overview](#import-modes-overview)
2. [Standard Mode (CSV + Files)](#standard-mode-csv--files)
3. [Metadata-less Mode (Files Only)](#metadata-less-mode-files-only)
4. [CSV Format Specification](#csv-format-specification)
5. [File Naming Requirements](#file-naming-requirements)
6. [Import Process Details](#import-process-details)
7. [Import Job Management](#import-job-management)
8. [Matching System](#matching-system)
9. [Advanced Features](#advanced-features)
10. [Troubleshooting](#troubleshooting)

---

## Import Modes Overview

Stardust Distro offers two powerful import modes accessible via the Migration interface:

| Mode | Steps | Requirements | Use Case |
|------|-------|--------------|----------|
| **Standard Mode** | 3 steps | CSV + Audio + Images | When you have complete metadata in spreadsheet format |
| **Metadata-less Mode** | 2 steps | DDEX-named audio files only | When you only have audio files but they follow DDEX naming |

### Mode Toggle
Switch between modes using the "Metadata-less" button in the Migration header. The interface dynamically adjusts steps and requirements based on the selected mode.

---

## Standard Mode (CSV + Files)

### Three-Step Workflow

#### Step 1: Import Catalog Metadata
Upload and map your CSV file containing release and track information.

#### Step 2: Upload Files  
Batch upload audio files and cover images with DDEX-compliant naming.

#### Step 3: Match & Create
System automatically matches files to metadata and creates draft releases.

### CSV Import Features

#### Automatic Field Detection
The system intelligently detects common column name variations:
- Title: `title`, `release_title`, `album_title`, `name`
- Artist: `artist`, `display_artist`, `album_artist`, `performer`
- UPC: `upc`, `barcode`, `ean`, `gtin`
- Track Title: `track_title`, `song_title`, `track_name`
- Track Number: `track_number`, `track_no`, `track_#`, `sequence`

#### Field Mapping Interface
- Visual mapping grid showing CSV headers and target fields
- Required fields marked with asterisk (*)
- Auto-populated suggestions based on column names
- Dropdown selectors for each field mapping
- Validation before proceeding

#### CSV Validation
- Required field checking
- UPC format validation (12-14 digits)
- Date format validation (YYYY-MM-DD)
- Row count and parsing confirmation
- Error reporting with specific row numbers

### File Upload System

#### Audio Upload Area
- Drag-and-drop zone or click to browse
- Multiple file selection supported
- Accepts WAV, FLAC, MP3 formats
- Real-time DDEX naming validation
- Individual file upload progress bars
- Shows uploaded count and file names

#### Image Upload Area  
- Separate zone for cover and additional images
- Supports JPG, PNG formats
- Validates image dimensions
- Shows thumbnail previews after upload
- Tracks cover vs additional images

---

## Metadata-less Mode (Files Only)

### Revolutionary Two-Step Process

#### Step 1: Upload DDEX-Compliant Files
Upload audio files (and optionally images) that follow DDEX naming convention.

#### Step 2: Automatic Metadata & Match
System extracts UPCs, fetches metadata from Deezer, and creates complete releases.

### Deezer Integration Details

#### Metadata Fetching Process
1. **UPC Extraction**
   - Parses filenames for UPC patterns
   - Groups files by unique UPC
   - Shows count of unique releases found

2. **API Query Sequence**
   - Queries Deezer API by UPC
   - Shows real-time progress: "Fetching metadata for UPC {upc}..."
   - Implements 500ms rate limiting between calls
   - Handles API failures gracefully

3. **Data Retrieved**
   - Album: Title, artist, label, release date, genre
   - Tracks: Title, artist, ISRC, duration, track number
   - Cover art: Multiple resolutions available
   - Additional: Track count, album duration

#### Cover Art Management

##### Intelligent Detection
- Checks if user uploaded cover for each UPC
- Identifies releases needing artwork
- Counts total artwork requirements

##### User Confirmation Dialog
When Deezer artwork is available:
- Modal shows preview grid of available covers
- Lists number of releases needing artwork
- Radio button choices:
  - "Use Deezer artwork for releases without covers"
  - "Continue without cover art (not recommended)"
- Artwork quality indicator (XL = 1000x1000px)

##### Download Process
- Downloads from Deezer CDN
- Stores in Firebase Storage: `imports/{userId}/{importJobId}/deezer-artwork/{UPC}-xl.jpg`
- Adds source metadata tag
- Shows download progress
- Integrates with matching system

### Visual Progress Indicators

#### Metadata Fetch Card
- Spinner icon with "Fetching Metadata from Deezer" header
- Current status text
- Progress details showing:
  - Current UPC being processed
  - X of Y releases processed
  - Progress bar

#### Fetched Metadata Display
After successful fetch:
- Success icon with count of retrieved releases
- Card for each release showing:
  - Album cover thumbnail (if available)
  - Title and artist
  - UPC and track count
  - Track list preview (first 3 tracks)
  - Cover art source indicator

---

## CSV Format Specification

### Required Columns

| Column | Field Type | Format | Example | Notes |
|--------|------------|--------|---------|-------|
| title | Release | Text | "Summer Album" | Album/Release title |
| artist | Release | Text | "Beach Band" | Primary artist |
| upc | Release | 12-14 digits | "123456789012" | No spaces or dashes |
| releaseDate | Release | YYYY-MM-DD | "2024-06-01" | ISO date format |
| trackTitle | Track | Text | "Sunset Dreams" | Song title |
| trackNumber | Track | Integer | 1 | Track sequence |
| trackArtist | Track | Text | "Beach Band" | Optional, defaults to release artist |
| isrc | Track | 12 chars | "USRC12400001" | Optional |
| discNumber | Track | Integer | 1 | Optional, defaults to 1 |
| duration | Track | Seconds | 215 | Optional |
| label | Release | Text | "Indie Records" | Optional |
| catalogNumber | Release | Text | "CAT001" | Optional |
| genre | Release | Text | "Pop" | Optional |

### Multi-Row Format
Each track is a separate row with release information repeated:

```csv
title,artist,upc,releaseDate,trackTitle,trackNumber
"Album","Artist","123456789012","2024-01-01","Track 1",1
"Album","Artist","123456789012","2024-01-01","Track 2",2
```

### Sample CSV Download
Click "Download Sample CSV" button in Step 1 to get a properly formatted template.

---

## File Naming Requirements

### DDEX-Compliant Naming Convention

All files must follow DDEX standard naming to enable automatic matching:

#### Audio Files
```
Format: {UPC}_{DiscNumber}_{TrackNumber}.{extension}
Pattern: \d{12,14}_\d{2}_\d{3}\.(wav|flac|mp3)
Example: 669158552979_01_001.wav
```

Components:
- **UPC**: 12-14 digit barcode
- **DiscNumber**: Two digits (01, 02, etc.)
- **TrackNumber**: Three digits (001, 002, etc.)
- **Extension**: wav, flac, or mp3

#### Cover Images
```
Format: {UPC}.{extension}
Pattern: \d{12,14}\.(jpg|jpeg|png)
Example: 669158552979.jpg
```

#### Additional Images
```
Format: {UPC}_{ImageNumber}.{extension}
Pattern: \d{12,14}_\d{2}\.(jpg|jpeg|png)
Example: 669158552979_02.jpg
```

### Validation Messages

The system provides real-time validation feedback:
- ✅ Valid: "669158552979_01_001.wav - Valid (UPC: 669158552979)"
- ❌ Invalid: "Track 1.wav - Invalid: Audio files must be named: UPC_DiscNumber_TrackNumber.wav"

---

## Import Process Details

### Navigation & Setup

1. **Access Migration**
   - Go to Catalog view
   - Click "Import Catalog" button
   - Migration wizard opens

2. **Mode Selection**
   - Default: Standard Mode (3 steps)
   - Click "Metadata-less" to switch (2 steps)
   - Steps dynamically update

3. **Import Job Creation**
   - System creates import job on first action
   - Job ID generated and stored
   - Progress tracked in Firestore

### Standard Mode Detailed Steps

#### Step 1: Import Metadata

**CSV Upload**
- Drag-and-drop or click to browse
- File size shown after selection
- Parsing begins immediately
- Row count displayed

**Field Mapping**
- Headers extracted and displayed
- Auto-mapping attempts for common names
- Dropdown selectors for manual mapping
- Required fields validation
- "Validate & Continue" button enabled when ready

#### Step 2: Upload Files

**Upload Interface**
- Two distinct upload zones (Audio | Images)
- Drag-and-drop or multi-select
- File validation on selection
- Individual progress bars per file
- Running count of uploaded files

**Progress Tracking**
- Overall progress bar
- Individual file progress
- Current file indicator
- Upload speed optimization
- Error handling per file

#### Step 3: Match & Create

**Matching Process**
- "Perform Matching" triggers automatically
- Processes releases sequentially
- Real-time status updates
- Groups tracks by UPC and disc

**Results Display**
- Statistics cards:
  - Total Releases
  - Total Tracks  
  - Matched Releases
  - Incomplete Releases
- Detailed results table
- Color-coded status indicators

### Metadata-less Mode Detailed Steps

#### Step 1: Upload Files

**File Requirements Display**
- Three info cards showing naming patterns
- Audio files requirement (mandatory)
- Cover images (optional)
- Additional images (optional)

**Upload Process**
- Same upload interface as Standard Mode
- DDEX validation stricter
- No CSV field mapping needed
- "Process Metadata" button appears after upload

#### Step 2: Match & Create

**Processing Stages**
1. Extract UPCs from filenames
2. Fetch metadata from Deezer (with progress)
3. Handle cover art decisions
4. Match files to metadata
5. Create draft releases

**Auto-triggering**
- Matching begins automatically after metadata fetch
- No manual trigger needed
- Shows spinner during processing

---

## Import Job Management

### Job Persistence

#### Automatic Saving
- Job created on first action
- State saved after each step
- Files tracked in `uploadedFiles`
- Metadata stored in `parsedReleases`
- Matching results preserved

#### Resume Capability
- Detects active job on component mount
- Loads previous state automatically
- Maintains mode selection
- Restores upload progress
- Continues from last step

### Job States

| Status | Description | Next Action |
|--------|-------------|-------------|
| started | Job created | Continue with import |
| metadata_imported | CSV processed | Upload files |
| metadata_fetched | Deezer data retrieved | Process matching |
| files_uploading | Files being uploaded | Wait or continue |
| matching_complete | Matching finished | Review results |
| completed | Releases created | View in catalog |
| cancelled | User cancelled | Start new import |

### Job Operations

**Cancel Import**
- "Start Over" button in header
- Cancels current job
- Cleans up temporary files
- Resets all state

**View Status**
- Real-time statistics dashboard
- Shows current step progress
- Error messages displayed
- Incomplete items detailed

---

## Matching System

### Matching Algorithm

The system matches files to releases using:

1. **UPC Extraction**
   - From filename for audio/images
   - From CSV for metadata

2. **File Association**
   - Audio: Match by UPC + Disc + Track
   - Cover: Match by UPC (main image)
   - Additional: Match by UPC + number

3. **Completeness Check**
   - All tracks have audio files
   - Cover image present
   - Required metadata complete

### Match Results Categories

#### ✅ Complete Releases
- All audio files matched
- Cover image present
- Full metadata available
- → Creates draft releases automatically

#### ⚠️ Incomplete Releases  
- Some files matched
- Missing audio or images identified
- Partial metadata
- → Shows details in modal
- → Can complete manually later

#### ❌ Failed Matches
- No files matched
- Invalid naming
- Missing in Deezer (metadata-less mode)
- → Shows error details
- → Requires manual intervention

### MigrationStatus Component

Shows detailed view of incomplete releases:
- Release title and UPC
- Missing tracks listed
- Missing images identified
- Options to fix issues
- Direct edit links

---

## Advanced Features

### Import Statistics Dashboard

Real-time metrics displayed during import:
- **Total Releases**: Count from CSV or unique UPCs
- **Total Tracks**: Sum of all tracks
- **Matched Releases**: Successfully matched count
- **Incomplete Releases**: Partial matches count
- **Errors**: Failed items count

### Automatic Processing

#### Release Type Detection
```javascript
trackCount === 1 → "Single"
trackCount <= 6 → "EP"
trackCount > 6 → "Album"
```

#### Data Cleaning
- Trims whitespace
- Normalizes UPC format
- Validates dates
- Escapes special characters

#### Smart Defaults
- Copyright year: Current year
- Territory: Worldwide
- Language: English
- Status: Draft

### Error Recovery

#### Partial Success Handling
- Continues processing despite individual failures
- Logs errors for each item
- Creates releases for successful matches
- Reports failures separately

#### Network Resilience
- Retries failed API calls
- Handles timeout gracefully
- Saves progress frequently
- Can resume after connection loss

### File Upload Features

#### Batch Processing
- Select hundreds of files at once
- Parallel upload streams
- Optimized for large catalogs
- Progress per file

#### Validation Layers
1. File type checking
2. Naming convention validation  
3. Size limits enforcement
4. Duplicate detection

#### Upload Progress
- Individual file progress bars
- Overall batch progress
- Current file indicator
- Time remaining estimate

### Firestore Integration

#### Collections Used
- `importJobs`: Job tracking and state
- `releases`: Created draft releases
- `users`: User preferences

#### Security Rules
- User can only access own import jobs
- Files isolated by user ID
- Cleanup on job cancellation

---

## Troubleshooting

### Common Issues & Solutions

#### CSV Import Problems

**"CSV parsing failed"**
- Ensure UTF-8 encoding
- Check for comma delimiter
- Remove empty rows
- Verify headers present

**"Required column missing: [field]"**
- Check column exists in CSV
- Verify header spelling
- Map field manually if needed

**"Invalid UPC format"**
- Must be 12-14 digits
- Remove spaces/dashes
- Check for typos

#### File Upload Issues

**"Invalid file names"**
- Follow DDEX pattern exactly
- Use correct digit counts (2 for disc, 3 for track)
- Check file extensions

**"Upload failed"**
- Check internet connection
- Verify file size < 200MB
- Try smaller batches
- Clear browser cache

#### Metadata-less Mode Issues

**"No valid UPCs found in uploaded files"**
- Files must follow DDEX naming
- Check UPC is 12-14 digits
- Verify underscore placement

**"Could not fetch metadata from Deezer"**
- Release may not be in Deezer
- Check UPC is correct
- Internet connection required
- Try Standard Mode instead

**"Artwork download failed"**
- Temporary CDN issue
- Retry download
- Upload manually if persistent

#### Matching Problems

**"No matching files found"**
- Verify DDEX naming
- Check UPCs match between CSV and files
- Ensure files uploaded successfully

**"Incomplete release"**
- View details to see missing items
- Upload missing files
- Check track numbering

### Performance Optimization

#### For Large Imports
- Process in batches of 50-100 releases
- Use wired internet connection
- Close unnecessary browser tabs
- Use Chrome for best performance
- Import during off-peak hours

#### Upload Speed Tips
- Use FLAC over WAV (smaller size)
- Compress images to <10MB
- Upload audio and images separately
- Monitor progress bars

### Error Messages Guide

| Error | Cause | Solution |
|-------|-------|----------|
| "File too large" | File > 200MB | Compress or split file |
| "Invalid format" | Wrong file type | Use WAV/FLAC/MP3 for audio |
| "Duplicate UPC" | UPC already exists | Skip or update existing |
| "Network timeout" | Slow connection | Retry or check internet |
| "Session expired" | Logged out | Log in and resume |

---

## Best Practices

### Before Starting Import

#### Preparation Checklist
- [ ] Backup your original files
- [ ] Verify UPCs are correct
- [ ] Rename files to DDEX format
- [ ] Test with 5 releases first
- [ ] Check available storage space
- [ ] Ensure stable internet (for metadata-less)

### During Import

#### Recommended Workflow
1. Start with small test batch
2. Verify results before full import
3. Monitor progress actively
4. Don't close browser during upload
5. Review draft releases before publishing

### After Import

#### Post-Import Tasks
1. Review all draft releases
2. Complete any incomplete items
3. Add missing metadata
4. Verify audio quality
5. Check image dimensions
6. Update status to "Ready"
7. Schedule deliveries to DSPs

---

*Import System Version: 1.0.0 | Last Updated: August 2025*