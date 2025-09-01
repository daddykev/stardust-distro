// functions/delivery/handlers.js
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { requireAuth } = require('../middleware/auth')
const { validateWith, validateFileUpload } = require('../middleware/validation')
const { checkRateLimit } = require('../middleware/auth')

const {
  deliverViaFTP,
  deliverViaSFTP,
  deliverViaS3,
  deliverViaAPI,
  deliverToDSP,
  deliverViaAzure
} = require('./protocols')

/**
 * FTP Delivery Handler
 */
const deliverFTP = onCall({
  timeoutSeconds: 300,
  memory: '512MB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('deliverFTP')(request);
  await checkRateLimit(request.auth.uid, 20, 60000);
  
  const { target, package: deliveryPackage } = request.data;
  
  if (deliveryPackage.files) {
    deliveryPackage.files.forEach(file => {
      validateFileUpload(file);
    });
  }
  
  try {
    return await deliverViaFTP(target, deliveryPackage)
  } catch (error) {
    console.error('FTP delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * SFTP Delivery Handler
 */
const deliverSFTP = onCall({
  timeoutSeconds: 300,
  memory: '512MB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('deliverSFTP')(request);
  await checkRateLimit(request.auth.uid, 20, 60000);
  
  const { target, package: deliveryPackage } = request.data;
  
  if (deliveryPackage.files) {
    deliveryPackage.files.forEach(file => {
      validateFileUpload(file);
    });
  }
  
  try {
    return await deliverViaSFTP(target, deliveryPackage)
  } catch (error) {
    console.error('SFTP delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * S3 Delivery Handler
 */
const deliverS3 = onCall({
  timeoutSeconds: 300,
  memory: '1GB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('deliverS3')(request);
  await checkRateLimit(request.auth.uid, 20, 60000);
  
  const { target, package: deliveryPackage } = request.data;
  
  if (deliveryPackage.files) {
    deliveryPackage.files.forEach(file => {
      validateFileUpload(file);
    });
  }
  
  try {
    return await deliverViaS3(target, deliveryPackage)
  } catch (error) {
    console.error('S3 delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * API Delivery Handler
 */
const deliverAPI = onCall({
  timeoutSeconds: 300,
  memory: '512MB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('deliverAPI')(request);
  await checkRateLimit(request.auth.uid, 20, 60000);
  
  const { target, package: deliveryPackage } = request.data;
  
  try {
    // Check if this is a DSP delivery that needs special handling
    if (target.type === 'DSP' && deliveryPackage.distributorId) {
      return await deliverToDSP(target, deliveryPackage)
    } else {
      return await deliverViaAPI(target, deliveryPackage)
    }
  } catch (error) {
    console.error('API delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Azure Delivery Handler
 */
const deliverAzure = onCall({
  timeoutSeconds: 300,
  memory: '1GB',
  maxInstances: 5,
  cors: true
}, async (request) => {
  requireAuth(request);
  validateWith('deliverAzure')(request);
  await checkRateLimit(request.auth.uid, 20, 60000);
  
  const { target, package: deliveryPackage } = request.data;
  
  if (deliveryPackage.files) {
    deliveryPackage.files.forEach(file => {
      validateFileUpload(file);
    });
  }
  
  try {
    return await deliverViaAzure(target, deliveryPackage)
  } catch (error) {
    console.error('Azure delivery error:', error)
    throw new HttpsError('internal', error.message)
  }
})

module.exports = {
  deliverFTP,
  deliverSFTP,
  deliverS3,
  deliverAPI,
  deliverAzure
}