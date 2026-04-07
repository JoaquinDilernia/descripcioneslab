/**
 * structureStore.js - Persists the default store structure using Firestore.
 * Collection: descripcioneslab_structures
 */

const { getFirestore } = require('../config/firebase.js');

const COLLECTION = 'descripcioneslab_structures';
const DOC_ID = 'default'; // Single document for default structure

/**
 * Save the default structure.
 */
async function saveDefaultStructure(sections, font) {
  const db = getFirestore();

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
async function getDefaultStructure() {
  const db = getFirestore();

  const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
  if (!doc.exists) return null;

  return doc.data();
}

module.exports = {
  saveDefaultStructure,
  getDefaultStructure,
};
