# Release Creation Guide 🎵

This comprehensive guide walks you through creating and managing releases in Stardust Distro using our intuitive 6-step wizard.

## Overview

Creating a release in Stardust Distro involves:
1. **Basic Information** - Core metadata
2. **Track Management** - Adding and organizing tracks  
3. **Asset Upload** - Cover art and audio files
4. **Metadata** - Genre, copyright, and credits
5. **Territories & Rights** - Distribution regions
6. **Review & Generate** - Validation and ERN creation

## Before You Start

### Required Information
- ✅ Release title and artist name
- ✅ UPC/EAN barcode (12-14 digits)
- ✅ Release date
- ✅ Track titles and ISRCs (if available)
- ✅ Copyright information

### Required Files
- ✅ Cover image (minimum 3000x3000px, JPG or PNG)
- ✅ Audio files (WAV, FLAC, or high-quality MP3)

## Step 1: Basic Information

### Essential Fields

**Release Title**
- Use proper capitalization (Title Case)
- Avoid special characters unless part of official title
- Maximum 200 characters

**Display Artist**  
- Primary artist as shown on cover
- Use "Various Artists" for compilations
- Maintain consistency across releases

**Release Type**
- **Single**: 1-3 tracks, under 30 minutes
- **EP**: 4-6 tracks or under 30 minutes
- **Album**: 7+ tracks or over 30 minutes
- **Compilation**: Multiple artists collection

**Barcode (UPC/EAN)**
- Required for DDEX compliance
- Must be 12 (UPC-A), 13 (EAN-13), or 14 (EAN-14) digits
- System validates checksum automatically
- Cannot be reused across releases

### Optional Fields

**Label**: Your record label name
**Catalog Number**: Internal reference (e.g., "CAT001")
**Original Release Date**: For reissues or remasters

### Pro Tips
- Save as draft frequently (auto-saves every 3 seconds)
- Use consistent formatting across your catalog
- Prepare metadata in advance using our CSV template

## Step 2: Track Management

### Adding Tracks

1. Click **"Add Track"** button
2. Enter track information:
   - **Title**: Exact as appears on release
   - **Artist**: Track-level artist (if different from album)
   - **ISRC**: International Standard Recording Code (optional but recommended)

### Track Sequencing

- Drag and drop to reorder tracks
- Track numbers update automatically
- Maintain intended artistic flow

### Audio File Requirements

**Preferred Formats:**
- WAV: 16-bit or 24-bit, 44.1kHz or higher
- FLAC: Lossless compression, any bit depth
- MP3: 320kbps minimum for distribution

**File Naming Best Practice:**
```
01_Track_Title.wav
02_Another_Track.wav
```

### Bulk Track Import

For albums with many tracks:
1. Name files with track numbers
2. Upload all at once
3. System auto-sequences based on filename

## Step 3: Asset Upload

### Cover Art Requirements

**Technical Specifications:**
- Minimum: 3000x3000 pixels
- Maximum: 6000x6000 pixels  
- Format: JPG or PNG
- Color: RGB (not CMYK)
- Resolution: 300 DPI recommended

**Content Guidelines:**
- No blurry or pixelated images
- No promotional text ("New Album", "Exclusive")
- No social media handles or URLs
- Must match release metadata

### Upload Process

1. Click upload area or drag & drop
2. System validates dimensions automatically
3. Preview shows uploaded image
4. Replace option available if needed

### Additional Images (Coming Soon)
- Back cover
- Booklet pages
- Artist photos
- Label artwork

## Step 4: Metadata

### Genre Classification

**Using the Genre Selector:**
1. Click the genre dropdown
2. Browse hierarchical genre tree
3. Select primary genre (required)
4. Add subgenre for specificity (optional)

**Genre Intelligence:**
- System shows genre paths (e.g., Music → Rock → Alternative Rock)
- Auto-maps to DSP-specific taxonomies
- Preview mappings before delivery

### Copyright Information

**Copyright Notice Format:**
```
© 2024 Label Name
℗ 2024 Label Name
```
- © (Copyright): Composition and lyrics
- ℗ (Phonogram): Sound recording
- Year typically matches release year

### Language Selection
- Choose primary language of lyrics
- Affects international distribution
- "Multiple" option for multi-language releases

## Step 5: Territories & Rights

### Distribution Territories

**Worldwide (Recommended)**
- Distributes to all available territories
- Maximizes reach
- Simplest option for most releases

**Selected Territories**
- Choose specific countries/regions
- Useful for licensing restrictions
- Staged rollout strategies

### Rights Period
- **Start Date**: Usually release date
- **End Date**: Leave empty for perpetual rights
- **Takedown Date**: For limited-time releases

### Territory Restrictions
Common scenarios:
- Exclude home territory for international deals
- Japan-only for special editions
- Europe-first for tour support

## Step 6: Review & Generate

### Pre-Generation Review

**Validation Checklist:**
- ✅ All required fields complete
- ✅ Cover art uploaded
- ✅ All tracks have audio files
- ✅ Genre selected
- ✅ Copyright information entered
- ✅ Territories configured

### ERN Configuration

**Version Selection:**
- **ERN 4.3**: Newest, recommended
- **ERN 4.2**: Wide compatibility
- **ERN 3.8.2**: Legacy systems

**Profile Options:**
- **AudioAlbum**: Standard music releases
- **AudioSingle**: Single track releases
- **VideoAlbum**: Music videos (coming soon)

### Validation Process

1. Click **"Validate ERN"**
2. System checks DDEX compliance
3. Review any errors or warnings
4. Fix issues before generation

### Common Validation Errors

**"Barcode checksum invalid"**
- Double-check UPC/EAN number
- Ensure no spaces or dashes

**"Cover image too small"**
- Upload higher resolution image
- Minimum 3000x3000 required

**"Missing required metadata"**
- Review all steps for empty fields
- Check track-level information

### Generating ERN

Once validated:
1. Click **"Generate ERN & Save"**
2. System creates DDEX-compliant package
3. Status changes to "Ready"
4. Available for delivery

## After Creation

### Release Management

**From Catalog view:**
- View all releases
- Filter by status
- Bulk operations
- Quick actions menu

**From Release Detail:**
- Edit metadata
- Update tracks
- Replace assets
- View delivery history

### Making Updates

**To edit a release:**
1. Navigate to Catalog
2. Click release title or Edit button
3. Make necessary changes
4. Re-validate if structural changes
5. Save updates

### Delivery Preparation

**Release is ready when:**
- Status shows "Ready"
- All validation passed
- Assets uploaded
- ERN generated

**Next steps:**
1. Go to Deliveries → New Delivery
2. Select your release
3. Choose delivery targets
4. Schedule or send immediately

## Best Practices

### Workflow Optimization

1. **Batch Preparation**
   - Prepare multiple releases offline
   - Use CSV import for bulk creation
   - Upload all assets to cloud storage first

2. **Template Usage**
   - Save common metadata as templates
   - Reuse copyright information
   - Standardize genre selections

3. **Quality Control**
   - Review everything before validation
   - Test with single track first
   - Check ERN preview before delivery

### Content Guidelines

**Audio Quality:**
- Master at -14 LUFS for streaming
- Leave headroom to prevent clipping
- Use professional mastering services

**Metadata Accuracy:**
- Match streaming platform guidelines
- Consistent artist naming
- Accurate songwriter credits

**Cover Art Design:**
- Readable at thumbnail size
- Consistent brand aesthetic
- Professional photography/design

## Advanced Features

### Content Fingerprinting

When uploading audio:
- System generates acoustic fingerprint
- Checks for duplicates in catalog
- Warns about similar tracks
- Prevents redundant uploads

### Auto-Save & Recovery

- Changes save every 3 seconds
- Resume interrupted sessions
- Draft recovery after browser crash
- Version history (coming soon)

### Bulk Operations

**For multiple releases:**
- Select multiple in catalog
- Update common fields
- Bulk status changes
- Export for external processing

## Troubleshooting

### Upload Issues

**"File too large"**
- Compress audio to FLAC
- Reduce image dimensions (keep above 3000px)
- Check internet connection stability

**"Upload failed"**
- Refresh page and retry
- Check Firebase Storage quota
- Clear browser cache

### Validation Problems

**"ERN generation failed"**
- Review all required fields
- Check special characters in metadata
- Ensure dates are logical
- Verify file formats

### Performance Tips

**For large catalogs:**
- Upload during off-peak hours
- Use wired internet connection
- Process in smaller batches
- Enable browser notifications

## Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save draft
- `Tab`: Navigate between fields
- `Shift + Tab`: Previous field
- `Enter`: Next step (when valid)
- `Esc`: Cancel operation

## Support Resources

- [Video Tutorial](https://youtube.com/watch?v=xxx): Complete walkthrough
- [Template Downloads](./templates): CSV and metadata templates
- [Genre Guide](./genre-mapping.md): Understanding genre classification
- [Delivery Guide](./delivery-setup.md): Next steps after creation

---

💡 **Pro Tip**: Create your first release as a test with one track to familiarize yourself with the process before uploading your entire catalog.