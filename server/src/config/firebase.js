import admin from 'firebase-admin';
import 'dotenv/config';

/**
 * Initialize Firebase Admin SDK with Firestore
 */
let db = null;

export function initializeFirebase() {
  if (db) return db;

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    // Validate required fields
    if (!serviceAccount.projectId || !serviceAccount.clientEmail) {
      throw new Error('Missing required Firebase configuration: FIREBASE_PROJECT_ID or FIREBASE_CLIENT_EMAIL');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();
    console.log('Firebase Firestore initialized successfully');
    return db;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    throw error;
  }
}

export function getFirestore() {
  if (!db) {
    throw new Error('Firestore not initialized. Call initializeFirebase() first.');
  }
  return db;
}

export default initializeFirebase;
