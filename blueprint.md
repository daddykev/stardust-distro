# Stardust Distro - Technical Blueprint

## System Overview

Stardust Distro is a Vue 3 (Composition API) application with Firebase backend that provides a complete music distribution platform. The system generates DDEX-compliant ERN messages and Apple Music XML packages, delivering them to DSPs via multiple protocols.

## Core Architecture

### Technology Stack
- **Frontend**: Vue 3 with Composition API, Vite build system
- **Backend**: Firebase (Firestore, Cloud Functions v2, Storage, Auth)
- **Cloud Functions**: Node.js 18 runtime with Firebase Functions v2
- **Delivery Protocols**: FTP (basic-ftp), SFTP (ssh2), S3 (AWS SDK v3), REST API (axios), Azure Blob Storage
- **External APIs**: Spotify Web API, Deezer API for metadata retrieval
- **Email**: Firebase Email Extension with Gmail SMTP
- **CLI Tool**: Node.js with Commander.js for project scaffolding

### Firebase Infrastructure
- **Authentication**: Email/password and Google OAuth providers
- **Firestore Database**: NoSQL document database with real-time sync
- **Cloud Storage**: File storage with signed URLs and CDN
- **Cloud Functions v2**: Serverless compute with scheduled jobs
- **Security Rules**: Row-level security with tenant isolation

## Core Functionality

### 1. Catalog Management System
- **Release CRUD**: Create, read, update, delete releases with draft auto-save
- **Track Management**: Sequencing, reordering, metadata editing
- **Asset Processing**: Audio file validation (WAV/FLAC/MP3), cover art handling
- **Bulk Operations**: Select all, bulk status updates, bulk delete, bulk export
- **Search & Filter**: Real-time search with status and type filtering
- **Version Control**: Release history with update tracking

### 2. ERN & Apple Music Generation
- **ERN Versions**: 3.8.2, 4.2, and 4.3 with profile-specific generation
- **Apple Music**: XML generation following Spec 5.3.23
- **Message Types**: NewReleaseMessage with Initial/Update/Takedown subtypes
- **DDEX Naming**: UPC-based file naming (UPC_Disc_Track.extension)
- **Hash Generation**: MD5, SHA-256, SHA-1 for all files
- **XML Safety**: URL escaping for Firebase Storage URLs

### 3. Delivery System
- **Queue Processing**: Firestore-based queue with scheduled Cloud Function (every minute)
- **Multi-Protocol**: FTP/SFTP/S3/API/Azure with protocol-specific handlers
- **Retry Logic**: Exponential backoff (3 attempts: immediate, 5min, 15min)
- **Transaction Locks**: Prevents concurrent processing of same delivery
- **Real-time Logs**: Structured logging with levels (info/warning/error/success)
- **Connection Testing**: Pre-delivery validation of DSP connections

### 4. Genre Classification System
- **Genre Truth**: 200+ hierarchical genres based on Apple Music 5.3.9
- **DSP Dictionaries**: Apple, Beatport, Amazon genre support
- **Mapping Interface**: Visual mapping tool with drag-and-drop UI
- **Auto-Suggest**: Levenshtein distance-based suggestions
- **Strict Mode**: Reject deliveries if genre can't be mapped
- **Fallback Support**: Default genre for unmappable entries

### 5. Catalog Import System
- **Dual-Mode Import**: CSV + files (standard) or files-only (metadata-less)
- **CSV Parser**: Flexible field mapping with auto-detection
- **API Integration**: Spotify and Deezer for metadata retrieval
- **Metadata Synthesis**: Combines best data from multiple sources
- **DDEX Validation**: File naming convention enforcement
- **Batch Processing**: Handles 1000s of releases efficiently
- **Resume Support**: Persistent import jobs in Firestore

### 6. Content Security
- **Fingerprinting**: MD5, SHA-256, SHA-1 hash generation
- **Audio Similarity**: Chunk-based audio comparison
- **Duplicate Detection**: Catalog-wide duplicate checking
- **Idempotency Keys**: Prevents duplicate deliveries
- **Input Validation**: DOMPurify + Zod schemas
- **Credential Encryption**: Cloud KMS for sensitive data

### 7. Multi-Tenant Architecture
- **Data Isolation**: Firestore security rules ensure tenant separation
- **User Roles**: Admin, manager, viewer with RBAC
- **Team Management**: Multiple users per tenant
- **Custom Branding**: Per-tenant theming and configuration

### 8. Testing Suite
- **System Health**: Firebase service monitoring (Auth/Firestore/Storage/Functions)
- **DDEX Compliance**: ERN validation, file naming, hash verification
- **Protocol Testing**: FTP/SFTP/S3/API connection tests
- **Performance Benchmarks**: <5s ERN generation, <500ms queries
- **Test Isolation**: Uses test data only, production-safe

### 9. Email Notifications
- **Gmail SMTP**: Via Firebase Email Extension
- **Templates**: Welcome, delivery status, weekly summaries
- **User Preferences**: Toggle notifications by type
- **Queue Management**: Firestore mail collection

### 10. MEAD Integration
- **MEAD 1.1**: Complete dictionary implementation
- **Mood Classification**: 60+ moods across 4 categories
- **Musical Characteristics**: BPM, key, time signature
- **Discovery Metadata**: Focus track, playlist suitability
- **Track Overrides**: Per-track MEAD data

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
│   │   ├── testing-guide.md       # Testing component guide
│   │   └── troubleshooting.md     # Troubleshooting guide
│   ├── functions/                 # Cloud Functions
│   │   ├── api/                   # Public APIs
│   │   │   ├── deezer.js          # Deezer API queries
│   │   │   └── spotify.js         # Spotify API queries
│   │   ├── delivery/              # Delivery
│   │   │   ├── handlers.js        # Cloud handlers for delivery protocols
│   │   │   ├── processing.js      # Queue processing, locks, and package prep
│   │   │   └── protocols.js       # FTP/SFTP/S3/API/Azure/Storage
│   │   ├── middleware/            # Middleware functions
│   │   │   ├── auth.js            # To verify authentication
│   │   │   └── validation.js      # Factory for request validation
│   │   ├── node_modules/          # Dependencies (git-ignored)
│   │   ├── services/              # Services
│   │   │   ├── assetMetadata.js   # Extract metadata from audio and images
│   │   │   ├── fingerprinting.js  # Deduplication via MD5/SHA hashing
│   │   │   └── notifications.js   # Email notifications and weekly summaries
│   │   ├── utils/                 # Util functions
│   │   │   ├── helpers.js         # Common utils (MD5, file ops, logging)
│   │   │   ├── testing.js         # Connection testing and test API endpoint
│   │   │   └── validation.js      # Validation schemas for cloud functions
│   │   ├── encryption.js          # Server-side encrypt-decrypt
│   │   ├── index.js               # Main functions and exports (v2)
│   │   ├── package.json           # Dependencies (v2)
│   │   └── package-lock.json      # Locked dependencies
│   ├── public/                    # Static assets
│   │   └── index.html             # HTML template
│   ├── src/                       # Vue application
│   │   ├── assets/                # Design system CSS architecture
│   │   │   ├── base.css           # CSS reset, normalization, base typography
│   │   │   ├── components.css     # Reusable component & utility classes
│   │   │   ├── main.css           # Entry point importing all stylesheets
│   │   │   └── themes.css         # CSS custom properties, light/dark themes
│   │   ├── components/            # UI components
│   │   │   ├── delivery/          # Delivery management
│   │   │   │   ├── DeliveryTargetForm.vue  # Target configuration
│   │   │   │   └── ERNVisualization.vue  # D3 Tidy tree visualization of XML
│   │   │   ├── ArtistForm.vue     # Create and edit artist profiles
│   │   │   ├── DuplicateWarning.vue  # Fingerprint analysis tool
│   │   │   ├── GenreSelector.vue  # Unified genre selector tool
│   │   │   ├── MigrationStatus.vue  # Catalog import modal
│   │   │   ├── NavBar.vue         # Navigation bar component
│   │   │   └── ReconciliationDashboard.vue  # Delivery receipts
│   │   ├── composables/           # Vue composables
│   │   │   ├── useArtists.js      # Manages global artist state
│   │   │   ├── useAuth.js         # Authentication composable
│   │   │   ├── useCatalog.js      # Catalog operations
│   │   │   └── useDelivery.js     # Delivery operations
│   │   ├── dictionaries/          # Centralized data dictionaries
│   │   │   ├── contributors/      # Contributor roles
│   │   │   │   ├── composer-lyricist.js  # Composer-lyricist roles
│   │   │   │   ├── index.js       # Contributor service and API
│   │   │   │   ├── performer.js   # Performer roles
│   │   │   │   └── producer-engineer.js  # Producer-engineer roles
│   │   │   ├── currencies/        # Currency dictionary
│   │   │   │   └── index.js       # Based on ISO 4217
│   │   │   ├── genres/            # Genre classification system
│   │   │   │   ├── amazon-201805.js  # Amazon genres v2018-05
│   │   │   │   ├── apple-539.js   # Apple Music genres v5.3.9
│   │   │   │   ├── beatport-202505.js  # Beatport genres v2025-05
│   │   │   │   ├── default.js     # Default genre export
│   │   │   │   ├── genre-truth.js # Genre truth
│   │   │   │   ├── index.js       # Genre service and API
│   │   │   │   └── mappings.js    # Genre mappings
│   │   │   ├── languages/         # Language dictionary
│   │   │   │   └── index.js       # Based on ISO 639-1 and ISO 639-2
│   │   │   ├── mead/              # DDEX MEAD dictionary
│   │   │   │   └── index.js       # Based on MEAD 1.1
│   │   │   └── territories/       # Territory dictionary
│   │   │       └── index.js       # Based on ISO 3166-1
│   │   ├── router/                # Vue Router
│   │   │   └── index.js           # Route definitions
│   │   ├── services/              # API services
│   │   │   ├── apple.js           # Apple Music XML generation
│   │   │   ├── apple/             # Apple versions
│   │   │   │   ├── apple-5323.js  # Apple 5.3.23 builder
│   │   │   ├── artists.js         # Artist operations
│   │   │   ├── assetMetadata.js   # Enhanced metadata for audio and images
│   │   │   ├── assets.js          # Asset management
│   │   │   ├── batch.js           # Migration batch operations
│   │   │   ├── catalog.js         # Catalog operations
│   │   │   ├── delivery.js        # Delivery operations
│   │   │   ├── deliveryHistory.js # Logger for delivery history
│   │   │   ├── deliveryTargets.js # Target management
│   │   │   ├── ern.js             # ERN XML generation
│   │   │   ├── ern/               # ERN versions
│   │   │   │   ├── ern-42.js      # ERN 4.2 builder
│   │   │   │   ├── ern-43.js      # ERN 4.3 builder
│   │   │   │   └── ern-382.js     # ERN 3.8.2 builder
│   │   │   ├── fingerprints.js    # Fingerprint service with cloud functions
│   │   │   ├── genreMappings.js   # Genre map Firestore service
│   │   │   ├── import.js          # Catalog migration service
│   │   │   ├── mead.js            # MEAD XML builder
│   │   │   ├── metadataSynthesizer.js. # Metadata synth
│   │   │   ├── productMetadata.js  # Product metadata operations
│   │   │   ├── receipts.js        # Enhanced delivery receipts
│   │   │   └── testTargets.js     # Test DSP targets
│   │   ├── utils/                 # Utils
│   │   │   ├── releaseClassifier.js  # Classify release by DDEX standards
│   │   │   ├── santizer.js        # Frontend Sanitizer Utility
│   │   │   ├── urlUtils.js        # Escapes URLs for safe XML
│   │   │   └── validation.js      # Frontend Validation Schemas
│   │   ├── views/                 # Page views
│   │   │   ├── Analytics.vue      # Usage analytics
│   │   │   ├── Artists.vue        # Artist management
│   │   │   ├── Batch.vue          # Migration batch manager
│   │   │   ├── Catalog.vue        # Catalog management
│   │   │   ├── Dashboard.vue      # Main dashboard
│   │   │   ├── Deliveries.vue     # Delivery management
│   │   │   ├── EditRelease.vue    # Release editor
│   │   │   ├── GenreMaps.vue      # Genre map management
│   │   │   ├── Login.vue          # Authentication page
│   │   │   ├── Migration.vue      # Catalog migration manager
│   │   │   ├── NewDelivery.vue    # Create delivery
│   │   │   ├── NewRelease.vue     # Create release wizard
│   │   │   ├── NotFound.vue       # 404 page
│   │   │   ├── ReleaseDetail.vue  # Release details page
│   │   │   ├── Settings.vue       # Platform settings
│   │   │   ├── Signup.vue         # Account creation page
│   │   │   ├── SplashPage.vue     # Landing/marketing page
│   │   │   └── Testing.vue        # Testing suite with OWASP ZAP
│   │   ├── firebase.js            # Firebase initialization
│   │   ├── App.vue                # Root component with theme management
│   │   └── main.js                # Entry point with FontAwesome setup
│   ├── .env                       # Environment variables (git-ignored)
│   ├── .env.example               # Environment template
│   ├── .gitignore                 # Git ignore
│   ├── firebase.json              # Firebase config
│   ├── firestore.indexes.json     # Database indexes
│   ├── firestore.rules            # Firestore rules
│   ├── index.html                 # HTML app entry
│   ├── package.json               # Project dependencies
│   ├── storage.rules              # Cloud storage rules
│   └── vite.config.js             # Vite configuration
├── .firebaserc                    # Firebase project config
├── .gitignore                     # Git ignore rules
├── blueprint.md                   # This document
├── CONTRIBUTING.md                # Contribution guide
├── LICENSE                        # MIT License
├── package-lock.json              # Locked dependencies
├── package.json                   # Root package config
└── README.md                      # Project README
```

## CSS Architecture

The `/assets` folder contains four core CSS files that power the design system:

- **main.css**: Entry point importing all stylesheets in correct order
- **base.css**: CSS reset, browser normalization, base typography, global element styles
- **themes.css**: CSS custom properties for colors, spacing, typography, shadows, transitions. Supports light/dark/auto themes via data attributes
- **components.css**: Reusable component classes (.btn, .card, .form-input) and utility classes for spacing, typography, layout, enabling consistent UI without custom CSS

## Key Technical Decisions

### Firebase Functions v2
- Better performance and resource allocation
- Supports larger payloads (32MB vs 10MB)
- Concurrent executions up to 1000
- Region selection for lower latency

### Firestore Document IDs
- Releases: `UPC_{upc}` for deduplication
- Users: Firebase Auth UID
- Deliveries: Auto-generated with timestamps
- Fingerprints: SHA-256 hash as document ID

### File Storage Strategy
- User-scoped paths: `/users/{uid}/releases/{releaseId}/`
- DDEX naming for deliveries
- Signed URLs with 1-hour expiration
- CDN distribution via Firebase Storage

### Queue Processing
- Scheduled function runs every minute
- Transaction locks prevent double processing
- Status progression: queued → processing → completed/failed
- Automatic cleanup of stale locks after 1 hour

### Security Layers
- Firebase Auth required for all operations
- Firestore rules enforce tenant isolation
- Input validation with Zod schemas
- DOMPurify for XSS prevention
- File validation by magic numbers
- Rate limiting on Cloud Functions

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

# API Keys (optional)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
DEEZER_APP_ID=
DEEZER_SECRET=

# Email Configuration
GMAIL_EMAIL=
GMAIL_APP_PASSWORD=
```

## Deployment Configuration

Firebase services required:
- Authentication (Email/Password + Google)
- Firestore Database
- Cloud Storage
- Cloud Functions (Blaze plan required)
- Firebase Hosting