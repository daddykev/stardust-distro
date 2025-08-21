# **DDEX Standards - Stardust Ecosystem Enhanced**

## **Overview**

Unified DDEX implementation standards for Stardust Distro (distribution platform) and Stardust DSP (streaming platform). This document covers ERN (Electronic Release Notification) standards across multiple versions, providing comprehensive guidance for both generating and processing DDEX messages with detailed file choreography and delivery patterns.

## **ERN Version Support Matrix**

| Version | Status | Stardust Distro | Stardust DSP | Industry Usage | Adoption Timeline |
|---------|--------|-----------------|--------------|----------------|------------------|
| **ERN 4.3** | Primary | ✅ Full Support | ✅ Full Support | Emerging (UMG, Spotify adopting) | Latest features, immersive audio |
| **ERN 4.2** | Supported | ✅ Full Support | ✅ Full Support | Moderate | Enhanced encoding support |
| **ERN 4.1** | Legacy | ⚠️ Limited | ⚠️ Limited | Declining | Migration recommended |
| **ERN 3.8.2** | Legacy+ | ✅ Full Support | ✅ Full Support | **Most Common (80%+)** | Industry standard |

### **Default Configuration**
- **Primary Version**: ERN 4.3 (recommended for all new implementations)
- **Fallback Version**: ERN 3.8.2 (for maximum compatibility)
- **Default Profile**: AudioAlbum
- **Message Priority**: Normal (unless specified otherwise)

---

## **Comprehensive ERN Version Analysis**

### **ERN 4.3 (Latest - December 2022)**
The most advanced standard with next-generation capabilities, including full support for immersive audio, UGC clip authorization, enhanced classical music metadata handling, and hooks for MEAD/PIE integration.

**Major New Features:**
- **Immersive Audio Support**: Full support for communication of data about immersive audio including data about different sound engineers and mixers who helped to create the immersive editions
- **UGC Clip Authorization**: Enabling a record company or distributor to provide data about sound recording and video clips that are authorized for a user-generated content DSP, allowing its users to create and upload short clips
- **Granular Visibility Dates**: Support for data about more granular album visibility dates for streaming DSPs including when DSPs are permitted to show both the cover art and track listings for a new release
- **MEAD/PIE Hooks**: A "hook" mechanism to enable a record company or distributor to direct the DSP from the ERN message to Media Enrichment and Description (MEAD) and/or Party Identification and Enrichment (PIE) messages
- **Enhanced Classical Music**: Significantly enhanced handling of classical music requiring less human intervention by clarifying the rules for individual movements, hierarchical title data for bigger classical works, and data about soloists, orchestras, composers and conductors

**Clip Details Structure (ERN 4.3):**
```xml
<SoundRecording>
  <SoundRecordingEdition>
    <TechnicalDetails>
      <ClipDetails>
        <ClipType>Preview</ClipType>
        <ClipType>Standalone</ClipType>
        <PreviewDetails>
          <StartPoint>30000</StartPoint>
          <Duration>30000</Duration>
        </PreviewDetails>
      </ClipDetails>
    </TechnicalDetails>
  </SoundRecordingEdition>
</SoundRecording>
```

**Industry Commitment:**
- Universal Music Group: "Implementing ERN 4.3 will enable us to send expanded artist product information to our partners, to enable the creation of richer, more engaging, fan experiences"
- Spotify: "ERN 4.3 opens so many doors for important upcoming features"

### **ERN 4.2 (Intermediate)**
Enhanced version with improved audio encoding support.

**Key Improvements over 4.1:**
- Comprehensive support for different audio encodings (stereo, binaural, Atmos, etc.) by augmenting the TechnicalResourceDetails
- **New Fields**: EncodingId, EncodingDescription, IsProvidedInDelivery flag
- **Breaking Change**: While in ERN 4.1 the presence of a TechnicalResourceDetails meant that the relevant resource file was part of the delivery, in ERN 4.2 the IsProvidedInDelivery flag must be set accordingly
- Clearly separates dates for Release availability from dates for Release visibility by moving ReleaseDisplayStartDateTime, CoverArtPreviewStartDateTime into separate composites in the Deal list

**Migration Considerations:**
- Must explicitly set `IsProvidedInDelivery` for all TechnicalResourceDetails
- Update date/time handling for territorial visibility
- Enhanced audio format metadata collection required

### **ERN 3.8.2 (Most Common)**
Current industry standard with extensive tooling support, with version 3.8.2 being the most common.

**Key Characteristics:**
- DetailsByTerritory composite requires complete metadata repetition
- Party information scattered throughout message sections
- Resource references: A1, A2, A3 (assets), R0, R1, R2 (releases)
- All track releases treated as full album releases
- Limited support for modern audio formats

**Message Structure:**
- MessageHeader
- ReleaseList  
- ResourceList
- DealList
- WorkList (optional)
- CueSheetList (optional)
- CollectionList (optional)

---

## **ERN 4.x vs ERN 3.x Architectural Differences**

### **Centralized Party Management (ERN 4.x)**
Parties such as musicians, writers, labels and others will now be collated in the NewReleaseMessage into a PartyList rather than that data appearing potentially several times through the NewReleaseMessage.

```xml
<!-- ERN 4.x: Centralized PartyList -->
<PartyList>
  <Party>
    <PartyReference>P1</PartyReference>
    <PartyName>
      <FullName>Artist Name</FullName>
    </PartyName>
  </Party>
</PartyList>

<!-- Referenced elsewhere -->
<DisplayArtist>
  <PartyName SequenceNumber="1">
    <PartyNameReference>P1</PartyNameReference>
  </PartyName>
</DisplayArtist>
```

### **Territorial Data Handling**
In ERN 3, even if the title of a recording does not change between different territories but the genre does, the title needs to be repeated in the relevant DetailsByTerritory composite. In ERN 4 there is no DetailsByTerritory composite any more. Instead, where territorial variations need to be communicated this appears in the main tag.

```xml
<!-- ERN 3.x: Full repetition required -->
<ReleaseDetailsByTerritory>
  <TerritoryCode>US</TerritoryCode>
  <!-- Complete metadata block repeated -->
</ReleaseDetailsByTerritory>

<!-- ERN 4.x: Granular territorial variations -->
<Title TerritoryCode="FR" LanguageAndScriptCode="fr">
  <TitleText>Titre Français</TitleText>
</Title>
```

---

## **File Choreography and Delivery Patterns**

### **DDEX Choreography Standards**
DDEX has also updated the ERN Choreography for Cloud Based Storage standard which defines how record companies or distributors can securely transmit information to DSPs and caters for non-repudiation requirements.

#### **Supported Choreography Methods:**
1. **Cloud-Based Storage (SFTP)** - DDEX defines two mechanisms to exchange ERN messages between two business partners using Secure File Transfer Protocol
2. **Web Services Exchange** - Atom-based web service architecture
3. **Direct API Integration** - For modern DSP implementations

### **Batch Folder Structure and Naming**
The batched SFTP protocol stipulates that the sender should place all ERN messages, plus all the required Resource files, into a folder named after "the date and time of the batch folder creation" in the form YYYYMMDDhhmmssnnn.

```
YYYYMMDDhhmmssnnn/           // Timestamp-based batch folder
├── BatchManifest.xml        // Batch description (optional)
├── Release1/
│   ├── {MessageID}.xml      // ERN message
│   ├── audio/
│   │   ├── {UPC}_01_001.wav
│   │   └── {UPC}_01_002.wav
│   └── images/
│       └── {UPC}.jpg
├── Release2/
│   └── ...
└── BatchComplete.txt        // Signals batch completion
```

### **Processing Order and Priority**
The ERN choreography standards for cloud-based file exchange support priority/non-priority indicators. These indicators enable a record company or distributor to provide a DSP with new releases and back-fills as discrete "queues".

**Priority Queue Signaling:**
- **Normal Priority**: Batch folder name starting with "N"
- **High Priority**: Batch folder name starting with "H" 
- **Backfill**: Batch folder name starting with "B"

```javascript
// Processing order implementation
function processBatches(batches) {
  const sortedBatches = batches.sort((a, b) => 
    a.timestamp.localeCompare(b.timestamp)
  );
  
  for (const batch of sortedBatches) {
    processBatch(batch);
  }
}
```

### **File Naming Standards**

#### **DDEX-Compliant Naming Convention**

**Audio Files:**
```
{UPC}_{DiscNumber}_{TrackNumber}.{extension}
```
**Examples:**
- `1234567890123_01_001.wav` (Track 1, Disc 1)
- `1234567890123_01_002.mp3` (Track 2, Disc 1)
- `1234567890123_02_001.flac` (Track 1, Disc 2)

**Cover Art:**
```
{UPC}.jpg                    // Main cover art
{UPC}_IMG_{XXX}.jpg         // Additional images
```
**Examples:**
- `1234567890123.jpg` (Main cover)
- `1234567890123_IMG_001.jpg` (Back cover)
- `1234567890123_IMG_002.jpg` (Booklet page 1)

**ERN XML Files:**
```
{MessageID}.xml
```
**Examples:**
- `MSG_DISTRO_001_20240815_143022.xml`
- `UMGD_ERN_20240815T143022Z.xml`

### **Acknowledgment Protocol**
DDEX recommends using acknowledgements when using the SFTP choreographies, to support non-repudiation.

**Acknowledgment Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<FtpAcknowledgementMessage>
  <MessageHeader>
    <MessageId>ACK_MSG_DISTRO_001_20240815_143022</MessageId>
    <MessageCreatedDateTime>2024-08-15T14:30:22Z</MessageCreatedDateTime>
  </MessageHeader>
  <AcknowledgementList>
    <Acknowledgement>
      <OriginalMessageId>MSG_DISTRO_001_20240815_143022</OriginalMessageId>
      <AcknowledgementType>MessageReceived</AcknowledgementType>
    </Acknowledgement>
  </AcknowledgementList>
</FtpAcknowledgementMessage>
```

---

## **MD5 Hash Validation and File Integrity**

### **Hash Calculation and Storage**
```javascript
function calculateMD5(fileBuffer) {
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

// Include MD5 in delivery manifest
const fileManifest = {
  name: ddexFileName,
  originalName: originalFileName,
  size: fileBuffer.length,
  md5Hash: calculateMD5(fileBuffer),
  uploadedAt: new Date().toISOString()
};
```

### **Validation Strategy**
```javascript
// DSP processing: Validate but don't reject on mismatch
function validateFile(file, expectedMD5) {
  const calculatedMD5 = calculateMD5(file.buffer);
  
  if (expectedMD5 !== calculatedMD5) {
    console.warn(`MD5 mismatch for ${file.name}: expected ${expectedMD5}, got ${calculatedMD5}`);
    // Continue processing - file may have been re-encoded
    return { valid: false, warning: 'MD5 mismatch - possible re-encoding' };
  }
  
  return { valid: true };
}
```

---

## **Message Types & SubTypes**

### **NewReleaseMessage**
The primary message type for communicating release information between distributors and DSPs.

#### **Message SubTypes**

**Initial:** First-time delivery of a release to a DSP.
- **Content**: Full metadata, audio files, artwork, and commercial deals
- **Purpose**: Create new catalog entry in DSP
- **Territory Information**: Complete territorial availability and commercial terms
- **Stardust Distro**: Generated for first delivery to each DSP
- **Stardust DSP**: Creates new release document with UPC-based ID

**Update:** Metadata or asset updates to existing releases.
- **Content**: Modified metadata, new/updated assets, revised deals
- **Purpose**: Correct or enhance existing release information
- **Preservation**: Existing commercial terms maintained unless explicitly changed
- **Stardust Distro**: Generated when release data is modified after initial delivery
- **Stardust DSP**: Merges with existing data while preserving play counts and user data

**Takedown:** Request to remove a release from distribution.
- **Content**: Minimal metadata identifying the release to be removed
- **Purpose**: Remove release from DSP catalog and stop distribution
- **Effect**: Release becomes unavailable to consumers
- **Stardust Distro**: Generated when release is marked for takedown
- **Stardust DSP**: Archives release data but maintains historical records

---

## **UPC-Based Deduplication Strategy**

### **Release Identification Strategy**
Both platforms use UPC as the primary identifier to prevent duplicate releases and enable proper update handling.

```javascript
// Document ID strategy
const releaseId = upc ? `UPC_${upc}` : `GR_${gridId}`;

// Check for existing release
const existingRelease = await db.collection("releases").doc(releaseId).get();

if (existingRelease.exists && messageType === 'Update') {
  // Merge with existing
} else if (existingRelease.exists && messageType === 'Initial') {
  // Log warning and overwrite (duplicate delivery)
} else {
  // Create new
}
```

### **Delivery History Tracking**
Each release maintains a complete delivery history:

```javascript
interface DeliveryHistory {
  deliveryId: string;
  messageType: 'Initial' | 'Update' | 'Takedown';
  processedAt: Timestamp;
  sender: string;
  ernVersion: string;
}
```

---

## **Implementation Standards**

### **For Distributors (Stardust Distro)**
1. **Version Strategy**: Default to ERN 4.3 for new implementations, maintain 3.8.2 for compatibility
2. **File Naming**: Always use DDEX-compliant naming conventions
3. **Validation**: Validate messages before delivery using DDEX Workbench API
4. **Complete Sets**: Include all active deals in every message
5. **Error Handling**: Implement comprehensive retry logic with exponential backoff
6. **Testing**: Test with Stardust DSP instance before sending to commercial DSPs

### **For DSPs (Stardust DSP)**
1. **Multi-Version Support**: Accept ERN 3.8.2, 4.2, and 4.3 during transition period
2. **UPC Deduplication**: Use UPC-based release identification consistently
3. **Graceful Updates**: Merge updates without losing user-generated data (play counts, favorites)
4. **Error Responses**: Provide detailed, actionable error messages
5. **Performance**: Use streaming parsers for large messages
6. **Monitoring**: Track ingestion metrics and delivery success rates

### **Security Considerations**
1. **Authentication**: Verify sender DPID in all messages
2. **File Validation**: Calculate and verify MD5 hashes
3. **Input Sanitization**: Sanitize all metadata fields before storage
4. **Access Control**: Implement role-based access for delivery management
5. **Audit Logging**: Log all delivery attempts and processing results

---

## **Future Roadmap**

### **Planned Enhancements**
- **ERN 5.0**: Monitor DDEX roadmap for next-generation features
- **Automated Testing**: Comprehensive test suite for all ERN versions
- **Analytics Integration**: Enhanced delivery and ingestion analytics
- **Performance Monitoring**: Real-time performance metrics and alerts
- **Developer Tools**: Visual ERN message builder and validator

### **Industry Trends**
- **Immersive Audio**: Growing adoption of Dolby Atmos and spatial audio
- **UGC Integration**: Increasing importance of user-generated content features
- **Classical Music**: Enhanced metadata requirements for classical repertoire
- **Global Expansion**: Better support for non-Western music markets
- **Sustainability**: Reduced message sizes and improved efficiency

---

*This document is maintained as part of the Stardust Ecosystem and should be updated as DDEX standards evolve and industry practices change.*