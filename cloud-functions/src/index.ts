/**
 * Cloud Functions Entry Point
 * Exports all functions for Firebase Functions deployment
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Import function handlers
// Export named functions for Firebase Functions
export { onDeploy } from './onDeploy';
export { onUserCreate, onUserDelete } from './onAuthChange';
export { onRollback, triggerManualRollback } from './onRollback';
export { serveApp } from './serveApp';

// Export for testing
export const DeploymentHandlers = require('./onDeploy').DeploymentHealthCheck;
export const AuthHandlers = require('./onAuthChange').AuthChangeHandlers;
export const RollbackHandlers = require('./onRollback').RollbackHandlers;
