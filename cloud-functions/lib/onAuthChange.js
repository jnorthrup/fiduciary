"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthChangeHandlers = exports.onUserDelete = exports.onUserCreate = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
async function provisionUserStorage(user) {
    const userId = user.uid;
    const email = user.email;
    const emailVerified = user.emailVerified || false;
    const createdAt = user.metadata.creationTime || new Date().toISOString();
    functions.logger.info(`Provisioning storage for new user: ${userId}`);
    try {
        const db = admin.firestore();
        const fdbNamespace = `user_${userId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const salt = generateSalt();
        const storageConfig = {
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
        await db.collection('users').doc(userId).set({
            email,
            emailVerified,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            storageConfig,
            provisioned: true,
        }, { merge: true });
        await initializeUserNamespace(fdbNamespace);
        const result = {
            userId,
            email,
            emailVerified,
            createdAt,
            lastSignInAt: createdAt,
            storageProvisioned: true,
            fdbNamespace,
        };
        functions.logger.info('User storage provisioned:', result);
        await publishStorageEvent('user.provisioned', result);
        return result;
    }
    catch (error) {
        functions.logger.error('Failed to provision user storage:', error);
        throw error;
    }
}
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    await provisionUserStorage(user);
    return null;
});
exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
    const userId = user.uid;
    functions.logger.info(`Deleting storage for user: ${userId}`);
    try {
        const db = admin.firestore();
        await db.collection('users').doc(userId).update({
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            storageConfig: admin.firestore.FieldValue.delete(),
        });
        functions.logger.info(`User ${userId} marked for deletion`);
        return null;
    }
    catch (error) {
        functions.logger.error('Failed to delete user storage:', error);
        throw error;
    }
});
function generateSalt() {
    const crypto = require('crypto');
    return crypto.randomBytes(16);
}
async function initializeUserNamespace(namespace) {
    functions.logger.info(`Initializing FoundationDB namespace: ${namespace}`);
}
async function publishStorageEvent(eventType, data) {
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
    }
    catch (error) {
        functions.logger.error('Failed to publish storage event:', error);
    }
}
exports.AuthChangeHandlers = {
    onUserCreate: exports.onUserCreate,
    onUserDelete: exports.onUserDelete,
    generateSalt,
    initializeUserNamespace,
    publishStorageEvent,
    provisionUserStorage
};
//# sourceMappingURL=onAuthChange.js.map