# Stardust Distro

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D.svg)](https://vuejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-v9-FFA000.svg)](https://firebase.google.com/)
[![Status](https://img.shields.io/badge/Status-Alpha-orange.svg)](https://github.com/daddykev/stardust-distro)

> Open-source, npm-installable music distribution platform for the modern music industry.

Stardust Distro enables labels, artists, and distributors to deploy a fully functional, DDEX-compliant distribution system with professional-grade features and comprehensive delivery capabilities. It is built on Firebase for scalability and reliability.

## ✨ Core Features

*   **Catalog Management**: Unlimited releases, tracks, and assets with smart duplicate detection.
*   **Multi-Format Generation**: Full support for DDEX ERN (3.8.2, 4.2, 4.3) and Apple Music XML.
*   **All Delivery Protocols**: FTP, SFTP, S3, API, and Azure with automatic retry logic.
*   **Powerful Catalog Migration**: A smart bulk import tool that syncs metadata and cover art via API.
*   **Genre Intelligence**: DSP-specific genre mapping with 200+ hierarchical genres.
*   **Production Testing Suite**: 17 built-in tests for system health, DDEX compliance, and delivery protocols.
*   **Secure by Design**: Enterprise-grade security features, including encryption, rate limiting, and tenant isolation.

## 🚀 Quick Start (For Users)

Create your own instance of the Stardust Distro platform with one command.

```bash
# Create your distribution platform
npx @stardust-distro/cli create my-platform

# Navigate to the project directory
cd my-platform

# Initialize Firebase (free tier available)
# The CLI will guide you through the setup process.
stardust-distro init

# Start the local development server
npm run dev
# Visit http://localhost:5173

# Deploy to production on Firebase
npm run deploy
# Your platform is live!
```

## 🛠️ Development (For Contributors)

To contribute to the Stardust Distro project itself, follow these steps to set up a local development environment.

```bash
# 1. Clone the repository
git clone https://github.com/daddykev/stardust-distro.git
cd stardust-distro

# 2. Install all dependencies and bootstrap the monorepo
npm run install:all

# 3. Start the development server for the template app
npm run dev

# The application will be running at http://localhost:5173
```

## 📖 Documentation

This repository contains extensive documentation. For a deeper understanding of the project, please refer to the following resources:

*   **[Technical Blueprint](blueprint.md)**: A complete overview of the project's architecture, data models, and development phases.
*   **[Getting Started Guide](template/docs/getting-started.md)**: A detailed guide for setting up and configuring your platform instance.
*   **[All Documentation](template/docs/)**: A full list of all platform guides, including release creation, catalog import, delivery setup, and more.

## 🔧 Technology Stack

*   **Frontend**: Vue 3 (Composition API) + Vite
*   **Backend**: Firebase (Firestore, Functions v2, Storage, Auth)
*   **Cloud Functions**: Node.js
*   **CLI**: Node.js with Commander.js
*   **Monorepo**: Lerna

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

## 📄 License

Stardust Distro is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
