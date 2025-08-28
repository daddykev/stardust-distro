# Troubleshooting Guide 🔧

Quick solutions to common issues in Stardust Distro. If your issue isn't covered here, please check our [GitHub Issues](https://github.com/yourusername/stardust-distro/issues).

## Table of Contents
1. [Installation Issues](#installation-issues)
2. [Authentication Problems](#authentication-problems)
3. [Release Creation Errors](#release-creation-errors)
4. [Upload Failures](#upload-failures)
5. [Delivery Problems](#delivery-problems)
6. [Genre Mapping Issues](#genre-mapping-issues)
7. [Email Notification Issues](#email-notification-issues)
8. [Performance Problems](#performance-problems)
9. [Firebase Errors](#firebase-errors)

## Installation Issues

### Problem: "npx create-stardust-distro" fails

**Symptoms:**
- Command not found
- Package installation errors
- Network timeouts

**Solutions:**
1. **Update Node.js:**
   ```bash
   node --version  # Should be 18.x or higher
   npm --version   # Should be 8.x or higher
   ```

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   npx clear-npx-cache
   ```

3. **Use alternative registry:**
   ```bash
   npm config set registry https://registry.npmjs.org/
   ```

4. **Manual installation:**
   ```bash
   git clone https://github.com/yourusername/stardust-distro.git
   cd stardust-distro
   npm install
   ```

### Problem: Firebase deployment fails

**Error:** "Error: Failed to get Firebase project"

**Solutions:**
1. **Login to Firebase:**
   ```bash
   firebase logout
   firebase login
   ```

2. **Select correct project:**
   ```bash
   firebase use --clear
   firebase use your-project-id
   ```

3. **Check Blaze plan:**
   - Go to Firebase Console
   - Navigate to Usage & Billing
   - Upgrade to Blaze (Pay as you go)

**Error:** "Error: Cloud Functions deployment requires Blaze plan"

**Solution:**
- Upgrade to Blaze plan (required for Functions v2)
- Free tier is generous (2M invocations/month)

## Authentication Problems

### Problem: Can't create account

**Symptoms:**
- "Email already in use" error
- "Weak password" error
- Loading spinner never stops

**Solutions:**
1. **Check Firebase Auth settings:**
   - Ensure Email/Password provider is enabled
   - Verify email domain is not blocked

2. **Password requirements:**
   - Minimum 6 characters
   - Include numbers and letters

3. **Clear browser data:**
   - Clear cookies for your domain
   - Try incognito/private mode

### Problem: Can't sign in

**Error:** "Invalid email or password"

**Solutions:**
1. **Reset password:**
   - Click "Forgot password?" link
   - Check spam folder for reset email

2. **Check account status:**
   - Verify in Firebase Console → Authentication
   - Ensure account is not disabled

3. **Browser issues:**
   - Disable ad blockers
   - Allow third-party cookies
   - Try different browser

## Release Creation Errors

### Problem: Validation fails

**Error:** "Barcode checksum invalid"

**Solution:**
- Ensure UPC/EAN is exactly 12, 13, or 14 digits
- Remove spaces and dashes
- Use barcode validator tool
- Example valid UPC: 123456789012

**Error:** "Release title required"

**Solution:**
- Fill all required fields (marked with *)
- Check for hidden characters
- Maximum 200 characters

### Problem: Can't save draft

**Symptoms:**
- Auto-save indicator stays red
- "Failed to save" message
- Changes lost on refresh

**Solutions:**
1. **Check Firestore rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Verify permissions:**
   - User must be authenticated
   - Check browser console for errors

3. **Manual save:**
   - Click "Save as Draft" button
   - Export data as backup

## Upload Failures

### Problem: Cover image won't upload

**Error:** "Image dimensions too small"

**Solution:**
- Minimum 3000x3000 pixels required
- Use image editing software to resize
- Maintain aspect ratio (square)

**Error:** "File too large"

**Solutions:**
1. **Compress image:**
   - Use JPG format instead of PNG
   - Reduce to 80-90% quality
   - Maximum 10MB recommended

2. **Check Storage quota:**
   - Firebase Console → Storage
   - View usage statistics
   - Upgrade if needed

### Problem: Audio upload stuck

**Symptoms:**
- Progress bar stops
- "Upload failed" after timeout
- Browser becomes unresponsive

**Solutions:**
1. **File optimization:**
   - Convert to FLAC for smaller size
   - Check for corrupted files
   - Maximum 200MB per file

2. **Network issues:**
   - Use stable connection
   - Avoid VPN during upload
   - Upload during off-peak hours

3. **Browser limits:**
   - Close other tabs
   - Clear browser cache
   - Increase browser memory limit

## Delivery Problems

### Problem: Delivery stuck in "queued"

**Symptoms:**
- Status never changes to "processing"
- No logs generated
- Delivery timeout

**Solutions:**
1. **Check Cloud Functions:**
   ```bash
   firebase functions:log --only processDeliveryQueue
   ```

2. **Verify target configuration:**
   - Test connection to DSP
   - Check credentials are valid
   - Ensure target is active

3. **Manual retry:**
   - Click retry button in Deliveries view
   - Check delivery logs for errors

### Problem: "Connection refused" to DSP

**Error:** "ECONNREFUSED" or "ETIMEDOUT"

**Solutions:**
1. **FTP/SFTP issues:**
   - Verify host and port
   - Check firewall settings
   - Test with FTP client (FileZilla)
   - Common ports: FTP (21), SFTP (22)

2. **API endpoints:**
   - Confirm URL is correct
   - Check API key validity
   - Verify HTTP method (POST/PUT)

3. **S3/Azure:**
   - Validate credentials
   - Check bucket/container exists
   - Verify region settings

### Problem: ERN generation fails

**Error:** "Failed to generate ERN"

**Solutions:**
1. **Check required fields:**
   - All tracks need audio files
   - Cover image must be uploaded
   - Genre must be selected

2. **Special characters:**
   - Remove or escape XML entities (&, <, >)
   - Use Unicode for special characters
   - Avoid emoji in metadata

3. **Date logic:**
   - Release date must be future or today
   - Original release date must be before release date

## Genre Mapping Issues

### Problem: "Genre not mapped" error

**Symptoms:**
- Delivery fails with strict mode
- Warning about unmapped genre
- ERN missing genre information

**Solutions:**
1. **Create mapping:**
   - Go to Genre Maps
   - Find unmapped genre
   - Map to target DSP genre

2. **Disable strict mode:**
   - Edit delivery target
   - Uncheck "Strict Mode"
   - Set fallback genre

3. **Update genre in release:**
   - Edit release metadata
   - Choose mapped genre
   - Re-generate ERN

### Problem: Genre mapping not applying

**Solutions:**
1. **Check mapping configuration:**
   - Ensure mapping is enabled for target
   - Verify mapping is set as default
   - Clear browser cache

2. **Refresh mappings:**
   - Re-save genre mapping
   - Test with single delivery
   - Check logs for mapping details

## Email Notification Issues

### Problem: Not receiving emails

**Symptoms:**
- Test email fails
- No delivery notifications
- Weekly reports missing

**Solutions:**
1. **Check email configuration:**
   - Settings → Notifications
   - Enable email notifications
   - Verify email address

2. **Firebase Extension setup:**
   - Firebase Console → Extensions
   - Check "Trigger Email" extension
   - Verify SMTP settings

3. **Email delivery:**
   - Check spam/junk folder
   - Whitelist sender address
   - Verify SMTP credentials

### Problem: "SMTP authentication failed"

**Solutions:**
1. **Gmail specific:**
   - Use App Password (not regular password)
   - Enable 2-factor authentication
   - Allow less secure apps (not recommended)

2. **Other providers:**
   - Check SMTP server settings
   - Verify port (465 for SSL, 587 for TLS)
   - Update credentials

## Performance Problems

### Problem: Catalog loads slowly

**Symptoms:**
- Long loading times
- Page unresponsive
- Timeout errors

**Solutions:**
1. **Optimize queries:**
   - Use pagination (show 25/50/100)
   - Enable search filters
   - Archive old releases

2. **Browser optimization:**
   - Clear cache and cookies
   - Disable browser extensions
   - Update browser version

3. **Firestore indexes:**
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Problem: Bulk operations timeout

**Solutions:**
1. **Reduce batch size:**
   - Process 10-20 items at a time
   - Use sequential processing
   - Enable progress indicators

2. **Optimize operations:**
   - Perform during low-traffic hours
   - Use Cloud Functions for heavy processing
   - Implement queue system

## Firebase Errors

### Problem: Firestore permission denied

**Error:** "Missing or insufficient permissions"

**Solutions:**
1. **Check authentication:**
   - Ensure user is logged in
   - Verify auth token is valid

2. **Update security rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Check document ownership:**
   - User must own document (tenantId matches)
   - Admin role required for some operations

### Problem: Storage quota exceeded

**Error:** "Quota exceeded for bucket"

**Solutions:**
1. **Clean up storage:**
   - Delete old/unused files
   - Remove duplicate uploads
   - Clear temporary files

2. **Upgrade Firebase plan:**
   - Check current usage in Console
   - Upgrade storage quota
   - Consider archiving to external storage

### Problem: Functions timeout

**Error:** "Function execution took 60001 ms, finished with status: timeout"

**Solutions:**
1. **Optimize function code:**
   - Reduce processing complexity
   - Use batch operations
   - Implement pagination

2. **Increase timeout:**
   ```javascript
   // In functions/index.js
   exports.processDeliveryQueue = functions
     .runWith({ timeoutSeconds: 540 }) // 9 minutes max
   ```

3. **Split into smaller functions:**
   - Separate ERN generation from delivery
   - Use Cloud Tasks for long operations

## Debug Mode

### Enabling detailed logging

1. **Browser console:**
   - Press F12 to open DevTools
   - Check Console for errors
   - Look for red error messages

2. **Firebase logs:**
   ```bash
   # View all function logs
   firebase functions:log
   
   # View specific function
   firebase functions:log --only processDeliveryQueue
   
   # Stream logs in real-time
   firebase functions:log --follow
   ```

3. **Local debugging:**
   ```bash
   # Run with Firebase emulators
   npm run emulators
   
   # Enable verbose logging
   DEBUG=* npm run dev
   ```

## Getting Additional Help

### Before asking for help:
1. Check error messages carefully
2. Search existing GitHub issues
3. Try solutions in this guide
4. Collect relevant logs

### When reporting issues:
Include:
- Error message (exact text)
- Steps to reproduce
- Browser and version
- Screenshots if relevant
- Relevant logs

### Support channels:
- GitHub Issues: Bug reports and feature requests
- Discord: Community support
- Email: support@example.com (Pro support)

## Common Quick Fixes

### Reset everything:
```bash
# Clear all caches
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install

# Redeploy everything
firebase deploy
```

### Check service status:
- [Firebase Status](https://status.firebase.google.com/)
- [npm Status](https://status.npmjs.org/)
- Your DSP's status page

### Emergency rollback:
```bash
# List Firebase deploy history
firebase hosting:versions:list

# Rollback to previous version
firebase hosting:rollback
```

---

💡 **Pro Tip**: Always check the browser console (F12) first - most errors will show detailed messages there that point to the exact problem.