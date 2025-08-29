# Changelog

## [1.0.0] - 2025-08-29

### 🎉 Production Release
First stable release of Stardust Distro CLI - The open-source music distribution platform.

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