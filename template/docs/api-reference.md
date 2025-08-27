# API Reference 📚

Complete reference for Stardust Distro's Cloud Functions and service APIs.

## Table of Contents
- [Cloud Functions](#cloud-functions)
- [Service APIs](#service-apis)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)

---

## Cloud Functions

### Base URL
```
https://us-central1-[YOUR-PROJECT-ID].cloudfunctions.net/
```

### Authentication
All callable functions require Firebase Authentication. Include the auth token in your requests.

---

### calculateFileMD5

Calculate MD5 hash for a file from URL.

**Type**: Callable Function  
**Endpoint**: `/calculateFileMD5`  
**Method**: POST  
**Timeout**: 60 seconds  
**Memory**: 256MB  

#### Request
```javascript
{
  "url": "https://storage.googleapis.com/bucket/file.wav"
}
```

#### Response
```javascript
{
  "url": "https://storage.googleapis.com/bucket/file.wav",
  "md5": "5d41402abc4b2a76b9719d911017c592",
  "size": 15728640
}
```

#### Error Codes
- `unauthenticated`: User not authenticated
- `invalid-argument`: Missing or invalid URL
- `internal`: Failed to fetch or process file

---

### processDeliveryQueue

Processes pending deliveries from the queue.

**Type**: Scheduled Function  
**Schedule**: Every minute (`* * * * *`)  
**Timeout**: 540 seconds (9 minutes)  
**Memory**: 1GB  

#### Behavior
1. Queries deliveries with status `pending` or `retrying`
2. Processes up to 5 deliveries concurrently
3. Implements exponential backoff for retries
4. Updates delivery status and logs

#### Monitored Collections
- `/deliveries` - Delivery queue
- `/deliveryHistory` - Completed deliveries
- `/deliveryLogs` - Detailed logging

---

### checkDuplicates

Check for duplicate content using fingerprinting.

**Type**: Callable Function  
**Endpoint**: `/checkDuplicates`  
**Method**: POST  
**Timeout**: 60 seconds  

#### Request
```javascript
{
  "releaseId": "release123",
  "upc": "123456789012",
  "tracks": [
    {
      "isrc": "USRC17607839",
      "duration": 180
    }
  ]
}
```

#### Response
```javascript
{
  "isDuplicate": false,
  "duplicates": [],
  "fingerprint": "fp_abc123",
  "confidence": 0.0
}
```

---

### calculateAudioFingerprint

Generate acoustic fingerprint for audio similarity detection.

**Type**: Callable Function  
**Endpoint**: `/calculateAudioFingerprint`  
**Method**: POST  
**Memory**: 512MB  

#### Request
```javascript
{
  "audioUrl": "https://storage.googleapis.com/bucket/track.wav",
  "releaseId": "release123",
  "trackId": "track456"
}
```

#### Response
```javascript
{
  "fingerprint": "AQAAA...",
  "duration": 180,
  "sampleRate": 44100,
  "similarTracks": []
}
```

---

### deliverFTP

Execute FTP delivery with DDEX-compliant file naming.

**Type**: Internal Function  
**Called by**: processDeliveryQueue  
**Timeout**: 540 seconds  

#### Features
- DDEX file naming (UPC_Disc_Track.ext)
- MD5 hash validation
- Progress tracking
- Automatic retry on failure

---

### deliverSFTP

Execute SFTP delivery with SSH key or password authentication.

**Type**: Internal Function  
**Called by**: processDeliveryQueue  
**Timeout**: 540 seconds  

#### Features
- SSH key and password authentication
- DDEX-compliant file naming
- Secure file transfer
- Connection pooling

---

### deliverS3

Execute Amazon S3 delivery with multipart upload support.

**Type**: Internal Function  
**Called by**: processDeliveryQueue  
**Memory**: 1GB  

#### Features
- Multipart upload for large files
- MD5 validation via Content-MD5
- Custom metadata support
- Bucket versioning compatible

---

### deliverAzure

Execute Azure Blob Storage delivery.

**Type**: Internal Function  
**Called by**: processDeliveryQueue  

#### Features
- Block blob upload
- Container management
- SAS token support
- Metadata preservation

---

### deliverAPI

Execute REST API delivery to DSP endpoints.

**Type**: Internal Function  
**Called by**: processDeliveryQueue  

#### Features
- Multiple auth types (Bearer, Basic, API Key)
- Custom headers support
- JSON/XML payload formats
- Webhook response handling

---

### deliverStorage

Internal delivery to Firebase Storage (testing).

**Type**: Internal Function  
**Called by**: processDeliveryQueue  

#### Features
- Direct Storage upload
- Metadata preservation
- Public URL generation
- Testing mode support

---

### sendNotification

Send email and in-app notifications.

**Type**: Callable Function  
**Endpoint**: `/sendNotification`  
**Method**: POST  

#### Request
```javascript
{
  "userId": "user123",
  "type": "delivery_complete",
  "data": {
    "releaseTitle": "My Album",
    "targetName": "Spotify",
    "status": "completed"
  }
}
```

#### Notification Types
- `delivery_complete` - Delivery successful
-ためれ_failed` - Delivery failed
- `delivery_retry` - Retry scheduled
- `test_email` - Test notification
- `welcome` - New user welcome

---

### sendWeeklySummaries

Send weekly activity reports.

**Type**: Scheduled Function  
**Schedule**: Mondays at 9:00 AM  
**Timezone**: America/New_York  

#### Report Contents
- Delivery statistics
- New releases added
- Failed deliveries requiring attention
- Storage usage
- Platform updates

---

### onUserCreated

Triggered when a new user signs up.

**Type**: Auth Trigger  
**Event**: User creation  

#### Actions
1. Creates user profile in Firestore
2. Sends welcome email
3. Initializes default settings
4. Creates sample delivery target

---

## Service APIs

### Catalog Service

#### Create Release
```javascript
import { catalogService } from '@/services/catalog'

const release = await catalogService.createRelease({
  basic: {
    title: "Album Title",
    displayArtist: "Artist Name",
    releaseDate: "2025-01-01",
    label: "Label Name",
    upc: "123456789012"
  },
  tracks: [...],
  territories: {...}
})
```

#### Get Release
```javascript
const release = await catalogService.getRelease(releaseId)
```

#### Update Release
```javascript
await catalogService.updateRelease(releaseId, updates)
```

#### Delete Release
```javascript
await catalogService.deleteRelease(releaseId)
```

---

### Delivery Service

#### Queue Delivery
```javascript
import deliveryService from '@/services/delivery'

const delivery = await deliveryService.queueDelivery({
  releaseId: "release123",
  targetIds: ["target456", "target789"],
  priority: "normal",
  testMode: false
})
```

#### Get Delivery Status
```javascript
const status = await deliveryService.getDeliveryStatus(deliveryId)
```

#### Retry Delivery
```javascript
await deliveryService.retryDelivery(deliveryId)
```

#### Cancel Delivery
```javascript
await deliveryService.cancelDelivery(deliveryId)
```

---

### Asset Service

#### Upload Cover Image
```javascript
import assetService from '@/services/assets'

const result = await assetService.uploadCoverImage(file, {
  releaseId: "release123",
  onProgress: (progress) => console.log(`${progress}% uploaded`)
})
```

#### Upload Audio File
```javascript
const result = await assetService.uploadAudioFile(file, {
  releaseId: "release123",
  trackId: "track456",
  onProgress: (progress) => console.log(`${progress}% uploaded`)
})
```

---

### ERN Service

#### Generate ERN 4.3
```javascript
import ernService from '@/services/ern'

const ern = await ernService.generateERN(release, {
  version: '43',
  target: targetConfig,
  messageType: 'NewReleaseMessage'
})
```

#### Supported Versions
- `43` - ERN 4.3 (recommended)
- `42` - ERN 4.2
- `382` - ERN 3.8.2 (legacy)

#### Message Types
- `NewReleaseMessage` - Initial delivery
- `UpdateReleaseMessage` - Update existing
- `TakedownMessage` - Remove from DSP

---

### Genre Mapping Service

#### Get Genre Mapping
```javascript
import genreMappingService from '@/services/genreMappings'

const mapping = await genreMappingService.getMappingForTarget(
  'apple',
  userId
)
```

#### Map Genre
```javascript
const mappedGenre = await genreMappingService.mapGenre(
  sourceGenre,
  targetDSP,
  mappingConfig
)
```

---

## Authentication

### Firebase Auth Integration

All API calls require authentication via Firebase Auth:

```javascript
import { auth } from '@/firebase'

// Get current user token
const token = await auth.currentUser.getIdToken()

// Include in function calls
const response = await fetch(functionUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
```

### Security Rules

Firestore security rules enforce:
- User isolation (users can only access their own data)
- Role-based access (admin functions require admin claim)
- Rate limiting (max writes per minute)
- Size restrictions (max document size)

---

## Error Handling

### Error Response Format

```javascript
{
  "error": {
    "code": "invalid-argument",
    "message": "Missing required field: upc",
    "details": {
      "field": "upc",
      "requirement": "12-14 digit UPC/EAN"
    }
  }
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|------------|------------|
| `unauthenticated` | Missing or invalid auth | Sign in required |
| `permission-denied` | Insufficient permissions | Check user role |
| `invalid-argument` | Invalid input data | Validate request |
| `not-found` | Resource doesn't exist | Check ID |
| `already-exists` | Duplicate resource | Use update instead |
| `failed-precondition` | System not ready | Retry later |
| `resource-exhausted` | Rate limit exceeded | Implement backoff |
| `internal` | Server error | Contact support |

---

## Rate Limits

### Function Limits

| Function | Requests/Minute | Concurrent | Timeout |
|----------|----------------|------------|---------|
| calculateFileMD5 | 60 | 10 | 60s |
| processDeliveryQueue | N/A | 1 | 540s |
| checkDuplicates | 30 | 5 | 60s |
| sendNotification | 100 | 20 | 30s |
| deliverFTP | 10 | 5 | 540s |
| deliverS3 | 20 | 10 | 540s |

### Firestore Limits

- **Writes**: 500 per second per database
- **Reads**: 50,000 per second per database
- **Document Size**: 1MB maximum
- **Collection Depth**: 100 levels

### Storage Limits

- **File Size**: 5GB per file
- **Upload Bandwidth**: 1GB/sec per project
- **Download Bandwidth**: 10GB/sec per project
- **Metadata Size**: 8KB per object

---

## Best Practices

### Performance Optimization

1. **Batch Operations**
   ```javascript
   const batch = db.batch()
   docs.forEach(doc => batch.set(doc.ref, doc.data))
   await batch.commit()
   ```

2. **Pagination**
   ```javascript
   const snapshot = await db.collection('releases')
     .orderBy('createdAt')
     .limit(20)
     .startAfter(lastDoc)
     .get()
   ```

3. **Caching**
   - Cache ERN templates
   - Store genre mappings locally
   - Cache authentication tokens

### Error Recovery

1. **Implement Exponential Backoff**
   ```javascript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn()
       } catch (error) {
         if (i === maxRetries - 1) throw error
         await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000))
       }
     }
   }
   ```

2. **Handle Network Failures**
   - Check connectivity before operations
   - Queue operations for offline mode
   - Sync when connection restored

### Security

1. **Never expose sensitive data**
   - API keys in environment variables
   - Encrypt stored credentials
   - Use Firebase Security Rules

2. **Validate all inputs**
   - Sanitize user input
   - Validate against schemas
   - Check permissions before operations

---

## Support

For API issues or questions:
- GitHub Issues: [github.com/yourusername/stardust-distro/issues](https://github.com/yourusername/stardust-distro/issues)
- Documentation: [docs.stardust-distro.com](https://docs.stardust-distro.com)
- Community: [discord.gg/stardust](https://discord.gg/stardust)

---

*API Version: 1.0.0 | Last Updated: August 2025*