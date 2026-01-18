# Cloud Functions for Ledger PWA

Orchestration and rollback automation for the Ledger PWA deployment pipeline.

## Functions

### onDeploy
**Trigger:** Pub/Sub topic `deploy.signal`

Performs health checks after GKE deployment completes:
- Checks deployment rollout status
- Validates pod health and readiness
- Monitors for deployment failures
- Triggers automatic rollback on failure
- Publishes status to `build.status` topic

**Environment Variables:**
- `GCP_PROJECT_ID`: GCP project ID
- `GCP_REGION`: GCP region (default: us-central1)
- `K8S_NAMESPACE`: Kubernetes namespace (default: ledger-pwa)
- `GKE_CLUSTER`: GKE cluster name (default: ledger-pwa-cluster)

### onRollback
**Trigger:** Pub/Sub topic `rollback.signal`

Performs automatic rollback to previous stable deployment:
- Executes `kubectl rollout undo`
- Waits for rollout completion
- Validates new deployment health
- Publishes rollback result to `build.status`

**Environment Variables:** (same as onDeploy)

### triggerManualRollback
**Trigger:** HTTP

Allows manual rollback invocation via HTTP request:

```bash
curl -X POST https://us-central1-PROJECT_ID.cloudfunctions.net/triggerManualRollback \
  -H "Content-Type: application/json" \
  -d '{
    "deploymentName": "ledger-pwa",
    "namespace": "ledger-pwa",
    "reason": "Manual rollback"
  }'
```

### onUserCreate
**Trigger:** Firebase Auth user creation

Provisions user-specific storage:
- Creates FoundationDB namespace for user
- Generates encryption salt for key derivation
- Initializes user ledger in Firestore
- Publishes provisioning event to `ledger.events`

### onUserSignIn
**Trigger:** Firebase Auth sign-in

Updates user sign-in timestamp and re-validates storage configuration.

### onUserDelete
**Trigger:** Firebase Auth user deletion

Marks user storage for deletion (soft delete with recovery window).

## Pub/Sub Topics

| Topic | Purpose | Publisher | Subscriber |
|-------|---------|-----------|------------|
| `deploy.signal` | Deployment completed | Cloud Build | onDeploy |
| `rollback.signal` | Trigger rollback | onDeploy, manual | onRollback |
| `build.status` | Build/rollback status | onDeploy, onRollback | Monitoring |
| `ledger.events` | User/storage events | Auth handlers | Monitoring |

## Deployment

```bash
# Install dependencies
cd cloud-functions
npm install

# Build
npm run build

# Deploy
cd ..
./scripts/deploy-cloud-functions.sh
```

## Local Development

```bash
cd cloud-functions
npm run shell
```

## Monitoring

View function logs:
```bash
firebase functions:log
# or
gcloud functions logs read --project=PROJECT_ID
```

## Testing

```bash
cd cloud-functions
npm test
```

## Dependencies

- `firebase-functions`: Cloud Functions framework
- `firebase-admin`: Firebase Admin SDK
- `@google-cloud/pubsub`: Pub/Sub client
- `@google-cloud/firestore`: Firestore client
- `@kubernetes/client-node`: Kubernetes API client for GKE operations

## Security

- Functions use Workload Identity for GKE access
- Minimal permissions (no cloud-platform scope)
- Service account: `PROJECT_ID@appspot.gserviceaccount.com`
