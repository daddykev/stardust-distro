# 🚀 Stardust Distro CLI

[![npm version](https://img.shields.io/npm/v/@stardust-distro/cli.svg)](https://www.npmjs.com/package/@stardust-distro/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dt/@stardust-distro/cli.svg)](https://www.npmjs.com/package/@stardust-distro/cli)
[![Node Version](https://img.shields.io/node/v/@stardust-distro/cli.svg)](https://nodejs.org)

> **Open-source, npm-installable music distribution platform for the modern age.**

Stardust Distro enables artists, labels, and distributors to deploy a fully functional, DDEX-compliant distribution system with enterprise-grade features and global delivery capabilities.

## 🎯 Production Ready

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

## 📦 Platform Features

### 🎵 Catalog Management
- **Smart Import**: Bulk import via CSV or just audio files (fetches metadata automatically)
- **Duplicate Detection**: Audio fingerprinting prevents duplicate uploads
- **Auto-Save**: Never lose work with automatic draft saving
- **Bulk Operations**: Update/delete multiple releases at once

### 🚀 Delivery Engine
- **All Protocols**: FTP, SFTP, S3, REST API, Azure Storage
- **DDEX Compliant**: ERN 3.8.2, 4.2, 4.3 + Apple Music XML
- **Smart Retry**: Automatic retry with exponential backoff
- **Real-time Logs**: Watch deliveries happen in real-time

### 📊 Professional Tools
- **Genre Mapping**: 200+ genres with DSP-specific mapping
- **Testing Suite**: 17 production tests for compliance
- **Analytics**: Track deliveries, success rates, performance
- **Email System**: Automated notifications with Gmail SMTP

## 🔐 Security First

Every platform created includes:
- **Firebase Auth**: Secure authentication out of the box
- **Encrypted Credentials**: All DSP credentials encrypted
- **Input Validation**: DOMPurify + Zod schemas everywhere
- **Rate Limiting**: Prevent abuse automatically
- **File Security**: Magic number validation, size limits
- **Audit Logs**: Complete activity tracking

## 📈 Performance

Your platform will handle:
- ✓ 1 million+ releases
- ✓ 1,000+ concurrent deliveries  
- ✓ 100+ releases imported in 5 minutes
- ✓ <5 second ERN generation

## 🆓 Open Source

- **MIT License**: Use commercially, modify freely, no restrictions
- **Self-Hosted**: Deploy anywhere (Firebase, AWS, your own servers)

## 📚 Resources

- 📖 **[Full Documentation](https://github.com/daddykev/stardust-distro)**
- 🐛 **[Report Issues](https://github.com/daddykev/stardust-distro/issues)**
- ⭐ **[Star on GitHub](https://github.com/daddykev/stardust-distro)**

## 🤝 Contributing

```bash
git clone https://github.com/daddykev/stardust-distro.git
cd stardust-distro
npm run install:all
# Make your changes
npm test
# Submit PR
```

See [CONTRIBUTING.md](https://github.com/daddykev/stardust-distro/blob/main/CONTRIBUTING.md) for guidelines.

## 🚦 Current Status

**v1.0.2 - Alpha Release** (August 2025)
- ✅ Production ready
- ✅ All core features complete
- ✅ Security audit passed

## 📮 Get Started Now

```bash
npx @stardust-distro/cli create my-platform
```

Your music distribution platform awaits.

---

**Built with ❤️ for the music industry**

*Part of the [Stardust Ecosystem](https://github.com/daddykev) - Open-source tools for modern music distribution*