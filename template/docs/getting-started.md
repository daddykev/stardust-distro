# Getting Started with Stardust Distro 🚀

Welcome to Stardust Distro! This guide will walk you through setting up your own professional, open-source music distribution platform. In about 15-20 minutes, you'll go from zero to a fully deployed system ready to deliver.

## What is Stardust Distro?

Stardust Distro is a self-hosted, DDEX-compliant music distribution platform that gives you complete control over your catalog and distribution pipeline. Key features include:

- **DDEX ERN Support**: Generate compliant ERN messages (versions 3.8.2, 4.2, and 4.3)
- **Apple Music XML**: Full support for Apple Music Spec 5.3.23
- **Multi-Protocol Delivery**: FTP, SFTP, Amazon S3, Azure Blob Storage, and REST APIs
- **Genre Intelligence**: Automatic genre mapping between different DSP taxonomies
- **Content Fingerprinting**: Duplicate detection and audio similarity analysis
- **Catalog Import**: Bulk import existing catalogs via CSV and DDEX file naming
- **Real-time Monitoring**: Live delivery tracking with comprehensive logging

## Prerequisites

Before you begin, ensure you have:

1. **Node.js 18.x or higher** - [Download from nodejs.org](https://nodejs.org/)
2. **A Google Account** - Required for Firebase project creation
3. **Firebase CLI** - Install globally:
   ```bash
   npm install -g firebase-tools
   ```
4. **Git** (optional but recommended) - For version control

## Quick Start (5 minutes)

For the fastest setup, use our one-command installer:

```bash
npx create-stardust-distro my-music-distro
cd my-music-distro
npm run init

# IMPORTANT: Set your Firebase project
cp .firebaserc.example .firebaserc
# Edit .firebaserc with your Firebase project ID

npm run deploy
```

Your platform will be live at `https://your-project-id.web.app` 🎉

## Detailed Installation

### Step 1: Create Your Project

```bash
# Create a new Stardust Distro instance
npx create-stardust-distro my-label-distro

# Navigate to your project
cd my-label-distro

# Install dependencies
npm install
```

### Step 2: Firebase Setup

#### 2.1 Create Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Name it (e.g., "My Label Distro")
4. Disable Google Analytics (optional)
5. Click **"Create Project"**

#### 2.2 Enable Required Services

In your Firebase project dashboard:

**Authentication** (Build → Authentication)
- Click **"Get started"**
- Enable **Email/Password** provider
- Enable **Google** provider (optional)

**Firestore Database** (Build → Firestore Database)
- Click **"Create database"**
- Choose **Production mode**
- Select your region (e.g., `us-central1`)
- Click **"Enable"**

**Storage** (Build → Storage)
- Click **"Get started"**
- Accept the default rules
- Choose the same region as Firestore
- Click **"Done"**

**Functions** (Build → Functions)
- Click **"Get started"**
- **IMPORTANT**: Upgrade to Blaze (Pay as you go) plan
  - Required for Cloud Functions v2
  - Free tier includes 2M invocations/month
  - You won't be charged unless you exceed generous free limits

#### 2.3 Configure Email Notifications

1. Go to **Extensions** in Firebase Console
2. Search for **"Trigger Email from Firestore"**
3. Click **"Install"** and configure:
   - SMTP connection URI: `smtps://username@gmail.com:password@smtp.gmail.com:465`
   - Email documents collection: `mail`
   - Default FROM address: `noreply@yourdomain.com`
4. For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password

#### 2.4 Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click the **Web icon** (`</>`)
4. Register your app with a nickname
5. Copy the configuration object

### Step 3: Initialize Your Platform

```bash
# Run the initialization wizard
npm run init

# The wizard will ask for:
# 1. Your Firebase configuration (paste the object from Step 2.4)
# 2. Your Firebase project ID
# 3. Initial admin email (optional)
```

### Step 4: Configure Firebase Project (Critical Step!)

Before deploying, you MUST configure your Firebase project ID:

```bash
# Copy the example file
cp .firebaserc.example .firebaserc

# Edit .firebaserc and replace "your-project-id-here" with your actual Firebase project ID
```

Your `.firebaserc` file should look like:
```json
{
  "projects": {
    "default": "my-label-distro-12345"
  }
}
```

**Important**: The project ID must match exactly what's shown in your Firebase Console. You can find it in:
- Firebase Console → Project Settings → General → Project ID
- Or in your Firebase configuration object as `projectId`

Alternatively, you can set this using the Firebase CLI:
```bash
# Set the default project
firebase use your-project-id-here

# This will create/update the .firebaserc file automatically
```

### Step 5: Deploy to Production

```bash
# Build and deploy everything
npm run deploy

# This will:
# ✓ Build the Vue.js application
# ✓ Deploy to Firebase Hosting
# ✓ Deploy Cloud Functions (delivery engine)
# ✓ Set up Firestore security rules
# ✓ Configure Storage rules
```

⚠️ **If deployment fails with "No project active" error**, you forgot to set up `.firebaserc` in Step 4!

### Step 6: Initial Setup

1. **Visit your live site**: `https://your-project-id.web.app`

2. **Create Admin Account**:
   - Click **"Sign Up"**
   - Enter your email and password
   - The first user automatically becomes admin

3. **Complete Platform Setup**:
   - Navigate to **Settings**
   - Fill in your organization details
   - Configure notification preferences
   - Set up your first delivery target (see [Delivery Setup Guide](./delivery-setup.md))

## Your First Release

Once your platform is configured:

1. **Create a Release** (Catalog → New Release):
   - Step through the 6-step wizard
   - Upload audio files and cover art
   - Select genre using our intelligent genre selector
   - Set release date and territories

2. **Validate Your Release**:
   - The system automatically validates against DDEX standards
   - Fix any validation errors before proceeding

3. **Queue a Delivery** (Deliveries → New Delivery):
   - Select your release
   - Choose delivery targets
   - Generate ERN messages
   - Schedule or send immediately

4. **Monitor Progress**:
   - Real-time delivery tracking
   - View detailed logs
   - Download delivery receipts

## Platform Features

### 🎵 Genre Intelligence
- Automatic mapping between DSP taxonomies
- Support for Apple Music, Spotify, Beatport, and Amazon genres
- Visual genre mapping interface
- Strict mode for compliance enforcement

### 🔍 Content Fingerprinting
- Automatic duplicate detection
- Audio similarity analysis
- Prevents redundant uploads
- Maintains catalog integrity

### 📦 Catalog Import
- Bulk import via CSV
- DDEX-compliant file naming support
- Automatic file matching
- Resume interrupted imports

### 📊 Analytics & Monitoring
- Real-time delivery status
- Comprehensive logging system
- Performance metrics
- Weekly email summaries

## Development Mode

For local development:

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run Firebase emulators
npm run emulators
```

## Getting Help

### Resources
- **Documentation**: Browse all guides in the `/docs` folder
- **Blueprint**: Read `/blueprint.md` for technical architecture
- **Issues**: Report bugs on [GitHub Issues](https://github.com/yourusername/stardust-distro)

### Common Issues

**Firebase deployment fails**
- Ensure you're logged in: `firebase login`
- **Check `.firebaserc` is configured with your project ID**
- Check you've upgraded to Blaze plan
- Verify all services are enabled

**"No project active" error**
- You need to create `.firebaserc` file with your project ID
- Or run: `firebase use your-project-id`
- Verify with: `firebase use` (should show your project)

**Email notifications not working**
- Check SMTP configuration in Firebase Extensions
- Verify sender email is authorized
- Test with Settings → Notifications → Test Email

**Genre mapping errors**
- Configure genre mappings in Settings → Genre Maps
- Disable strict mode for initial testing
- See [Genre Mapping Guide](./genre-mapping.md)

## Next Steps

1. ✅ **[Configure Delivery Targets](./delivery-setup.md)** - Connect to your DSPs
2. ✅ **[Create Your First Release](./release-creation.md)** - Step-by-step guide
3. ✅ **[Import Existing Catalog](./catalog-import.md)** - Migrate your catalog
4. ✅ **[Set Up Genre Mappings](./genre-mapping.md)** - Configure DSP taxonomies

---

**Congratulations!** 🎉 You now have your own professional music distribution platform. Start delivering your music to the world!