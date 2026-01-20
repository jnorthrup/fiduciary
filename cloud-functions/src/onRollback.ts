/**
 * onRollback Cloud Function
 * Triggered by Pub/Sub when deployment failure is detected
 * Performs automatic rollback to previous stable version
 */

import * as functions from 'firebase-functions/v1';
import * as k8s from '@kubernetes/client-node';

interface RollbackSignal {
  deploymentName: string;
  namespace: string;
  reason: string;
  timestamp: string;
  triggeredBy: 'health_check' | 'manual' | 'monitoring_alert';
}

interface RollbackResult {
  success: boolean;
  previousRevision: string;
  newRevision: string;
  reason: string;
  timestamp: string;
}

/**
 * Rollback function triggered by Pub/Sub
 * Subscribes to: rollback.signal topic
 */
export const onRollback = functions.pubsub
  .topic('rollback.signal')
  .onRun(async (context) => {
    const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    const region = process.env.GCP_REGION || 'us-central1';
    const clusterName = process.env.GKE_CLUSTER || 'ledger-pwa-cluster';
    const namespace = process.env.K8S_NAMESPACE || 'ledger-pwa';

    functions.logger.info('Rollback signal received');

    try {
      // Configure k8s client for GKE
      const kc = new k8s.KubeConfig();
      await loadGKECredentials(kc, projectId, region, clusterName);

      const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);

      const deploymentName = 'ledger-pwa';

      // Get current deployment
      const deployment = await appsV1Api.readNamespacedDeployment(deploymentName, namespace);
      const currentRevision = deployment.body.status?.currentRevision || 'unknown';

      functions.logger.info(`Current revision: ${currentRevision}`);

      // Perform rollback (undo last rollout)
      const rollbackResult = await appsV1Api.createNamespacedDeploymentRollback(
        namespace,
        deploymentName,
        {
          name: deploymentName,
          rollbackTo: {
            revision: 0, // 0 means undo last rollout
          },
        }
      );

      // Wait for rollout to complete
      await waitForRolloutComplete(appsV1Api, deploymentName, namespace, 300000); // 5 minutes

      // Get new revision after rollback
      const updatedDeployment = await appsV1Api.readNamespacedDeployment(deploymentName, namespace);
      const newRevision = updatedDeployment.body.status?.currentRevision || 'unknown';

      const result: RollbackResult = {
        success: true,
        previousRevision: currentRevision,
        newRevision,
        reason: 'Automatic rollback due to deployment failure',
        timestamp: new Date().toISOString(),
      };

      functions.logger.info('Rollback completed:', result);

      // Publish rollback result
      await publishRollbackResult(result, projectId);

      return null;
    } catch (error) {
      functions.logger.error('Rollback failed:', error);

      const failureResult: RollbackResult = {
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

/**
 * Wait for rollout to complete
 */
async function waitForRolloutComplete(
  appsV1Api: k8s.AppsV1Api,
  deploymentName: string,
  namespace: string,
  timeout: number
): Promise<void> {
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

    if (
      updatedReplicas === desiredReplicas &&
      readyReplicas === desiredReplicas &&
      unavailableReplicas === 0
    ) {
      functions.logger.info('Rollout complete');
      return;
    }

    // Check for failure conditions
    if (status.conditions) {
      const failedCondition = status.conditions.find(
        c => c.type === 'Progressing' && c.status === 'False' && c.reason === 'ProgressDeadlineExceeded'
      );

      if (failedCondition) {
        throw new Error(`Rollout failed: ${failedCondition.message}`);
      }
    }

    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Rollout timed out');
}

/**
 * Load GKE credentials using Workload Identity
 */
async function loadGKECredentials(
  kc: k8s.KubeConfig,
  projectId: string,
  region: string,
  clusterName: string
): Promise<void> {
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
 * Publish rollback result to Pub/Sub
 */
async function publishRollbackResult(
  result: RollbackResult,
  projectId: string
): Promise<void> {
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

/**
 * Manual rollback trigger (HTTP function)
 */
export const triggerManualRollback = functions.https.onRequest(async (req, res) => {
  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method not allowed' });
    return;
  }

  const { deploymentName, namespace, reason } = req.body as Partial<RollbackSignal>;

  if (!deploymentName || !namespace || !reason) {
    res.status(400).send({ error: 'Missing required fields: deploymentName, namespace, reason' });
    return;
  }

  const signal: RollbackSignal = {
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
  } catch (error) {
    functions.logger.error('Failed to send rollback signal:', error);
    res.status(500).send({ error: 'Failed to send rollback signal' });
  }
});

// Export for testing
export const RollbackHandlers = {
  onRollback,
  waitForRolloutComplete,
  loadGKECredentials,
  publishRollbackResult,
  triggerManualRollback,
};
