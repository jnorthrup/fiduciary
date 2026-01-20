/**
 * onAuthChange Cloud Function
 * Triggered by Firebase Auth when user is created or signs in
 * Provisions user-specific storage (IndexedDB encryption keys, FoundationDB namespaces)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

interface UserStorageProvision {
  userId: string;
  email?: string;
  emailVerified: boolean;
  createdAt: string;
  lastSignInAt: string;
  storageProvisioned: boolean;
  fdbNamespace: string;
  encryptedKeyShare?: string;
}

interface UserStorageConfig {
  namespace: string;
  keyDerivation: {
    salt: string;
    iterations: number;
    algorithm: 'PBKDF2';
  };
  encryption: {
    algorithm: 'AES-GCM';
    keyLength: 256;
  };
}

/**
 * Triggered when a user is created in Firebase Auth
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const userId = user.uid;
  const email = user.email;
  const emailVerified = user.emailVerified || false;
  const createdAt = user.metadata.createdAt || new Date().toISOString();

  functions.logger.info(`Provisioning storage for new user: ${userId}`);

  try {
    // Initialize Firestore
    const db = admin.firestore();

    // Create user-specific FoundationDB namespace
    const fdbNamespace = `user_${userId.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    // Generate salt for user's key derivation
    const salt = generateSalt();

    // Create storage configuration document
    const storageConfig: UserStorageConfig = {
      namespace: fdbNamespace,
      keyDerivation: {
        salt: salt.toString('base64'),
        iterations: 100000,
        algorithm: 'PBKDF2',
      },
      encryption: {
        algorithm: 'AES-GCM',
        keyLength: 256,
      },
    };

    // Store configuration in Firestore
    await db.collection('users').doc(userId).set({
      email,
      emailVerified,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      storageConfig,
      provisioned: true,
    }, { merge: true });

    // Initialize user's ledger namespace in FoundationDB
    await initializeUserNamespace(fdbNamespace);

    const result: UserStorageProvision = {
      userId,
      email,
      emailVerified,
      createdAt,
      lastSignInAt: createdAt,
      storageProvisioned: true,
      fdbNamespace,
    };

    functions.logger.info('User storage provisioned:', result);

    // Publish to Pub/Sub for monitoring
    await publishStorageEvent('user.provisioned', result);

    return null;
  } catch (error) {
    functions.logger.error('Failed to provision user storage:', error);
    throw error;
  }
});

/**
 * Triggered when a user signs in
 * Updates last sign-in time and re-validates storage
 */
export const onUserSignIn = functions.auth.user().onSignIn(async (user) => {
  const userId = user.uid;
  const lastSignInAt = user.metadata.lastSignInAt || new Date().toISOString();

  functions.logger.info(`User sign-in: ${userId}`);

  try {
    const db = admin.firestore();

    // Update last sign-in time
    await db.collection('users').doc(userId).update({
      lastSignInAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Verify storage is still provisioned
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists || !userDoc.data()?.storageConfig) {
      functions.logger.warn(`User ${userId} missing storage config, reprovisioning`);
      // Trigger re-provisioning
      await onUserCreate(user);
    }

    return null;
  } catch (error) {
    functions.logger.error('Failed to update user sign-in:', error);
    throw error;
  }
});

/**
 * Triggered when a user is deleted
 * Cleans up user storage
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  const userId = user.uid;

  functions.logger.info(`Deleting storage for user: ${userId}`);

  try {
    const db = admin.firestore();

    // Mark for deletion (soft delete)
    await db.collection('users').doc(userId).update({
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      storageConfig: admin.firestore.FieldValue.delete(),
    });

    // Schedule actual data cleanup in FoundationDB
    // (done by a separate Cloud Scheduler job to allow for recovery)

    functions.logger.info(`User ${userId} marked for deletion`);

    return null;
  } catch (error) {
    functions.logger.error('Failed to delete user storage:', error);
    throw error;
  }
});

/**
 * Generate cryptographically random salt
 */
function generateSalt(): Buffer {
  const crypto = require('crypto');
  return crypto.randomBytes(16);
}

/**
 * Initialize user namespace in FoundationDB
 */
async function initializeUserNamespace(namespace: string): Promise<void> {
  // TODO: Implement FoundationDB namespace initialization
  // This would create the namespace directory structure
  functions.logger.info(`Initializing FoundationDB namespace: ${namespace}`);

  // Placeholder - actual implementation would use FDB client
  // await fdb.doTransaction(async (trx) => {
  //   await trx.createDirectory(namespace);
  // });
}

/**
 * Publish storage event to Pub/Sub
 */
async function publishStorageEvent(
  eventType: string,
  data: UserStorageProvision
): Promise<void> {
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

  if (!projectId) {
    functions.logger.warn('No project ID configured, skipping Pub/Sub publish');
    return;
  }

  try {
    const { PubSub } = require('@google-cloud/pubsub');
    const pubsub = new PubSub({ projectId });

    const topic = pubsub.topic('ledger.events');
    const message = {
      eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    await topic.publish(Buffer.from(JSON.stringify(message)));
    functions.logger.info(`Published ${eventType} event`);
  } catch (error) {
    functions.logger.error('Failed to publish storage event:', error);
    // Don't throw - storage provisioning succeeded
  }
}

// Export for testing
export const AuthChangeHandlers = {
  onUserCreate,
  onUserSignIn,
  onUserDelete,
  generateSalt,
  initializeUserNamespace,
  publishStorageEvent,
};
