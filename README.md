# Stardust Distro

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D.svg)](https://vuejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-v9-FFA000.svg)](https://firebase.google.com/)
[![Status](https://img.shields.io/badge/Status-Alpha-orange.svg)](https://github.com/daddykev/stardust-distro)

> Open-source, npm-installable music distribution platform for the modern music industry.

Stardust Distro enables labels, artists, and distributors to deploy a fully functional, DDEX-compliant distribution system in minutes. **Every feature, every protocol, every line of code is MIT licensed and free forever.**

## 🎯 True Open Source Philosophy

**Stardust Distro is 100% open source.** The entire platform is MIT licensed with no paid tiers, no enterprise edition, and no artificial limitations. You get a complete, production-ready distribution system with ALL delivery protocols (FTP, SFTP, S3, API, Azure), full ERN generation, and everything needed to run a professional distribution platform.

We believe in building trust through transparency. The core platform is and will always be completely free and fully functional.

### Plug-in Marketplace
For specialized needs, we're developing an **open plug-in marketplace** where both our team and **third-party developers** can offer commercial and free plug-ins. This creates a thriving ecosystem of extensions while keeping the core platform 100% open source. These plug-ins are entirely optional - the core Stardust Distro platform is complete and production-ready without any plug-ins.

The marketplace will be **open to all developers**, fostering innovation and allowing the community to build specialized solutions for unique industry needs. Whether you're a developer looking to monetize your expertise or share free tools with the community, the plug-in marketplace will provide the infrastructure to distribute your extensions.

### Why This Matters
- **No vendor lock-in**: Deploy and use forever without paying a cent
- **No artificial limits**: No release caps, no watermarks, no time bombs
- **Complete functionality**: Every feature needed for professional distribution
- **True community ownership**: Fork it, modify it, deploy it - it's yours
- **Vibrant ecosystem**: Buy plugins from various developers or build your own

## 🚧 Current Development Status

**Alpha Release - v0.7.0** (August 2025)

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
- **Delivery Target Service**: Full CRUD operations for DSP configurations with encryption support
- **DeliveryTargetForm Component**: Comprehensive configuration UI with:
  - DDEX Party Name and Party ID fields
  - Protocol-specific settings (FTP/SFTP/S3/API)
  - Commercial model and usage type relationships
  - DSP presets for quick setup
  - Connection testing functionality
- **Settings Integration**: New delivery targets tab with complete management interface
- **NewDelivery View**: 4-step wizard for delivery creation:
  - Step 1: Release selection with visual cards
  - Step 2: Multi-target selection
  - Step 3: ERN generation with preview/download
  - Step 4: Scheduling and priority settings
- **Deliveries View**: Real-time monitoring dashboard with:
  - Live Firestore updates
  - Status filtering and target filtering
  - Retry/cancel operations
  - ERN and receipt downloads
  - Detailed delivery timeline modal
- **Database Collections**: deliveryTargets and deliveries with proper schemas
- **DDEX Compliance**: Full ERN 4.3 message generation with validation readiness
- **Multi-Protocol Support**: Configuration for FTP/SFTP/S3/API delivery methods
- **Delivery Queue Management**: Scheduling and queue system with Firestore

### ✅ Phase 4: Delivery Engine - COMPLETE 🎉
- **Protocol Implementations**:
  - FTP delivery with basic-ftp library
  - SFTP delivery with ssh2 library
  - S3 delivery with AWS SDK v3 and multipart upload support
  - REST API delivery with flexible authentication methods
  - Azure Blob Storage delivery with Azure SDK
- **Scheduled Processing**: Cloud Function running every minute to process queued deliveries
- **Retry Logic**: Exponential backoff with 3 attempts (5min, 15min, 1hr delays)
- **Delivery Service**: Complete service layer with:
  - Package preparation (ERN + assets)
  - Protocol-agnostic delivery interface
  - Error handling and recovery
  - Receipt generation
- **Notifications**: Firestore-backed notification system with hooks for email integration
- **Analytics Integration**: Real-time delivery metrics in Analytics view
- **Connection Testing**: Test delivery connections before actual deliveries
- **Security**: Authentication required for all Cloud Functions
- **Monitoring**: Comprehensive logging and error tracking
- **useDelivery Composable**: Reactive delivery state management

### 🚀 Phase 5: Plugin Marketplace - STARTING NOW
- [ ] Build plugin architecture
- [ ] Create marketplace infrastructure
- [ ] Develop Plugin SDK
- [ ] Build developer portal
- [ ] Create plugin submission/review system
- [ ] Develop initial plugins:
  - [ ] Dolby Atmos Plugin
  - [ ] Sony 360 Reality Audio Plugin
  - [ ] Advanced Credits Plugin
  - [ ] Delivery Orchestrator Plugin
- [ ] Setup third-party developer onboarding
- [ ] Create plugin documentation
- [ ] Build licensing system

### 📅 Phase 6: Testing & Launch (Weeks 17-20)
- [ ] Comprehensive testing suite
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation completion
- [ ] Demo site deployment
- [ ] npm package publication
- [ ] Multi-ERN version support (3.8.2, 4.2)
- [ ] DDEX Workbench API integration for validation

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

✅ **ERN Generation** *(Coming Phase 3)*
- DDEX ERN 3.8.2, 4.2, and 4.3 support
- Automatic validation via DDEX Workbench API
- Profile-specific message generation
- Real-time preview and editing

✅ **All Delivery Protocols** *(Coming Phase 4)*
- **FTP**: Legacy system support
- **SFTP**: Secure file transfers
- **S3**: AWS cloud delivery
- **API**: Modern REST/GraphQL endpoints
- **Azure**: Microsoft cloud storage
- Manual export for custom workflows

✅ **Professional Dashboard**
- Real-time statistics
- Recent activity feed
- Quick actions panel
- Getting started checklist
- Performance metrics

✅ **White-Label Ready**
- Custom branding
- Theme customization (light/dark modes)
- Multi-tenant support
- Domain mapping

## 🔌 Plugin Marketplace

An **open marketplace** for optional plugins, welcoming contributions from both our core team and **third-party developers**. Create and sell your own plugins or choose from a growing library of extensions.

### 🚀 For Developers
- **Open ecosystem**: Anyone can develop and publish plugins
- **Flexible monetization**: Offer free, freemium, or paid plugins
- **Plugin SDK**: Comprehensive development kits and documentation
- **Community driven**: Build solutions for real industry needs

### Plugin Categories *(Coming Phase 5)*
- 🎵 **Audio Processing**: Dolby Atmos, Sony 360, Apple Digital Masters
- 📝 **Metadata Enhancement**: Session credits, studio details, custom fields
- 🔄 **Workflow Automation**: Delivery orchestration, bulk processing, smart scheduling
- 📊 **Analytics & Reporting**: Advanced metrics, custom reports, BI connectors
- 🌍 **Territory & Pricing**: Windowing, dynamic pricing, geo-restrictions

*The marketplace will launch with initial plugins from our team, but we encourage developers to start planning their extensions. Plugin development documentation and SDK will be available in Phase 5.*

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
With Phase 2 complete, you can now:
1. **Create releases** with the 6-step wizard
2. **Upload assets** to Firebase Storage
3. **Manage tracks** with full CRUD operations
4. **Search and filter** your catalog
5. **Edit existing releases** with all data preserved
6. **Auto-save drafts** as you work

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
- **Backend**: Firebase (Firestore, Functions, Storage, Auth)
- **Styling**: Custom CSS architecture with theme system
- **Icons**: FontAwesome free icons
- **CLI**: Node.js with Commander.js
- **Monorepo**: Lerna for package management
- **Types**: TypeScript for shared packages
- **Services**: Modular service architecture
- **State Management**: Vue composables for reactive state

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

### Phase 2: Core CMS ✅ 80% COMPLETE
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
- [ ] Bulk operations (20% remaining)

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

### Phase 4: Delivery Engine 📅 (Weeks 10-12) - IN PROGRESS
- [ ] FTP/SFTP protocol implementation
- [ ] S3/Azure/API delivery
- [ ] Cloud Functions for processing
- [ ] Retry logic and error handling
- [ ] Delivery receipts and tracking
- [ ] Failure notifications
- [ ] Analytics and reporting

### Phase 5: Plug-in Marketplace 📅 (Weeks 17-20)
- [ ] Plug-in architecture design
- [ ] Marketplace infrastructure
- [ ] Plug-in SDK and documentation
- [ ] Developer portal
- [ ] Initial core team plugins
- [ ] Third-party developer support

### Phase 6: Testing & Launch 📅 (Weeks 21-24)
- [ ] Comprehensive test suite
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation completion
- [ ] npm package publication
- [ ] Public beta launch

## 💻 Development

```bash
# Clone the repository
git clone https://github.com/daddykev/stardust-distro.git
cd distro

# Install all dependencies (root, template, cli, packages)
npm run install:all

# Start development server
cd template
npm run dev
# Visit http://localhost:5173

# Build for production
npm run build

# Deploy to Firebase
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
│   │   ├── components/  # UI components (✅ NavBar complete)
│   │   ├── composables/ # Vue composables (✅ useAuth, useCatalog)
│   │   ├── services/    # Backend services (✅ catalog, assets)
│   │   ├── router/      # Routing config (✅ Complete)
│   │   ├── assets/      # CSS architecture (✅ Complete)
│   │   └── firebase.js  # Firebase config (✅ Complete)
│   └── functions/       # Cloud Functions (📅 Phase 3)
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

We welcome contributions! With Phase 2 80% complete, we especially need help with:

### Immediate Needs (Phase 2 Completion)
- 🔧 Bulk operations UI implementation
- 🎨 Performance optimizations
- 🧪 Testing the release creation flow
- 📝 Documentation for new features

### Upcoming Priorities (Phase 3)
- 🎵 ERN generation logic
- 🔗 DDEX Workbench API integration
- 📋 ERN validation rules
- 🖼️ ERN preview UI

### For Plugin Developers
Start thinking about plugins you'd like to build! The Plugin SDK and marketplace infrastructure will be available in Phase 5, but you can:
- Join our Discord (coming soon) to discuss plugin ideas
- Review the core architecture to plan integrations
- Suggest plugin APIs and hook points
- Contribute to the plugin SDK design

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 🔗 Stardust Ecosystem

Stardust Distro is part of the larger Stardust ecosystem:

- [Stardust DSP](https://github.com/daddykev/stardust-dsp) - Streaming platform
- [DDEX Workbench](https://github.com/daddykev/ddex-workbench) - Validation and testing tools

All tools share unified authentication for seamless workflow integration.

## 📈 Performance Targets

- **Release Creation**: <2 seconds to save
- **Asset Upload**: Real-time progress tracking
- **Catalog Search**: <100ms response time
- **Auto-save**: 3-second debounce
- **ERN Generation**: <5 seconds *(Phase 3)*
- **Delivery Queue**: <2 minute average *(Phase 4)*

## 🔐 Security

- ✅ Firebase Auth with SSO support
- ✅ Secure file uploads with signed URLs
- ✅ Role-based access control (RBAC)
- ✅ Input validation and sanitization
- ✅ Firestore security rules
- ✅ Audit logging for all operations
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

## 💬 Support

### Community Support (Free)
- **GitHub Issues**: [Bug reports and features](https://github.com/daddykev/stardust-distro/issues)
- **Discussions**: [Community forum](https://github.com/daddykev/stardust-distro/discussions)
- **Discord**: Coming soon
- **Documentation**: Comprehensive guides and API docs

### Plugin Support
Support terms vary by plugin developer. Each plugin in the marketplace will clearly indicate support options.

## 🙏 Acknowledgments

Built by the music industry, for the music industry. Special thanks to:
- [DDEX](https://ddex.net) for the standards and ongoing support
- Early contributors and testers
- The Vue.js and Firebase teams
- The open-source community
- Future plug-in developers who will extend the platform

---

**Join us in democratizing music distribution. True open source, no compromises.**

*Star ⭐ the repo to follow our progress! With Phase 2 nearly complete, we're getting closer to a production-ready platform. Interested in developing plugins? Watch this space for the Plugin SDK announcement in Phase 5!*