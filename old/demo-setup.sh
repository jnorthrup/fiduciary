#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Starting Thin Demo Setup...${NC}"

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "Docker is required but not installed."
    exit 1
fi

if ! command -v kind &> /dev/null; then
    echo "Kind is required but not installed."
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo "Kubectl is required but not installed."
    exit 1
fi

# Create Kind cluster if not exists
if ! kind get clusters | grep -q "trust-ledger-demo"; then
    echo -e "${GREEN}Creating Kind cluster 'trust-ledger-demo'...${NC}"
    kind create cluster --name trust-ledger-demo
else
    echo "Cluster 'trust-ledger-demo' already exists."
fi

# Build shared image
echo -e "${GREEN}Building shared server image...${NC}"
docker build -t fiduciary/trust-ledger-server:latest ./server

# Load image into Kind
echo -e "${GREEN}Loading image into Kind...${NC}"
kind load docker-image fiduciary/trust-ledger-server:latest --name trust-ledger-demo

# Apply Manifests
echo -e "${GREEN}Applying Kubernetes manifests...${NC}"
kubectl apply -k k8s/overlays/thin-demo

# Wait for rollout
echo -e "${GREEN}Waiting for deployments to roll out...${NC}"
kubectl rollout status deployment/rabbitmq -n fiduciary-system --timeout=120s
kubectl rollout status deployment/ledger-service -n fiduciary-system --timeout=120s
kubectl rollout status deployment/audit-service -n fiduciary-system --timeout=120s
kubectl rollout status deployment/prometheus -n fiduciary-system --timeout=120s
kubectl rollout status deployment/grafana -n fiduciary-system --timeout=120s
kubectl rollout status deployment/loki -n fiduciary-system --timeout=120s

echo -e "${GREEN}Setup Complete!${NC}"
echo "You can access the services via port-forwarding:"
echo "API Gateway: kubectl port-forward svc/api-gateway -n fiduciary-system 8080:8080"
echo "Grafana (Logs): kubectl port-forward svc/grafana -n fiduciary-system 3000:3000 (User: admin / Pass: change-me-in-production)"
