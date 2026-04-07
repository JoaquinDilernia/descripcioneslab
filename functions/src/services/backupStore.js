/**
 * backupStore.js - Description backup/rollback system using Firestore.
 *
 * Saves snapshots of descriptions before applying bulk changes.
 * Backups expire after 30 minutes (emergency rollback).
 * Storage: Firestore collection descripcioneslab_backups
 */

const { getFirestore } = require('../config/firebase.js');

const COLLECTION = 'descripcioneslab_backups';
const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Create a backup of the current descriptions.
 * @param {Array} products - Products with their current description
 * @returns {Object} Metadata of the created backup
 */
async function createBackup(products) {
  const db = getFirestore();

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_MS);

  const backup = {
    id,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    product_count: products.length,
    products: {},
  };

  for (const p of products) {
    backup.products[p.id] = {
      description: p.description,
      seo_title: p.seo_title || null,
      seo_description: p.seo_description || null,
    };
  }

  await db.collection(COLLECTION).doc(id).set(backup);

  return {
    id: backup.id,
    created_at: backup.created_at,
    expires_at: backup.expires_at,
    product_count: backup.product_count,
  };
}

/**
 * List all available (non-expired) backups.
 */
async function listBackups() {
  const db = getFirestore();

  const now = Date.now();
  const snapshot = await db.collection(COLLECTION).orderBy('created_at', 'desc').get();

  const backups = [];
  const expiredIds = [];

  for (const doc of snapshot.docs) {
    const b = doc.data();
    const expired = new Date(b.expires_at).getTime() < now;

    // Mark expired for deletion
    if (expired) {
      expiredIds.push(doc.id);
      continue;
    }

    backups.push({
      id: b.id,
      created_at: b.created_at,
      expires_at: b.expires_at,
      product_count: b.product_count,
      minutes_left: Math.round((new Date(b.expires_at).getTime() - now) / 60000),
    });
  }

  // Clean up expired backups asynchronously
  if (expiredIds.length > 0) {
    for (const id of expiredIds) {
      db.collection(COLLECTION).doc(id).delete().catch(error => {
        console.error(`Error deleting expired backup ${id}:`, error);
      });
    }
  }

  return backups;
}

/**
 * Get a backup by ID.
 * @returns {Object|null} Complete backup with products, or null if doesn't exist/expired
 */
async function getBackup(id) {
  const db = getFirestore();

  try {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    const b = doc.data();

    // Check if expired
    if (new Date(b.expires_at).getTime() < Date.now()) {
      // Clean up expired backup
      await db.collection(COLLECTION).doc(id).delete();
      return null;
    }

    return b;
  } catch (error) {
    console.error(`Error getting backup ${id}:`, error);
    return null;
  }
}

module.exports = {
  createBackup,
  listBackups,
  getBackup,
};
