# Stardust Distro - Blueprint

## Project Overview

Stardust Distro is an open-source, npm-installable music distribution platform that enables labels and artists to manage their catalog, generate DDEX-compliant ERN messages, and deliver releases to Digital Service Providers (DSPs). Built with an **open-source core** and an **optional plugin marketplace** for specialized features.

### Vision
Democratize music distribution by providing a complete, DDEX-compliant distribution platform that's truly free and open, with an optional marketplace for specialized plugins from both our team and third-party developers.

### Core Value Propositions
- **Instant Distribution Platform**: Deploy a functional distribution system with one command
- **Multi-Protocol Delivery**: Supports FTP, SFTP, Amazon S3, and Google Cloud methods
- **No Vendor Lock-in**: Core platform is a full production-ready system
- **Community Driven**: Open development, transparent roadmap
- **Developer Ecosystem**: Anyone can build and sell plugins

### Platform Architecture

#### Stardust Distro Core (100% Open Source - MIT License)
**Complete distribution platform for everyone**
- Full ERN generation (3.8.2, 4.2, 4.3)
- All delivery protocols (FTP/SFTP/API/S3/Azure)
- Complete metadata and production credits
- Audio processing (WAV/FLAC/MP3)
- Territory management
- Professional dashboard
- White-label capabilities
- Multi-tenant support
- **No limitations, no restrictions, complete functionality**

#### Plugin Marketplace (Optional - Separate Repositories)
**Open marketplace for specialized features**

The marketplace welcomes plugins from:
- **Core Team Plugins**: Professional extensions developed by the Stardust Distro team
- **Third-Party Developers**: Community and commercial plugins from independent developers
- **Label/DSP Integrations**: Custom integrations from industry partners
- **Open Source Plugins**: Free community contributions

Example plugin categories:
- **Audio Processing**: Dolby Atmos, Apple Digital Masters, Stem Management
- **Advanced Metadata**: Session musicians, engineering credits, studio details
- **Workflow Automation**: Delivery orchestration, bulk operations, smart scheduling
- **Analytics & Reporting**: Advanced metrics, custom reports, BI integrations
- **Territory Management**: Windowing, dynamic pricing, complex rights

## Development Status (August 2025)

### ✅ Phase 1: Foundation - COMPLETE
- Full Vue 3 application with routing and views
- Firebase integration (Auth, Firestore, Storage)
- Professional CSS architecture with theming
- Functional CLI tool with all core commands
- Monorepo structure with Lerna
- TypeScript types and schemas defined
- Template system ready for project generation

### 🚧 Phase 2: Core CMS - IN PROGRESS (80% Complete)
- ✅ Release creation wizard with full Firestore persistence
- ✅ Asset management system with Firebase Storage
- ✅ Track management (CRUD operations)
- ✅ Auto-save functionality
- ✅ Catalog browse/search with real data
- ✅ Edit mode for existing releases
- ✅ Delete operations with confirmation
- ⏳ Bulk operations (remaining 20%)

### 📅 Upcoming Phases
- Phase 3: ERN Generation (Weeks 9-12)
- Phase 4: Delivery Engine (Weeks 13-16)
- Phase 5: Plugin Marketplace (Weeks 17-20)
- Phase 6: Testing & Launch (Weeks 21-24)

## Technical Architecture

### Platform Stack
- **Frontend**: Vue 3 (Composition API) with Vite
- **Backend**: Firebase (Firestore, Functions, Storage, Auth)
- **Icons**: FontAwesome Free icons for consistent UI iconography
- **Delivery**: Node.js workers for file transfer
- **Validation**: DDEX Workbench API integration
- **CLI**: Node.js CLI for project scaffolding
- **Package Manager**: npm/yarn for distribution
- **Plugin System**: Dynamic plugin loading architecture

### Deployment Model
```bash
# One-command deployment
npx create-stardust-distro my-label-distro
cd my-label-distro
npm run deploy
```

### Multi-Tenant Architecture
- **Single Codebase**: One installation can serve multiple labels
- **Isolated Data**: Firestore security rules ensure data isolation
- **Custom Domains**: Each tenant can use their own domain
- **Shared Infrastructure**: Efficient resource utilization

## Unified Authentication Strategy

Stardust Distro shares authentication with the DDEX Workbench app ecosystem:

```javascript
// Shared auth configuration
import { initializeAuth } from '@stardust/auth';

const auth = initializeAuth({
  project: 'stardust-ecosystem',
  domain: 'auth.stardust-ecosystem.org'
});

// Single sign-on across:
// - DDEX Workbench (validation tools)
// - Stardust Distro (distribution platform)
// - Stardust DSP (streaming platform)
```

### Benefits
- **Test Workflows**: Users can test distributions by sending to their own Stardust DSP instance
- **Unified Dashboard**: Single login for all DDEX tools
- **Cross-Platform Analytics**: Track releases from creation to consumption
- **Shared API Keys**: One API key works across all services

## Project Structure

```
stardust-distro/
├── cli/                           # CLI tool for scaffolding
│   ├── bin/                       # Executable scripts
│   │   └── stardust-distro.js     # Main CLI entry ✅
│   ├── commands/                  # CLI commands
│   │   ├── create.js              # Create new project ✅
│   │   ├── init.js                # Initialize Firebase ✅
│   │   ├── deploy.js              # Deploy to Firebase ✅
│   │   ├── configure.js           # Configure delivery targets ✅
│   │   ├── target.js              # Manage delivery targets ✅
│   │   └── dev.js                 # Development server ✅
│   ├── templates/                 # Project templates
│   │   ├── default/               # Default template ✅
│   │   │   └── (full Vue app)     # Complete template structure ✅
│   │   ├── minimal/               # Minimal setup ❌
│   │   └── custom/                # Custom configurations ❌
│   └── package.json               # CLI dependencies ✅
├── packages/                      # Core packages
│   ├── @stardust/common/          # Common types and utilities ✅
│   │   ├── src/
│   │   │   ├── types/             # TypeScript types ✅
│   │   │   │   ├── index.ts       # Type exports ✅
│   │   │   │   ├── release.types.ts  # Release types ✅
│   │   │   │   └── delivery.types.ts # Delivery types ✅
│   │   │   ├── constants/         # Constants ✅
│   │   │   │   └── index.ts       # Constant values ✅
│   │   │   ├── utils/             # Utilities ✅
│   │   │   │   ├── index.ts       # Utility exports ✅
│   │   │   │   └── validation.ts  # Validation functions ✅
│   │   │   ├── schemas/           # Schemas ✅
│   │   │   │   └── firestore.schema.ts # Firestore schema ✅
│   │   │   └── index.ts           # Main export ✅
│   │   ├── package.json           # Package config ✅
│   │   └── tsconfig.json          # TypeScript config ✅
│   ├── @stardust/distro-core/     # Core distribution logic ❌
│   │   ├── src/
│   │   │   ├── catalog/           # Catalog management
│   │   │   ├── delivery/          # Delivery engine
│   │   │   ├── ern/               # ERN generation
│   │   │   ├── validation/        # Workbench integration
│   │   │   └── plugin-system/     # Plugin architecture
│   │   └── package.json
│   ├── @stardust/cms/             # Content management ❌
│   │   ├── src/
│   │   │   ├── components/        # Vue components
│   │   │   ├── stores/            # Pinia stores
│   │   │   └── views/             # Page components
│   │   └── package.json
│   └── @stardust/delivery-engine/   # Delivery workers ❌
│       ├── src/
│       │   ├── protocols/         # FTP, SFTP, S3, API
│       │   ├── queue/             # Job queue management
│       │   └── workers/           # Background workers
│       └── package.json
├── plugins/                       # Example plugin development (separate repos in production)
│   ├── example-plugin/            # Example plugin structure ❌
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   └── plugin-sdk/                # Plugin development kit ❌
│       ├── docs/                  # Plugin documentation
│       ├── templates/             # Plugin templates
│       └── tools/                 # Development tools
├── template/                      # Default project template
│   ├── src/                       # Vue application
│   │   ├── components/            # UI components
│   │   │   ├── catalog/           # Catalog management ❌
│   │   │   │   ├── ReleaseList.vue
│   │   │   │   ├── ReleaseForm.vue
│   │   │   │   ├── TrackManager.vue
│   │   │   │   └── AssetUploader.vue
│   │   │   ├── delivery/          # Delivery management ❌
│   │   │   │   ├── DeliveryTargets.vue
│   │   │   │   ├── DeliveryQueue.vue
│   │   │   │   └── DeliveryHistory.vue
│   │   │   ├── dashboard/         # Analytics & overview ❌
│   │   │   │   ├── StatsOverview.vue
│   │   │   │   ├── RecentActivity.vue
│   │   │   │   └── DeliveryMetrics.vue
│   │   │   └── NavBar.vue         # Navigation bar component ✅
│   │   ├── views/                 # Page views
│   │   │   ├── SplashPage.vue     # Landing/marketing page ✅
│   │   │   ├── Login.vue          # Authentication page ✅
│   │   │   ├── Signup.vue         # Account creation page ✅
│   │   │   ├── Dashboard.vue      # Main dashboard ✅
│   │   │   ├── Settings.vue       # Platform settings ✅
│   │   │   ├── Catalog.vue        # Catalog management ✅ UPDATED
│   │   │   ├── NewRelease.vue     # Create release wizard ✅ UPDATED
│   │   │   ├── ReleaseDetail.vue  # Release details page ✅ NEW
│   │   │   ├── Deliveries.vue     # Delivery management ✅
│   │   │   ├── NewDelivery.vue    # Create delivery ✅ NEW
│   │   │   ├── Analytics.vue      # Usage analytics ✅
│   │   │   └── NotFound.vue       # 404 page ✅ NEW
│   │   ├── composables/           # Vue composables
│   │   │   ├── useAuth.js         # Authentication composable ✅
│   │   │   ├── useCatalog.js      # Catalog operations ✅ NEW
│   │   │   ├── useDelivery.js     # Delivery operations ❌
│   │   │   └── useSettings.js     # Settings management ❌
│   │   ├── stores/                # Pinia stores ❌
│   │   │   ├── auth.js            # Shared auth state
│   │   │   ├── catalog.js         # Release catalog
│   │   │   ├── delivery.js        # Delivery queue
│   │   │   └── settings.js        # Platform config
│   │   ├── services/              # API services
│   │   │   ├── catalog.js         # Catalog operations ✅ NEW
│   │   │   ├── assets.js          # Asset management ✅ NEW
│   │   │   ├── delivery.js        # Delivery operations ❌
│   │   │   ├── workbench.js       # Validation API ❌
│   │   │   └── storage.js         # Asset management ❌
│   │   ├── router/                # Vue Router
│   │   │   └── index.js           # Route definitions ✅ UPDATED
│   │   ├── assets/                # Design system CSS architecture
│   │   │   ├── main.css           # Entry point importing all stylesheets ✅
│   │   │   ├── base.css           # CSS reset, normalization, base typography ✅
│   │   │   ├── themes.css         # CSS custom properties, light/dark themes ✅
│   │   │   └── components.css     # Reusable component & utility classes ✅
│   │   ├── firebase.js            # Firebase initialization ✅
│   │   ├── App.vue                # Root component with theme management ✅
│   │   └── main.js                # Entry point with FontAwesome setup ✅ UPDATED
│   ├── functions/                 # Cloud Functions ❌
│   │   ├── catalog/               # Catalog operations
│   │   ├── delivery/              # Delivery operations
│   │   ├── ern/                   # ERN operations
│   │   ├── integrations/          # External integrations
│   │   ├── utils/                 # Utilities
│   │   ├── index.js               # Function exports
│   │   └── package.json           # Dependencies
│   ├── public/                    # Static assets ✅
│   │   └── index.html             # HTML template ✅
│   ├── node_modules/              # Dependencies (git-ignored) ✅
│   ├── dist/                      # Build output (git-ignored) ✅
│   ├── scripts/                   # Build scripts ❌
│   │   ├── setup.js               # Initial setup
│   │   ├── configure.js           # Configuration wizard
│   │   └── migrate.js             # Migration tools
│   ├── .env                       # Environment variables (git-ignored) ✅
│   ├── .env.example               # Environment template ✅
│   ├── .gitignore                 # Git ignore ✅
│   ├── package.json               # Project dependencies ✅
│   ├── package-lock.json          # Locked dependencies ✅
│   ├── vite.config.js             # Vite configuration ✅
│   └── README.md                  # Project documentation ✅
├── docs/                          # Documentation ❌
│   ├── getting-started.md         # Quick start guide
│   ├── configuration.md           # Configuration guide
│   ├── delivery-setup.md          # Delivery target setup
│   ├── api-reference.md           # API documentation
│   ├── customization.md           # Customization guide
│   ├── plugin-development.md      # Plugin developer guide
│   └── troubleshooting.md         # Common issues
├── examples/                      # Example configurations ❌
│   ├── indie-label/               # Indie label setup
│   ├── aggregator/                # Aggregator setup
│   └── multi-tenant/              # Multi-tenant setup
├── tests/                         # Test suites ❌
├── .github/                       # GitHub actions ❌
├── .DS_Store                      # Mac system file (git-ignored) ✅
├── .firebase/                     # Firebase cache (git-ignored) ✅
├── .firebaserc                    # Firebase project config ✅
├── .git/                          # Git repository ✅
├── .gitignore                     # Git ignore rules ✅
├── firebase.json                  # Firebase config ✅
├── firestore.rules                # Security rules ✅
├── firestore.indexes.json         # Database indexes ✅
├── lerna.json                     # Lerna config ✅
├── package.json                   # Root package config ✅
├── LICENSE                        # MIT License ❌
├── README.md                      # Project README ✅
├── CONTRIBUTING.md                # Contribution guide ❌
└── blueprint.md                   # This document ✅ UPDATED
```

### Files Created and Deployed:
✅ = File exists and is functional
❌ = File not yet created
📝 = File partially created or needs implementation

### Summary of Actual vs Planned:
- **Core App (template/)**: 95% complete - all views, routing, and core services done
- **CLI Tool**: ✅ 100% complete - All commands created and functional
- **Packages**: ✅ 40% complete - @stardust-distro/common created with types, constants, utils, schemas
- **Services**: ✅ 40% complete - catalog and assets services created
- **Composables**: ✅ 50% complete - useAuth and useCatalog created
- **Functions**: 0% complete - not yet created
- **Documentation**: 10% complete - blueprint exists
- **Testing**: 0% complete - no tests written yet

## Core Features (All Included in Open Source)

### 1. Product Catalog Management

#### Release Creation Wizard
A multi-step wizard for creating new releases:

```typescript
interface ReleaseWizardSteps {
  1: 'Basic Information',     // Title, artist, type
  2: 'Track Management',      // Add/order tracks
  3: 'Asset Upload',          // Audio files, artwork
  4: 'Metadata',              // Credits, copyright
  5: 'Territories & Rights',  // Distribution rights
  6: 'Review & Generate'      // ERN preview
}
```

#### Asset Management
- **Audio Processing**: Automatic format validation (WAV, FLAC, MP3)
- **Artwork Handling**: Multiple artwork types with size validation
- **Cloud Storage**: Organized asset storage with CDN delivery
- **Batch Upload**: Drag-and-drop multiple files

#### Metadata Templates
```javascript
// Reusable metadata templates
templates: {
  'standard-album': {
    releaseType: 'Album',
    defaultTerritories: ['Worldwide'],
    requiredAssets: ['FrontCoverImage', 'Audio'],
    metadata: { /* template fields */ }
  }
}
```

### 2. DDEX ERN Generation

#### Multi-Version Support
```javascript
// Generate ERN based on target DSP requirements
const ernGenerator = new ERNGenerator({
  version: '4.3',  // or '3.8.2', '4.2'
  profile: 'AudioAlbum',
  territory: 'Worldwide'
});

const ern = await ernGenerator.generate(release);
```

#### Validation Integration
```javascript
// Every generated ERN is validated via Workbench
async function generateAndValidate(release) {
  const ern = await generateERN(release);
  
  const validation = await workbenchAPI.validate({
    content: ern,
    type: 'ERN',
    version: release.ernVersion,
    profile: release.profile
  });
  
  if (!validation.valid) {
    throw new ValidationError(validation.errors);
  }
  
  return { ern, validation };
}
```

### 3. Delivery Management

#### Multi-Protocol Support (All Included in Core)
```typescript
interface DeliveryProtocols {
  FTP: {
    host: string;
    port: number;
    username: string;
    password: encrypted;
    directory: string;
  };
  SFTP: {
    host: string;
    port: number;
    username: string;
    privateKey: encrypted;
    directory: string;
  };
  S3: {
    bucket: string;
    region: string;
    accessKey: encrypted;
    secretKey: encrypted;
    prefix: string;
  };
  Azure: {
    accountName: string;
    accountKey: encrypted;
    containerName: string;
    prefix: string;
  };
  API: {
    endpoint: string;
    authType: 'Bearer' | 'Basic' | 'OAuth2';
    credentials: encrypted;
    headers?: Record<string, string>;
  };
}
```

#### Delivery Queue System
```javascript
// Firestore queue for reliable delivery
deliveryQueue: {
  queueId: {
    releaseId: string,
    target: DeliveryTarget,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    attempts: number,
    scheduledFor: Timestamp,
    files: [{
      type: 'ERN' | 'Audio' | 'Image',
      path: string,
      size: number
    }],
    logs: DeliveryLog[]
  }
}
```

#### Delivery Scheduling
- **Immediate**: Send as soon as ready
- **Scheduled**: Set specific delivery time
- **Recurring**: Regular catalog updates
- **Batch**: Group multiple releases

### 4. Dashboard & Analytics

#### Real-time Metrics
```vue
<template>
  <DashboardMetrics>
    <MetricCard 
      title="Active Releases" 
      :value="stats.activeReleases" 
      trend="+12%"
    />
    <MetricCard 
      title="Pending Deliveries" 
      :value="stats.pendingDeliveries" 
      status="warning"
    />
    <MetricCard 
      title="Success Rate" 
      :value="`${stats.successRate}%`" 
      trend="+5%"
    />
  </DashboardMetrics>
</template>
```

#### Delivery History
- Comprehensive logs for each delivery
- Retry failed deliveries
- Download delivery receipts
- Track DSP acknowledgments

### 5. Multi-Tenant Support

#### Tenant Isolation
```javascript
// Firestore rules ensure complete data isolation
match /tenants/{tenantId}/{document=**} {
  allow read, write: if request.auth != null && 
    request.auth.token.tenantId == tenantId;
}
```

#### White-Label Features
- Custom branding (logo, colors, fonts)
- Custom domain support
- Branded email notifications
- Customizable delivery metadata

## Data Models

### Firestore Collections

```typescript
// releases collection
interface Release {
  id: string;
  tenantId: string;
  type: 'Album' | 'Single' | 'Video' | 'Mixed';
  status: 'draft' | 'ready' | 'delivered' | 'archived';
  
  metadata: {
    title: string;
    displayArtist: string;
    releaseDate: Date;
    label: string;
    catalogNumber?: string;
    barcode?: string;
    genre: string[];
    language: string;
  };
  
  tracks: Track[];
  
  assets: {
    audio: AudioAsset[];
    images: ImageAsset[];
    documents?: DocumentAsset[];
  };
  
  territories: {
    included: string[];
    excluded?: string[];
  };
  
  rights: {
    startDate: Date;
    endDate?: Date;
    priceCode?: string;
  };
  
  ddex: {
    version: '3.8.2' | '4.2' | '4.3';
    profile: string;
    messageId?: string;
    lastGenerated?: Date;
    validationStatus?: 'valid' | 'invalid';
    validationErrors?: ValidationError[];
  };
  
  created: Timestamp;
  updated: Timestamp;
  createdBy: string;
}

// tracks subcollection
interface Track {
  id: string;
  sequenceNumber: number;
  isrc: string;
  
  metadata: {
    title: string;
    displayArtist: string;
    duration: number; // seconds
    contributors: Contributor[];
    writers?: Writer[];
    publishers?: Publisher[];
  };
  
  audio: {
    fileId: string;
    format: 'WAV' | 'FLAC' | 'MP3';
    bitrate?: number;
    sampleRate?: number;
  };
  
  preview?: {
    startTime: number;
    duration: number;
  };
}

// deliveryTargets collection
interface DeliveryTarget {
  id: string;
  tenantId: string;
  name: string;
  type: 'DSP' | 'Aggregator' | 'Test';
  
  protocol: 'FTP' | 'SFTP' | 'S3' | 'API' | 'Azure';
  config: DeliveryProtocol; // Type based on protocol
  
  requirements?: {
    ernVersion: string;
    audioFormat: string[];
    imageSpecs: ImageRequirement[];
  };
  
  schedule: {
    type: 'immediate' | 'scheduled' | 'recurring';
    timezone?: string;
    time?: string; // For scheduled/recurring
    frequency?: 'daily' | 'weekly' | 'monthly';
  };
  
  active: boolean;
  lastDelivery?: Date;
  testMode: boolean;
}

// deliveries collection
interface Delivery {
  id: string;
  releaseId: string;
  targetId: string;
  tenantId: string;
  
  status: 'queued' | 'processing' | 'delivering' | 'completed' | 'failed';
  
  package: {
    ernFile: string;
    audioFiles: string[];
    imageFiles: string[];
    totalSize: number;
  };
  
  attempts: DeliveryAttempt[];
  
  scheduled: Timestamp;
  started?: Timestamp;
  completed?: Timestamp;
  
  receipt?: {
    dspMessageId?: string;
    acknowledgment?: string;
    timestamp: Timestamp;
  };
}

// tenants collection
interface Tenant {
  id: string;
  name: string;
  type: 'label' | 'artist' | 'aggregator';
  
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    customDomain?: string;
  };
  
  settings: {
    defaultERNVersion: string;
    defaultTerritories: string[];
    requireValidation: boolean;
    autoDeliver: boolean;
  };
  
  plugins: {
    installed: string[]; // Plugin IDs
    licenses: Map<string, PluginLicense>;
  };
  
  users: string[]; // User IDs with access
  owner: string;
  created: Timestamp;
}

// users collection
interface User {
  id: string;
  email: string;
  displayName: string;
  organizationName?: string;
  photoURL?: string;
  
  role: 'admin' | 'manager' | 'viewer';
  tenants: string[]; // Tenant IDs user has access to
  
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: NotificationPreferences;
  };
  
  created: Timestamp;
  lastLogin: Timestamp;
}

// Additional type definitions
interface Contributor {
  name: string;
  role: 'Producer' | 'Writer' | 'Composer' | 'Arranger';
  isni?: string;
  ipi?: string;
}

interface AudioAsset {
  id: string;
  fileName: string;
  format: 'WAV' | 'FLAC' | 'MP3';
  size: number;
  duration: number;
  channels: number;
  sampleRate: number;
  bitDepth?: number;
  bitrate?: number;
  storageUrl: string;
  uploadedAt: Timestamp;
}

interface ImageAsset {
  id: string;
  fileName: string;
  type: 'FrontCover' | 'BackCover' | 'Booklet' | 'Artist' | 'Label';
  format: 'JPEG' | 'PNG';
  width: number;
  height: number;
  size: number;
  storageUrl: string;
  uploadedAt: Timestamp;
}

interface DeliveryAttempt {
  attemptNumber: number;
  startTime: Timestamp;
  endTime?: Timestamp;
  status: 'success' | 'failed' | 'partial';
  error?: string;
  files: {
    fileName: string;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    bytesTransferred?: number;
    totalBytes?: number;
  }[];
}

interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}
```

## API Architecture

### Internal APIs (Cloud Functions)

```typescript
// Catalog Management
POST   /api/releases                 // Create new release
GET    /api/releases                 // List releases
GET    /api/releases/:id             // Get release details
PUT    /api/releases/:id             // Update release
DELETE /api/releases/:id             // Delete release
POST   /api/releases/:id/generate    // Generate ERN
POST   /api/releases/:id/validate    // Validate via Workbench

// Asset Management
POST   /api/assets/upload            // Get upload URL
POST   /api/assets/process           // Process uploaded asset
DELETE /api/assets/:id               // Delete asset

// Delivery Management
GET    /api/delivery-targets         // List delivery targets
POST   /api/delivery-targets         // Create target
PUT    /api/delivery-targets/:id     // Update target
DELETE /api/delivery-targets/:id     // Delete target
POST   /api/delivery-targets/:id/test // Test connection

// Delivery Operations
POST   /api/deliveries               // Queue delivery
GET    /api/deliveries               // List deliveries
GET    /api/deliveries/:id           // Get delivery status
POST   /api/deliveries/:id/retry     // Retry failed delivery
GET    /api/deliveries/:id/logs      // Get delivery logs

// Tenant Management
GET    /api/tenant                   // Get current tenant info
PUT    /api/tenant                   // Update tenant settings
POST   /api/tenant/invite            // Invite user to tenant

// User Management
GET    /api/users/me                 // Get current user
PUT    /api/users/me                 // Update user profile
GET    /api/users                    // List tenant users (admin only)

// Plugin Management
GET    /api/plugins                  // List available plugins
POST   /api/plugins/install          // Install plugin
DELETE /api/plugins/:id              // Uninstall plugin
GET    /api/plugins/:id/config       // Get plugin configuration
PUT    /api/plugins/:id/config       // Update plugin configuration
```

### External Integration APIs

```javascript
// DDEX Workbench Integration
class WorkbenchClient {
  async validateERN(ern, version, profile) {
    return fetch('https://api.ddex-workbench.org/v1/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.WORKBENCH_API_KEY
      },
      body: JSON.stringify({
        content: ern,
        type: 'ERN',
        version,
        profile
      })
    });
  }
}

// Stardust DSP Test Integration
class DSPTestClient {
  async sendTestDelivery(release, targetDSP) {
    // Send to user's Stardust DSP instance for testing
    return fetch(`${targetDSP.endpoint}/api/deliveries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${targetDSP.apiKey}`
      },
      body: formData // ERN + assets
    });
  }
}
```

## Plugin Architecture

### Plugin System Design

```javascript
// Base plugin interface
class StardustPlugin {
  static metadata = {
    name: 'plugin-name',
    version: '1.0.0',
    author: 'Developer Name',
    requires: ['@stardust/core@^2.0.0'],
    hooks: ['beforeRelease', 'afterRelease', 'beforeDelivery']
  };
  
  install(app) {
    // Plugin installation logic
    this.registerHooks(app);
    this.extendModels(app);
    this.addUIComponents(app);
  }
  
  uninstall(app) {
    // Cleanup logic
    this.removeHooks(app);
    this.cleanupData(app);
  }
}

// Plugin loader
class PluginLoader {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
  }
  
  async loadPlugin(name) {
    const plugin = await import(`@stardust-plugins/${name}`);
    
    // Validate plugin compatibility
    if (!this.validateRequirements(plugin.metadata.requires)) {
      throw new Error(`Plugin ${name} requirements not met`);
    }
    
    // Install plugin
    plugin.install(this.app);
    this.plugins.set(name, plugin);
    
    return plugin;
  }
  
  async executeHook(hookName, data) {
    const hooks = this.hooks.get(hookName) || [];
    
    for (const hook of hooks) {
      data = await hook(data);
    }
    
    return data;
  }
}
```

### Example Plugin Development

```javascript
// Example: Dolby Atmos Plugin (third-party or core team)
export class DolbyAtmosPlugin extends StardustPlugin {
  static metadata = {
    name: 'dolby-atmos',
    version: '1.0.0',
    author: 'Audio Processing Inc.',
    requires: ['@stardust/core@^2.0.0'],
    hooks: ['beforeAssetProcess', 'afterAssetProcess', 'beforeDelivery']
  };
  
  install(app) {
    // Extend audio processor
    app.audioProcessor.addFormat('DolbyAtmos', this.processDolbyAtmos);
    app.audioProcessor.addFormat('BinauraL', this.processBinaural);
    
    // Add UI components
    app.ui.register('track-editor', AtmosAudioPanel);
    
    // Register hooks
    app.hooks.register('beforeAssetProcess', this.validateAtmosFile);
    app.hooks.register('beforeDelivery', this.prepareAtmosDelivery);
  }
  
  async processDolbyAtmos(file) {
    // Validate Atmos file
    const validation = await this.validateAtmosFile(file);
    
    if (!validation.valid) {
      throw new Error(`Invalid Atmos file: ${validation.errors.join(', ')}`);
    }
    
    // Extract metadata
    const metadata = await this.extractAtmosMetadata(file);
    
    // Generate deliverables
    const deliverables = await this.generateAtmosDeliverables(file, metadata);
    
    return {
      format: 'DolbyAtmos',
      metadata,
      deliverables
    };
  }
  
  async generateAtmosDeliverables(source, metadata) {
    return {
      master: source,
      binaural: await this.generateBinauralMix(source),
      stereoDownmix: await this.generateStereoDownmix(source),
      mp4: await this.generateAtmosMP4(source),
      metadata: await this.generateAtmosXML(metadata)
    };
  }
}
```

### Plugin Marketplace Infrastructure

```javascript
// Plugin marketplace API
class PluginMarketplace {
  constructor() {
    this.registry = new PluginRegistry();
    this.licensing = new LicensingService();
  }
  
  async searchPlugins(query) {
    return this.registry.search({
      query,
      filters: {
        category: query.category,
        author: query.author,
        license: query.license // 'free', 'paid', 'freemium'
      }
    });
  }
  
  async installPlugin(pluginId, tenantId) {
    const plugin = await this.registry.get(pluginId);
    
    // Check licensing
    if (plugin.license !== 'free') {
      const hasLicense = await this.licensing.verify(pluginId, tenantId);
      if (!hasLicense) {
        throw new Error('Valid license required');
      }
    }
    
    // Download and install
    const package = await this.downloadPlugin(plugin);
    return this.loader.install(package);
  }
  
  async publishPlugin(plugin, developer) {
    // Validate plugin
    await this.validatePlugin(plugin);
    
    // Register in marketplace
    return this.registry.publish({
      ...plugin,
      author: developer,
      publishedAt: new Date()
    });
  }
}
```

## CLI Tool Architecture

### Installation & Setup
```bash
# Global installation
npm install -g @stardust/distro-cli

# Create new project
stardust-distro create my-label \
  --template=default \
  --region=us-central1

# Interactive setup
cd my-label
stardust-distro init
# Prompts for:
# - Firebase project selection/creation
# - Authentication configuration
# - Domain setup (optional)
# - Initial admin user
```

### CLI Commands
```bash
# Project management
stardust-distro create <name>    # Create new project
stardust-distro init             # Initialize Firebase
stardust-distro deploy           # Deploy to Firebase
stardust-distro update           # Update to latest version

# Configuration
stardust-distro config set <key> <value>
stardust-distro config get <key>
stardust-distro target add       # Add delivery target
stardust-distro target test      # Test delivery target
stardust-distro target list      # List configured targets

# Development
stardust-distro dev              # Start local development
stardust-distro build            # Build for production
stardust-distro emulators        # Start Firebase emulators
stardust-distro test             # Run test suite

# Plugin Management
stardust-distro plugin search    # Search marketplace
stardust-distro plugin install   # Install plugin
stardust-distro plugin remove    # Remove plugin
stardust-distro plugin list      # List installed plugins
stardust-distro plugin develop   # Create new plugin

# Migration & Backup
stardust-distro import           # Import existing catalog
stardust-distro export           # Export catalog data
stardust-distro backup           # Backup to cloud storage
stardust-distro restore          # Restore from backup
```

## Security Architecture

### Authentication & Authorization
```javascript
// Unified auth with ecosystem
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Shared auth configuration
const app = initializeApp({
  authDomain: 'auth.stardust-ecosystem.org',
  // ... other config
});

// Role-based access control
const roles = {
  'admin': ['*'],                    // Full access
  'manager': ['catalog', 'delivery'], // Manage releases
  'viewer': ['catalog:read']          // Read-only access
};
```

### Data Security
- **Encryption**: All sensitive data encrypted at rest
- **API Keys**: Stored encrypted, never exposed in UI
- **File Access**: Signed URLs with expiration
- **Audit Logs**: All actions logged with user/timestamp

### Delivery Security
```javascript
// Encrypted credential storage
async function storeDeliveryCredentials(targetId, credentials) {
  const encrypted = await encryptWithKMS(credentials);
  await firestore.collection('deliveryTargets').doc(targetId).update({
    'config.credentials': encrypted
  });
}

// Secure credential retrieval
async function getDeliveryCredentials(targetId) {
  const doc = await firestore.collection('deliveryTargets').doc(targetId).get();
  return decryptWithKMS(doc.data().config.credentials);
}
```

## Customization & Extension

### Theme Customization
```javascript
// Brand configuration
export default {
  brand: {
    name: 'My Label Distro',
    logo: '/assets/logo.svg',
    colors: {
      primary: '#1a73e8',
      secondary: '#34a853',
      accent: '#fbbc04'
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Open Sans'
    }
  },
  features: {
    enableAnalytics: true,
    enableMultiTenant: false,
    defaultERNVersion: '4.3'
  }
}
```

### Custom Delivery Protocols
```javascript
// Add custom delivery protocol
export class CustomDeliveryProtocol {
  async connect(config) {
    // Custom connection logic
    this.client = new CustomClient(config);
    await this.client.authenticate();
  }
  
  async upload(files) {
    // Custom upload logic
    for (const file of files) {
      await this.client.uploadFile(file);
    }
  }
  
  async disconnect() {
    // Cleanup
    await this.client.disconnect();
  }
}

// Register custom protocol
distro.registerProtocol('custom', CustomDeliveryProtocol);
```

## Implementation Examples

### Complete Release Flow

```javascript
// Complete release creation and delivery
import { ReleaseCreator, DeliveryManager } from '@stardust/distro-core';

// Create release with full metadata
const release = {
  title: "Summer Vibes EP",
  artist: "Beach Band",
  label: "Indie Records",
  releaseDate: "2024-07-01",
  catalogNumber: "IND001",
  barcode: "1234567890123",
  
  tracks: [
    {
      title: "Sunset Dreams",
      artist: "Beach Band",
      producer: "John Smith",
      writer: ["Jane Doe", "John Smith"],
      duration: 215,
      isrc: "USRC12400001",
      audioFile: "sunset-dreams.wav"
    },
    {
      title: "Ocean Waves",
      artist: "Beach Band",
      producer: "John Smith",
      writer: "Jane Doe",
      duration: 189,
      isrc: "USRC12400002",
      audioFile: "ocean-waves.wav"
    }
  ],
  
  artwork: {
    frontCover: "cover.jpg",
    resolution: "3000x3000"
  },
  
  territories: ["Worldwide"],
  
  delivery: {
    targets: [
      {
        name: "Spotify",
        protocol: "API",              // ✓ API supported
        endpoint: "https://api.spotify.com/v1/releases",
        credentials: { /* encrypted */ }
      },
      {
        name: "Apple Music",
        protocol: "S3",                // ✓ S3 supported
        bucket: "apple-music-uploads",
        region: "us-west-2"
      },
      {
        name: "Bandcamp",
        protocol: "FTP",               // ✓ FTP supported
        host: "ftp.bandcamp.com"
      }
    ]
  }
};

// Create and validate release
const creator = new ReleaseCreator();
const stardustRelease = await creator.createRelease(release);

// Generate ERN
const ern = await creator.generateERN(stardustRelease);

// Validate with Workbench
const validation = await creator.validate(ern);

if (validation.valid) {
  // Deliver to all targets
  const delivery = new DeliveryManager();
  
  for (const target of release.delivery.targets) {
    await delivery.deliver(stardustRelease, target);
  }
}
```

### Plugin-Enhanced Workflow

```javascript
// Using plugins for specialized features
import { ReleaseCreator, DeliveryManager } from '@stardust/distro-core';
import { PluginLoader } from '@stardust/plugin-system';

// Load plugins (if licensed)
const plugins = new PluginLoader();
await plugins.load('dolby-atmos');
await plugins.load('delivery-orchestrator');

// Create release with plugin features
const release = {
  title: "Cinematic Experience",
  artist: "Orchestra Supreme",
  label: "Major Records",
  
  tracks: [
    {
      title: "Epic Journey",
      artist: "Orchestra Supreme",
      producer: "Alex Producer",
      writer: ["Sarah Composer"],
      
      // Plugin-enhanced: Dolby Atmos
      audioFiles: {
        stereo: "epic-journey-stereo.wav",  // Core feature
        atmos: "epic-journey.atmos"          // Plugin feature
      }
    }
  ],
  
  // Plugin-enhanced: Delivery orchestration
  delivery: {
    orchestration: {
      type: "parallel",
      rules: [
        {
          condition: "spotify.success",
          action: "notify",
          target: "marketing-team"
        }
      ]
    },
    targets: [
      { name: "Spotify", protocol: "API" },
      { name: "Apple", protocol: "S3" },
      { name: "Amazon", protocol: "API" }
    ]
  }
};

// Process with plugins
const creator = new ReleaseCreator({ plugins });
const stardustRelease = await creator.createRelease(release);

// Deliver with orchestration
const delivery = new DeliveryManager({ plugins });
const results = await delivery.deliver(stardustRelease);
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4) ✅ COMPLETE
- [x] Define project structure and blueprint
- [x] Create basic Vue 3 app with Firebase integration
- [x] Set up authentication (Login/Signup views)
- [x] Create navigation and routing structure
- [x] Design CSS architecture (themes, components, utilities)
- [x] Deploy initial app to Firebase Hosting
- [x] Create placeholder views for all routes
- [x] Create CLI scaffolding tool
- [x] Set up monorepo with Lerna/Yarn workspaces
- [x] Create shared packages (@stardust-distro/common)
- [x] Design Firestore schema

#### Phase 1 Accomplishments:
- **Frontend Foundation**: Complete Vue 3 app with all routing and views
- **Authentication**: Full auth flow with Firebase Auth (email/password + Google)
- **UI/UX**: Professional design system with light/dark themes
- **CLI Tool**: Fully functional CLI with all commands (create, init, deploy, configure, target, dev)
- **Monorepo**: Lerna configuration with workspaces support
- **Shared Packages**: @stardust-distro/common package with types, constants, utils, and schemas
- **Templates**: Complete default template with full Vue app structure
- **Views Created**: All 12 views (Splash, Login, Signup, Dashboard, Settings, Catalog, NewRelease, ReleaseDetail, Deliveries, NewDelivery, Analytics, NotFound)
- **Deployment**: Successfully deployed to Firebase Hosting
- **CSS Architecture**: Modular CSS system with base, themes, components, and utility classes

### Phase 2: Core CMS (Weeks 5-8) - CURRENT PHASE 🚧 (80% Complete)
- [x] Build release creation wizard (UI and functionality)
- [x] Implement asset upload system (Storage integration complete)
- [x] Create metadata management UI
- [x] Build track management interface
- [x] Implement catalog browse/search
- [x] Connect to Firestore for data persistence
- [x] Add auto-save functionality
- [x] Implement edit mode for releases
- [x] Add delete operations with confirmation
- [ ] Add bulk operations (20% remaining)

#### Phase 2 Accomplishments:
- **Release Creation Wizard**: 6-step wizard with full data persistence
- **Asset Management**: Cover image and audio file uploads to Firebase Storage
- **Track Management**: Complete CRUD operations for tracks with sequencing
- **Catalog Service**: Full service layer for release management
- **Asset Service**: Upload service with progress tracking and validation
- **Catalog Composable**: Vue composable for reactive catalog operations
- **Auto-save**: Drafts automatically saved after 3 seconds of inactivity
- **Search & Filter**: Real-time search and filtering in catalog
- **Edit Mode**: Edit existing releases with all data preserved
- **Delete Confirmation**: Modal confirmation for destructive actions
- **Upload Progress**: Visual progress indicators for file uploads
- **Error Handling**: Comprehensive error handling with user feedback
- **Services Created**: CatalogService and AssetService with full Firestore/Storage integration
- **Composables Created**: useCatalog for reactive state management
- **Views Updated**: NewRelease and Catalog with full backend integration
- **New Views Added**: ReleaseDetail, NewDelivery, and NotFound pages

### Phase 3: ERN Generation (Weeks 9-12)
- [ ] Build ERN generator engine
- [ ] Integrate with DDEX Workbench API
- [ ] Create ERN preview UI
- [ ] Implement version-specific rules
- [ ] Add territory management
- [ ] Build validation feedback UI

### Phase 4: Delivery Engine (Weeks 13-16)
- [ ] Implement FTP/SFTP protocols
- [ ] Add S3/Azure delivery support
- [ ] Build API delivery system
- [ ] Create delivery queue system
- [ ] Implement retry logic
- [ ] Add delivery receipts

### Phase 5: Plugin Marketplace (Weeks 17-20)
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

### Phase 6: Testing & Launch (Weeks 21-24)
- [ ] Comprehensive testing suite
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation completion
- [ ] Demo site deployment
- [ ] npm package publication

## Success Metrics

### Performance Targets
- **ERN Generation**: <5 seconds for standard album
- **Asset Processing**: <30 seconds per track
- **Delivery Queue**: <2 minute average delivery time
- **UI Response**: <200ms for all operations
- **API Response**: <500ms p95

### Ecosystem Integration
- **Workbench Validations**: 100% of generated ERNs
- **DSP Test Deliveries**: 30% of users testing with Stardust DSP
- **Cross-Platform Users**: 50% using multiple DDEX tools

## Future Enhancements

### Post-Launch Features
1. **DSR Integration**: Process sales reports from DSPs
2. **Rights Management**: Complex rights and royalty tracking
3. **Multi-Currency**: Pricing in multiple currencies
4. **Advanced Analytics**: Revenue projections, trend analysis
5. **Automated Workflows**: Rule-based delivery automation
6. **Mobile Apps**: iOS/Android companion apps

### Ecosystem Expansion
1. **Stardust Publisher**: Publishing and composition management
2. **Stardust Analytics**: Unified analytics across distribution and consumption
3. **Stardust Studio**: Audio mastering and preparation tools
4. **Stardust Connect**: B2B integration platform

## Technical Considerations

### Scalability
- **Firebase Auto-scaling**: Handles growth automatically
- **CDN Integration**: Global asset delivery via Firebase Storage
- **Queue Management**: Cloud Tasks for reliable processing
- **Sharding Strategy**: For large catalogs (10k+ releases)

### Performance Optimization
- **Lazy Loading**: Load catalog data on demand
- **Asset Chunking**: Split large files for upload
- **Caching Strategy**: Cache ERN templates and metadata
- **Background Processing**: Offload heavy operations

### Monitoring & Logging
```javascript
// Comprehensive logging
import { logger } from '@stardust/distro-core';

logger.info('Delivery started', {
  releaseId,
  targetId,
  protocol,
  fileCount: files.length,
  totalSize
});

// Performance monitoring
import { performance } from '@stardust/monitoring';

const timer = performance.startTimer('ern-generation');
const ern = await generateERN(release);
timer.end({ releaseId, trackCount: release.tracks.length });
```

## Open Source Strategy

### License Structure
- **Core Platform**: MIT License (100% open source)
- **Plugins**: Individual licenses (MIT, GPL, Commercial, etc.)
- **Documentation**: Creative Commons
- **Examples**: MIT License

### Community Building
1. **Public Roadmap**: GitHub Projects board
2. **Regular Releases**: Monthly release cycle
3. **Community Calls**: Bi-weekly video calls
4. **Contributor Guide**: Clear contribution guidelines
5. **Plugin Marketplace**: Community and commercial extensions

### Support Model
- **Community**: GitHub Discussions, Discord (free)
- **Plugin Support**: Varies by plugin developer

## Getting Started

### Quick Start
```bash
# Clone and set up the development environment
git clone https://github.com/daddykev/stardust-distro.git
cd stardust-distro

# Install CLI dependencies
cd cli
npm install

# Test the CLI locally
./bin/stardust-distro.js create my-distro

# Or install globally for development
npm link
stardust-distro create my-distro

# Deploy to Firebase
cd my-distro
npm install
npm run deploy

# Your platform is live! 🚀
# Visit: https://my-distro.web.app
```

### Plugin Development
```bash
# Create new plugin project
stardust-distro plugin create my-plugin

# Navigate to plugin directory
cd my-plugin

# Develop your plugin
npm run dev

# Test with local Stardust Distro instance
npm run test

# Publish to marketplace
stardust-distro plugin publish
```

### Next Steps
1. Configure delivery targets
2. Customize branding
3. Create first release
4. Test with Stardust DSP
5. Go live with real deliveries
6. Browse plugin marketplace for enhancements

## Conclusion

Stardust Distro's 100% open-source model with an optional plugin marketplace provides the perfect balance of accessibility and extensibility. The core platform delivers everything needed for professional music distribution without any limitations or fees, while the open plugin marketplace enables specialized features and creates opportunities for developers to innovate and monetize their expertise. This approach ensures:

1. **Complete transparency** - Every core feature is open source
2. **No vendor lock-in** - The platform is fully functional without plugins
3. **Developer ecosystem** - Anyone can create and sell plugins
4. **Sustainable development** - Plugin revenue supports ongoing development
5. **Community ownership** - True open source with community governance

The future of music distribution is open, compliant, and accessible to all.