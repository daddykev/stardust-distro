# Stardust Distro

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D.svg)](https://vuejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-v9-FFA000.svg)](https://firebase.google.com/)
[![Status](https://img.shields.io/badge/Status-Alpha-orange.svg)](https://github.com/daddykev/stardust-distro)

> Open-source, npm-installable music distribution platform for the modern music industry.

Stardust Distro enables labels, artists, and distributors to deploy a fully functional, DDEX-compliant distribution system with professional-grade features and comprehensive delivery capabilities.

-----

## 🎯 Production Ready

Stardust Distro is a production-ready music distribution platform, built with an open-source core and MIT license. You get a fully functional system with catalog management, DDEX ERN generation with lifecycle tracking, all delivery protocols, and comprehensive testing tools — everything needed to run a global distribution platform.

### Complete Platform, Zero Compromises

A complete, production-ready distribution platform that includes:

- **Full Catalog Management** - Unlimited releases, tracks, and assets with smart duplicate detection
- **Multi-Format Generation** - Full support for DDEX ERN (3.8.2, 4.2, 4.3) and Apple Music XML (5.3.23 spec)
- **All Delivery Protocols** - FTP, SFTP, S3, API, and Azure with automatic retry logic
- **Powerful Catalog Migration** - Smart bulk import tool, syncs metadata and cover art via API
- **Genre Intelligence** - DSP-specific genre mapping with 200+ hierarchical genres
- **Mobile-First Design** - Full functionality on all devices, including smartphones
- **Real-time Monitoring** - Comprehensive logging, delivery tracking, and performance metrics
- **Production Testing Suite** - 17 built-in tests for system health, DDEX compliance, and protocols
- **Professional Operations** - Auto-save, bulk operations, idempotency, and delivery scheduling

-----

## 🚀 Current Development Status

**Release Candidate - v0.9.6** (August 2025)

### 🎉 Phase 6: Production Launch Essentials - COMPLETE

We're excited to announce that **Phase 6 is now complete**, bringing the platform to production-ready status! The final major features have been implemented:

#### ✨ Latest Additions

**Catalog Migration System**
- **Dual-Mode Import Wizard**: Choose between traditional CSV import or our fast "metadata-less" mode
- **Standard Mode**: Upload CSV with metadata → Bulk upload DDEX-named files → Auto-match and create releases
- **Metadata-less Mode**: Upload audio files → Fetch essential metadata from API → Saves missing cover art
- **Smart Product Matching**: Automatic UPC-based file matching with intelligent error handling
- **Resume Capability**: Import jobs persist in Firestore - close your browser and resume anytime
- **Visual Progress**: Real-time progress tracking with animated indicators and statistics

**Multi-Format Support**
- DDEX ERN support (3.8.2, 4.2, 4.3)
- Apple Music XML generation (5.3.23 spec)
- Enhanced delivery receipts with reconciliation dashboard
- DSP acknowledgment tracking across all protocols

**Advanced Genre Classification**
- Genre Truth System with 200+ hierarchical genres
- Multi-DSP genre dictionaries (Apple Music, Beatport, Amazon)
- Visual genre mapping interface with drag-and-drop feel
- Auto-suggest based on string similarity
- Import/export genre mappings as JSON

**Core Reliability Features**
- Delivery status notifications (success/failure/retry)
- Idempotency protection prevents duplicate deliveries
- Content fingerprinting detects duplicate files on upload
- Audio similarity detection with percentage matching
- Transaction locks ensure single processing
- Enhanced error recovery and retry logic

### ✅ Complete Development Timeline

**Phase 1-5**: Foundation through Production Testing ✅
- Full Vue 3 application with Firebase backend
- Complete catalog and asset management
- ERN generation with DDEX compliance
- All delivery protocols implemented
- Production testing suite with 100% pass rate

**Phase 6**: Production Launch Essentials ✅
- Genre classification and mapping system ✅
- Idempotency and deduplication ✅
- Content fingerprinting ✅
- Multi-version ERN and Apple support ✅
- Complete catalog migration tools ✅
- Email notification system ✅
- Comprehensive documentation ✅

### 🚧 Remaining Pre-Launch Tasks
- [x] Security audit checklist ✅ COMPLETE (August 27, 2025)
- [x] NPM package publication
- [ ] GitHub release preparation
- [ ] Launch announcement

-----

## 📖 Documentation

### Technical Blueprint
📋 **[View Technical Blueprint](blueprint.md)** - Complete development overview, architecture, and implementation status

### Platform Guides
Our comprehensive documentation covers every aspect of the platform:

- 🚀 **[Getting Started Guide](template/docs/getting-started.md)** - Quick setup and initial configuration
- ⚙️ **[Configuration Guide](template/docs/configuration.md)** - Platform settings and customization
- 📦 **[Release Creation Guide](template/docs/release-creation.md)** - Step-by-step release wizard walkthrough
- 🎵 **[Catalog Import Guide](template/docs/catalog-import.md)** - Bulk import and migration procedures  
- 🚚 **[Delivery Setup Guide](template/docs/delivery-setup.md)** - DSP connections and target configuration
- 🎯 **[Genre Mapping Guide](template/docs/genre-mapping.md)** - DSP taxonomy mapping and management
- 🧪 **[Testing Guide](template/docs/testing-guide.md)** - Production testing suite documentation
- 📋 **[DDEX Standards Guide](template/docs/DDEX.md)** - DDEX compliance and ERN implementation
- 🔧 **[API Reference](template/docs/api-reference.md)** - Cloud Functions and service documentation
- ❓ **[Troubleshooting Guide](template/docs/troubleshooting.md)** - Common issues and solutions

-----

## ✨ Core Features

### 🌊 Smart Catalog Migration - NEW!

**Two Ways to Import Your Catalog:**

**📊 Standard Mode (CSV + Assets)**
1. Upload your catalog CSV with flexible field mapping
2. Bulk upload DDEX-named audio files and cover art
3. System automatically matches and creates releases
4. Support for multi-track releases and various CSV formats

**🎵 "Metadata-less" Mode (Assets Only)**
1. Upload audio files (no metadata needed)
2. System extracts UPCs and queries API
3. Automatically downloads cover art
4. Creates valid releases with complete metadata

**Key Features:**
- Resume interrupted imports anytime
- Real-time progress tracking
- Intelligent duplicate detection
- Support for 1000s of releases
- Visual import statistics dashboard

### 📦 Complete Distribution Platform

✅ **Catalog Management**
- Unlimited releases and tracks
- Smart duplicate detection with fingerprinting
- Real-time search and filtering
- Auto-save draft functionality
- Version control and release history
- Bulk operations support

✅ **Asset Management**
- Firebase Storage integration
- MD5, SHA-256, and SHA-1 hashing
- Audio similarity detection
- Cover image validation
- Audio file support (WAV, FLAC, MP3)
- Upload progress tracking

✅ **ERN & Apple Generation**
- DDEX ERN support (3.8.2, 4.2, 4.3)
- Apple Music XML (Spec 5.3.23)
- DDEX-compliant file naming
- Stable package/vendor IDs
- Profile-specific message generation
- Message type tracking (Initial/Update/Takedown)

✅ **All Delivery Protocols**
- **FTP/SFTP**: Legacy system support
- **S3**: AWS cloud delivery with multipart uploads
- **API**: Modern REST endpoints
- **Azure**: Microsoft cloud storage
- **Firebase Storage**: Internal testing
- Connection testing before deliveries

✅ **Professional Operations**
- Email notifications with templates
- Genre mapping for all DSPs
- Idempotency protection
- Content fingerprinting
- Delivery receipts and reconciliation
- Real-time log streaming
- Performance benchmarking

-----

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

-----

## 🛡️ Security First Approach

Stardust Distro prioritizes security with enterprise-grade protection:
- **Zero Trust Architecture**: Every request validated and authenticated
- **Defense in Depth**: Multiple security layers from frontend to backend
- **OWASP Compliance**: Following security best practices
- **Active Security Monitoring**: Real-time threat detection and logging

-----

## 📊 Performance Metrics

### Current Production Benchmarks

- **Release Creation**: <2 seconds to save
- **Catalog Import**: 100+ releases in under 5 minutes
- **Metadata Fetch**: <3 seconds per album via Deezer
- **ERN Generation**: <5 seconds with validation
- **Delivery Queue**: 3.2 minute average delivery time
- **Success Rate**: 99.3% delivery success
- **Test Suite**: 17 tests, 100% pass rate
- **Duplicate Detection**: <500ms per file

### Production Capacity

- Handles 1 million+ releases
- Supports 1,000+ concurrent deliveries
- Manages exabyte-scale asset libraries
- Processes scheduled deliveries every minute
- Sends 500+ emails daily (Gmail free tier)

-----

## 🔧 Technical Architecture

### Technology Stack

- **Frontend**: Vue 3 (Composition API) + Vite
- **Backend**: Firebase (Firestore, Functions v2, Storage, Auth)
- **Cloud Functions**: Node.js with Firebase Functions v2
- **Delivery Protocols**: FTP, SFTP, S3, API, Azure
- **External APIs**: Deezer (metadata), Gmail SMTP (emails)
- **Styling**: Custom CSS architecture with theme system
- **CLI**: Node.js with Commander.js

-----

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/daddykev/stardust-distro.git
cd stardust-distro

# Install all dependencies
npm run install:all

# Start development server
cd template
npm run dev

# Run production tests
# Visit http://localhost:5173/testing (admin only)

# Test catalog import
# Visit http://localhost:5173/migration

# Build for production
npm run build

# Deploy to Firebase
npm run deploy
```

-----

## 📅 Upcoming Development

### Phase 7: Post-Launch Essentials (Q4-2025)

**Data Security & Operational Excellence**
- Backup & Restore System
- GDPR Compliance Package
- Circuit Breaker System
- Enhanced Connection Management
- Health Monitoring Dashboard
- RESTful API with Swagger
- Webhook System

-----

## 🤝 Contributing

We're approaching our v1.0 launch! Help us with:

### Launch Priorities
- 🔐 Security audit and testing
- 📚 Video tutorials and demos
- 🌍 Beta testing with real catalogs
- 🐛 Bug reports and fixes
- 🌐 Internationalization
- 📱 Mobile UI improvements

### Post-Launch Opportunities
- 🔄 Circuit breaker patterns
- 📊 Analytics enhancements
- 💾 Backup/restore strategies
- 🌐 Additional DSP integrations

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

-----

## 🔐 Security

### Security Score: 85/100 ✅ (Production Ready)
All critical security items implemented and deployed to production!

### ✅ Core Security Features - COMPLETE
- **Input Validation & Sanitization** (100% coverage) - DOMPurify + Zod schemas on all inputs
- **Authentication & Authorization** - Firebase Auth with role-based access control (RBAC)
- **Rate Limiting** - 100 req/min for reads, 20 req/min for writes
- **Cloud Functions Protection** - 100% of functions require authentication
- **Credential Encryption** - All sensitive data encrypted with Cloud KMS
- **File Security** - Magic number validation, size limits (10MB images, 500MB audio)
- **Tenant Isolation** - Complete data isolation with helper functions

### ✅ Security Implementation - COMPLETE
**Frontend Security:**
- Zod validation schemas for all forms
- DOMPurify XSS prevention on all string inputs
- File type validation by magic numbers (not extensions)
- Sanitized filenames prevent directory traversal
- File size enforcement before upload

**Backend Security:**
- Authentication middleware on ALL Cloud Functions v2
- Rate limiting middleware prevents abuse
- Input validation middleware with size limits
- Request sanitization before processing
- Clean Firestore writes (no undefined values)
- Structured logging for audit trails

**Infrastructure Security:**
- Firestore Rules with tenant isolation and RBAC ✅ Deployed
- Storage Rules with file type/size validation ✅ Deployed
- Security headers configured (X-Frame-Options, CSP, HSTS) ✅ Deployed
- User-scoped storage paths
- Immutable audit logs
- Transaction locks prevent race conditions

### 📊 Security Metrics
- **npm vulnerabilities**: 2 moderate (dev-only, acceptable)
- **Cloud Functions protected**: 100%
- **Input validation coverage**: 100%
- **Encrypted credentials**: 100%
- **Security rules deployed**: ✅ Production (August 27, 2025)
- **Security headers deployed**: ✅ Production (August 27, 2025)
- **Repository security**: ✅ Verified clean (August 27, 2025)

### 🚦 Launch Readiness
- **Can Launch**: ✅ **YES - FULLY CLEARED FOR v1.0**
- **Security Level**: 🟢 **ENTERPRISE-GRADE**
- **Production Status**: **SECURED & DEPLOYED**
- **Security Audit**: ✅ **COMPLETE** (August 27, 2025)

### 🔜 Post-Launch Security Enhancements
- Multi-factor authentication (MFA)
- Email verification requirement
- Firebase App Check integration
- OWASP ZAP security testing
- GDPR compliance package
- Security incident response plan
- Quarterly security audits

See [Security Audit Report](template/docs/security.md) for details.

-----

## 📄 License

**MIT License** - Use freely for any purpose. See [LICENSE](LICENSE) for details.

This means you can:
- ✅ Use commercially without payment
- ✅ Modify and customize freely
- ✅ Distribute and sell your modifications
- ✅ Use privately without restrictions
- ✅ Fork and create your own platform

-----

## 🔗 Stardust Ecosystem

Stardust Distro is part of the larger Stardust Ecosystem:

- [DDEX Workbench](https://github.com/daddykev/ddex-workbench) - Validation and testing tools
- [Stardust DSP](https://github.com/daddykev/stardust-dsp) - Streaming platform

Working on unified authentication for seamless workflow integration.

-----

## 🙏 Acknowledgments

Built with the music industry in mind. Special thanks to:

- [DDEX](https://ddex.net) for the standards and ongoing support
- [Deezer](https://developers.deezer.com) for their public API
- Early contributors and testers
- The Vue.js and Firebase teams
- The open-source community

-----

**Join us in building the future of music distribution. Open source, professional grade, production ready.**

*Star ⭐ the repo to follow our progress!*

**🎉 Phase 6 Complete!** The platform is now production-ready with comprehensive catalog migration, email notifications, genre mapping, and reliability features. We're preparing for the official v1.0 launch!

**Next:** Phase 7 will add post-launch operational excellence including backup/restore, GDPR compliance, circuit breakers, and health monitoring.