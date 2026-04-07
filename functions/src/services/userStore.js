/**
 * userStore.js - User management with Firestore storage.
 *
 * Each user is linked to a store_id from Tienda Nube.
 * Passwords hashed with bcrypt. Collection: descripcioneslab_users
 */

const { getFirestore } = require('../config/firebase.js');
const bcrypt = require('bcryptjs');

const COLLECTION = 'descripcioneslab_users';

/**
 * Create a new user.
 * Returns the user (without password) or throws error if already exists.
 */
async function createUser({ name, email, password, store_id, access_token }) {
  const db = getFirestore();
  const normalizedEmail = email.toLowerCase();

  // Check for duplicate email
  const emailQuery = await db.collection(COLLECTION).where('email', '==', normalizedEmail).limit(1).get();
  if (!emailQuery.empty) {
    throw new Error('Ya existe un usuario con ese email');
  }

  // Check for duplicate store_id
  const storeQuery = await db.collection(COLLECTION).where('store_id', '==', store_id).limit(1).get();
  if (!storeQuery.empty) {
    throw new Error('Esta tienda ya tiene un usuario registrado');
  }

  const hash = await bcrypt.hash(password, 10);
  const userId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const user = {
    id: userId,
    name: name || '',
    email: normalizedEmail,
    password: hash,
    store_id,
    access_token,
    created_at: new Date().toISOString(),
  };

  await db.collection(COLLECTION).doc(userId).set(user);

  const { password: _, ...safe } = user;
  return safe;
}

/**
 * Authenticate a user by email + password.
 * Returns the user (without password) or null if no match.
 */
async function authenticateUser(email, password) {
  const db = getFirestore();
  const normalizedEmail = email.toLowerCase();
  const query = await db.collection(COLLECTION).where('email', '==', normalizedEmail).limit(1).get();

  if (query.empty) return null;

  const user = query.docs[0].data();
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  const { password: _, ...safe } = user;
  return safe;
}

/**
 * Get a user by ID.
 */
async function getUserById(id) {
  const db = getFirestore();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;

  const user = doc.data();
  const { password: _, ...safe } = user;
  return safe;
}

/**
 * Update a user's access_token (on Tienda Nube re-auth).
 */
async function updateUserToken(id, access_token) {
  const db = getFirestore();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;

  await db.collection(COLLECTION).doc(id).update({ access_token });

  const user = await db.collection(COLLECTION).doc(id).get();
  const data = user.data();
  const { password: _, ...safe } = data;
  return safe;
}

/**
 * Find user by store_id.
 */
async function getUserByStoreId(storeId) {
  const db = getFirestore();
  const query = await db.collection(COLLECTION).where('store_id', '==', storeId).limit(1).get();

  if (query.empty) return null;

  const user = query.docs[0].data();
  const { password: _, ...safe } = user;
  return safe;
}

module.exports = {
  createUser,
  authenticateUser,
  getUserById,
  updateUserToken,
  getUserByStoreId,
};
