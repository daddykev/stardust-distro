# DDEX Standards - Stardust Ecosystem

## Overview
Unified DDEX implementation standards for Stardust Distro (distribution platform) and Stardust DSP (streaming platform).

## ERN Version Support
- **Primary**: ERN 4.3 (latest)
- **Supported**: ERN 4.2, 4.1, 3.8.2
- **Default Profile**: AudioAlbum

## Message Types & SubTypes

### NewReleaseMessage
The primary message type for communicating release information between distributors and DSPs.

#### SubTypes:
- **Initial**: First-time delivery of a release
  - Full metadata, audio files, and artwork included
  - Contains commercial deals and territory information
  - Creates new catalog entry in DSP
  
- **Update**: Metadata or asset updates to existing releases
  - Used for corrections or enhancements
  - May include new tracks, updated artwork, or metadata changes
  - Preserves existing commercial terms unless explicitly changed
  - DSP should merge with existing data, preserving play counts
  
- **Takedown**: Request to remove a release from distribution
  - No audio/image assets included
  - Sets `includeDeals: false` in message
  - DSP should mark release as "taken_down" but preserve data

### Message Type Determination Logic

#### For Stardust Distro (Sender):
```javascript
if (isTakedown) {
  messageType = 'NewReleaseMessage'
  messageSubType = 'Takedown'
} else if (!hasBeenDelivered) {
  messageType = 'NewReleaseMessage'
  messageSubType = 'Initial'
} else {
  messageType = 'NewReleaseMessage'
  messageSubType = 'Update'
}
```

#### For Stardust DSP (Receiver):
```javascript
// Check UpdateIndicator in release
if (release.UpdateIndicator === 'OriginalMessage') {
  return 'Initial'
} else if (release.UpdateIndicator) {
  return 'Update'
}

// Check DealTerms for takedown
if (deal?.DealTerms?.TakeDown === 'true') {
  return 'Takedown'
}
```

## File Naming Convention
- **Audio**: `{UPC}_{DiscNumber}_{TrackNumber}.{extension}`
- **Cover Art**: `{UPC}.jpg` (main), `{UPC}_IMG_{XXX}.jpg` (additional)
- **ERN XML**: `{MessageID}.xml`

## UPC-Based Deduplication
Both platforms use UPC as the primary identifier for releases to prevent duplicates.

## MD5 Hash Validation
All files should include MD5 checksums for integrity verification.