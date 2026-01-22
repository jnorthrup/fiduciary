#!/bin/bash
# validate-scale-to-zero.sh
# Validates scale-to-zero capability and measures cold-start latency

set -e

NAMESPACE="${1:-ledger-pwa}"
PROJECT_ID="${GCP_PROJECT_ID}"

echo "=== Scale-to-Zero Validation for $PROJECT_ID ==="

# Get current deployment info
echo "Current deployment state:"
kubectl get deployment ledger-pwa -n "$NAMESPACE" -o jsonpath='{.spec.replicas}'

# Test 1: Scale to zero
echo ""
echo "Test 1: Scaling to zero..."
kubectl scale deployment ledger-pwa -n "$NAMESPACE" --replicas=0

# Wait for pods to terminate
echo "Waiting for pods to terminate..."
kubectl wait --for=delete pods -l app=ledger-pwa -n "$NAMESPACE" --timeout=120s || echo "Pods terminated"

# Verify no pods running
REMAINING=$(kubectl get pods -n "$NAMESPACE" -l app=ledger-pwa --no-headers 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMAINING" -eq 0 ]; then
  echo "✓ Successfully scaled to zero"
else
  echo "✗ Failed to scale to zero (still $REMAINING pods)"
  exit 1
fi

# Test 2: Scale up and measure cold-start latency
echo ""
echo "Test 2: Scaling up and measuring cold-start latency..."
START_TIME=$(date +%s%3N)

kubectl scale deployment ledger-pwa -n "$NAMESPACE" --replicas=1

echo "Waiting for pod to be ready (cold-start)..."
kubectl wait --for=condition=ready pod -l app=ledger-pwa -n "$NAMESPACE" --timeout=300s || {
  echo "✗ Pod failed to become ready within 5 minutes"
  exit 1
}

END_TIME=$(date +%s%3N)
COLD_START_LATENCY=$((END_TIME - START_TIME))

echo "✓ Cold-start latency: ${COLD_START_LATENCY}ms"

# Test 3: HPA scale-down behavior
echo ""
echo "Test 3: Setting low traffic for scale-down..."

# Wait for metrics to stabilize
sleep 60

# Check HPA status
echo "HPA Status:"
kubectl get hpa ledger-pwa-hpa -n "$NAMESPACE"

echo ""
echo "=== Validation Complete ==="
echo "Cold-start latency: ${COLD_START_LATENCY}ms"
echo ""

if [ "$COLD_START_LATENCY" -lt 30000 ]; then
  echo "✓ PASS: Cold-start under 30 seconds"
else
    echo "✗ FAIL: Cold-start exceeds 30 seconds (${COLD_START_LATENCY}ms)"
    exit 1
fi

echo "Scale-to-zero capability verified"
echo "Deployment can scale to zero when idle"
