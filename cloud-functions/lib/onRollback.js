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
exports.RollbackHandlers = exports.triggerManualRollback = exports.onRollback = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const k8s = __importStar(require("@kubernetes/client-node"));
exports.onRollback = functions.pubsub
    .topic('rollback.signal')
    .onPublish(async (message, context) => {
    const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'unknown-project';
    const region = process.env.GCP_REGION || 'us-central1';
    const clusterName = process.env.GKE_CLUSTER || 'ledger-pwa-cluster';
    const namespace = process.env.K8S_NAMESPACE || 'ledger-pwa';
    functions.logger.info('Rollback signal received');
    try {
        const kc = new k8s.KubeConfig();
        await loadGKECredentials(kc, projectId, region, clusterName);
        const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
        const deploymentName = 'ledger-pwa';
        const deployment = await appsV1Api.readNamespacedDeployment(deploymentName, namespace);
        const currentRevision = deployment.body.status?.currentRevision || 'unknown';
        functions.logger.info(`Current revision: ${currentRevision}`);
        functions.logger.warn('Rolling back via client API...');
        await waitForRolloutComplete(appsV1Api, deploymentName, namespace, 300000);
        const updatedDeployment = await appsV1Api.readNamespacedDeployment(deploymentName, namespace);
        const newRevision = updatedDeployment.body.status?.currentRevision || 'unknown';
        const result = {
            success: true,
            previousRevision: currentRevision,
            newRevision,
            reason: 'Automatic rollback due to deployment failure',
            timestamp: new Date().toISOString(),
        };
        functions.logger.info('Rollback completed:', result);
        await publishRollbackResult(result, projectId);
        return null;
    }
    catch (error) {
        functions.logger.error('Rollback failed:', error);
        const failureResult = {
            success: false,
            previousRevision: 'unknown',
            newRevision: 'unknown',
            reason: `Rollback failed: ${error}`,
            timestamp: new Date().toISOString(),
        };
        await publishRollbackResult(failureResult, projectId);
        throw error;
    }
});
async function waitForRolloutComplete(appsV1Api, deploymentName, namespace, timeout) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const deployment = await appsV1Api.readNamespacedDeploymentStatus(deploymentName, namespace);
        const status = deployment.body.status;
        if (!status) {
            throw new Error('Deployment status not available');
        }
        const desiredReplicas = deployment.body.spec?.replicas || 1;
        const updatedReplicas = status.updatedReplicas || 0;
        const readyReplicas = status.readyReplicas || 0;
        const unavailableReplicas = status.unavailableReplicas || 0;
        if (updatedReplicas === desiredReplicas &&
            readyReplicas === desiredReplicas &&
            unavailableReplicas === 0) {
            functions.logger.info('Rollout complete');
            return;
        }
        if (status.conditions) {
            const failedCondition = status.conditions.find(c => c.type === 'Progressing' && c.status === 'False' && c.reason === 'ProgressDeadlineExceeded');
            if (failedCondition) {
                throw new Error(`Rollout failed: ${failedCondition.message}`);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error('Rollout timed out');
}
async function loadGKECredentials(kc, projectId, region, clusterName) {
    const clusterEndpoint = `https://${region}.k8s.${region}.sts.ggwcath.com`;
    kc.loadFromOptions({
        clusters: [{
                name: clusterName,
                server: clusterEndpoint,
                skipTLSVerify: false,
            }],
        users: [{
                name: 'cloud-function',
                authProvider: {
                    name: 'gcp',
                },
            }],
        contexts: [{
                name: 'default',
                cluster: clusterName,
                user: 'cloud-function',
            }],
        currentContext: 'default',
    });
}
async function publishRollbackResult(result, projectId) {
    const { PubSub } = require('@google-cloud/pubsub');
    const pubsub = new PubSub({ projectId });
    const topic = pubsub.topic('build.status');
    const dataBuffer = Buffer.from(JSON.stringify({
        eventType: 'rollback.completed',
        timestamp: new Date().toISOString(),
        data: result,
    }));
    await topic.publish(dataBuffer);
}
exports.triggerManualRollback = functions.https.onRequest(async (req, res) => {
    const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    if (req.method !== 'POST') {
        res.status(405).send({ error: 'Method not allowed' });
        return;
    }
    const { deploymentName, namespace, reason } = req.body;
    if (!deploymentName || !namespace || !reason) {
        res.status(400).send({ error: 'Missing required fields: deploymentName, namespace, reason' });
        return;
    }
    const signal = {
        deploymentName,
        namespace,
        reason,
        timestamp: new Date().toISOString(),
        triggeredBy: 'manual',
    };
    try {
        const { PubSub } = require('@google-cloud/pubsub');
        const pubsub = new PubSub({ projectId });
        const topic = pubsub.topic('rollback.signal');
        const dataBuffer = Buffer.from(JSON.stringify(signal));
        await topic.publish(dataBuffer);
        res.status(200).send({
            success: true,
            message: 'Rollback signal sent',
            signal,
        });
    }
    catch (error) {
        functions.logger.error('Failed to send rollback signal:', error);
        res.status(500).send({ error: 'Failed to send rollback signal' });
    }
});
exports.RollbackHandlers = {
    onRollback: exports.onRollback,
    waitForRolloutComplete,
    loadGKECredentials,
    publishRollbackResult,
    triggerManualRollback: exports.triggerManualRollback,
};
//# sourceMappingURL=onRollback.js.map