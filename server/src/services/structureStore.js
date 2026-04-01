/**
 * structureStore.js - Persists the default store structure using Firestore.
 * Collection: descripcioneslab_structures
 */

import { getFirestore } from '../config/firebase.js';

const COLLECTION = 'descripcioneslab_structures';
const DOC_ID = 'default'; // Single document for default structure

let db;
try {
  db = getFirestore();
} catch {
  // Will be initialized on first use
}

/**
 * Save the default structure.
 */
export async function saveDefaultStructure(sections, font) {
  if (!db) db = getFirestore();

  const data = {
    sections,
    font: font || '',
    saved_at: new Date().toISOString(),
  };

  await db.collection(COLLECTION).doc(DOC_ID).set(data);
  return data;
}

/**
 * Get the default structure.
 */
export async function getDefaultStructure() {
  if (!db) db = getFirestore();

  const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
  if (!doc.exists) return null;

  return doc.data();
}
