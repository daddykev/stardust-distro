// scripts/addIdempotencyKeys.js
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

async function addIdempotencyKeys() {
  const deliveries = await db.collection('deliveries').get();
  const batch = db.batch();
  let count = 0;
  
  deliveries.forEach(doc => {
    const data = doc.data();
    if (!data.idempotencyKey) {
      const key = generateIdempotencyKey(
        data.releaseId,
        data.targetId,
        data.messageType,
        data.messageSubType,
        data.ernMessageId
      );
      
      batch.update(doc.ref, { idempotencyKey: key });
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Added idempotency keys to ${count} deliveries`);
  }
}

function generateIdempotencyKey(releaseId, targetId, messageType, messageSubType, ernMessageId) {
  const components = [
    releaseId,
    targetId,
    messageType || 'NewReleaseMessage',
    messageSubType || 'Initial',
    ernMessageId || Date.now()
  ].filter(Boolean).join('_');
  
  return `IDMP_${components}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

addIdempotencyKeys().catch(console.error);