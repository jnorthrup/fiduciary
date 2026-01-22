#!/bin/bash
# rollback-gke-auto.sh
# Triggers automatic rollback via Cloud Function or performs manual rollback

set -e

NAMESPACE="${1:-ledger-pwa}"
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
FUNCTION_URL="${CLOUD_FUNCTION_URL:-}"

echo "=== GKE Automatic Rollback for $PROJECT_ID ==="

# Check if Cloud Function URL is provided
if [ -n "$FUNCTION_URL" ]; then
  echo "Triggering rollback via Cloud Function: $FUNCTION_URL"

  # Get current deployment info
  CURRENT_REVISION=$(kubectl rollout status deployment/ledger-pwa -n "$NAMESPACE" -o jsonpath='{.status.currentRevision}' 2>/dev/null || echo "unknown")
  echo "Current revision: $CURRENT_REVISION"

  # Trigger rollback via Cloud Function
  RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"deploymentName\": \"ledger-pwa\",
      \"namespace\": \"$NAMESPACE\",
      \"reason\": \"Manual rollback triggered via script\"
    }")

  echo "Rollback signal sent:"
  echo "$RESPONSE" | jq . || echo "$RESPONSE"

  echo ""
  echo "Waiting for rollback to complete..."

  # Wait for rollout to complete
  kubectl rollout status deployment/ledger-pwa -n "$NAMESPACE" --timeout=5m

  # Get new revision
  NEW_REVISION=$(kubectl rollout status deployment/ledger-pwa -n "$NAMESPACE" -o jsonpath='{.status.currentRevision}')
  echo ""
  echo "=== Rollback Complete ==="
  echo "Previous revision: $CURRENT_REVISION"
  echo "New revision: $NEW_REVISION"
  echo ""

else
  echo "Cloud Function URL not provided, performing manual kubectl rollback"
  echo ""

  # Check for recent deployments
  echo "Recent rollout history:"
  kubectl rollout history deployment/ledger-pwa -n "$NAMESPACE" --limit=5 || true

  # Get current revision
  CURRENT_REVISION=$(kubectl rollout status deployment/ledger-pwa -n "$NAMESPACE" -o jsonpath='{.status.currentRevision}' 2>/dev/null || echo "unknown")
  echo "Current revision: $CURRENT_REVISION"

  # Prompt user for target revision
  echo ""
  echo "Available rollback options:"
  echo "  1) Undo last rollout (kubectl rollout undo)"
  echo "  2) Rollback to specific revision"
  echo "  3) Cancel"
  echo ""
  read -p "Choose option (1-3): " choice

  case $choice in
    1)
      echo "Undoing last rollout..."
      kubectl rollout undo deployment/ledger-pwa -n "$NAMESPACE"

      echo "Waiting for rollback to complete..."
      kubectl rollout status deployment/ledger-pwa -n "$NAMESPACE" --timeout=5m
      ;;
    2)
      echo ""
      echo "Available revisions:"
      kubectl rollout history deployment/ledger-pwa -n "$NAMESPACE" --limit=10 || true

      read -p "Enter revision number to rollback to: " revision
      if [ -n "$revision" ]; then
        echo "Rolling back to revision $revision..."
        kubectl rollout undo deployment/ledger-pwa -n "$NAMESPACE" --to-revision="$revision"

        echo "Waiting for rollback to complete..."
        kubectl rollout status deployment/ledger-pwa -n "$NAMESPACE" --timeout=5m
      else
        echo "Cancelled"
        exit 0
      fi
      ;;
    3)
      echo "Cancelled"
      exit 0
      ;;
    *)
      echo "Invalid option"
      exit 1
      ;;
  esac

  # Get new revision after rollback
  NEW_REVISION=$(kubectl rollout status deployment/ledger-pwa -n "$NAMESPACE" -o jsonpath='{.status.currentRevision}')
  echo ""
  echo "=== Rollback Complete ==="
  echo "Previous revision: $CURRENT_REVISION"
  echo "New revision: $NEW_REVISION"
  echo ""
fi

# Verify deployment health
echo "Verifying deployment health..."
kubectl get pods -n "$NAMESPACE" -l app=ledger-pwa

# Get service endpoint
echo ""
echo "Service endpoint:"
kubectl get service ledger-pwa -n "$NAMESPACE" || true

echo ""
echo "✓ Rollback completed successfully"
