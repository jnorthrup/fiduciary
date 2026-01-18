# Kubernetes Microservices Deployment Guide

## Overview

This document provides comprehensive deployment procedures for the Trust Ledger System microservices architecture on Kubernetes.

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Helm 3.x installed
- Ingress controller (NGINX recommended)
- cert-manager (for TLS)
- Container registry access

## Quick Start

### 1. Create Namespace

```bash
kubectl create namespace fiduciary-system
```

### 2. Install Using Kustomize

```bash
# Install all resources
kubectl apply -k k8s/base

# Verify deployment
kubectl get pods -n fiduciary-system
kubectl get services -n fiduciary-system
```

### 3. Install Using Helm

```bash
# Add dependencies (if using external charts)
helm dependency update helm/trust-ledger-system

# Install release
helm install trust-ledger helm/trust-ledger-system \
  --namespace fiduciary-system \
  --create-namespace \
  --values helm/trust-ledger-system/values.yaml

# Upgrade release
helm upgrade trust-ledger helm/trust-ledger-system \
  --namespace fiduciary-system \
  --values helm/trust-ledger-system/values.yaml
```

### 4. Configure Ingress

Update the ingress hostnames in `k8s/ingress.yaml`:
```yaml
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    - grafana.yourdomain.com
  rules:
  - host: api.yourdomain.com
  - host: grafana.yourdomain.com
```

Apply ingress:
```bash
kubectl apply -f k8s/ingress.yaml
```

## Configuration

### Secrets Management

For production, use external secret management (External Secrets Operator, AWS Secrets Manager, etc.):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: fiduciary-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
  - secretKey: JWT_SECRET
    remoteRef:
      key: fiduciary/jwt-secret
```

### Environment-Specific Values

Create environment-specific value files:

```bash
helm/trust-ledger-system/values-dev.yaml
helm/trust-ledger-system/values-staging.yaml
helm/trust-ledger-system/values-production.yaml
```

Deploy with specific environment:
```bash
helm install trust-ledger helm/trust-ledger-system \
  --namespace fiduciary-system \
  --values helm/trust-ledger-system/values-production.yaml
```

## Service Deployment

### Individual Service Deployment

Deploy specific services independently:

```bash
# Deploy IRS Service only
kubectl apply -f k8s/services/irs-service/

# Deploy Ledger Service only
kubectl apply -f k8s/services/ledger-service/
```

### Rolling Updates

```bash
# Update image
kubectl set image deployment/irs-service irs-service=fiduciary/irs-service:v1.2.3 -n fiduciary-system

# Rollback if needed
kubectl rollout undo deployment/irs-service -n fiduciary-system

# Check status
kubectl rollout status deployment/irs-service -n fiduciary-system
```

## Scaling

### Manual Scaling

```bash
# Scale IRS Service to 5 replicas
kubectl scale deployment/irs-service --replicas=5 -n fiduciary-system
```

### Horizontal Pod Autoscaler

HPA is configured for critical services. Verify status:

```bash
kubectl get hpa -n fiduciary-system
kubectl describe hpa irs-service-hpa -n fiduciary-system
```

## Monitoring

### Access Grafana

```bash
# Port-forward to access Grafana locally
kubectl port-forward -n fiduciary-system svc/grafana 3000:3000

# Open browser to http://localhost:3000
# Default credentials: admin / change-me-in-production
```

### Access Prometheus

```bash
# Port-forward to access Prometheus locally
kubectl port-forward -n fiduciary-system svc/prometheus 9090:9090

# Open browser to http://localhost:9090
```

### View Logs

```bash
# All pods
kubectl logs -n fiduciary-system -l app=irs-service --all-containers=true

# Specific pod
kubectl logs -n fiduciary-system deployment/irs-service -f

# Multiple pods
kubectl logs -n fiduciary-system -l tier=backend --tail=100
```

## Troubleshooting

### Pod Not Starting

```bash
# Describe pod for events
kubectl describe pod -n fiduciary-system <pod-name>

# Check logs
kubectl logs -n fiduciary-system <pod-name> --previous
```

### Service Not Reachable

```bash
# Check service endpoints
kubectl get endpoints -n fiduciary-system

# Test service connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- http://irs-service:3001/health
```

### Database Connection Issues

```bash
# Check database statefulsets
kubectl get statefulsets -n fiduciary-system

# Verify database is ready
kubectl exec -it -n fiduciary-system irs-db-postgresql-0 -- pg_isready -U irs_service
```

## Disaster Recovery

### Backup Procedures

```bash
# Backup all resources
kubectl get all -n fiduciary-system -o yaml > backup.yaml

# Backup specific service
kubectl get deployment,service,hpa -n fiduciary-system -l app=irs-service -o yaml > irs-backup.yaml
```

### Database Backups

```bash
# Backup IRS database
kubectl exec -n fiduciary-system irs-db-postgresql-0 -- pg_dump -U irs_service irs_service > irs-db-backup.sql

# Restore IRS database
cat irs-db-backup.sql | kubectl exec -i -n fiduciary-system irs-db-postgresql-0 -- psql -U irs_service irs_service
```

## Performance Tuning

### Resource Limits

Adjust resource limits in deployments based on actual usage:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

### Database Optimization

PostgreSQL tuning in StatefulSets:

```yaml
env:
- name: POSTGRES_SHARED_BUFFERS
  value: "256MB"
- name: POSTGRES_EFFECTIVE_CACHE_SIZE
  value: "1GB"
- name: POSTGRES_MAX_WORKERS
  value: "4"
```

## Security Hardening

### Network Policies

Network policies are enabled by default. Verify:

```bash
kubectl get networkpolicies -n fiduciary-system
```

### Pod Security

Enforce pod security standards:

```bash
kubectl label ns fiduciary-system pod-security.kubernetes.io/enforce=restricted
```

### Secrets Rotation

Implement secret rotation:

```bash
# Update secret
kubectl create secret generic app-secrets \
  --from-literal=JWT_SECRET=new-secret \
  --dry-run=client -o yaml | kubectl apply -n fiduciary-system -f -

# Restart pods to pick up new secret
kubectl rollout restart deployment -n fiduciary-system
```

## Local Development

### Docker Compose

For local development:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Minikube/Kind

For local Kubernetes testing:

```bash
# Start Minikube
minikube start --cpus=4 --memory=8192

# Enable ingress
minikube addons enable ingress

# Deploy
kubectl apply -k k8s/base

# Access services
minikube tunnel
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          method: kubeconfig
          kubeconfig: ${{ secrets.KUBE_CONFIG }}
      - name: Deploy with Helm
        run: |
          helm upgrade trust-ledger ./helm/trust-ledger-system \
            --install \
            --namespace fiduciary-system \
            --values helm/trust-ledger-system/values-production.yaml
```

## Maintenance

### Regular Maintenance Tasks

1. **Daily**: Monitor Grafana dashboards, review logs
2. **Weekly**: Check resource usage, review HPA behavior
3. **Monthly**: Update container images, review security policies
4. **Quarterly**: Database maintenance, capacity planning

### Upgrading

```bash
# Upgrade specific service
kubectl set image deployment/irs-service irs-service=fiduciary/irs-service:v2.0.0 -n fiduciary-system

# Monitor rollout
kubectl rollout status deployment/irs-service -n fiduciary-system

# Verify health
kubectl get pods -n fiduciary-system -l app=irs-service
```

## Support

For issues or questions:
- Review logs: `kubectl logs -n fiduciary-system`
- Check events: `kubectl get events -n fiduciary-system --sort-by='.lastTimestamp'`
- Verify health: `kubectl get pods -n fiduciary-system`
