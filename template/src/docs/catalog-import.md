# Catalog Import Guide 📦

Import your existing music catalog into Stardust Distro using our powerful bulk import system with DDEX-compliant file naming support.

## Overview

The catalog import system allows you to:
- Import metadata from CSV files
- Upload audio and images in bulk
- Automatically match files to releases using DDEX naming
- Resume interrupted imports
- Create draft releases automatically

## Import Process

### Three-Step Workflow

1. **CSV Import**: Upload catalog metadata
2. **File Upload**: Bulk upload audio and images
3. **Auto-Matching**: System creates releases

## Preparing Your Import

### Step 1: Organize Your Data

#### Required CSV Columns

Your CSV must include:
- `release_title` or `album_title`
- `display_artist` or `artist`
- `upc` or `barcode` (12-14 digits)
- `track_title`
- `track_number` or `sequence`

#### Optional CSV Columns

Enhance your import with:
- `release_date`
- `label`
- `catalog_number`
- `isrc`
- `track_artist`
- `genre`
- `copyright`
- `duration` (seconds)

#### Sample CSV Format

```csv
upc,release_title,display_artist,release_date,track_number,track_title,isrc,duration
123456789012,Summer Album,Beach Band,2024-07-01,1,Sunrise,USRC12400001,215
123456789012,Summer Album,Beach Band,2024-07-01,2,Ocean Waves,USRC12400002,189
123456789012,Summer Album,Beach Band,2024-07-01,3,Sunset Dreams,USRC12400003,201
987654321098,Winter EP,Mountain Duo,2024-12-15,1,Snow Falls,USRC12400004,180
987654321098,Winter EP,Mountain Duo,2024-12-15,2,Ice Crystals,USRC12400005,195
```

### Step 2: Prepare Your Files

#### DDEX File Naming Convention

**Audio Files:**
```
{UPC}_{DiscNumber}_{TrackNumber}.{extension}
```

Examples:
- `123456789012_01_001.wav` (Album track 1)
- `123456789012_01_002.flac` (Album track 2)
- `987654321098_01_001.mp3` (EP track 1)

**Cover Images:**
```
{UPC}.jpg                    # Main cover
{UPC}_{ImageNumber}.jpg      # Additional images
```

Examples:
- `123456789012.jpg` (Album cover)
- `123456789012_02.jpg` (Back cover)
- `987654321098.jpg` (EP cover)

#### File Organization Structure

Organize files in folders for easier upload:
```
import-files/
├── audio/
│   ├── 123456789012_01_001.wav
│   ├── 123456789012_01_002.wav
│   ├── 123456789012_01_003.wav
│   ├── 987654321098_01_001.wav
│   └── 987654321098_01_002.wav
└── images/
    ├── 123456789012.jpg
    └── 987654321098.jpg
```

## Using the Import Tool

### Accessing the Importer

1. Navigate to **Catalog** view
2. Click **"Import Catalog"** button
3. Migration wizard opens

### Step 1: Upload CSV

1. **Select your CSV file**
   - Drag and drop or click to browse
   - Maximum 10MB file size
   - UTF-8 encoding required

2. **Review detected columns**
   - System auto-detects column mappings
   - Adjust mappings if needed
   - Verify required fields are mapped

3. **Validate and import**
   - System validates UPC checksums
   - Checks for required fields
   - Shows preview of releases to import

### Step 2: Upload Files

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

### Step 3: Automatic Matching

System automatically:
1. **Matches files to releases by UPC**
2. **Associates tracks by disc/track numbers**
3. **Links cover images**
4. **Creates draft releases**

Results shown:
- ✅ Complete releases (all files matched)
- ⚠️ Incomplete releases (missing files)
- ❌ Failed matches (naming issues)

## Import Management

### Monitoring Import Progress

**Import Status Dashboard shows:**
- Total releases in CSV
- Files uploaded
- Releases matched
- Drafts created

### Handling Incomplete Releases

For releases missing files:
1. **View missing items**
   - Click "View Details" on incomplete release
   - See which tracks/images are missing

2. **Complete manually**
   - Upload missing files individually
   - Edit release to add missing data

3. **Re-run matching**
   - After uploading more files
   - Click "Re-match Files"

### Resume Interrupted Imports

If import is interrupted:
1. Return to Catalog → Import
2. System detects active import
3. Choose "Resume" or "Start New"
4. Continue from last checkpoint

## Advanced Features

### Field Mapping

#### Custom Column Names

System recognizes variations:
- Title: `title`, `release_title`, `album_title`, `name`
- Artist: `artist`, `display_artist`, `album_artist`
- UPC: `upc`, `barcode`, `ean`, `gtin`
- Track: `track_title`, `song_title`, `track_name`

#### Manual Mapping

For non-standard columns:
1. Click "Manual Mapping" mode
2. Drag CSV columns to target fields
3. Save mapping as template

### Bulk Processing Options

#### Import Settings

Configure before import:
- **Skip duplicates**: Ignore existing UPCs
- **Update existing**: Overwrite catalog entries
- **Draft only**: Don't auto-publish
- **Validate ISRCs**: Check ISRC format

#### Batch Size

For large catalogs:
- Process in batches of 100 releases
- Prevents timeout issues
- Shows batch progress

### Data Transformation

#### Automatic Corrections

System auto-fixes:
- Removes whitespace from UPCs
- Capitalizes ISRCs
- Formats dates (YYYY-MM-DD)
- Trims extra spaces

#### Genre Mapping

During import:
- Maps CSV genres to system genres
- Uses intelligent matching
- Falls back to "Other" if unknown

## File Validation

### Audio File Checks

Before import, files are validated for:
- **Format**: WAV, FLAC, or MP3
- **Naming**: DDEX compliance
- **Size**: Under 200MB per file
- **Integrity**: Not corrupted

### Image Requirements

Cover images must be:
- **Minimum**: 3000x3000 pixels
- **Format**: JPG or PNG
- **Aspect**: Square (1:1)
- **Size**: Under 10MB

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

## Best Practices

### Pre-Import Checklist

Before starting import:
- ✅ CSV validated in spreadsheet app
- ✅ All UPCs verified
- ✅ Files named correctly
- ✅ Cover images ready
- ✅ Audio files normalized

### Optimizing Import Speed

**For fastest imports:**
1. Use FLAC instead of WAV (smaller files)
2. Compress images to ~1-2MB
3. Upload in batches of 50-100
4. Use wired internet connection
5. Import during off-peak hours

### Error Recovery

**If import fails:**
1. Note the last successful UPC
2. Fix issues in CSV/files
3. Re-run import from failure point
4. System skips already imported

## Troubleshooting

### CSV Issues

**"CSV parsing failed"**
- Save as UTF-8 encoding
- Use comma delimiter
- Escape special characters
- Remove blank rows

**"Required column missing"**
- Ensure headers match exactly
- Check for typos in column names
- Use template CSV as guide

### File Matching Problems

**"Files not matching to releases"**
- Verify UPC in filename matches CSV
- Check disc/track numbering
- Ensure file extensions are correct
- Remove special characters

**"Duplicate files detected"**
- System found same content hash
- Choose to skip or replace
- Clean up source folders

### Performance Issues

**"Upload very slow"**
- Reduce concurrent uploads
- Check internet speed
- Try different browser
- Clear browser cache

## Import Templates

### Download Sample Files

Available templates:
- [Basic CSV Template](./templates/basic-import.csv)
- [Full Metadata CSV](./templates/full-import.csv)
- [Multi-Disc Template](./templates/multi-disc.csv)
- [Compilation Template](./templates/compilation.csv)

### Creating Custom Templates

1. Export existing catalog
2. Modify in spreadsheet app
3. Save as CSV (UTF-8)
4. Test with small batch

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

### Quality Assurance

**Verify import quality:**
- Spot-check random releases
- Play audio samples
- Review cover art
- Check track sequences

## Migration Strategies

### From Other Platforms

**Exporting from competitors:**
1. Export catalog as CSV
2. Map columns to our format
3. Batch download assets
4. Rename files to DDEX standard

### From Legacy Systems

**Modernizing old catalogs:**
1. Digitize physical media
2. Generate UPCs if missing
3. Research missing metadata
4. Enhance audio quality

### Incremental Migration

**For active catalogs:**
1. Import back catalog first
2. Continue using old system
3. Import new releases weekly
4. Switch over when complete

## Advanced Scenarios

### Multi-Disc Albums

CSV format for multi-disc:
```csv
upc,disc_number,track_number,track_title
123456789012,1,1,Disc 1 Track 1
123456789012,1,2,Disc 1 Track 2
123456789012,2,1,Disc 2 Track 1
```

File naming:
- `123456789012_01_001.wav` (Disc 1, Track 1)
- `123456789012_02_001.wav` (Disc 2, Track 1)

### Compilations

Include track-level artists:
```csv
upc,track_title,track_artist,display_artist
123456789012,Song One,Artist A,Various Artists
123456789012,Song Two,Artist B,Various Artists
```

### Box Sets

Use catalog numbers:
```csv
upc,catalog_number,release_title,disc_title
123456789012,BOX001,Complete Collection,Volume 1
123456789013,BOX001,Complete Collection,Volume 2
```

## Support Resources

### Video Tutorials
- [CSV Preparation](https://youtube.com/watch?v=xxx)
- [File Organization](https://youtube.com/watch?v=yyy)
- [Import Walkthrough](https://youtube.com/watch?v=zzz)

### Help Documentation
- [CSV Format Reference](./csv-format.md)
- [DDEX Naming Convention](./ddex-naming.md)
- [Troubleshooting Guide](./troubleshooting.md#import-issues)

### Community Resources
- Import tips and tricks forum
- Shared import templates
- Migration success stories

---

💡 **Pro Tip**: Start with a test import of 5-10 releases to familiarize yourself with the process before importing your entire catalog.