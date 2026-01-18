# Thin Demo Event-Driven Architecture

This overlay provides a lightweight, "thin" deployment of the Trust Ledger System focused on demonstrating the event-driven capabilities without the resource overhead of the full production suite.

## Purpose

To showcase the asynchronous communication patterns between services (specifically `ledger-service` and `audit-service`) using RabbitMQ, hosted in a Kubernetes environment.

## Included Components

### Infrastructure
- **RabbitMQ**: The core event bus for asynchronous messaging.
- **Redis**: For caching and session management.
- **PostgreSQL**: Stateful persistence (deployed as minimal StatefulSets).
- **Observability Stack**:
    - **Grafana**: Visualization dashboard (Metrics + Logs).
    - **Prometheus**: Metrics collection.
    - **Loki**: Log aggregation store.
    - **Promtail**: Log shipper (DaemonSet).

### Services
1.  **API Gateway**: The entry point for all HTTP requests.
2.  **Ledger Service**: The core domain service that produces `journal.entry_created` events.
3.  **Audit Service**: The consumer service that subscribes to events and records them.

## Changes from Base
- **Replicas**: All services are scaled down to 1 replica (vs 2+ in production).
- **Excluded Services**: `irs-service`, `bso-service`, `banking-service` are omitted to save resources.
- **Resource Usage**: Minimized for demo environments.

## Deployment

To deploy this thin demo overlay:

```bash
# Preview the manifests
kubectl kustomize k8s/overlays/thin-demo

# Apply to cluster
kubectl apply -k k8s/overlays/thin-demo
```

## Verification

1.  **Check Pods**: Ensure all pods are running.
    ```bash
    kubectl get pods -n fiduciary-system
    ```
2.  **Check RabbitMQ**: Access the management interface (port-forward 15672) to see exchanges and queues.
3.  **Trigger Event**:
    -   Send a request to `api-gateway` to create a journal entry.
    -   Verify `ledger-service` processes it.
    -   Verify `audit-service` picks up the event from RabbitMQ.
