# Stardust Distro - Technical Blueprint

## System Overview

Stardust Distro is a Vue 3 (Composition API) application with Firebase backend that provides a complete music distribution platform. The system generates DDEX-compliant ERN messages and Apple Music XML packages, delivering them to DSPs via multiple protocols.

## Project Structure

```
stardust-distro/
├── cli/                           # CLI tool for scaffolding
│   ├── bin/                       # Executable scripts
│   │   └── stardust-distro.js     # Main CLI entry
│   ├── commands/                  # CLI commands
│   │   ├── create.js              # Create new project
│   │   ├── init.js                # Initialize Firebase
│   │   ├── deploy.js              # Deploy to Firebase
│   │   ├── configure.js           # Configure delivery targets
│   │   ├── target.js              # Manage delivery targets
│   │   └── dev.js                 # Development server
│   ├── package.json               # CLI dependencies
│   └── templates/                 # Project templates
│       └── default/               # Default template
│           └── (full Vue app)     # Complete template structure
├── node_modules/                  # Dependencies (git-ignored)
├── template/                      # Default project template
│   ├── dist/                      # Build output (git-ignored)
│   ├── docs/                      # Documentation
│   │   ├── api-reference.md       # API reference guide
│   │   ├── catalog-import.md      # Catalog migration guide
│   │   ├── configuration.md       # Configuration guide
│   │   ├── DDEX.md                # DDEX standards implementation
│   │   ├── delivery-setup.md      # Delivery target setup
│   │   ├── genre-mapping.md       # Genre mapping guide
│   │   ├── getting-started.md     # Quick start guide
│   │   ├── release-creation.md    # Release creation guide
│   │   ├── security.md            # Security audit report
│   │   ├── testing-guide.md       # Testing suite guide
│   │   └── troubleshooting.md     # Common issues and solutions
│   ├── functions/                 # Cloud Functions
│   │   ├── api/                   # Public APIs
│   │   │   ├── deezer.js          # Deezer API integration
│   │   │   └── spotify.js         # Spotify API integration
│   │   ├── delivery/              # Delivery engine
│   │   │   ├── handlers.js        # Protocol-specific handlers
│   │   │   ├── processing.js      # Queue processor and package preparation
│   │   │   └── protocols.js       # Protocol implementations
│   │   ├── middleware/            # Middleware functions
│   │   │   ├── auth.js            # Authentication verification
│   │   │   └── validation.js      # Request validation factory
│   │   ├── services/              # Service layer
│   │   │   ├── assetMetadata.js   # Audio/image metadata extraction
│   │   │   ├── fingerprinting.js  # Content deduplication
│   │   │   └── notifications.js   # Email notification service
│   │   ├── utils/                 # Utility functions
│   │   │   ├── helpers.js         # Common utilities (MD5, file ops)
│   │   │   ├── testing.js         # Connection testing utilities
│   │   │   └── validation.js      # Zod schemas for validation
│   │   ├── encryption.js          # KMS encryption/decryption
│   │   ├── index.js               # Main exports (v2 functions)
│   │   ├── package.json           # Dependencies
│   │   └── package-lock.json      # Locked dependencies
│   ├── public/                    # Static assets
│   │   └── index.html             # HTML template
│   ├── src/                       # Vue application
│   │   ├── assets/                # Design system CSS
│   │   │   ├── base.css           # Reset, normalization, typography
│   │   │   ├── components.css     # Component and utility classes
│   │   │   ├── main.css           # Entry point for styles
│   │   │   └── themes.css         # CSS variables, theme support
│   │   ├── components/            # Vue components
│   │   │   ├── delivery/          # Delivery components
│   │   │   │   ├── DeliveryTargetForm.vue  # Target configuration
│   │   │   │   └── ERNVisualization.vue    # D3 tree visualization
│   │   │   ├── ArtistForm.vue     # Artist profile management
│   │   │   ├── DuplicateWarning.vue        # Fingerprint detection UI
│   │   │   ├── GenreSelector.vue  # Unified genre selection
│   │   │   ├── MigrationStatus.vue         # Import progress modal
│   │   │   ├── NavBar.vue         # Navigation component
│   │   │   └── ReconciliationDashboard.vue # Receipt manager
│   │   ├── composables/           # Vue composables
│   │   │   ├── useArtists.js      # Artist state management
│   │   │   ├── useAuth.js         # Authentication logic
│   │   │   ├── useCatalog.js      # Catalog operations
│   │   │   └── useDelivery.js     # Delivery operations
│   │   ├── dictionaries/          # Data dictionaries
│   │   │   ├── contributors/      # Contributor roles
│   │   │   │   ├── composer-lyricist.js
│   │   │   │   ├── index.js
│   │   │   │   ├── performer.js
│   │   │   │   └── producer-engineer.js
│   │   │   ├── currencies/        # ISO 4217 currencies
│   │   │   │   └── index.js
│   │   │   ├── genres/            # Genre classifications
│   │   │   │   ├── amazon-201805.js
│   │   │   │   ├── apple-539.js
│   │   │   │   ├── beatport-202505.js
│   │   │   │   ├── default.js
│   │   │   │   ├── genre-truth.js
│   │   │   │   ├── index.js
│   │   │   │   └── mappings.js
│   │   │   ├── languages/         # ISO 639 languages
│   │   │   │   └── index.js
│   │   │   ├── mead/              # DDEX MEAD 1.1
│   │   │   │   └── index.js
│   │   │   └── territories/       # ISO 3166 territories
│   │   │       └── index.js
│   │   ├── router/                # Vue Router
│   │   │   └── index.js           # Route definitions
│   │   ├── services/              # Frontend services
│   │   │   ├── apple.js           # Apple Music XML service
│   │   │   ├── apple/             # Apple version builders
│   │   │   │   └── apple-5323.js
│   │   │   ├── assets.js          # Asset upload service
│   │   │   ├── assetMetadata.js   # Metadata extraction
│   │   │   ├── catalog.js         # Release management
│   │   │   ├── delivery.js        # Delivery service
│   │   │   ├── deliveryHistory.js # Delivery logging
│   │   │   ├── deliveryTargets.js # Target management
│   │   │   ├── ern.js             # ERN generation service
│   │   │   ├── ern/               # ERN version builders
│   │   │   │   ├── ern-382.js
│   │   │   │   ├── ern-42.js
│   │   │   │   └── ern-43.js
│   │   │   ├── fingerprints.js    # Duplicate detection
│   │   │   ├── genreMappings.js   # Genre mapping service
│   │   │   ├── import.js          # Catalog import service
│   │   │   ├── receipts.js        # Receipt generation
│   │   │   └── testTargets.js     # Test DSP configurations
│   │   ├── utils/                 # Frontend utilities
│   │   │   ├── releaseClassifier.js # DDEX classification
│   │   │   ├── sanitizer.js       # DOMPurify integration
│   │   │   ├── urlUtils.js        # XML URL escaping
│   │   │   └── validation.js      # Zod validation schemas
│   │   ├── views/                 # Vue views (pages)
│   │   │   ├── Analytics.vue      # Platform analytics
│   │   │   ├── Catalog.vue        # Release catalog
│   │   │   ├── Dashboard.vue      # User dashboard
│   │   │   ├── Deliveries.vue     # Delivery monitoring
│   │   │   ├── DeliveryDetail.vue # Single delivery view
│   │   │   ├── Login.vue          # Authentication page
│   │   │   ├── Migration.vue      # Catalog import wizard
│   │   │   ├── NewDelivery.vue    # Create delivery
│   │   │   ├── NewRelease.vue     # Release creation wizard
│   │   │   ├── NotFound.vue       # 404 page
│   │   │   ├── ReleaseDetail.vue  # Release details/edit
│   │   │   ├── Settings.vue       # Platform settings
│   │   │   ├── Signup.vue         # Registration page
│   │   │   ├── SplashPage.vue     # Landing page
│   │   │   └── Testing.vue        # Testing suite UI
│   │   ├── firebase.js            # Firebase initialization
│   │   ├── App.vue                # Root component
│   │   └── main.js                # Application entry
│   ├── .env                       # Environment variables (ignored)
│   ├── .env.example               # Environment template
│   ├── .gitignore                 # Git ignore rules
│   ├── firebase.json              # Firebase configuration
│   ├── firestore.indexes.json     # Database indexes
│   ├── firestore.rules            # Security rules
│   ├── index.html                 # HTML entry
│   ├── package.json               # Project dependencies
│   ├── storage.rules              # Storage security rules
│   └── vite.config.js             # Vite configuration
├── .firebaserc                    # Firebase project config
├── .gitignore                     # Root git ignore
├── blueprint.md                   # This document
├── dev-notes.md                   # Development notes
├── CONTRIBUTING.md                # Contribution guidelines
├── LICENSE                        # MIT License
├── package.json                   # Root package config
└── README.md                      # Project overview
```

## CSS Architecture

The `/assets` folder contains four core CSS files that power the design system:

- **main.css**: Entry point importing all stylesheets in correct order
- **base.css**: CSS reset, browser normalization, base typography, global element styles
- **themes.css**: CSS custom properties for colors, spacing, typography, shadows, transitions. Supports light/dark/auto themes via data attributes
- **components.css**: Reusable component classes (.btn, .card, .form-input) and semantic utility classes for spacing (.mt-md, .p-lg), typography (.text-primary, .font-semibold), layout (.grid, .flex), enabling consistent UI without custom CSS

## Core Architecture

### Technology Stack
- **Frontend**: Vue 3 with Composition API, Vite build system
- **Backend**: Firebase (Firestore, Cloud Functions v2, Storage, Auth)
- **Cloud Functions**: Node.js 18 runtime with Firebase Functions v2
- **Delivery Protocols**: FTP (basic-ftp), SFTP (ssh2), S3 (AWS SDK v3), REST API (axios), Azure Blob Storage
- **External APIs**: Spotify Web API, Deezer API for metadata retrieval
- **Email**: Firebase Email Extension with Gmail SMTP
- **Security**: DOMPurify for XSS prevention, Zod for validation, Cloud KMS for encryption
- **Visualization**: D3 with @d3/tidy for ERN tree visualization
- **CLI Tool**: Node.js with Commander.js for project scaffolding

### Firebase Infrastructure
- **Authentication**: Email/password and Google OAuth providers
- **Firestore Database**: NoSQL document database with real-time sync
- **Cloud Storage**: File storage with signed URLs and CDN
- **Cloud Functions v2**: Serverless compute with scheduled jobs
- **Security Rules**: Row-level security with tenant isolation
- **Cloud KMS**: Encryption for sensitive credentials

## Core Functionality

### 1. Catalog Management System
- **Release CRUD**: Create, read, update, delete releases with draft auto-save
- **Track Management**: Sequencing, reordering, metadata editing
- **Asset Processing**: Audio file validation (WAV/FLAC/MP3), cover art handling
- **Bulk Operations**: Select all, bulk status updates, bulk delete, bulk export
- **Search & Filter**: Real-time search with status and type filtering
- **Version Control**: Release history with update tracking
- **Draft System**: Auto-save every 3 seconds with recovery support

### 2. ERN & Apple Music Generation
- **ERN Versions**: 3.8.2, 4.2, and 4.3 with profile-specific generation
- **Apple Music**: XML generation following Spec 5.3.23
- **Message Types**: NewReleaseMessage with Initial/Update/Takedown subtypes
- **DDEX Naming**: UPC-based file naming (UPC_Disc_Track.extension)
- **Hash Generation**: MD5, SHA-256, SHA-1 for all files
- **XML Safety**: URL escaping for Firebase Storage URLs
- **Profile Detection**: Automatic release type classification

### 3. Delivery System
- **Queue Processing**: Firestore-based queue with scheduled Cloud Function (every minute)
- **Multi-Protocol**: FTP/SFTP/S3/API/Azure with protocol-specific handlers
- **Retry Logic**: Exponential backoff (3 attempts: immediate, 5min, 15min)
- **Transaction Locks**: Prevents concurrent processing of same delivery
- **Real-time Logs**: Structured logging with levels (info/warning/error/success)
- **Connection Testing**: Pre-delivery validation of DSP connections
- **Idempotency**: Message ID generation prevents duplicate deliveries
- **Receipt Generation**: Downloadable PDF receipts for completed deliveries

### 4. Genre Classification System
- **Genre Truth**: 200+ hierarchical genres based on Apple Music 5.3.9
- **DSP Dictionaries**: Apple, Beatport, Amazon genre support
- **Mapping Interface**: Visual mapping tool with drag-and-drop UI
- **Auto-Suggest**: Levenshtein distance-based suggestions
- **Strict Mode**: Reject deliveries if genre can't be mapped
- **Fallback Support**: Default genre for unmappable entries
- **Per-DSP Mapping**: Custom mappings for each delivery target

### 5. Catalog Import System
- **Dual-Mode Import**: CSV + files (standard) or files-only (metadata-less)
- **CSV Parser**: Flexible field mapping with auto-detection
- **API Integration**: Spotify and Deezer for metadata retrieval
- **Metadata Synthesis**: Combines best data from multiple sources
- **DDEX Validation**: File naming convention enforcement
- **Batch Processing**: Handles 1000s of releases efficiently
- **Resume Support**: Persistent import jobs in Firestore
- **Progress Tracking**: Real-time import status with visual indicators

### 6. Content Security
- **Fingerprinting**: MD5, SHA-256, SHA-1 hash generation
- **Audio Similarity**: Chunk-based audio comparison
- **Duplicate Detection**: Catalog-wide duplicate checking
- **Idempotency Keys**: Prevents duplicate deliveries
- **Input Validation**: DOMPurify + Zod schemas
- **Credential Encryption**: Cloud KMS for sensitive data
- **File Validation**: Magic number verification
- **XSS Prevention**: Comprehensive input sanitization

### 7. Multi-Tenant Architecture
- **Data Isolation**: Firestore security rules ensure tenant separation
- **User Roles**: Admin, manager, viewer with RBAC
- **Team Management**: Multiple users per tenant
- **Custom Branding**: Per-tenant theming and configuration
- **Tenant Settings**: Custom delivery defaults and preferences

### 8. Testing Suite
- **System Health**: Firebase service monitoring (Auth/Firestore/Storage/Functions)
- **DDEX Compliance**: ERN validation, file naming, hash verification
- **Protocol Testing**: FTP/SFTP/S3/API connection tests
- **Performance Benchmarks**: <5s ERN generation, <500ms queries
- **Test Isolation**: Uses test data only, production-safe
- **OWASP Integration**: Security vulnerability scanning

### 9. Email Notifications
- **Gmail SMTP**: Via Firebase Email Extension
- **Templates**: Welcome, delivery status, weekly summaries
- **User Preferences**: Toggle notifications by type
- **Queue Management**: Firestore mail collection
- **Batch Sending**: Aggregated notifications for efficiency

### 10. MEAD Integration
- **MEAD 1.1**: Complete dictionary implementation
- **Mood Classification**: 60+ moods across 4 categories
- **Musical Characteristics**: BPM, key, time signature
- **Discovery Metadata**: Focus track, playlist suitability
- **Track Overrides**: Per-track MEAD data

## Key Technical Decisions

### Firebase Functions v2
- Better performance and resource allocation
- Supports larger payloads (32MB vs 10MB)
- Concurrent executions up to 1000
- Region selection for lower latency
- Improved cold start performance

### Firestore Document IDs
- Releases: `UPC_{upc}` for deduplication
- Users: Firebase Auth UID
- Deliveries: Auto-generated with timestamps
- Fingerprints: SHA-256 hash as document ID
- Genre Mappings: `{userId}_{dspType}` for uniqueness

### File Storage Strategy
- User-scoped paths: `/users/{uid}/releases/{releaseId}/`
- DDEX naming for deliveries
- Signed URLs with 1-hour expiration
- CDN distribution via Firebase Storage
- Sanitized filenames to prevent attacks

### Queue Processing
- Scheduled function runs every minute
- Transaction locks prevent double processing
- Status progression: queued → processing → completed/failed
- Automatic cleanup of stale locks after 1 hour
- Retry attempts tracked with timestamps

### Security Layers
- Firebase Auth required for all operations
- Firestore rules enforce tenant isolation
- Input validation with Zod schemas
- DOMPurify for XSS prevention
- File validation by magic numbers
- Rate limiting on Cloud Functions
- Encrypted credentials with Cloud KMS
- Secure file naming and path generation

## Environment Configuration

Required environment variables (.env):

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# API Keys (optional but recommended)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
DEEZER_APP_ID=
DEEZER_SECRET=

# Email Configuration
GMAIL_EMAIL=
GMAIL_APP_PASSWORD=

# Security
ENCRYPTION_KEY= # For Cloud KMS

# Organization Details
VITE_ORGANIZATION_NAME=
VITE_DISTRIBUTOR_ID=
```

## Deployment Configuration

Firebase services required:
- Authentication (Email/Password + Google)
- Firestore Database
- Cloud Storage
- Cloud Functions (Blaze plan required)
- Firebase Hosting
- Cloud KMS (for credential encryption)

## Performance Targets

- Release Creation: <2s to save
- ERN Generation: <5s for complete package
- File Upload: Progressive with chunking
- Catalog Search: <500ms for 10k releases
- Delivery Processing: <3.2min average
- Dashboard Load: <1s initial render

## Development Workflow

1. **Local Development**
   ```bash
   cd template
   npm run dev
   ```

2. **Functions Testing**
   ```bash
   cd template/functions
   npm run serve
   ```

3. **Deploy to Production**
   ```bash
   firebase deploy
   ```

4. **Run Test Suite**
   - Navigate to `/testing` in the application
   - Run all tests to verify system health

## API Endpoints (Cloud Functions v2)

### Public Endpoints
- `calculateFileMD5`: Generate MD5 hash for files
- `testDeliveryConnection`: Test DSP connectivity
- `encryptSensitiveData`: Encrypt credentials
- `decryptSensitiveData`: Decrypt credentials
- `querySpotifyAlbum`: Fetch Spotify metadata
- `queryDeezerAlbum`: Fetch Deezer metadata

### Scheduled Functions
- `processDeliveryQueue`: Runs every minute
- `cleanupStaleLocks`: Runs every hour
- `sendWeeklySummaries`: Runs weekly

### Triggered Functions
- `onReleaseCreate`: Firestore trigger on release creation
- `onDeliveryComplete`: Firestore trigger on delivery completion
- `onUserSignup`: Auth trigger on new user registration

## Security Checklist

✅ **Input Validation**: All inputs sanitized with DOMPurify
✅ **Authentication**: Firebase Auth on all operations
✅ **Authorization**: RBAC with Firestore rules
✅ **Encryption**: Sensitive data encrypted with Cloud KMS
✅ **File Security**: Magic number validation
✅ **XSS Prevention**: Comprehensive sanitization
✅ **CSRF Protection**: Firebase handles automatically
✅ **Rate Limiting**: Implemented on all endpoints
✅ **Audit Logging**: All operations logged
✅ **Secure Storage**: Signed URLs with expiration

## Production Readiness

The platform is production-ready with:
- 100% test suite pass rate
- Comprehensive error handling
- Real-time monitoring and logging
- Scalable Firebase infrastructure
- Complete documentation
- Active maintenance and updates

This blueprint serves as the authoritative technical specification for Stardust Distro development and deployment.