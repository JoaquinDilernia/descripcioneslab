/**
 * tokenStore.js - Token storage using Firestore.
 * Collection: descripcioneslab_tokens
 */

import { getFirestore } from '../config/firebase.js';

const COLLECTION = 'descripcioneslab_tokens';
const DOC_ID = 'current_token'; // Single document for the current token

let db;
try {
  db = getFirestore();
} catch {
  // Will be initialized on first use
}

/**
 * Get the stored token. Returns null if it doesn't exist.
 */
export async function getStoredToken() {
  if (!db) db = getFirestore();

  try {
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (error) {
    console.error('Error reading stored token:', error);
    return null;
  }
}

/**
 * Save the token to Firestore.
 */
export async function saveToken(data) {
  if (!db) db = getFirestore();

  const payload = {
    store_id: data.user_id || data.store_id,
    access_token: data.access_token,
    scope: data.scope || '',
    connected_at: new Date().toISOString(),
    active: true,
  };

  await db.collection(COLLECTION).doc(DOC_ID).set(payload);
  return payload;
}
