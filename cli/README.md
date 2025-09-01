# 🚀 Stardust Distro CLI

[![npm version](https://img.shields.io/npm/v/@stardust-distro/cli.svg)](https://www.npmjs.com/package/@stardust-distro/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dt/@stardust-distro/cli.svg)](https://www.npmjs.com/package/@stardust-distro/cli)
[![Node Version](https://img.shields.io/node/v/@stardust-distro/cli.svg)](https://nodejs.org)

> **Open-source, npm-installable music distribution software for the modern age.**

Stardust Distro enables artists, labels, and distributors to deploy a fully functional, DDEX-compliant distribution system with enterprise-grade features and global delivery capabilities.

## Introduction

Stardust Distro is a production-ready music distribution platform, built with an open-source core and MIT license. You get a fully functional system with catalog management, DDEX ERN generation with lifecycle tracking, all delivery protocols, and comprehensive testing tools — everything needed to run a global distribution platform.

✅ **Complete Distribution Platform**
- Full catalog management system with unlimited releases
- DDEX ERN generation (3.8.2, 4.2, 4.3) + Apple Music XML (5.3.23)
- All delivery protocols built-in (FTP, SFTP, S3, API, Azure)
- 200+ genre classifications with visual mapping
- DDEX MEAD 1.1 implementation for enhanced metadata
- Mobile-first UI that works on any device

✅ **Enterprise-Grade Features**
- Smart catalog migration with API-enhanced bulk imports
- App Security: DOMPurify XSS prevention and Zod schema validation
- Modern Authentication: Firebase Auth with RBAC
- Idempotency protection and delivery retry logic
- Audio fingerprinting with MD5, SHA-256, and similarity detection
- Powered by Google Cloud for 99.95% uptime SLA

✅ **Zero Setup Hassles**
- Pre-configured Firebase backend (free tier available)
- Auto-save drafts & version control
- Built-in production testing suite
- Professional UI with light/dark themes
- Comprehensive documentation included

## ⚡ Quick Start

```bash
# Create your distribution platform
npx @stardust-distro/cli create my-music-platform

# Navigate to your new platform
cd my-music-platform

# Start local development
npm run dev
# Visit http://localhost:5173

# Deploy to production (requires Firebase account)
npm run deploy
# Your platform is live at https://my-music-platform.web.app 🚀
```

That's it! You now have a fully functional music distribution platform.

## 🛠️ CLI Commands

```bash
# Project Management
stardust-distro create <name>    # Create new distribution platform
stardust-distro init             # Initialize Firebase configuration
stardust-distro deploy           # Deploy to production
stardust-distro update           # Update to latest version

# Development
stardust-distro dev              # Start development server
stardust-distro build            # Build for production
stardust-distro test             # Run test suite

# Configuration
stardust-distro config           # Configure platform settings
stardust-distro target add       # Add DSP delivery target
stardust-distro target test      # Test delivery connection
stardust-distro target list      # List configured targets

# Operations
stardust-distro import           # Import existing catalog
stardust-distro backup           # Backup platform data
stardust-distro restore          # Restore from backup
```

## 🎨 What Can You Build?

### For Record Labels
```bash
npx @stardust-distro/cli create my-label
# → Complete distribution system for your label
# → Manage thousands of artists and releases
```

### For Aggregators
```bash
npx @stardust-distro/cli create my-distro
# → Multi-tenant architecture
# → Manage multiple labels/artists
```

### For Artists
```bash
npx @stardust-distro/cli create my-music
# → Direct control of catalog assets
# → Professional tools at your fingertips
```

## 🛠️ Tech Stack

Built with modern web technologies for maximum performance and developer experience:

- **Frontend**: Vue 3 (Composition API) with Vite build tool
- **Language**: JavaScript ES6+ with TypeScript support
- **Backend**: Firebase (Google Cloud Platform)
  - Firestore for NoSQL, schemaless database
  - Cloud Functions v2 for serverless processing
  - Cloud Storage for asset management
  - Firebase Auth for authentication
- **UI/UX**: Custom CSS architecture with theming support
- **Package Manager**: npm/yarn compatible

## 🔐 Multi-layer Security

- **Encrypted Credentials**: All DSP credentials encrypted at rest
- **Input Validation**: DOMPurify + Zod schemas on all inputs
- **Rate Limiting**: 100 req/min reads, 20 req/min writes
- **File Security**: Magic number validation, size limits (500MB audio, 10MB images)
- **Audit Logs**: Complete activity tracking with immutable logs

## 📈 Performance

Built for major catalogs:

- ✓ Handle 1 million+ releases
- ✓ Process 1,000+ concurrent deliveries
- ✓ Import hundreds of releases with one drag and click
- ✓ 99.95% uptime with Google Cloud SLA

## 🆓 Open Source

- **MIT License**: Use commercially, modify freely, no restrictions
- **Self-Hosted**: Your data, your infrastructure, your control
- **Firebase Optimized**: Works best with Firebase (free tier available)
- **Extensible**: Add custom features, integrate with your existing systems

## 📚 Documentation & Support

- 📖 **[Full Documentation](https://github.com/daddykev/stardust-distro)** - Comprehensive guides and API reference
- 🐛 **[Report Issues](https://github.com/daddykev/stardust-distro/issues)** - Found a bug? Let us know
- ⭐ **[Star on GitHub](https://github.com/daddykev/stardust-distro)** - Show your support

## 🤝 Contributing

We welcome contributions! Whether it's bug fixes, new features, or documentation improvements:

```bash
git clone https://github.com/daddykev/stardust-distro.git
cd stardust-distro
npm run install:all
# Make your changes
npm test
# Submit PR
```

See [CONTRIBUTING.md](https://github.com/daddykev/stardust-distro/blob/main/CONTRIBUTING.md) for detailed guidelines.

## 🚦 Current Status

**v1.0.5 - Alpha Release** (September 2025)
- ✅ Production ready for early adopters
- ✅ All core features complete
- ✅ Security audit passed

## 🗺️ Roadmap

- **v1.1**: DSR (sales reporting) integration
- **v1.2**: Advanced royalty management
- **v1.3**: Mobile app companions (iOS/Android)
- **v2.0**: AI-powered metadata enhancement

## 📮 Get Started Now

```bash
npx @stardust-distro/cli create my-platform
```

Your music distribution platform awaits. Join the open-source music distribution revolution.

---

**Built for the music industry using Vue 3 and Firebase**

*Part of the [Stardust Ecosystem](https://github.com/daddykev) - Open-source tools for modern music distribution*