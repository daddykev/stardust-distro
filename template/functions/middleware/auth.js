// functions/middleware/auth.js
const { HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * Middleware to verify authentication
 */
function requireAuth(context) {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  
  return context.auth;
}

/**
 * Middleware to verify user role
 */
async function requireRole(context, allowedRoles) {
  const auth = requireAuth(context);
  
  // Get user document
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(auth.uid)
    .get();
  
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User profile not found');
  }
  
  const userData = userDoc.data();
  
  if (!allowedRoles.includes(userData.role)) {
    throw new HttpsError(
      'permission-denied',
      `Requires one of these roles: ${allowedRoles.join(', ')}`
    );
  }
  
  return { auth, user: userData };
}

/**
 * Verify tenant access
 */
async function requireTenantAccess(context, tenantId) {
  const auth = requireAuth(context);
  
  // Get user document
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(auth.uid)
    .get();
  
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User profile not found');
  }
  
  const userData = userDoc.data();
  
  // Check if user has access to this tenant
  if (userData.tenantId !== tenantId && !userData.tenants?.includes(tenantId)) {
    throw new HttpsError('permission-denied', 'Access denied to this tenant');
  }
  
  return { auth, user: userData };
}

/**
 * Rate limiting check (simple implementation)
 * In production, use Firebase Extensions or Redis
 */
const rateLimitMap = new Map();

async function checkRateLimit(userId, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const userLimits = rateLimitMap.get(userId) || [];
  
  // Clean old entries
  const validLimits = userLimits.filter(time => now - time < windowMs);
  
  if (validLimits.length >= limit) {
    throw new HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. Max ${limit} requests per ${windowMs/1000} seconds`
    );
  }
  
  validLimits.push(now);
  rateLimitMap.set(userId, validLimits);
  
  // Clean up map if too large
  if (rateLimitMap.size > 1000) {
    const oldestAllowed = now - windowMs;
    for (const [key, times] of rateLimitMap.entries()) {
      const valid = times.filter(t => t > oldestAllowed);
      if (valid.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, valid);
      }
    }
  }
}

module.exports = {
  requireAuth,
  requireRole,
  requireTenantAccess,
  checkRateLimit
};