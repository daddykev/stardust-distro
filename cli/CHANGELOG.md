# Changelog

## [1.0.3] - 2025-08-30

### 🔄 Template Genericization & Dynamic Configuration

This release makes the template fully generic and reusable, removing all hard-coded references to "Stardust Distro" in favor of dynamic configuration.

#### **Major Refactoring**
- **Template Genericization**: Removed all hard-coded "stardust-distro" and "Stardust Distro" references from non-documentation files
- **Dynamic Configuration**: Template now uses environment variables for all branding and identification
- **Simplified Environment Variables**:
  - Consolidated `VITE_APP_NAME` into `VITE_ORGANIZATION_NAME` (single source of truth for branding)
  - Removed unused `VITE_ORGANIZATION_ID` (keeping only `VITE_DISTRIBUTOR_ID` for DDEX)
  - Cleaner `.env.example` with only essential configuration

#### **CLI Improvements**
- **Enhanced `create` command**:
  - Dynamically processes template files during project creation
  - Updates `package.json`, `index.html`, and Docker scripts with project name
  - Generates customized `.env` file based on user input
  - Removes template lock files to be regenerated fresh
  - Better error handling with stack traces
  - Added Firebase Blaze plan requirement warning

#### **Code Updates**
- **Services**: Updated all service files to use environment variables:
  - `ern.js`, `mead.js`, `delivery.js`: Use `VITE_ORGANIZATION_NAME` for sender name
  - `delivery.js`, `ern.js`: Use `VITE_DISTRIBUTOR_ID` for DDEX identification
  - `emailService.js`: Dynamic organization name in all email templates
  - `productMetadata.js`: Dynamic Firebase project ID in API URLs

- **Vue Components**:
  - `NavBar.vue`, `Login.vue`, `Signup.vue`: Use `VITE_ORGANIZATION_NAME` for display
  - `EditRelease.vue`, `NewDelivery.vue`: Use `VITE_DISTRIBUTOR_ID` for DDEX messages

- **Email Templates**: All email content now uses dynamic organization name
- **Functions**: Updated Cloud Functions to use dynamic organization names in emails

#### **Developer Experience**
- Template can now be used as-is for any music distribution platform
- Single configuration point for organization branding
- Attribution to original project preserved in package.json names
- Clearer separation between template and generated project

### 🐛 Bug Fixes
- Fixed `stardust-distro init` command issues with Firebase app detection
- Improved handling of different Firebase API response formats
- Fixed public directory configuration in firebase.json

### 📚 Documentation
- Added deployment troubleshooting notes
- Documented Firebase Blaze plan requirement
- Updated CLI usage instructions

## [1.0.2] - 2025-08-30

### 🕷️ Bug Fixes

- Critical permissions error in Settings
- Redacted unified auth for Stardust Ecosystem (keeping auth separated)

## [1.0.1] - 2025-08-30

### 🎉 New Features

#### **Batch Management System**
- **New Batch Management Interface** (`Batch.vue`)
  - Create and manage import batches for organizing large catalog migrations
  - Track batch progress with real-time statistics (total, complete, incomplete, cataloged)
  - Archive completed batches for historical reference
  - Batch deletion with confirmation safeguards
  - Visual progress indicators and status badges

- **Enhanced Migration Workflow** (`Migration.vue`)
  - **Multi-source metadata fetching**: Automatic retrieval from Spotify and Deezer APIs
  - **Smart release creation**: Auto-creates releases when uploading DDEX-named audio files
  - **Bulk audio upload**: Process multiple audio files with automatic UPC extraction and track matching
  - **Auto cover art download**: Fetches high-quality artwork from API sources using Cloud Functions
  - **UPC list import**: Batch import releases by entering or uploading UPC codes
  - **Visual release editor**: Tab-based interface for metadata and asset management
  - **Completeness tracking**: Visual indicators for metadata, cover art, and audio status
  - **One-click catalog transfer**: Move completed releases to main catalog

#### **Security Testing Suite Expansion**
- **8 New Security Tests** added to Testing.vue:
  - `sec-1`: Authentication Security - Token expiration and RBAC validation
  - `sec-2`: Input Validation & XSS Prevention - Tests against common attack vectors
  - `sec-3`: API Rate Limiting - Verifies rate limiting enforcement
  - `sec-4`: Data Encryption - Confirms sensitive data encryption
  - `sec-5`: Security Headers - Validates HTTP security headers
  - `sec-6`: Firestore Security Rules - Tests access control enforcement
  - `sec-7`: File Upload Security - Validates file type and size restrictions
  - `sec-8`: HTTPS/TLS Configuration - Ensures secure connections
- **OWASP Compliance Tracking**: Coverage report for OWASP Top 10 vulnerabilities
- **Security Score Calculation**: Overall security health percentage with visual indicators

### ✨ Improvements

- **Metadata Synthesis**: Enhanced metadata quality through multi-source aggregation
- **Auto-matching Logic**: Improved track matching for bulk audio uploads using DDEX naming
- **Progress Tracking**: Real-time progress indicators for all async operations
- **Error Handling**: Comprehensive error messages with recovery suggestions

### 🐛 Bug Fixes

- Fixed missing `newlyCreatedReleases` ref in Migration.vue
- Improved CORS handling for external API image downloads
- Enhanced batch statistics calculation accuracy
- Fixed race conditions in bulk upload processing

### 📚 Documentation

- Added inline documentation for Batch Management workflow
- Updated security testing documentation with OWASP references
- Added DDEX file naming examples in UI tooltips

### 🔧 Technical Changes

- Added `batchService` for centralized batch operations
- Integrated `productMetadataService` for API metadata caching
- Added `metadataSynthesizer` for intelligent data merging
- Enhanced Testing.vue with production-safe test isolation
- Improved Firestore query efficiency for batch operations

---

## [1.0.0] - 2025-08-29

### 🎉 Production Release
First stable release of Stardust Distro.

### ✨ Features
- **Complete CLI Tool**: All commands implemented and tested
  - `create` - Scaffold new distribution platforms
  - `init` - Initialize Firebase configuration
  - `deploy` - Deploy to Firebase hosting
  - `configure` - Configure platform settings
  - `target` - Manage delivery targets (add/list/test)
  - `dev` - Start development server with optional emulators

- **Project Scaffolding**
  - Full Vue 3 + Firebase template
  - Professional UI with light/dark themes
  - Complete DDEX ERN support (3.8.2, 4.2, 4.3)
  - Apple Music XML support (5.3.23)
  - All delivery protocols (FTP/SFTP/S3/API/Azure)

- **Production Features**
  - Multi-tenant architecture support
  - Encrypted credential storage
  - Real-time delivery monitoring
  - Bulk catalog import
  - Audio fingerprinting
  - Email notifications
  - Comprehensive testing suite

### 🔒 Security
- Input validation on all commands
- Encrypted storage for API keys
- Firebase security rules included
- Authentication required for all operations

### 📚 Documentation
- 10 comprehensive guides included
- Getting started documentation
- API reference
- Troubleshooting guide

### 🚀 Quick Start
```bash
npx @stardust-distro/cli create my-platform
cd my-platform
npm run dev