# Configuration Guide ⚙️

This guide covers all configuration options for your Stardust Distro platform, from basic settings to advanced features.

## Table of Contents
1. [Organization Settings](#organization-settings)
2. [Delivery Targets](#delivery-targets)
3. [Genre Mapping](#genre-mapping)
4. [Notification Settings](#notification-settings)
5. [Security Settings](#security-settings)
6. [Appearance Settings](#appearance-settings)
7. [Advanced Configuration](#advanced-configuration)

## Organization Settings

Navigate to **Settings → General** to configure your organization profile.

### Basic Information

- **Organization Name**: Your label or company name (appears in ERN messages)
- **Display Name**: Your personal name (for internal use)
- **Email Address**: Primary contact email (used for notifications)
- **Timezone**: Affects scheduling and timestamps
- **Language**: Interface language (more languages coming soon)

### Best Practices
- Use your official label name for professional delivery
- Keep contact information current for DSP communications
- Set timezone to your primary business location

## Delivery Targets

Configure your DSP and aggregator connections at **Settings → Delivery Targets**.

### Adding a Target

1. Click **"Add Target"**
2. Fill in the configuration form:

**Basic Information**
- **Target Name**: Friendly identifier (e.g., "Spotify Production")
- **Target Type**: DSP, Aggregator, or Test
- **Active Status**: Enable/disable without deleting

**DDEX Configuration**
- **Party Name**: Official DSP name from their documentation
- **Party ID (DPID)**: Unique DDEX identifier
- **ERN Version**: 4.3 (recommended), 4.2, or 3.8.2
- **Commercial Model**: Subscription, PayAsYouGo, or FreeStreaming
- **Usage Types**: PermanentDownload, OnDemandStream, etc.

**Connection Settings**
- **Protocol**: FTP, SFTP, S3, Azure, or API
- **Credentials**: Encrypted and stored securely
- **Test Mode**: Enable for testing without actual delivery

### Testing Connections

Always test connections before first use:
1. Click the **plug icon** on any target card
2. System performs connectivity test
3. View results in success/error message

### Managing Targets

- **Edit**: Update any configuration
- **Deactivate**: Temporarily disable without deleting
- **Delete**: Permanently remove (requires confirmation)

## Genre Mapping

Configure genre translations at **Settings → Genre Maps** or **Genre Maps** in navigation.

### Understanding Genre Mapping

Different DSPs use different genre taxonomies:
- Apple Music has 200+ genres
- Spotify uses different categorization
- Beatport focuses on electronic music genres

Stardust Distro automatically translates between these systems.

### Creating Mappings

1. Navigate to **Genre Maps**
2. Select target DSP (Apple, Spotify, Beatport, Amazon)
3. Choose mapping mode:
   - **Auto-map Identical**: Automatically match exact genre names
   - **Manual Mapping**: Drag genres from left (source) to right (target)
   - **Import Mapping**: Load from JSON file

### Mapping Configuration

**For each DSP target, configure:**
- **Enable Mapping**: Turn genre translation on/off
- **Strict Mode**: Fail delivery if genre can't be mapped
- **Fallback Genre**: Default when mapping fails (if not strict)
- **Default Mapping**: Select primary mapping configuration

### Best Practices
- Start with auto-mapping for common genres
- Manually map specialized genres for your catalog
- Test with a few releases before enabling strict mode
- Export mappings for backup

## Notification Settings

Control platform communications at **Settings → Notifications**.

### Email Notifications

- **Master Switch**: Enable/disable all emails
- **Delivery Status**: Success/failure notifications
- **Weekly Reports**: Monday morning summaries
- **Release Updates**: Processing notifications
- **Product Updates**: New features and updates

### Configuring Email

1. Test email system with **"Send Test Email"** button
2. Check spam folder if not received
3. Whitelist `noreply@` sender address

### In-App Notifications

- Real-time updates in notification panel
- Delivery status changes
- System alerts
- Import completion notices

## Security Settings

Manage account security at **Settings → Security**.

### Password Management

**Requirements:**
- Minimum 6 characters
- Mix of letters and numbers recommended
- Change every 90 days for best security

**To change password:**
1. Enter current password
2. Enter new password twice
3. Click **"Update Password"**

### Two-Factor Authentication (Coming Soon)

- SMS verification
- Authenticator app support
- Backup codes

### Session Management

- Automatic logout after 24 hours inactive
- Sign out from all devices option
- Active session monitoring

## Appearance Settings

Customize the interface at **Settings → Appearance**.

### Theme Options

- **Auto**: Follows system preference
- **Light**: Traditional bright interface
- **Dark**: Reduced eye strain for night work

### Display Options

- **Compact Mode**: Reduces spacing for more content
- **Show Tips**: Helpful hints throughout interface
- **Animation Speed**: Control transition effects

## Advanced Configuration

### Environment Variables

For self-hosted installations, configure via `.env`:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Optional Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_FINGERPRINTING=true
VITE_ENABLE_GENRE_MAPPING=true

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Firestore Collections

Understanding the data structure:

```
firestore-root/
├── users/                 # User profiles
├── releases/              # Music releases
├── deliveries/            # Delivery queue and history
├── deliveryTargets/       # DSP configurations
├── genreMappings/         # Genre translation rules
├── importJobs/            # Catalog import tracking
├── fingerprints/          # Content fingerprints
├── audioFingerprints/     # Audio similarity data
├── deliveryHistory/       # Historical delivery records
└── mail/                  # Email queue
```

### Storage Structure

```
storage-root/
├── releases/
│   ├── {releaseId}/
│   │   ├── cover.jpg
│   │   └── tracks/
│   │       ├── {trackId}/
│   │       │   └── audio.wav
└── temp/                  # Temporary uploads
```

### Cloud Functions

Deployed functions and their triggers:

- **processDeliveryQueue**: Runs every minute
- **calculateFileMD5**: On-demand hash calculation
- **checkDuplicates**: Content fingerprint analysis
- **calculateAudioFingerprint**: Audio similarity detection
- **sendNotification**: Email and notification dispatch
- **sendWeeklySummaries**: Monday 9 AM (scheduled)
- **onUserCreated**: Welcome email trigger

### Performance Tuning

**Optimize for large catalogs:**
- Enable Firestore composite indexes
- Use pagination for catalog views
- Implement lazy loading for images
- Cache ERN templates

**Delivery optimization:**
- Batch small files together
- Use multipart uploads for large files
- Enable connection pooling for FTP/SFTP
- Implement retry with exponential backoff

### Backup & Recovery

**Regular backups:**
1. Export Firestore data weekly
2. Backup Storage bucket to external service
3. Export delivery history monthly
4. Save configuration snapshots

**Recovery procedures:**
1. Restore from Firestore backup
2. Re-sync Storage files
3. Rebuild search indexes
4. Verify delivery targets

## Troubleshooting Configuration

### Common Issues

**Delivery targets not saving**
- Check Firebase security rules
- Verify Firestore is in production mode
- Ensure proper authentication

**Genre mapping not working**
- Confirm mapping is enabled for target
- Check fallback genre is set
- Verify source genres are recognized

**Email notifications failing**
- Test SMTP configuration
- Check spam filters
- Verify sender authentication

## Support

For configuration assistance:
- Check [Troubleshooting Guide](./troubleshooting.md)
- Review [FAQ](./faq.md)
- Contact support via GitHub Issues

---

Remember to save your configuration regularly and test changes with a few releases before applying globally.