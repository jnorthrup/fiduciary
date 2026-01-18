/**
 * Cloud Functions Entry Point
 * Exports all functions for Firebase Functions deployment
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Import function handlers
export const onDeploy = require('./onDeploy').onDeploy;
export const onUserCreate = require('./onAuthChange').onUserCreate;
export const onUserSignIn = require('./onAuthChange').onUserSignIn;
export const onUserDelete = require('./onAuthChange').onUserDelete;
export const onRollback = require('./onRollback').onRollback;
export const triggerManualRollback = require('./onRollback').triggerManualRollback;

// Export named functions for Firebase Functions
export {
  // Deployment orchestration
  onDeploy,

  // User auth handlers
  onUserCreate,
  onUserSignIn,
  onUserDelete,

  // Rollback handlers
  onRollback,
  triggerManualRollback,
};

// Export for testing
export const DeploymentHandlers = require('./onDeploy').DeploymentHealthCheck;
export const AuthHandlers = require('./onAuthChange').AuthChangeHandlers;
export const RollbackHandlers = require('./onRollback').RollbackHandlers;
