# Catalog Import & Migration Guide 📦

Complete guide for importing your existing catalog and migrating from other platforms to Stardust Distro.

## Table of Contents
1. [Quick Import](#quick-import)
2. [Migration from Other Platforms](#migration-from-other-platforms)
3. [CSV Format Specification](#csv-format-specification)
4. [File Organization](#file-organization)
5. [Import Process](#import-process)
6. [Advanced Features](#advanced-features)
7. [Troubleshooting](#troubleshooting)

---

## Quick Import

### Prerequisites
- CSV file with your catalog data (UTF-8 encoded)
- Audio files in WAV, FLAC, or MP3 format
- Cover images (minimum 3000x3000px)
- Files named according to DDEX standards

### Three-Step Process

1. **Upload CSV** → System parses catalog data
2. **Upload Files** → Automatic matching by UPC
3. **Review & Create** → Verify and import releases

---

## Migration from Other Platforms

### Export Your Current Catalog

Most distribution platforms allow you to export your catalog data. Common export formats include:
- CSV (Comma-Separated Values)
- TSV (Tab-Separated Values)
- XML (Extensible Markup Language)
- JSON (JavaScript Object Notation)

### Preparing Your Export

1. **Request or download catalog export** from your current platform
2. **Download all assets** (audio files and artwork)
3. **Convert to CSV format** if necessary
4. **Map columns** to Stardust Distro format

### Generic Column Mapping

| Common Field Names | Our Column | Notes |
|-------------------|------------|--------|
| Album/Release/Title | title | Required |
| Artist/Performer | artist | Required |
| UPC/EAN/Barcode | upc | Required, 12-14 digits |
| ISRC/Track Code | isrc | Per track |
| Release Date/Street Date | releaseDate | YYYY-MM-DD format |
| Track Name/Song Title | trackTitle | Required per track |
| Track #/Position | trackNumber | Required per track |
| Disc #/Volume | discNumber | Default: 1 |
| Label/Record Label | label | Optional |
| Catalog #/Cat Number | catalogNumber | Optional |

### Migration Strategy

#### Phase 1: Export & Prepare
1. Export catalog from current platform
2. Download all assets (audio + artwork)
3. Organize files by release
4. Create backup of everything

#### Phase 2: Transform Data
1. Convert export to our CSV format
2. Rename files to DDEX standard
3. Verify UPCs and ISRCs
4. Fix any data inconsistencies

#### Phase 3: Import to Stardust
1. Import back catalog (oldest first)
2. Verify each batch of 50 releases
3. Complete metadata for drafts
4. Schedule re-delivery to DSPs

#### Phase 4: Transition
1. Continue using old platform for new releases
2. Gradually transition workflows
3. Update DSP configurations
4. Notify partners of change

---

## CSV Format Specification

### Required Columns

```csv
title,artist,upc,releaseDate,trackTitle,trackNumber,discNumber
"Album Name","Artist Name","123456789012","2024-01-01","Song Title",1,1
```

### Complete Column Reference

| Column | Required | Format | Example | Notes |
|--------|----------|--------|---------|-------|
| **Release Fields** | | | | |
| title | ✅ Yes | Text | "My Album" | Release title |
| artist | ✅ Yes | Text | "Artist Name" | Display artist |
| upc | ✅ Yes | 12-14 digits | "123456789012" | No spaces/dashes |
| releaseDate | ✅ Yes | YYYY-MM-DD | "2024-01-01" | ISO format |
| label | No | Text | "My Label" | Record label |
| catalogNumber | No | Text | "CAT001" | Catalog ID |
| genre | No | Text | "Rock" | Primary genre |
| subgenre | No | Text | "Alternative Rock" | Secondary |
| **Track Fields** | | | | |
| trackTitle | ✅ Yes | Text | "Song Name" | Track title |
| trackNumber | ✅ Yes | Integer | 1 | Track position |
| discNumber | No | Integer | 1 | Default: 1 |
| trackArtist | No | Text | "Feat. Artist" | If different |
| isrc | No | 12 chars | "USRC17607839" | Track ISRC |
| duration | No | Seconds | 180 | Length in seconds |
| explicit | No | Boolean | "true"/"false" | Explicit content |
| **Credits** | | | | |
| composer | No | Text | "John Doe" | Songwriter |
| lyricist | No | Text | "Jane Doe" | Lyric writer |
| producer | No | Text | "Producer Name" | Producer |
| mixer | No | Text | "Mixer Name" | Mixing engineer |
| **Additional** | | | | |
| copyright | No | Text | "© 2024 Label" | Copyright line |
| copyrightYear | No | Year | 2024 | Copyright year |
| originalReleaseDate | No | YYYY-MM-DD | "2020-01-01" | First release |
| language | No | ISO 639-1 | "en" | Primary language |
| notes | No | Text | "Special edition" | Internal notes |

### Multi-Disc Format

For releases with multiple discs:

```csv
title,artist,upc,releaseDate,trackTitle,trackNumber,discNumber
"Double Album","Artist","123456789012","2024-01-01","Song 1",1,1
"Double Album","Artist","123456789012","2024-01-01","Song 2",2,1
"Double Album","Artist","123456789012","2024-01-01","Song 3",1,2
"Double Album","Artist","123456789012","2024-01-01","Song 4",2,2
```

### Compilation/Various Artists

For compilations:

```csv
title,artist,upc,releaseDate,trackTitle,trackArtist,trackNumber
"Compilation","Various Artists","123456789012","2024-01-01","Song 1","Artist A",1
"Compilation","Various Artists","123456789012","2024-01-01","Song 2","Artist B",2
```

---

## File Organization

### DDEX-Compliant Naming

#### Audio Files
```
Pattern: {UPC}_{DiscNumber}_{TrackNumber}.{extension}
Example: 123456789012_01_001.wav
```

#### Cover Images
```
Pattern: {UPC}_cover.{extension}
Example: 123456789012_cover.jpg
```

#### Additional Images
```
Pattern: {UPC}_image_{number}.{extension}
Example: 123456789012_image_01.jpg
```

### Folder Structure

Recommended organization:
```
import_files/
├── audio/
│   ├── 123456789012_01_001.wav
│   ├── 123456789012_01_002.wav
│   └── 123456789012_01_003.wav
├── images/
│   ├── 123456789012_cover.jpg
│   └── 123456789012_image_01.jpg
└── catalog.csv
```

---

## Import Process

### Step 1: Navigate to Import

1. Go to **Catalog** view
2. Click **"Import Catalog"** button
3. Migration wizard opens

### Step 2: Upload CSV

1. **Select your CSV file**
   - Drag and drop or click to browse
   - Maximum 10MB file size
   - UTF-8 encoding required

2. **Review detected columns**
   - System auto-detects column mappings
   - Adjust mappings if needed
   - Verify required fields are mapped

3. **Validate and proceed**
   - System validates UPC checksums
   - Checks for required fields
   - Shows preview of releases to import

### Step 3: Upload Files

1. **Select all audio files**
   - Multi-select with Ctrl/Cmd+Click
   - Or drag entire folder
   - Supported: WAV, FLAC, MP3

2. **Select all image files**
   - Cover images required
   - Additional images optional
   - Supported: JPG, PNG

3. **Upload progress**
   - Files upload in parallel
   - Progress shown per file
   - Can pause/resume upload

### Step 4: Automatic Matching

System automatically:
1. **Matches files to releases by UPC**
2. **Associates tracks by disc/track numbers**
3. **Links cover images**
4. **Creates draft releases**

Results shown:
- ✅ Complete releases (all files matched)
- ⚠️ Incomplete releases (missing files)
- ❌ Failed matches (naming issues)

### Step 5: Review & Complete

1. **Review matched releases**
   - Verify track order
   - Check cover art
   - Confirm metadata

2. **Fix incomplete releases**
   - Upload missing files
   - Correct file names
   - Manual association

3. **Bulk create releases**
   - Select releases to import
   - Click "Create Releases"
   - Monitor progress

---

## Advanced Features

### Field Mapping

#### Custom Column Names

System recognizes common variations:
- Title variations: `title`, `release_title`, `album_title`, `name`
- Artist variations: `artist`, `display_artist`, `album_artist`, `performer`
- UPC variations: `upc`, `barcode`, `ean`, `gtin`
- Track variations: `track_title`, `song_title`, `track_name`, `song`

#### Manual Mapping

For non-standard columns:
1. Click "Manual Mapping" mode
2. Drag CSV columns to target fields
3. Save mapping as template
4. Reuse for future imports

### Bulk Processing Options

#### Import Settings

Configure before import:
- **Skip duplicates**: Ignore existing UPCs
- **Update existing**: Overwrite catalog entries
- **Draft only**: Don't auto-publish
- **Validate ISRCs**: Check ISRC format
- **Auto-detect type**: Single/EP/Album detection
- **Generate missing ISRCs**: Create ISRCs for tracks without

#### Batch Size

For large catalogs:
- Process in batches of 100 releases
- Prevents timeout issues
- Shows batch progress
- Auto-saves progress

### Data Transformation

#### Automatic Corrections

System auto-fixes:
- Removes whitespace from UPCs
- Capitalizes ISRCs
- Formats dates (YYYY-MM-DD)
- Trims extra spaces
- Normalizes apostrophes and quotes
- Converts duration formats

#### Genre Mapping

During import:
- Maps CSV genres to system genres
- Uses intelligent matching
- Falls back to "Other" if unknown
- Can configure custom mappings

### Incremental Import

For ongoing migrations:

1. **Initial Import**
   - Import back catalog
   - Note last successful UPC

2. **Weekly Updates**
   - Export new releases only
   - Append to existing catalog
   - Use "Skip duplicates" option

3. **Final Migration**
   - Complete remaining releases
   - Verify all imported
   - Deactivate old platform

---

## Import Management

### Monitoring Import Progress

**Import Status Dashboard shows:**
- Total releases in CSV
- Files uploaded
- Releases matched
- Drafts created
- Errors encountered
- Estimated time remaining

### Handling Incomplete Releases

For releases missing files:
1. **View missing items**
   - Click "View Details" on incomplete release
   - See which tracks/images are missing

2. **Complete manually**
   - Upload missing files individually
   - Edit release to add missing data
   - Change status to "Ready"

3. **Re-run matching**
   - After uploading more files
   - Click "Re-match Files"
   - System attempts matching again

### Resume Interrupted Imports

If import is interrupted:
1. Return to Catalog → Import
2. System detects active import
3. Choose "Resume" or "Start New"
4. Continue from last checkpoint

---

## File Validation

### Audio File Checks

Before import, files are validated for:
- **Format**: WAV, FLAC, or MP3
- **Naming**: DDEX compliance
- **Size**: Under 200MB per file
- **Integrity**: Not corrupted
- **Duration**: Between 30s and 30min
- **Sample Rate**: 44.1kHz or higher
- **Bit Depth**: 16-bit or higher

### Image Requirements

Cover images must be:
- **Minimum**: 3000x3000 pixels
- **Format**: JPG or PNG
- **Aspect**: Square (1:1)
- **Size**: Under 10MB
- **Color**: RGB (not CMYK)
- **Resolution**: 72 DPI or higher

### Common Validation Errors

**"Invalid UPC in filename"**
- Check UPC is 12-14 digits
- Remove spaces/dashes
- Verify against CSV

**"Track number format incorrect"**
- Use 3 digits: 001, 002, etc.
- Include disc number: 01
- Format: UPC_DD_TTT

**"Image dimensions too small"**
- Resize to 3000x3000 minimum
- Maintain square aspect ratio
- Use high-quality source

---

## Best Practices

### Pre-Import Checklist

Before starting import:
- ✅ CSV validated in spreadsheet app
- ✅ All UPCs verified (12-14 digits)
- ✅ Files named correctly (DDEX)
- ✅ Cover images ready (3000x3000)
- ✅ Audio files normalized
- ✅ Backup created of all data
- ✅ Test with 5 releases first

### Optimizing Import Speed

**For fastest imports:**
1. Use FLAC instead of WAV (smaller files)
2. Compress images to ~1-2MB
3. Upload in batches of 50-100
4. Use wired internet connection
5. Import during off-peak hours
6. Close other browser tabs
7. Disable browser extensions temporarily

### Error Recovery

**If import fails:**
1. Note the last successful UPC
2. Export error log
3. Fix issues in CSV/files
4. Re-run import from failure point
5. System skips already imported
6. Contact support if persistent

---

## Troubleshooting

### CSV Issues

**"CSV parsing failed"**
- Save as UTF-8 encoding
- Use comma delimiter (not semicolon)
- Escape special characters with quotes
- Remove blank rows at end
- Check for BOM characters
- Ensure line endings are consistent

**"Required column missing"**
- Ensure headers match exactly
- Check for typos in column names
- Use template CSV as guide
- Remove extra spaces in headers
- Verify case sensitivity

### File Matching Problems

**"Files not matching to releases"**
- Verify UPC in filename matches CSV exactly
- Check disc/track numbering format
- Ensure file extensions are correct
- Remove special characters from filenames
- Check for leading zeros in numbers

**"Duplicate files detected"**
- System found same content hash
- Choose to skip or replace
- Clean up source folders
- Check for duplicate UPCs in CSV

### Performance Issues

**"Upload very slow"**
- Reduce concurrent uploads to 3
- Check internet speed (need 10+ Mbps)
- Try different browser (Chrome recommended)
- Clear browser cache
- Disable browser extensions
- Check available disk space

---

## Import Templates

### Download Sample Files

Available templates:
- [Basic CSV Template](./templates/basic-import.csv) - Minimal required fields
- [Full Metadata CSV](./templates/full-import.csv) - All supported fields
- [Multi-Disc Template](./templates/multi-disc.csv) - Multi-disc release example
- [Compilation Template](./templates/compilation.csv) - Various artists example

### Creating Custom Templates

1. Export a sample from your current catalog
2. Map columns to our format
3. Save as template for future use
4. Share with team members

---

## Post-Import Tasks

### Review Imported Releases

After import:
1. **Check draft releases**
   - Navigate to Catalog
   - Filter by status: Draft
   - Review for accuracy

2. **Complete metadata**
   - Add missing genres
   - Set copyright info
   - Configure territories
   - Add production credits

3. **Validate releases**
   - Run DDEX validation
   - Fix any errors
   - Change status to Ready

### Bulk Operations

**For imported releases:**
- Select multiple releases
- Apply common metadata
- Set release dates
- Update status together
- Generate ISRCs if missing

### Quality Assurance

**Verify import quality:**
- Spot-check random releases
- Play audio samples
- Review cover art quality
- Check track sequences
- Verify metadata accuracy
- Test with delivery preview

---

## Migration Timeline

### Recommended Schedule

**Week 1: Preparation**
- Day 1-2: Export from current platform
- Day 3-4: Organize and rename files
- Day 5-7: Prepare CSV and test import

**Week 2: Import**
- Day 1-3: Import back catalog
- Day 4-5: Fix incomplete releases
- Day 6-7: Quality assurance

**Week 3: Transition**
- Day 1-2: Configure delivery targets
- Day 3-4: Test deliveries
- Day 5-7: Train team on new platform

**Week 4: Go Live**
- Switch to Stardust Distro for new releases
- Monitor deliveries
- Gather feedback
- Optimize workflow

---

## Support Resources

### Import Assistance

- **Documentation**: Complete guides in `/docs` folder
- **Templates**: Sample CSV files in `/templates`
- **Community Forum**: Share tips and get help
- **Video Tutorials**: Step-by-step walkthroughs

### Frequently Asked Questions

**Q: How long does import take?**
A: Typically 1-2 minutes per release including file upload.

**Q: Can I import without ISRCs?**
A: Yes, you can generate ISRCs after import or add them later.

**Q: What if my files aren't DDEX named?**
A: Use our file renaming tool or rename manually before import.

**Q: Can I update releases after import?**
A: Yes, all imported releases can be edited.

**Q: Is there a limit to import size?**
A: No hard limit, but we recommend batches of 500 releases.

---

*Import System Version: 1.0.0 | Last Updated: August 2025*