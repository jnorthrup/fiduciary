
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getFirestore, Firestore, collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { logger } from './logger';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export const initFirebase = (config: any) => {
  // Basic validation to prevent crash on empty config
  if (!config || !config.apiKey || !config.projectId) {
    logger.error("Firebase initialization skipped: Missing API Key or Project ID.");
    return false;
  }

  try {
    // Check if an app is already initialized to avoid "Firebase App named '[DEFAULT]' already exists" error
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }

    if (app) {
      db = getFirestore(app);
      auth = getAuth(app);
      logger.info("Firebase initialized successfully");
      return true;
    }
    return false;
  } catch (e: any) {
    logger.error("Firebase initialization failed:", e.message);
    return false;
  }
};

export const getDb = () => db;
export const getFirebaseAuth = () => auth;

// Batch upload helper for initial sync
export const batchUpload = async (collectionName: string, items: any[]) => {
  if (!db || items.length === 0) return;

  try {
    const batch = writeBatch(db);
    const colRef = collection(db, collectionName);

    items.forEach(item => {
      if (item && item.id) {
        const docRef = doc(colRef, item.id);
        batch.set(docRef, item);
      }
    });

    await batch.commit();
  } catch (e) {
    logger.error("Batch upload failed:", e);
  }
};
