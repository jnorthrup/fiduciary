#!/bin/bash
# rollback-gke.sh
# Rolls back GKE deployment to previous stable version

set -e

NAMESPACE="${1:-ledger-pwa}"
PROJECT_ID="${GCP_PROJECT_ID:-gen-lang-client-0754063985}"

echo "=== GKE Rollback for $PROJECT_ID ==="

# Check for recent deployments
echo "Recent rollout history:"
kubectl rollout history deployment/ledger-pwa -n "$NAMESPACE" --limit=5

# Get current revision
CURRENT_REVISION=$(kubectl rollout status deployment/ledger-pwa -n "$NAMESPACE" -o jsonpath='{.status.currentRevision}')
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
    kubectl rollout history deployment/ledger-pwa -n "$NAMESPACE" --limit=10

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
echo "New revision: $NEW_REVISION"
echo ""

# Verify deployment health
echo "Verifying deployment health..."
kubectl get pods -n "$NAMESPACE" -l app=ledger-pwa

# Get service endpoint
echo "Service endpoint:"
kubectl get service ledger-pwa -n "$NAMESPACE"
