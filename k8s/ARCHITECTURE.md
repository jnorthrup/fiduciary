# Trust Ledger System - Microservices Architecture

## Executive Summary

The Trust Ledger System has been architected as a set of microservices deployed on Kubernetes. This architecture provides:
- **Independent deployability** - Each service can be deployed, scaled, and updated independently
- **Fault isolation** - Failures are contained within service boundaries
- **Technology diversity** - Services can use different technologies as needed
- **Team autonomy** - Teams can own and operate their services independently

## Service Boundaries

### Core Business Services

| Service | Purpose | Port | Database |
|---------|---------|------|----------|
| **api-gateway** | Request routing, auth, rate limiting | 8080 | None |
| **irs-service** | IRS IRIS A2A integration, 1099 filings | 3001 | PostgreSQL |
| **bso-service** | SSA BSO W-2 integration | 3002 | PostgreSQL |
| **ledger-service** | Double-entry accounting, journal entries | 3003 | PostgreSQL |
| **banking-service** | Multi-bank connectivity | 3004 | PostgreSQL |
| **auth-service** | Authentication, session management | 3005 | Firebase |
| **audit-service** | Audit logging, compliance | 3006 | PostgreSQL |
| **teach-mode-service** | AI-assisted education | 3007 | None |

### Infrastructure Services

| Component | Purpose |
|-----------|---------|
| **Redis** | Caching, session storage, pub/sub |
| **RabbitMQ** | Event bus for async communication |
| **PostgreSQL** | Primary data store (per service) |
| **Prometheus** | Metrics collection |
| **Grafana** | Metrics visualization |
| **Firebase** | Authentication (external) |

## Communication Patterns

### Synchronous Communication

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Frontend │ ───> │ Gateway  │ ───> │ Services │
└──────────┘      └──────────┘      └──────────┘
```

- **Frontend → Gateway**: HTTP/HTTPS
- **Gateway → Services**: HTTP/REST with JWT authentication
- **Service → Service**: HTTP/REST (minimized; prefer async)

### Asynchronous Communication

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Service  │ ───> │ RabbitMQ │ ───> │ Service  │
└──────────┘      └──────────┘      └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  Audit   │
                 └──────────┘
```

**Event Types:**
- `submission.created` - New IRS submission
- `submission.status_updated` - Submission status change
- `journal.entry_created` - New journal entry
- `payment.initiated` - Payment initiated
- `compliance.event` - All audit events

## Data Architecture

### Database per Service

Each service owns its database:
- **No shared databases** - Services access data via well-defined APIs
- **Independent scaling** - Each database can scale independently
- **Technology choice** - Each service can choose appropriate database

### Data Synchronization

**Eventual Consistency:**
```
Service A ──publish──> RabbitMQ ──subscribe──> Service B
                                │
                                └──subscribe──> Audit Service
```

**Saga Pattern** for distributed transactions:
1. **Orchestration** - Ledger service orchestrates accounting operations
2. **Choreography** - Services react to events independently

## Deployment Architecture

### Kubernetes Namespaces

```
fiduciary-system/
├── Services (all deployed here)
├── Infrastructure (Redis, RabbitMQ, PostgreSQL)
└── Observability (Prometheus, Grafana)
```

### Resource Management

**Resource Quotas:**
```yaml
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "10"
```

**Limit Ranges:**
```yaml
spec:
  limits:
  - default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
```

## High Availability

### Pod Distribution

**Anti-Affinity Rules:**
- Pods spread across nodes
- No two same-service pods on same node (preferred)

**Pod Disruption Budgets:**
- Minimum 1 pod available during updates
- Ensures service continuity

### Scaling Strategies

**Horizontal Pod Autoscaler:**
- CPU: Scale at 70% utilization
- Memory: Scale at 80% utilization
- Min: 2 replicas, Max: 10 replicas

**Cluster Autoscaler:**
- Add nodes when resource requests exceed capacity
- Remove underutilized nodes

## Observability

### Metrics (Prometheus)

**Service Metrics:**
- Request rate, error rate, latency (RED)
- Resource usage (CPU, memory)
- Business metrics (submissions, payments)

**Infrastructure Metrics:**
- Database connections, query performance
- Cache hit rates
- Queue depth, processing rate

### Logging

**Structured Logging:**
```json
{
  "timestamp": "2026-01-15T10:30:00Z",
  "level": "info",
  "service": "irs-service",
  "trace_id": "abc123",
  "message": "Submission received",
  "submission_id": "sub-456"
}
```

**Log Aggregation:**
- Centralized logging (Loki/ELK)
- Correlation by trace_id
- Retention: 30 days

### Tracing (Distributed)

**OpenTelemetry Integration:**
- Automatic trace propagation
- Service dependency mapping
- Performance bottleneck identification

## Security

### Authentication & Authorization

**API Gateway:**
- JWT validation
- OAuth 2.0 integration
- Rate limiting per user

**Service-to-Service:**
- mTLS (optional, for sensitive operations)
- Service accounts with RBAC
- Network policies for traffic control

### Secrets Management

**Best Practices:**
1. Never commit secrets to git
2. Use external secret management (AWS Secrets Manager, Azure Key Vault)
3. Rotate secrets regularly
4. Use separate secrets per environment

### Network Security

**Network Policies:**
- Default deny all ingress/egress
- Explicitly allow required traffic
- Database access restricted to specific services

**Ingress:**
- TLS only
- Cert-manager for automatic certificate management
- WAF rules (optional)

## Disaster Recovery

### Backup Strategy

**Database Backups:**
- Continuous archiving (WAL)
- Daily full backups
- 30-day retention
- Cross-region replication

**Configuration Backups:**
- GitOps for all manifests
- Automated backup of secrets
- State restoration procedures

### Failover

**Service Failover:**
- Multiple replicas across availability zones
- Automatic pod rescheduling
- Health-based routing

**Database Failover:**
- PostgreSQL streaming replication (future)
- Automatic failover (Patroni)
- Read replicas for scaling

## Performance Optimization

### Caching Strategy

**Multi-level Caching:**
1. **Application Cache** - In-memory (frequently accessed data)
2. **Redis Cache** - Distributed cache (shared data)
3. **CDN Cache** - Static assets

### Database Optimization

**Connection Pooling:**
```javascript
{
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000
}
```

**Query Optimization:**
- Indexes on frequently queried columns
- Query timeouts (30s default)
- Slow query logging

## Migration Strategy

### Monolith to Microservices

**Phase 1: Extract** (Current)
- Identify service boundaries
- Create new services alongside monolith
- Feature flags for gradual migration

**Phase 2: Migrate Data**
- Export data from monolith
- Import to service databases
- Verify data integrity

**Phase 3: Redirect Traffic**
- Update API Gateway routes
- Monitor for issues
- Rollback capability

**Phase 4: Decommission**
- Remove monolith code
- Clean up unused resources

## Future Enhancements

### Planned Improvements

1. **Service Mesh** (Istio/Linkerd)
   - Advanced traffic management
   - Automatic mTLS
   - Enhanced observability

2. **Event Sourcing**
   - Event store for audit trail
   - Temporal queries
   - Event replay

3. **CQRS**
   - Separate read/write models
   - Optimized queries
   - Scalable reads

4. **GraphQL Gateway**
   - Schema federation
   - Single endpoint
   - Type safety

## Monitoring Alerts

### Critical Alerts

- **Service Down** - Any service unreachable
- **High Error Rate** - > 5% error rate
- **High Latency** - P95 > 1s
- **Database Connections** - > 80% of pool

### Warning Alerts

- **High CPU** - > 80% for 5 minutes
- **High Memory** - > 80% for 5 minutes
- **Disk Space** - > 80% used
- **Queue Depth** - RabbitMQ queue > 1000

## Documentation References

- **[Deployment Guide](./DEPLOYMENT.md)** - Step-by-step deployment procedures
- **[K8s README](./README.md)** - Kubernetes architecture overview
- **[Service Documentation](../../services/)** - Individual service documentation
- **[API Documentation](../../specs/unified-api-openapi.yaml)** - OpenAPI specification
