/**
 * onDeploy Cloud Function
 * Triggered by Cloud Build after successful GKE deployment
 * Performs health checks and validates deployment readiness
 */

import * as functions from 'firebase-functions/v1';
import * as k8s from '@kubernetes/client-node';

interface DeploymentHealthCheck {
  deploymentName: string;
  namespace: string;
  projectName: string;
  region: string;
}

interface HealthCheckResult {
  healthy: boolean;
  readyReplicas: number;
  availableReplicas: number;
  unavailableReplicas: number;
  rolloutStatus: 'complete' | 'in_progress' | 'failed';
  message: string;
  timestamp: string;
}

/**
 * Health check function triggered by Pub/Sub after deployment
 * Subscribes to: deploy.signal topic
 */
export const onDeploy = functions.pubsub
  .topic('deploy.signal')
  .onPublish(async (message, context) => {
    const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'unknown-project';
    const region = process.env.GCP_REGION || 'us-central1';
    const clusterName = process.env.GKE_CLUSTER || 'ledger-pwa-cluster';
    const namespace = process.env.K8S_NAMESPACE || 'ledger-pwa';
    const deploymentName = 'ledger-pwa';

    functions.logger.info(`Starting deployment health check for ${deploymentName} in ${namespace}`);

    try {
      // Configure k8s client for GKE
      const kc = new k8s.KubeConfig();
      await loadGKECredentials(kc, projectId, region, clusterName);

      const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);

      // Get deployment status
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

      // Determine rollout status
      let rolloutStatus: HealthCheckResult['rolloutStatus'] = 'in_progress';
      let healthy = false;
      let message = 'Rollout in progress';

      if (unavailableReplicas > 0) {
        rolloutStatus = 'in_progress';
        message = `${unavailableReplicas} replicas unavailable`;
      } else if (readyReplicas === desiredReplicas && updatedReplicas === desiredReplicas) {
        rolloutStatus = 'complete';
        healthy = true;
        message = 'All replicas ready and updated';
      } else if (status.conditions) {
        // Check for failure conditions
        const failedCondition = status.conditions.find(
          c => c.type === 'Progressing' && c.status === 'False' && c.reason === 'ProgressDeadlineExceeded'
        );

        if (failedCondition) {
          rolloutStatus = 'failed';
          message = `Deployment failed: ${failedCondition.message}`;
        }
      }

      const result: HealthCheckResult = {
        healthy,
        readyReplicas,
        availableReplicas,
        unavailableReplicas,
        rolloutStatus,
        message,
        timestamp: new Date().toISOString(),
      };

      functions.logger.info('Health check result:', result);

      // Publish to build.status topic
      await publishBuildStatus(result, projectId);

      // If deployment failed, trigger automatic rollback
      if (rolloutStatus === 'failed') {
        functions.logger.error('Deployment health check failed, triggering rollback');
        await triggerRollback(deploymentName, namespace, projectId);
      }

      return null;
    } catch (error) {
      functions.logger.error('Deployment health check error:', error);
      throw error;
    }
  });

/**
 * Load GKE credentials using Workload Identity
 */
async function loadGKECredentials(
  kc: k8s.KubeConfig,
  projectId: string,
  region: string,
  clusterName: string
): Promise<void> {
  // For Cloud Functions with Workload Identity
  // Use the GKE cluster endpoint directly
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

/**
 * Publish build status to Pub/Sub
 */
async function publishBuildStatus(
  result: HealthCheckResult,
  projectId: string
): Promise<void> {
  const { PubSub } = require('@google-cloud/pubsub');
  const pubsub = new PubSub({ projectId });

  const topic = pubsub.topic('build.status');
  const dataBuffer = Buffer.from(JSON.stringify(result));

  await topic.publish(dataBuffer);
}

/**
 * Trigger automatic rollback
 */
async function triggerRollback(
  deploymentName: string,
  namespace: string,
  projectId: string
): Promise<void> {
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

// Export for testing
export const DeploymentHealthCheck = {
  onDeploy,
  loadGKECredentials,
  publishBuildStatus,
  triggerRollback,
};
