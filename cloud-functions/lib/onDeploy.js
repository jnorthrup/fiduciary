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
exports.DeploymentHealthCheck = exports.onDeploy = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const k8s = __importStar(require("@kubernetes/client-node"));
exports.onDeploy = functions.pubsub
    .topic('deploy.signal')
    .onPublish(async (message, context) => {
    const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'unknown-project';
    const region = process.env.GCP_REGION || 'us-central1';
    const clusterName = process.env.GKE_CLUSTER || 'ledger-pwa-cluster';
    const namespace = process.env.K8S_NAMESPACE || 'ledger-pwa';
    const deploymentName = 'ledger-pwa';
    functions.logger.info(`Starting deployment health check for ${deploymentName} in ${namespace}`);
    try {
        const kc = new k8s.KubeConfig();
        await loadGKECredentials(kc, projectId, region, clusterName);
        const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
        const deployment = await appsV1Api.readNamespacedDeployment(deploymentName, namespace);
        const status = deployment.body.status;
        if (!status) {
            throw new Error('Deployment status not available');
        }
        const readyReplicas = status.readyReplicas || 0;
        const availableReplicas = status.availableReplicas || 0;
        const unavailableReplicas = status.unavailableReplicas || 0;
        const desiredReplicas = deployment.body.spec?.replicas || 1;
        const updatedReplicas = status.updatedReplicas || 0;
        let rolloutStatus = 'in_progress';
        let healthy = false;
        let message = 'Rollout in progress';
        if (unavailableReplicas > 0) {
            rolloutStatus = 'in_progress';
            message = `${unavailableReplicas} replicas unavailable`;
        }
        else if (readyReplicas === desiredReplicas && updatedReplicas === desiredReplicas) {
            rolloutStatus = 'complete';
            healthy = true;
            message = 'All replicas ready and updated';
        }
        else if (status.conditions) {
            const failedCondition = status.conditions.find(c => c.type === 'Progressing' && c.status === 'False' && c.reason === 'ProgressDeadlineExceeded');
            if (failedCondition) {
                rolloutStatus = 'failed';
                message = `Deployment failed: ${failedCondition.message}`;
            }
        }
        const result = {
            healthy,
            readyReplicas,
            availableReplicas,
            unavailableReplicas,
            rolloutStatus,
            message,
            timestamp: new Date().toISOString(),
        };
        functions.logger.info('Health check result:', result);
        await publishBuildStatus(result, projectId);
        if (rolloutStatus === 'failed') {
            functions.logger.error('Deployment health check failed, triggering rollback');
            await triggerRollback(deploymentName, namespace, projectId);
        }
        return null;
    }
    catch (error) {
        functions.logger.error('Deployment health check error:', error);
        throw error;
    }
});
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
async function publishBuildStatus(result, projectId) {
    const { PubSub } = require('@google-cloud/pubsub');
    const pubsub = new PubSub({ projectId });
    const topic = pubsub.topic('build.status');
    const dataBuffer = Buffer.from(JSON.stringify(result));
    await topic.publish(dataBuffer);
}
async function triggerRollback(deploymentName, namespace, projectId) {
    const { PubSub } = require('@google-cloud/pubsub');
    const pubsub = new PubSub({ projectId });
    const topic = pubsub.topic('rollback.signal');
    const dataBuffer = Buffer.from(JSON.stringify({
        deploymentName,
        namespace,
        reason: 'Deployment health check failed',
        timestamp: new Date().toISOString(),
    }));
    await topic.publish(dataBuffer);
}
exports.DeploymentHealthCheck = {
    onDeploy: exports.onDeploy,
    loadGKECredentials,
    publishBuildStatus,
    triggerRollback,
};
//# sourceMappingURL=onDeploy.js.map