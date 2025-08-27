# 🔐 Security Checklist for Stardust Distro v1.0 Launch

## Overview
This comprehensive security checklist ensures Stardust Distro meets production security standards before public launch. Items are prioritized by risk level and implementation order.

---

## 🔴 CRITICAL - Block Launch if Not Complete

### 1. **Input Validation & Sanitization**

#### Install Security Libraries
```bash
npm install dompurify zod
npm audit fix --force
```

#### Backend Validation (Cloud Functions)
- [ ] Install Zod for schema validation
- [ ] Create validation schemas for all data models:

```javascript
// functions/utils/validation.js
import { z } from 'zod';

export const schemas = {
  // Core data validation
  upc: z.string().regex(/^\d{13}$/, 'Invalid UPC format'),
  isrc: z.string().regex(/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/, 'Invalid ISRC format'),
  email: z.string().email('Invalid email address'),
  
  // Release validation
  release: z.object({
    title: z.string().min(1).max(200).trim(),
    artist: z.string().min(1).max(200).trim(),
    label: z.string().max(200).trim(),
    barcode: z.string().regex(/^\d{13}$/),
    releaseDate: z.string().datetime(),
    type: z.enum(['Album', 'Single', 'Video', 'Mixed']),
    tracks: z.array(z.object({
      title: z.string().max(200),
      isrc: z.string().regex(/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/),
      duration: z.number().min(1).max(36000), // max 10 hours
      sequenceNumber: z.number().min(1).max(999)
    })).min(1).max(500)
  }),
  
  // Delivery target validation
  deliveryTarget: z.object({
    name: z.string().min(1).max(100),
    type: z.enum(['DSP', 'Aggregator', 'Test']),
    protocol: z.enum(['FTP', 'SFTP', 'S3', 'API', 'Azure']),
    config: z.record(z.any()) // Protocol-specific validation
  }),
  
  // CSV import validation
  csvImport: z.object({
    fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
    rows: z.number().max(10000),
    columns: z.array(z.string()).max(100)
  })
};
```

- [ ] Implement validation in ALL Cloud Functions:
```javascript
// functions/index.js - Example implementation
exports.createRelease = functions.https.onCall(async (data, context) => {
  // Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  
  // Input validation
  const validation = schemas.release.safeParse(data);
  if (!validation.success) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid input',
      validation.error.issues
    );
  }
  
  const validatedData = validation.data;
  // Process with validated data...
});
```

#### Frontend Sanitization
- [ ] Install and configure DOMPurify:
```javascript
// src/utils/sanitizer.js
import DOMPurify from 'dompurify';

export const sanitizeHTML = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
};

export const sanitizeText = (text) => {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
};
```

- [ ] Apply sanitization to ALL user inputs before display
- [ ] Validate file uploads by header, not extension:
```javascript
// src/services/assets.js
const validateFileType = async (file) => {
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  
  // Check magic numbers
  const signatures = {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47],
    wav: [0x52, 0x49, 0x46, 0x46],
    flac: [0x66, 0x4C, 0x61, 0x43]
  };
  
  // Validate against known signatures
  for (const [type, signature] of Object.entries(signatures)) {
    if (signature.every((byte, i) => header[i] === byte)) {
      return type;
    }
  }
  throw new Error('Invalid file type');
};
```

### 2. **API Keys & Secrets Management**

- [ ] **Remove ALL hardcoded keys from source code**
- [ ] **Verify .env files are in .gitignore**
- [ ] **Audit all files for exposed secrets**:
```bash
# Install and run secret scanner
npm install -g gitleaks
gitleaks detect --source . -v
```

- [ ] **Encrypt sensitive credentials in Firestore**:
```javascript
// functions/utils/encryption.js
const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const getKey = () => Buffer.from(process.env.ENCRYPTION_KEY, 'base64');

exports.encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

exports.decrypt = (encryptedData) => {
  const decipher = crypto.createDecipheriv(
    algorithm, 
    getKey(), 
    Buffer.from(encryptedData.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

- [ ] **Generate and secure encryption key**:
```bash
# Generate encryption key
openssl rand -base64 32

# Add to Cloud Functions config
firebase functions:config:set encryption.key="your-generated-key"
```

### 3. **Firebase Security Rules**

#### Firestore Rules Audit
- [ ] Review and update `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isTenantMember(tenantId) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/tenants/$(tenantId)).data.users.hasAny([request.auth.uid]);
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Tenant isolation
    match /tenants/{tenantId}/{document=**} {
      allow read: if isTenantMember(tenantId);
      allow write: if isTenantMember(tenantId) && request.auth.token.role in ['admin', 'manager'];
    }
    
    // User data protection
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow update: if isOwner(userId) && 
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'tenants']);
      allow delete: if false; // Never allow deletion
    }
    
    // Releases - tenant scoped
    match /releases/{releaseId} {
      allow read: if isAuthenticated() && 
        isTenantMember(resource.data.tenantId);
      allow create: if isAuthenticated() && 
        isTenantMember(request.resource.data.tenantId) &&
        request.resource.data.keys().hasAll(['title', 'artist', 'tenantId']);
      allow update: if isAuthenticated() && 
        isTenantMember(resource.data.tenantId) &&
        request.resource.data.tenantId == resource.data.tenantId; // Prevent tenant change
      allow delete: if isAuthenticated() && 
        isTenantMember(resource.data.tenantId) &&
        request.auth.token.role == 'admin';
    }
    
    // Delivery targets - encrypted credentials
    match /deliveryTargets/{targetId} {
      allow read: if isAuthenticated() && 
        isTenantMember(resource.data.tenantId);
      allow write: if isAuthenticated() && 
        isTenantMember(request.resource.data.tenantId) &&
        request.auth.token.role in ['admin', 'manager'];
    }
    
    // Audit logs - read only
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Only system can write
    }
  }
}
```

#### Storage Rules Audit
- [ ] Update `storage.rules`:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isValidAudioFile() {
      return request.resource.contentType.matches('audio/(wav|x-wav|flac|x-flac|mpeg|mp3)') &&
             request.resource.size < 500 * 1024 * 1024; // 500MB
    }
    
    function isValidImageFile() {
      return request.resource.contentType.matches('image/(jpeg|png)') &&
             request.resource.size < 10 * 1024 * 1024; // 10MB
    }
    
    // Tenant-scoped uploads
    match /tenants/{tenantId}/releases/{releaseId}/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() &&
        (isValidAudioFile() || isValidImageFile()) &&
        request.auth.token.tenantId == tenantId;
      allow delete: if isAuthenticated() &&
        request.auth.token.tenantId == tenantId &&
        request.auth.token.role == 'admin';
    }
    
    // Temporary uploads (auto-cleaned)
    match /temp/{userId}/{allPaths=**} {
      allow read, write: if isAuthenticated() && 
        request.auth.uid == userId;
    }
  }
}
```

### 4. **Authentication Security**

- [ ] **Enable Firebase App Check**:
```javascript
// src/firebase.js
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const app = initializeApp(firebaseConfig);

// Enable App Check
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('your-recaptcha-site-key'),
  isTokenAutoRefreshEnabled: true
});
```

- [ ] **Implement account security measures**:
```javascript
// functions/auth/security.js
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

exports.checkLoginAttempts = async (email) => {
  const attemptsDoc = await admin.firestore()
    .collection('loginAttempts')
    .doc(email)
    .get();
  
  if (!attemptsDoc.exists) return true;
  
  const data = attemptsDoc.data();
  if (data.attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutEnd = data.lastAttempt.toMillis() + LOCKOUT_DURATION;
    if (Date.now() < lockoutEnd) {
      throw new Error(`Account locked. Try again in ${Math.ceil((lockoutEnd - Date.now()) / 60000)} minutes`);
    }
  }
  
  return true;
};

exports.recordLoginAttempt = async (email, success) => {
  const docRef = admin.firestore().collection('loginAttempts').doc(email);
  
  if (success) {
    await docRef.delete();
  } else {
    await docRef.set({
      attempts: admin.firestore.FieldValue.increment(1),
      lastAttempt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
};
```

- [ ] **Force password requirements**:
  - Minimum 12 characters
  - Mix of uppercase, lowercase, numbers, special characters
  - No common passwords
  - Password history (no reuse of last 5)

- [ ] **Enable MFA for admin accounts**
- [ ] **Require email verification**
- [ ] **Implement secure session management**

### 5. **Cloud Functions Security**

- [ ] **Add authentication to ALL functions**:
```javascript
// functions/middleware/auth.js
exports.requireAuth = (handler) => {
  return async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    return handler(data, context);
  };
};

exports.requireRole = (roles) => {
  return (handler) => {
    return async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
      }
      
      const user = await admin.firestore()
        .collection('users')
        .doc(context.auth.uid)
        .get();
      
      if (!user.exists || !roles.includes(user.data().role)) {
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
      }
      
      return handler(data, context);
    };
  };
};
```

- [ ] **Implement rate limiting**:
```javascript
// functions/middleware/rateLimit.js
const rateLimitMap = new Map();

exports.rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (handler) => {
    return async (data, context) => {
      const uid = context.auth?.uid || context.rawRequest.ip;
      const key = `${uid}_${Math.floor(Date.now() / windowMs)}`;
      
      const current = rateLimitMap.get(key) || 0;
      if (current >= maxRequests) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many requests. Please try again later.'
        );
      }
      
      rateLimitMap.set(key, current + 1);
      
      // Cleanup old entries
      if (Math.random() < 0.01) {
        const cutoff = Date.now() - windowMs * 2;
        for (const [k, v] of rateLimitMap.entries()) {
          const timestamp = parseInt(k.split('_')[1]) * windowMs;
          if (timestamp < cutoff) {
            rateLimitMap.delete(k);
          }
        }
      }
      
      return handler(data, context);
    };
  };
};
```

- [ ] **Input size limits**:
```javascript
// Limit request size
exports.validateRequestSize = (maxSize = 10 * 1024 * 1024) => { // 10MB default
  return (handler) => {
    return async (data, context) => {
      const size = JSON.stringify(data).length;
      if (size > maxSize) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Request too large'
        );
      }
      return handler(data, context);
    };
  };
};
```

### 6. **Dependency Security**

- [ ] **Run npm audit and fix all vulnerabilities**:
```bash
# In root directory
npm audit
npm audit fix --force

# In functions directory
cd functions
npm audit
npm audit fix --force

# In CLI directory
cd ../cli
npm audit
npm audit fix --force
```

- [ ] **Update critical dependencies**:
```bash
# Update Firebase
npm install firebase@latest firebase-admin@latest firebase-functions@latest

# Update security-critical packages
npm install ssh2@latest
npm install aws-sdk@latest
npm install basic-ftp@latest
```

- [ ] **Remove unused dependencies**:
```bash
# Install depcheck
npm install -g depcheck

# Check for unused dependencies
depcheck

# Remove unused packages
npm uninstall [unused-package-names]
```

- [ ] **Pin dependency versions for production**:
```json
// package.json - use exact versions
{
  "dependencies": {
    "firebase": "10.7.1", // Not ^10.7.1
    "vue": "3.4.15"
  }
}
```

---

## 🟡 HIGH PRIORITY - Complete Within 48 Hours

### 7. **Cloud Infrastructure Security (IAM)**

- [ ] **Create service account audit matrix**:

| Service Account | Function | Required Permissions | Current Permissions | Action Needed |
|-----------------|----------|---------------------|---------------------|---------------|
| Default App Engine | All | Too broad | Editor | Reduce to custom role |
| delivery-processor | processDeliveryQueue | Firestore (deliveries), Storage (read) | - | Create new SA |
| release-creator | createRelease | Firestore (releases), Storage (write) | - | Create new SA |
| admin-functions | User management | Firestore (users), Auth Admin | - | Create new SA |

- [ ] **Implement least privilege**:
```bash
# Create custom service account
gcloud iam service-accounts create delivery-processor \
  --display-name="Delivery Processor"

# Grant minimal permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:delivery-processor@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Assign to specific function
firebase functions:config:set \
  delivery.service_account="delivery-processor@PROJECT_ID.iam.gserviceaccount.com"
```

- [ ] **Enable audit logging**:
```bash
gcloud logging sinks create iam-audit-sink \
  storage.googleapis.com/YOUR-AUDIT-BUCKET \
  --log-filter='protoPayload.methodName="SetIamPolicy"'
```

### 8. **Network Security**

- [ ] **Configure security headers** in `firebase.json`:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.cloudfunctions.net; frame-ancestors 'none';"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains; preload"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Permissions-Policy",
            "value": "geolocation=(), microphone=(), camera=()"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Configure CORS properly**:
```javascript
// functions/index.js
const cors = require('cors');
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://your-domain.com',
      'https://your-domain.web.app',
      'https://your-domain.firebaseapp.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400 // 24 hours
};

exports.api = functions.https.onRequest((req, res) => {
  cors(corsOptions)(req, res, () => {
    // Handle request
  });
});
```

### 9. **File Upload Security**

- [ ] **Implement file validation service**:
```javascript
// src/services/fileValidation.js
export class FileValidator {
  static async validateAudioFile(file) {
    // Check size
    if (file.size > 500 * 1024 * 1024) {
      throw new Error('Audio file too large (max 500MB)');
    }
    
    // Verify file signature (magic numbers)
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    
    const signatures = {
      wav: [0x52, 0x49, 0x46, 0x46], // RIFF
      flac: [0x66, 0x4C, 0x61, 0x43], // fLaC
      mp3: [0xFF, 0xFB] // MP3 frame sync
    };
    
    let validType = null;
    for (const [type, sig] of Object.entries(signatures)) {
      if (sig.every((byte, i) => header[i] === byte)) {
        validType = type;
        break;
      }
    }
    
    if (!validType) {
      throw new Error('Invalid audio file format');
    }
    
    // Additional validation
    return {
      valid: true,
      type: validType,
      size: file.size
    };
  }
  
  static sanitizeFileName(fileName) {
    // Remove path traversal attempts
    return fileName
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255);
  }
}
```

- [ ] **Implement virus scanning** (Cloud Function):
```javascript
// functions/security/virusScan.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

exports.scanFile = async (filePath) => {
  try {
    // Using ClamAV (install on Cloud Function)
    const { stdout, stderr } = await execAsync(`clamscan ${filePath}`);
    
    if (stderr || stdout.includes('FOUND')) {
      throw new Error('File failed virus scan');
    }
    
    return { safe: true };
  } catch (error) {
    console.error('Virus scan failed:', error);
    throw new Error('File scanning failed');
  }
};
```

### 10. **Logging & Monitoring**

- [ ] **Implement secure logging**:
```javascript
// functions/utils/secureLogger.js
class SecureLogger {
  static sanitize(data) {
    const sensitive = [
      'password', 'token', 'apiKey', 'secretKey', 
      'authorization', 'cookie', 'ssn', 'creditCard'
    ];
    
    if (typeof data === 'string') {
      return data;
    }
    
    const cleaned = { ...data };
    
    for (const key of Object.keys(cleaned)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof cleaned[key] === 'object') {
        cleaned[key] = this.sanitize(cleaned[key]);
      }
    }
    
    return cleaned;
  }
  
  static log(level, message, data = {}) {
    console[level](message, this.sanitize(data));
    
    // Also send to Firestore audit log
    admin.firestore().collection('auditLogs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      level,
      message,
      data: this.sanitize(data),
      user: data.userId || 'system'
    });
  }
  
  static info(message, data) {
    this.log('info', message, data);
  }
  
  static warn(message, data) {
    this.log('warn', message, data);
  }
  
  static error(message, data) {
    this.log('error', message, data);
  }
}
```

- [ ] **Set up monitoring alerts**:
```javascript
// functions/monitoring/alerts.js
exports.monitorSecurityEvents = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Check for failed login attempts
    const failedLogins = await admin.firestore()
      .collection('loginAttempts')
      .where('lastAttempt', '>', fiveMinutesAgo)
      .where('attempts', '>', 3)
      .get();
    
    if (failedLogins.size > 5) {
      await sendAlert('High number of failed login attempts detected');
    }
    
    // Check for unusual API usage
    const apiLogs = await admin.firestore()
      .collection('auditLogs')
      .where('timestamp', '>', fiveMinutesAgo)
      .where('level', '==', 'error')
      .get();
    
    if (apiLogs.size > 50) {
      await sendAlert('High error rate detected in API');
    }
    
    // Check for admin actions
    const adminActions = await admin.firestore()
      .collection('auditLogs')
      .where('timestamp', '>', fiveMinutesAgo)
      .where('action', 'in', ['deleteUser', 'updateRole', 'deleteRelease'])
      .get();
    
    for (const doc of adminActions.docs) {
      await sendAlert(`Admin action performed: ${doc.data().action}`);
    }
  });
```

---

## 🟢 MEDIUM PRIORITY - Complete Before Public Launch

### 11. **Testing & Validation**

#### Security Testing Tools
- [ ] **OWASP ZAP Scan**:
```bash
# Install OWASP ZAP
# Download from: https://www.zaproxy.org/download/

# Run automated scan
zap.sh -quickurl https://your-domain.web.app -quickprogress
```

- [ ] **Burp Suite Professional Testing** (if available):
  - [ ] Spider the application
  - [ ] Active scan for vulnerabilities
  - [ ] Test business logic flaws
  - [ ] Session handling analysis
  - [ ] API security testing

- [ ] **Additional Security Tools**:
```bash
# Semgrep - Static analysis
pip install semgrep
semgrep --config=auto .

# Snyk - Dependency scanning
npm install -g snyk
snyk auth
snyk test
snyk monitor

# Mozilla Observatory - Header analysis
# Visit: https://observatory.mozilla.org
```

#### Manual Security Testing
- [ ] **SQL/NoSQL Injection Testing**:
  - Test all input fields with payloads
  - Try Firestore injection patterns
  - Test query parameters

- [ ] **XSS Testing**:
  - Test with `<script>alert('XSS')</script>`
  - Test with event handlers: `<img src=x onerror=alert('XSS')>`
  - Test with data URLs

- [ ] **Authentication Testing**:
  - Test session fixation
  - Test privilege escalation
  - Test JWT manipulation
  - Test password reset flow

- [ ] **File Upload Testing**:
  - Upload malicious files
  - Test path traversal
  - Upload oversized files
  - Test concurrent uploads

#### Security Incident Response Testing
- [ ] **Create Incident Response Plan**:
```markdown
## Security Incident Response Plan

### 1. Detection (< 15 minutes)
- Monitor alerts from logging system
- Check error rates and anomalies
- Review user reports

### 2. Containment (< 30 minutes)
- Identify affected systems
- Isolate compromised accounts
- Block malicious IPs
- Disable affected features if needed

### 3. Investigation (< 2 hours)
- Review audit logs
- Identify root cause
- Determine data exposure
- Document timeline

### 4. Recovery (< 4 hours)
- Apply security patches
- Restore from backups if needed
- Reset affected credentials
- Re-enable services

### 5. Post-Incident (< 24 hours)
- User notification if required
- Update security measures
- Document lessons learned
- Update response plan
```

- [ ] **Schedule Security Drills**:
  - [ ] Q1 2025: Simulated API key leak
  - [ ] Q2 2025: DDoS simulation
  - [ ] Q3 2025: Data breach scenario
  - [ ] Q4 2025: Account takeover drill

### 12. **Data Protection & Privacy**

#### GDPR Compliance
- [ ] **Implement data export endpoint**:
```javascript
// functions/gdpr/dataExport.js
exports.exportUserData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated');
  }
  
  const userId = context.auth.uid;
  
  // Collect all user data
  const userData = {
    profile: await admin.firestore().collection('users').doc(userId).get(),
    releases: await admin.firestore().collection('releases')
      .where('createdBy', '==', userId).get(),
    deliveries: await admin.firestore().collection('deliveries')
      .where('createdBy', '==', userId).get(),
    auditLogs: await admin.firestore().collection('auditLogs')
      .where('userId', '==', userId).get()
  };
  
  // Format for export
  const exportData = {
    exported: new Date().toISOString(),
    user: userData.profile.data(),
    releases: userData.releases.docs.map(doc => doc.data()),
    deliveries: userData.deliveries.docs.map(doc => doc.data()),
    logs: userData.auditLogs.docs.map(doc => doc.data())
  };
  
  return exportData;
});
```

- [ ] **Implement right to deletion**:
```javascript
// functions/gdpr/deletion.js
exports.deleteUserData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated');
  }
  
  const userId = context.auth.uid;
  const batch = admin.firestore().batch();
  
  // Delete user data (keep audit logs for legal requirements)
  const collections = ['users', 'releases', 'deliveries', 'assets'];
  
  for (const collection of collections) {
    const docs = await admin.firestore().collection(collection)
      .where('userId', '==', userId).get();
    
    docs.forEach(doc => batch.delete(doc.ref));
  }
  
  await batch.commit();
  
  // Delete auth account
  await admin.auth().deleteUser(userId);
  
  return { deleted: true };
});
```

- [ ] **Data retention policies**:
```javascript
// functions/gdpr/retention.js
exports.enforceDataRetention = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const retentionPeriod = 90 * 24 * 60 * 60 * 1000; // 90 days
    const cutoffDate = new Date(Date.now() - retentionPeriod);
    
    // Delete old logs
    const oldLogs = await admin.firestore()
      .collection('deliveryLogs')
      .where('timestamp', '<', cutoffDate)
      .get();
    
    const batch = admin.firestore().batch();
    oldLogs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    console.log(`Deleted ${oldLogs.size} old log entries`);
  });
```

### 13. **Backup & Disaster Recovery**

- [ ] **Implement automated backups**:
```javascript
// functions/backup/automated.js
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

exports.dailyBackup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const bucket = storage.bucket('stardust-backups');
    const timestamp = new Date().toISOString();
    
    // Export Firestore
    const { Firestore } = require('@google-cloud/firestore');
    const firestore = new Firestore();
    
    await firestore.exportDocuments({
      outputUriPrefix: `gs://stardust-backups/firestore/${timestamp}`,
      collectionIds: [] // Empty = all collections
    });
    
    // Log backup
    await admin.firestore().collection('backups').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'automated',
      location: `firestore/${timestamp}`
    });
  });
```

- [ ] **Test restore procedures**:
  1. Create test environment
  2. Simulate data loss
  3. Restore from backup
  4. Verify data integrity
  5. Document restore time

### 14. **CLI & npm Package Security**

- [ ] **Secure the CLI tool**:
```javascript
// cli/security/auth.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class CLIAuth {
  constructor() {
    this.configPath = path.join(os.homedir(), '.stardust-cli');
  }
  
  saveCredentials(credentials) {
    // Never save plaintext credentials
    const encrypted = this.encrypt(credentials);
    fs.writeFileSync(
      path.join(this.configPath, 'auth.json'),
      JSON.stringify(encrypted),
      { mode: 0o600 } // Read/write for owner only
    );
  }
  
  encrypt(data) {
    const cipher = crypto.createCipher('aes-256-cbc', this.getKey());
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  getKey() {
    // Derive key from machine ID + user
    const machineId = require('node-machine-id').machineIdSync();
    return crypto.createHash('sha256').update(machineId).digest();
  }
}
```

- [ ] **Validate all CLI inputs**:
```javascript
// cli/utils/validation.js
const validator = require('validator');

exports.validateProjectName = (name) => {
  if (!validator.isAlphanumeric(name.replace(/-/g, ''))) {
    throw new Error('Project name must be alphanumeric');
  }
  if (name.length > 50) {
    throw new Error('Project name too long (max 50 chars)');
  }
  return true;
};

exports.validateUrl = (url) => {
  if (!validator.isURL(url, { protocols: ['https'] })) {
    throw new Error('Invalid URL (HTTPS required)');
  }
  return true;
};
```

- [ ] **Sign npm package**:
```bash
# Enable 2FA for npm account
npm profile enable-2fa auth-and-writes

# Sign commits
git config --global commit.gpgsign true

# Publish with signature
npm publish --access public --otp=YOUR_2FA_CODE
```

### 15. **Production Hardening**

- [ ] **Enable Firebase App Check** (enforcement mode)
- [ ] **Configure Web Application Firewall (WAF)**
- [ ] **Set up DDoS protection** (Cloudflare/Cloud Armor)
- [ ] **Implement request throttling**
- [ ] **Configure security monitoring**:
  - Firebase Performance Monitoring
  - Error reporting
  - Uptime checks
  - Custom alerts

- [ ] **Security configuration checklist**:
  - [ ] Remove all console.log statements
  - [ ] Disable source maps in production
  - [ ] Enable CORS with specific origins only
  - [ ] Set secure cookie flags
  - [ ] Implement CAPTCHA for public forms
  - [ ] Enable audit logging for all admin actions

---

## 📋 Pre-Launch Security Sign-off

### Final Security Checklist
- [ ] All CRITICAL items completed
- [ ] All HIGH PRIORITY items completed
- [ ] Security testing completed (OWASP ZAP minimum)
- [ ] Incident response plan tested
- [ ] Team trained on security procedures
- [ ] Security documentation complete
- [ ] Backup and restore tested
- [ ] Monitoring and alerting configured

### Security Metrics Target
- [ ] 0 HIGH or CRITICAL vulnerabilities in npm audit
- [ ] 100% of endpoints require authentication
- [ ] 100% of inputs validated with Zod
- [ ] 100% of user content sanitized with DOMPurify
- [ ] < 5 second response time for security alerts
- [ ] < 30 minute recovery time objective (RTO)

### Sign-off
- **Security Review By**: _____________________
- **Date**: _____________________
- **Penetration Test By**: _____________________
- **Date**: _____________________
- **Final Approval**: _____________________
- **Date**: _____________________

---

## 🚀 Quick Start Security Implementation

### Day 1 - Critical Security (4-6 hours)
```bash
# 1. Install security dependencies
npm install dompurify zod

# 2. Run security audit
npm audit fix --force

# 3. Update Firebase rules (copy from this doc)

# 4. Add input validation to critical endpoints
# Start with: createRelease, processDeliveryQueue, createDelivery

# 5. Encrypt sensitive data in Firestore
```

### Day 2 - Authentication & Authorization (4-6 hours)
```bash
# 1. Enable Firebase App Check
# 2. Implement rate limiting
# 3. Add authentication checks to all functions
# 4. Set up IAM least privilege
# 5. Configure security headers
```

### Day 3 - Testing & Monitoring (4-6 hours)
```bash
# 1. Run OWASP ZAP scan
# 2. Fix any critical findings
# 3. Set up monitoring alerts
# 4. Test backup/restore
# 5. Document security procedures
```

### Post-Launch Week 1
- Complete all MEDIUM priority items
- Schedule first security drill
- Review security metrics
- Plan ongoing security improvements

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Checklist](https://firebase.google.com/docs/rules/security-checklist)
- [Node.js Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Vue.js Security](https://vuejs.org/guide/best-practices/security.html)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

---

## 🆘 Emergency Contacts

- **Security Lead**: [Name] - [Phone] - [Email]
- **DevOps Lead**: [Name] - [Phone] - [Email]
- **Firebase Support**: https://firebase.google.com/support
- **Incident Hotline**: [Phone Number]

---

**Remember**: Security is not a one-time task but an ongoing process. Schedule regular security reviews and stay updated with the latest threats and patches.