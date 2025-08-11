// packages/@stardust-distro/common/src/schemas/firestore.schema.ts
export const COLLECTIONS = {
  TENANTS: 'tenants',
  USERS: 'users',
  RELEASES: 'releases',
  TRACKS: 'tracks',
  ASSETS: 'assets',
  DELIVERY_TARGETS: 'deliveryTargets',
  DELIVERIES: 'deliveries',
  AUDIT_LOGS: 'auditLogs'
} as const;

// Firestore Security Rules
export const FIRESTORE_RULES = `
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
        request.auth.token.role == role;
    }
    
    function belongsToTenant(tenantId) {
      return isAuthenticated() && 
        request.auth.token.tenantId == tenantId;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && 
        request.auth.uid == userId;
    }
    
    // Tenant rules
    match /tenants/{tenantId} {
      allow read: if belongsToTenant(tenantId);
      allow write: if belongsToTenant(tenantId) && hasRole('admin');
    }
    
    // User profiles
    match /users/{userId} {
      allow read: if isOwner(userId) || hasRole('admin');
      allow write: if isOwner(userId) || hasRole('admin');
    }
    
    // Releases - scoped to tenant
    match /tenants/{tenantId}/releases/{releaseId} {
      allow read: if belongsToTenant(tenantId);
      allow create: if belongsToTenant(tenantId) && 
        (hasRole('admin') || hasRole('manager'));
      allow update: if belongsToTenant(tenantId) && 
        (hasRole('admin') || hasRole('manager'));
      allow delete: if belongsToTenant(tenantId) && hasRole('admin');
      
      // Tracks subcollection
      match /tracks/{trackId} {
        allow read: if belongsToTenant(tenantId);
        allow write: if belongsToTenant(tenantId) && 
          (hasRole('admin') || hasRole('manager'));
      }
    }
    
    // Assets - scoped to tenant
    match /tenants/{tenantId}/assets/{assetId} {
      allow read: if belongsToTenant(tenantId);
      allow write: if belongsToTenant(tenantId) && 
        (hasRole('admin') || hasRole('manager'));
    }
    
    // Delivery targets - scoped to tenant
    match /tenants/{tenantId}/deliveryTargets/{targetId} {
      allow read: if belongsToTenant(tenantId);
      allow write: if belongsToTenant(tenantId) && hasRole('admin');
    }
    
    // Deliveries - scoped to tenant
    match /tenants/{tenantId}/deliveries/{deliveryId} {
      allow read: if belongsToTenant(tenantId);
      allow create: if belongsToTenant(tenantId) && 
        (hasRole('admin') || hasRole('manager'));
      allow update: if false; // Only system can update
      allow delete: if belongsToTenant(tenantId) && hasRole('admin');
    }
    
    // Audit logs - read only
    match /tenants/{tenantId}/auditLogs/{logId} {
      allow read: if belongsToTenant(tenantId) && hasRole('admin');
      allow write: if false; // Only system can write
    }
    
    // Default deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

// Firestore Indexes
export const FIRESTORE_INDEXES = {
  indexes: [
    {
      collectionGroup: 'releases',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'tenantId', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'created', order: 'DESCENDING' }
      ]
    },
    {
      collectionGroup: 'deliveries',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'tenantId', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'scheduled', order: 'ASCENDING' }
      ]
    },
    {
      collectionGroup: 'assets',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath: 'tenantId', order: 'ASCENDING' },
        { fieldPath: 'type', order: 'ASCENDING' },
        { fieldPath: 'uploadedAt', order: 'DESCENDING' }
      ]
    }
  ],
  fieldOverrides: []
};