const admin = require('firebase-admin');

/**
 * Get the Firestore instance
 * Firebase Admin is already initialized in index.js
 */
function getFirestore() {
  try {
    return admin.firestore();
  } catch (error) {
    console.error('Firestore access error:', error.message);
    throw error;
  }
}

module.exports = {
  getFirestore,
};
