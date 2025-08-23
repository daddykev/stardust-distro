# Stardust Distro

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D.svg)](https://vuejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-v9-FFA000.svg)](https://firebase.google.com/)
[![Status](https://img.shields.io/badge/Status-Alpha-orange.svg)](https://github.com/daddykev/stardust-distro)

> Open-source, npm-installable music distribution platform for the modern music industry.

Stardust Distro enables labels, artists, and distributors to deploy a fully functional, DDEX-compliant distribution system in minutes.

## 🎯 True Open Source Philosophy

Stardust Distro is a production-ready music distribution platform, built with an open-source core and MIT license. You get a fully functional system with catalog management, ERN generation, all delivery protocols (FTP, SFTP, S3, API, Azure), real-time monitoring, and comprehensive testing tools - everything needed to run a professional distribution platform.

### Complete Platform, Zero Compromises

A complete, production-ready distribution platform that includes:

- **Full Catalog Management** - Unlimited releases, tracks, and assets  
- **DDEX ERN Generation** - Industry-standard ERN 4.3 with MD5 hashing  
- **All Delivery Protocols** - FTP, SFTP, S3, API, and Azure support  
- **Real-time Monitoring** - Comprehensive logging and delivery tracking  
- **White-Label Ready** - Custom branding and multi-tenant support  
- **Production Testing Suite** - Comprehensive tests for system health and compliance  

## 🚧 Current Development Status

**Alpha Release - v0.9.0** (August 2025)

### ✅ Phase 1: Foundation - COMPLETE
- **Full Vue 3 Application**: All views, routing, and navigation implemented
- **Firebase Integration**: Complete Auth, Firestore, and Storage setup
- **Professional UI/UX**: Custom CSS architecture with light/dark themes
- **CLI Tool**: Fully functional with all commands (create, init, deploy, configure, target, dev)
- **Monorepo Structure**: Lerna configuration with workspace support
- **Shared Packages**: @stardust-distro/common package with TypeScript types, constants, utils, and schemas
- **Template System**: Complete project template for instant deployment
- **Live Deployment**: Successfully deployed to Firebase Hosting

### ✅ Phase 2: Core CMS - COMPLETE
- **Release Creation Wizard**: 6-step wizard with full Firestore persistence and horizontal progress indicator
- **Asset Management**: Firebase Storage integration with upload progress tracking
- **Track Management**: Complete CRUD operations with sequencing and reordering
- **Auto-save Functionality**: Drafts saved automatically after 3 seconds of inactivity
- **Edit Mode**: Modify existing releases with all data preserved
- **Catalog Service**: Full service layer for release management
- **Asset Service**: Upload service with progress tracking and validation
- **Vue Composables**: useCatalog for reactive state management
- **ReleaseDetail View**: Complete implementation with tabbed interface (Overview, Tracks, Metadata, Assets)
- **Bulk Operations**: Select all, bulk status updates, bulk delete, bulk export to JSON
- **Real-time Search**: Filter by status, type, and text query
- **Error Handling**: Comprehensive validation and user feedback
- **Dashboard Integration**: Real-time statistics from Firestore
- **Delete Confirmation**: Modal dialogs for destructive actions
- **Upload Progress**: Visual progress bars for all file uploads
- **Responsive Design**: Mobile-friendly interface throughout

### ✅ Phase 3: ERN Generation - COMPLETE
- **ERN Service**: Complete ERN 4.3 generation with proper DDEX XML formatting
  - MD5 Hash Generation: Automatic MD5 calculation for all audio files and cover images
  - DDEX-Compliant File Naming: Industry-standard naming (UPC_DiscNumber_TrackNumber.extension)
  - XML URL Escaping: Proper escaping for Firebase Storage URLs in ERN XML
  - Cloud Function Support: Dedicated calculateFileMD5 function for hash generation
- **Delivery Target Service**: Full CRUD operations for DSP configurations with encryption support
- **DeliveryTargetForm Component**: Comprehensive configuration UI with:
  - DDEX Party Name and Party ID fields
  - Protocol-specific settings (FTP/SFTP/S3/API/Azure)
  - Commercial model and usage type relationships
  - DSP presets for quick setup
  - Connection testing functionality
- **Settings Integration**: New delivery targets tab with complete management interface
- **NewDelivery View**: 4-step wizard for delivery creation:
  - Step 1: Release selection with visual cards
  - Step 2: Multi-target selection
  - Step 3: ERN generation with preview/download
  - Step 4: Scheduling and priority settings
  - Direct XML Preview: Modal with copy functionality
  - Enhanced Target Display: Distributor IDs and authentication info
- **Deliveries View**: Real-time monitoring dashboard with:
  - Live Firestore updates
  - Status filtering and target filtering
  - Retry/cancel operations
  - ERN and receipt downloads
  - Comprehensive Logs Viewer: Real-time log streaming
  - Log Level Indicators: Color-coded log levels and step tracking
- **Database Collections**: deliveryTargets and deliveries with proper schemas
- **XML Utilities**: New urlUtils.js for safe XML URL escaping

### ✅ Phase 4: Delivery Engine - COMPLETE 🎉
- **Firebase Functions v2**: Complete migration with improved performance
  - calculateFileMD5: Callable function for hash generation
  - Enhanced Logging: Structured logs with addDeliveryLog helper
  - DDEX File Naming: Applied across all delivery protocols
- **Protocol Implementations**:
  - **FTP delivery** with basic-ftp library
    - DDEX-compliant file naming on upload
    - MD5 hash calculation and storage
  - **SFTP delivery** with ssh2 library
    - DDEX-compliant file naming on upload
    - MD5 hash calculation and storage
  - **S3 delivery** with AWS SDK v3 and multipart upload support
    - MD5 hash in Content-MD5 header
    - DDEX naming in S3 keys
    - Enhanced metadata tags
  - **REST API delivery** with flexible authentication methods
    - DSP-specific payload structure
    - File URL references with MD5 hashes
  - **Azure Blob Storage** delivery with Azure SDK
    - DDEX-compliant blob naming
    - MD5 hash in blob metadata
- **Scheduled Processing**: Cloud Function running every minute to process queued deliveries
- **Retry Logic**: Exponential backoff with 3 attempts (5min, 15min, 1hr delays)
- **Delivery Service**: Complete service layer with:
  - Package preparation (ERN + assets)
  - DDEX file naming in preparePackage
  - Enhanced file extension detection
  - Comprehensive logging at each step
  - Protocol-agnostic delivery interface
  - Error handling and recovery
  - Receipt generation
- **Logging System**:
  - Structured logs with levels (info, warning, error, success)
  - Step-based logging for delivery tracking
  - Duration tracking for performance monitoring
  - Real-time log streaming to Firestore
  - Log viewer UI with auto-refresh
- **Notifications**: Firestore-backed notification system with hooks for email integration
- **Analytics Integration**: Real-time delivery metrics in Analytics view
- **Connection Testing**: Test delivery connections before actual deliveries
- **Security**: Authentication required for all Cloud Functions
- **Monitoring**: Comprehensive logging and error tracking
- **useDelivery Composable**: Reactive delivery state management

### ✅ Phase 5: Production Testing Suite - COMPLETE
- **Comprehensive Testing Framework**: Production-safe testing running in deployed environment
- **System Health Monitoring**: 4 tests validating Firebase services (Auth, Firestore, Storage, Functions)
- **DDEX Compliance Validation**: 5 tests for ERN generation, file naming, MD5 hashing, URL escaping, message types
- **Delivery Protocol Testing**: 4 tests using real servers (Firebase Storage, FTP via dlptest.com, SFTP via test.rebex.net, user targets)
- **Performance Benchmarking**: 4 tests measuring against targets (ERN <5s, queries <500ms, uploads <1s, delivery <60s)
- **Real-time Test Logging**: Color-coded logs with auto-scroll and clear functionality
- **Test Metrics Dashboard**: 17 total tests with 100% pass rate and health score calculation
- **Export Functionality**: JSON export of all test results and logs for documentation
- **Visual Status Indicators**: Pass/fail/running states with duration tracking
- **Production Safety**: Isolated test data with no production modifications
- **No Docker Required**: Tests run directly against production infrastructure
- **Admin Access Control**: Restricted to authenticated administrators in production

### 📅 Phase 6: Testing & Launch (Weeks 15-16)
- [ ] Comprehensive testing suite expansion
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation completion
- [ ] Demo site deployment
- [ ] npm package publication
- [ ] Multi-ERN version support (3.8.2, 4.2)
- [ ] DDEX Workbench API integration for validation

### 🚀 Phase 7: Plugin Marketplace (Post-Launch)
- [ ] Build plugin architecture
- [ ] Create marketplace infrastructure
- [ ] Develop Plugin SDK
- [ ] Build developer portal
- [ ] Create plugin submission/review system
- [ ] Develop initial plugins:
  - [ ] Dolby Atmos Plugin
  - [ ] Apple Digital Masters Plugin
  - [ ] Advanced Credits Plugin
  - [ ] Delivery Orchestrator Plugin
- [ ] Setup third-party developer onboarding
- [ ] Create plugin documentation
- [ ] Build licensing system

## ✨ Core Features (100% Free & Open Source)

### Complete Distribution Platform
✅ **Catalog Management**
- Unlimited releases and tracks
- Real-time search and filtering
- Auto-save draft functionality
- Edit mode for existing releases
- Version control and release history
- Delete operations with confirmation

✅ **Asset Management**
- Firebase Storage integration
- Cover image validation (3000x3000px minimum)
- Audio file support (WAV, FLAC, MP3)
- Upload progress tracking
- Drag and drop interface
- Automatic metadata extraction

✅ **Track Management**
- Full CRUD operations
- Track sequencing and reordering
- ISRC management
- Individual audio uploads
- Production credits
- Duration and format tracking

✅ **ERN Generation**
- DDEX ERN 4.3 support with full compliance
- DDEX-compliant file naming (UPC_DiscNumber_TrackNumber.extension)
- MD5 hash generation for file integrity verification
- XML URL escaping for Firebase Storage URLs
- Automatic validation readiness for DDEX Workbench API
- Profile-specific message generation
- Real-time preview and editing
- Direct XML preview with copy functionality

✅ **All Delivery Protocols**
- **FTP**: Legacy system support with DDEX naming
- **SFTP**: Secure file transfers with MD5 verification
- **S3**: AWS cloud delivery with metadata tags
- **API**: Modern REST endpoints with DSP-specific payloads
- **Azure**: Microsoft cloud storage with blob metadata
- Manual export for custom workflows
- Connection testing before deliveries
- Comprehensive logging at every step

✅ **Delivery Monitoring**
- **Real-time log streaming** for active deliveries
- **Structured logging** with levels (info, warning, error, success)
- **Step-based tracking** for delivery progress
- **Performance metrics** with duration tracking
- **Visual indicators** for log levels and status
- **Retry management** with exponential backoff
- **Delivery receipts** with download capability

✅ **Professional Dashboard**
- Real-time statistics from Firestore
- Recent activity feed
- Quick actions panel
- Getting started checklist
- Delivery performance metrics
- Error tracking and resolution

✅ **White-Label Ready**
- Custom branding
- Theme customization (light/dark modes)
- Multi-tenant support
- Domain mapping

## 🔧 Technical Enhancements

### DDEX Compliance Improvements
- **File Naming Convention**: All files follow DDEX standard naming:
  - Audio: `UPC_DiscNumber_TrackNumber.extension` (e.g., `1234567890123_01_001.wav`)
  - Cover Art: `UPC.jpg` for main cover, `UPC_XX.jpg` for additional images
  - ERN: `MessageID.xml` format
- **MD5 Hash Generation**: All files include MD5 checksums for integrity verification
- **XML Compliance**: Proper URL escaping for Firebase Storage URLs in ERN XML

### Enhanced Monitoring & Logging
- **Structured Logging**: Every delivery step logged with timestamp, level, and details
- **Real-time Updates**: Logs stream to UI in real-time during processing
- **Performance Tracking**: Duration tracking for each operation
- **Visual Indicators**: Color-coded log levels and status badges
- **Log Persistence**: All logs stored in Firestore for historical analysis

### Improved Error Handling
- **Detailed Error Messages**: Specific error details at each step
- **Graceful Degradation**: Continue processing other files if one fails
- **Retry Intelligence**: Smart retry logic with exponential backoff
- **User Feedback**: Clear error messages and recovery options in UI

## 🔌 Plugin Marketplace

An **open marketplace** for optional plugins, welcoming contributions from both our core team and **third-party developers**. Create and sell your own plugins or choose from a growing library of extensions.

### 🚀 For Developers
- **Open ecosystem**: Anyone can develop and publish plugins
- **Flexible monetization**: Offer free, freemium, or paid plugins
- **Plugin SDK**: Comprehensive development kits and documentation
- **Community driven**: Build solutions for real industry needs

### Plugin Categories *(Coming Phase 7 Post-Launch)*
- 🎵 **Audio Processing**: Dolby Atmos, Apple Digital Masters
- 📝 **Metadata Enhancement**: Session credits, studio details, custom fields
- 🔄 **Workflow Automation**: Delivery orchestration, bulk processing, smart scheduling
- 📊 **Analytics & Reporting**: Advanced metrics, custom reports, BI connectors
- 🌍 **Territory & Pricing**: Windowing, dynamic pricing, geo-restrictions

*The marketplace will launch with initial plugins from our team, but we encourage developers to start planning their extensions. Plugin development documentation and SDK will be available in Phase 7.*

## 🚀 Quick Start

### Install and Deploy
```bash
# Create your distribution platform
npx stardust-distro create my-platform

# Navigate to project
cd my-platform

# Initialize Firebase (free tier available)
stardust-distro init

# Start development server
npm run dev
# Visit http://localhost:5173

# Deploy to production
npm run deploy
# Your platform is live! 🚀
```

### Try the Live Features
With Phases 1-5 complete, you can now:
1. **Create releases** with the 6-step wizard
2. **Upload assets** to Firebase Storage with progress tracking
3. **Manage tracks** with full CRUD operations
4. **Generate ERN messages** with DDEX 4.3 compliance
5. **Configure delivery targets** with multiple protocols
6. **Queue deliveries** with real-time monitoring
7. **Track delivery logs** with comprehensive detail
8. **Retry failed deliveries** with smart exponential backoff
9. **Download receipts** for successful deliveries
10. **Run production tests** to validate system health and compliance

### Using the CLI Tool
```bash
# Available commands
stardust-distro create <name>    # Create new Stardust Distro project
stardust-distro init             # Initialize Firebase configuration
stardust-distro deploy           # Deploy to Firebase
stardust-distro configure        # Configure platform settings
stardust-distro target add       # Add delivery targets
stardust-distro target test      # Test delivery connections
stardust-distro dev              # Start development server
```

## 🛠️ Technology Stack

- **Frontend**: Vue 3 (Composition API) + Vite
- **Backend**: Firebase (Firestore, Functions v2, Storage, Auth)
- **Cloud Functions**: Node.js with Firebase Functions v2
- **Delivery Protocols**: FTP, SFTP, S3, API, Azure
- **Styling**: Custom CSS architecture with theme system
- **Icons**: FontAwesome free icons
- **CLI**: Node.js with Commander.js
- **Monorepo**: Lerna for package management
- **Types**: TypeScript for shared packages
- **Services**: Modular service architecture
- **State Management**: Vue composables for reactive state
- **Logging**: Structured logging with Firestore persistence

## 📊 Development Roadmap

### Phase 1: Foundation ✅ COMPLETE
- [x] Project architecture and blueprint
- [x] Vue 3 application with all views
- [x] Firebase integration (Auth, Firestore, Storage)
- [x] Complete authentication system
- [x] Navigation and routing structure
- [x] Professional CSS architecture
- [x] Theme support (light/dark)
- [x] CLI tool with all commands
- [x] Monorepo setup with Lerna
- [x] TypeScript types and schemas
- [x] Template system for project generation

### Phase 2: Core CMS ✅ COMPLETE
- [x] Release creation wizard with persistence
- [x] Asset upload to Firebase Storage
- [x] Track management with CRUD operations
- [x] Catalog with real-time search
- [x] Edit mode for releases
- [x] Auto-save functionality
- [x] Service layer architecture
- [x] Vue composables for state
- [x] Error handling and validation
- [x] Upload progress tracking
- [x] Bulk operations
- [x] ReleaseDetail view with tabs
- [x] Dashboard with real stats

### Phase 3: ERN Generation ✅ COMPLETE
- [x] ERN generator engine
- [x] DDEX ERN 4.3 support
- [x] Delivery target configuration system
- [x] Commercial model and usage type management
- [x] Multi-protocol support configuration
- [x] ERN preview and download UI
- [x] Delivery scheduling system
- [x] Real-time delivery monitoring
- [x] Queue management with Firestore
- [x] DDEX-compliant file naming
- [x] MD5 hash generation for all files
- [x] XML URL escaping and validation
- [x] Cloud Function for MD5 calculation

### Phase 4: Delivery Engine ✅ COMPLETE
- [x] FTP/SFTP protocol implementation
- [x] S3/Azure/API delivery
- [x] Cloud Functions v2 for processing
- [x] Retry logic and error handling
- [x] Delivery receipts and tracking
- [x] Failure notifications
- [x] Analytics and reporting
- [x] DDEX file naming in all protocols
- [x] MD5 hash validation for integrity
- [x] Comprehensive logging system
- [x] Real-time log streaming to UI

### Phase 5: Production Testing Suite ✅ COMPLETE
- [x] Build comprehensive production testing framework
- [x] Implement system health monitoring tests
- [x] Create DDEX compliance validation suite
- [x] Develop delivery protocol testing against real servers
- [x] Add performance benchmarking system
- [x] Build real-time test logging interface
- [x] Create test result export functionality
- [x] Deploy to production at `/testing` route
- [x] Achieve 100% test pass rate
- [x] Implement admin-only access control
- [x] Add visual test status indicators
- [x] Create health score calculation system

### Phase 6: Testing & Launch 📅 - UP NEXT
- [ ] Comprehensive test suite expansion
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation completion
- [ ] npm package publication
- [ ] Public beta launch

### Phase 7: Plugin Marketplace 📅 (Post-Launch)
- [ ] Plugin architecture design
- [ ] Marketplace infrastructure
- [ ] Plugin SDK and documentation
- [ ] Developer portal
- [ ] Initial core team plugins
- [ ] Third-party developer support

## 💻 Development

```bash
# Clone the repository
git clone https://github.com/daddykev/stardust-distro.git
cd stardust-distro

# Install all dependencies (root, template, cli, packages)
npm run install:all

# Start development server
cd template
npm run dev
# Visit http://localhost:5173

# Build for production
npm run build

# Deploy to Firebase (including Functions)
npm run deploy

# Work with the CLI
cd ../cli
npm link
stardust-distro --help
```

## 🏗️ Project Structure

```
stardust-distro/
├── template/            # Default Vue app template
│   ├── src/
│   │   ├── views/       # Page components (✅ 12 views complete)
│   │   ├── components/  # UI components
│   │   ├── composables/ # Vue composables (✅ useAuth, useCatalog, useDelivery)
│   │   ├── services/    # Backend services (✅ catalog, assets, ern, delivery)
│   │   ├── router/      # Routing config (✅ Complete)
│   │   ├── assets/      # CSS architecture (✅ Complete)
│   │   ├── utils/       # Utilities (✅ urlUtils.js)
│   │   └── firebase.js  # Firebase config (✅ Complete)
│   └── functions/       # Cloud Functions (✅ v2 Complete)
├── cli/                 # CLI tool (✅ Complete)
│   ├── bin/             # Executable scripts
│   └── commands/        # All CLI commands
├── packages/            # Shared packages
│   └── @stardust-distro/
│       └── common/      # Types & utils (✅ Complete)
├── firebase.json        # Firebase configuration (✅)
├── firestore.rules      # Security rules (✅)
├── lerna.json           # Monorepo config (✅)
└── docs/                # Documentation (📅 Phase 6)
```

## 🤝 Contributing

We welcome contributions! With Phases 1-5 complete, we especially need help with:

### Immediate Needs (Phase 6 Start)
- 🔧 Plugin architecture design
- 🎨 Plugin marketplace UI/UX
- 🧪 Testing the complete delivery and testing flows
- 📝 Documentation for all features including testing suite

### For Plugin Developers
Start thinking about plugins you'd like to build! The Plugin SDK and marketplace infrastructure will be available in Phase 6, but you can:
- Join our Discord (coming soon) to discuss plugin ideas
- Review the core architecture to plan integrations
- Suggest plugin APIs and hook points
- Contribute to the plugin SDK design

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 🔗 Stardust Ecosystem

Stardust Distro is part of the larger Stardust Ecosystem:

- [DDEX Workbench](https://github.com/daddykev/ddex-workbench) - Validation and testing tools
- [Stardust DSP](https://github.com/daddykev/stardust-dsp) - Streaming platform

All tools share unified authentication for seamless workflow integration.

## 📈 Performance Targets

- **Release Creation**: <2 seconds to save
- **Asset Upload**: Real-time progress tracking
- **Catalog Search**: <100ms response time
- **Auto-save**: 3-second debounce
- **ERN Generation**: <5 seconds with MD5 hashing
- **Delivery Queue**: <2 minute average delivery time
- **Log Streaming**: Real-time updates to UI
- **MD5 Calculation**: <3 seconds per file

## 🔐 Security

- ✅ Firebase Auth with SSO support
- ✅ Secure file uploads with signed URLs
- ✅ Role-based access control (RBAC)
- ✅ Input validation and sanitization
- ✅ Firestore security rules
- ✅ Audit logging for all operations
- ✅ MD5 hash verification for file integrity
- ✅ Encrypted credential storage for delivery targets
- 📅 Regular security audits *(Phase 6)*

## 📄 License

### Core Platform
**MIT License** - Use freely for any purpose, forever. See [LICENSE](LICENSE) for details.

This means you can:
- ✅ Use commercially without payment
- ✅ Modify and customize freely
- ✅ Distribute and sell your modifications
- ✅ Use privately without restrictions
- ✅ Fork and create your own platform

### Plugins
Individual licenses determined by plugin developers. The marketplace will support various licensing models including MIT, GPL, commercial, and freemium.

## 🙏 Acknowledgments

Built by the music industry, for the music industry. Special thanks to:
- [DDEX](https://ddex.net) for the standards and ongoing support
- Early contributors and testers
- The Vue.js and Firebase teams
- The open-source community
- Future plug-in developers who will extend the platform

---

**Join us in democratizing music distribution. True open source, no compromises.**

*Star ⭐ the repo to follow our progress! With Phases 1-5 complete, we're ready to build the plugin marketplace. Interested in developing plugins? Watch this space for the Plugin SDK announcement in Phase 5!*