# Kubernetes Microservices Architecture

## Service Boundaries

Based on domain-driven design analysis of the Trust Ledger System, the following microservices have been identified:

### Core Services

1. **api-gateway** - Entry point, routing, authentication proxy
2. **irs-service** - IRS IRIS A2A integration, 1099 filings
3. **bso-service** - SSA BSO W-2 integration
4. **ledger-service** - Double-entry accounting, journal entries
5. **banking-service** - Multi-bank connectivity (Plaid, Teller, OBP)
6. **auth-service** - Firebase Auth integration, session management
7. **audit-service** - Audit logging, compliance tracking
8. **teach-mode-service** - AI-assisted education features
9. **admin-service** - Administrative workflows, process management

### Supporting Infrastructure

- **PostgreSQL** - Primary database (per-service where appropriate)
- **Redis** - Caching, session storage, pub/sub
- **RabbitMQ** - Event bus for async communication
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Loki** - Log aggregation
- **Tempo** - Distributed tracing

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Ingress / LoadBalancer                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│  - TLS termination                                               │
│  - Request routing                                               │
│  - Rate limiting                                                 │
│  - JWT validation                                                │
└────────┬────────────────────────────────────────────────────────┘
         │
         ├──────────────────────────────────────────────────────┐
         │                                                      │
         ▼                                                      ▼
┌─────────────────┐                                    ┌─────────────────┐
│  IRS Service    │                                    │  BSO Service    │
│  - IRIS A2A     │                                    │  - SSA W-2      │
│  - 1099 filings │                                    │  - Payroll      │
│  Port: 3001     │                                    │  Port: 3002     │
└─────────────────┘                                    └─────────────────┘
         │                                                      │
         ▼                                                      ▼
┌─────────────────┐                                    ┌─────────────────┐
│ Ledger Service  │                                    │ Banking Service │
│  - Accounts     │                                    │  - Plaid        │
│  - Journals     │                                    │  - Teller       │
│  - Double-entry │                                    │  - OBP          │
│  Port: 3003     │                                    │  Port: 3004     │
└─────────────────┘                                    └─────────────────┘
         │                                                      │
         ▼                                                      ▼
┌─────────────────┐                                    ┌─────────────────┐
│  Auth Service   │                                    │  Audit Service  │
│  - Firebase     │                                    │  - Logging      │
│  - Sessions     │                                    │  - Compliance   │
│  Port: 3005     │                                    │  Port: 3006     │
└─────────────────┘                                    └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Teach Mode Svc  │
│  - AI education │
│  - GenAI        │
│  Port: 3007     │
└─────────────────┘
```

## Communication Patterns

### Synchronous (REST/HTTP)
- Frontend → API Gateway → Services
- Inter-service API calls (when needed)

### Asynchronous (Event-Driven)
- Service → RabbitMQ → Service (for decoupled operations)
- Audit events (all services → Audit Service via events)

## Data Strategy

### Database per Service
- **IRS Service**: PostgreSQL (submissions, receipts)
- **BSO Service**: PostgreSQL (W-2 forms, payroll)
- **Ledger Service**: PostgreSQL (accounts, journals)
- **Banking Service**: PostgreSQL (bank connections, transactions)
- **Auth Service**: Firebase (primary) + Redis (sessions)
- **Audit Service**: PostgreSQL (audit logs)

### Shared Data (via API)
- Services do NOT share databases
- Data shared via well-defined APIs
- Event-driven updates for eventual consistency

## Deployment Strategy

1. **Development**: Local Kubernetes (Minikube/Kind)
2. **Staging**: Cloud Kubernetes (EKS/GKE/AKS)
3. **Production**: Cloud Kubernetes with multi-AZ

## Getting Started

See individual service directories for deployment instructions.
