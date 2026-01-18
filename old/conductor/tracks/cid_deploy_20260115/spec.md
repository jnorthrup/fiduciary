# Track: Event-Driven CI/CD Infrastructure for Ledger PWA with WAL+LSM Persistence

## Overview

Implement an end-to-end event-driven Continuous Integration/Deployment (CI/CD) infrastructure using Google Cloud Platform services. The system will orchestrate builds, tests, and deployments for a mobile-first Progressive Web App (PWA) with Redux-based ledger state management, Write-Ahead Log (WAL) event sourcing, LSM tree compaction, and graph-based JSON persistence across a hybrid architecture of Cloud Functions and Google Kubernetes Engine (GKE) with cost-optimized minimal instances.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PWA Frontend                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Redux Store (Client)                                      │ │
│  │  - JSON Graph View (hot state)                            │ │
│  │  - IndexedDB Persistence                                   │ │
│  │  - Service Worker (offline)                                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ▲ Sync
                            │
┌─────────────────────────────────────────────────────────────────┐
│                    Ledger Event Pipeline                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WAL (Write-Ahead Log)                                     │ │
│  │  - Append-only event stream                                │ │
│  │  - Durable persistence (blob storage)                      │ │
│  │  - Replayable for consistency                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ▼ Flush                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  LSM Tree (Log-Structured Merge)                           │ │
│  │  - Compacted view of WAL events                           │ │
│  │  - Efficient range queries                                │ │
│  │  - Time-series optimized                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Storage Hierarchy                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Hot: Graph   │→ │ Warm: Columnar│→ │ Cold: Blob/LSM       │  │
│  │ (JSON, IMD)  │  │ (DuckDB/Click)│  │ (KV, Buckets, Journals)│ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Adjacent Services                            │
│  ┌──────────┬──────────┬──────────┬──────────────────────┐    │
│  │MapReduce │   AI     │  APIs    │  Agentic Tools       │    │
│  │ (batch)  │ (graph)  │ (serving)│  (autonomous agents) │    │
│  └──────────┴──────────┴──────────┴──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Functional Requirements

### 1. PWA Application with Redux State Management

- **Frontend (PWA)**: Mobile-first progressive web app with Redux state management
  - Build: Vite + PWA plugin
  - Test: Vitest with >80% coverage
  - Artifacts: service-worker.js, manifest.json, bundled assets

- **Redux Store (Client)**: Single source of truth for UI state
  - Actions dispatched for all state changes
  - Reducers compute new state immutably
  - Middleware for sync, persistence, logging
  - Time-travel debugging capability

- **Local-First Graph Persistence**: JSON graph with IndexedDB
  - In-memory graph database for queries
  - IndexedDB for local persistence
  - Graph serialization/deserialization (JSON graph serde)
  - Offline-first with sync on reconnect

### 2. WAL (Write-Ahead Log) Event Sourcing

- **WAL Structure**: Append-only log of ledger events
  - Event format: `{ id, timestamp, type, payload, signature }`
  - Ordered by timestamp with monotonically increasing sequence
  - Immutable: events never modified, only appended
  - Signed: cryptographic signature for integrity

- **WAL Persistence**: Blob storage with write optimization
  - Sequential writes for performance
  - Buffered flushes (size/time thresholds)
  - Checkpoint snapshots for recovery
  - Replay capability for state reconstruction

- **Flush Triggers**:
  - WAL segment size threshold (e.g., 64MB)
  - Time-based flush interval (e.g., 5 minutes)
  - Event stream completion
  - Manual flush command
  - System shutdown signal

### 3. LSM Tree Compaction

- **LSM Structure**: Log-structured merge tree for efficient queries
  - MemTable: in-memory buffer of recent events
  - SSTables: immutable sorted string tables on disk
  - Bloom filters: fast key existence checks
  - Compaction: background merge of SSTables

- **Flush from WAL**: WAL segments flushed to LSM
  - Sorted by timestamp for range queries
  - Columnar storage for analytics (optional)
  - Time-series partitioning (e.g., daily)
  - Tombstone handling for deletions

- **Query Optimization**: Efficient read paths
  - Key lookups via bloom filter + SSTable
  - Range scans via sorted SSTables
  - Level compaction strategy
  - Read amplification control

### 4. Redux Store (Server) with Sync

- **Redux Store (Server)**: Mirror of client state
  - Same actions/reducers as client
  - Server-side middleware for validation
  - Event sourcing from WAL for replay
  - State snapshots for recovery

- **Bidirectional Sync**: Client ↔ Server consistency
  - Client actions sent to server via Pub/Sub
  - Server actions broadcast to clients
  - Conflict resolution: last-write-wins with vector clocks
  - Acknowledgment mechanism for reliability

- **Consistency Guarantees**:
  - WAL ensures no events lost
  - Redux replay ensures deterministic state
  - Sync acknowledgments prevent duplication
  - Checkpoint recovery after crash

### 5. Storage Hierarchy

| Tier | Storage | Use Case | Technology |
|------|---------|----------|------------|
| **Hot** | JSON Graph | Interactive queries, real-time sync | In-memory + IndexedDB |
| **Warm** | Columnar | Analytical queries, aggregations | DuckDB (client) / ClickHouse (server) |
| **Cold** | Blob/LSM | Archival, compliance, replay | Cloud Storage + LSM journals |

- **Hot Tier**: JSON graph for active workset
  - Sub-second query latency
  - Frequent updates
  - Client-side processing

- **Warm Tier**: Columnar for analytics
  - Lazy loading of large datasets
  - Aggregation queries
  - Time-series analysis

- **Cold Tier**: Blob/LSM for archival
  - Cost-effective long-term storage
  - Regulatory compliance
  - Event replay for recovery

### 6. Adjacent Services

- **MapReduce**: Batch processing on flushed LSM data
  - Aggregations over time windows
  - Batch analytics
  - Report generation

- **AI**: Graph AI and machine learning
  - Natural language queries over graph
  - Pattern recognition and anomaly detection
  - Relationship inference and recommendations

- **APIs**: Serving layer for external access
  - REST/GraphQL endpoints
  - Rate limiting and authentication
  - API versioning

- **Agentic Tools**: Autonomous agents
  - Event-driven agents that react to ledger changes
  - Automated workflows
  - Decision support

### 7. Event-Driven CI/CD Pipeline

- **Pipeline Triggers**:
  - Code push to Git repository
  - Pub/Sub messages for event routing
  - Webhook support for external triggers
  - Manual trigger capability

- **Build and Test**:
  - Cloud Build executes: npm install, build, test
  - PWA validation: service worker, manifest, Lighthouse
  - Redux store tests: action dispatches, state updates
  - WAL/LSM tests: event replay, compaction
  - Graph serde tests: serialization/deserialization
  - Sync tests: bidirectional consistency
  - Test coverage reporting (>80% target)

- **Deployment**:
  - Docker images to Artifact Registry
  - GKE deployment with scale-to-zero
  - Cloud Functions for orchestration
  - Rollback on failure

### 8. Hybrid Deployment Architecture

- **Cloud Functions**:
  - Build orchestration triggers
  - Test execution coordination
  - Pre-deployment validations
  - Sync event processing
  - Rollback triggers
  - WAL flush triggers

- **GKE (Cost-Optimized)**:
  - PWA static assets (nginx/Caddy)
  - Redux API server (if needed)
  - LSM query service (if needed)
  - Horizontal Pod Autoscaling with scale-to-zero
  - Regional Load Balancer (not Premium tier)

### 9. Event Bus Integration

- **Pub/Sub Topics**:
  - `build.triggered`, `build.completed`, `test.passed`
  - `sync.requested`, `sync.completed`
  - `wal.flushed`, `lsm.compacted`
  - `deployment.started`, `deployment.completed`, `deployment.failed`

- **Event Routing**:
  - Cloud Functions subscribe via push subscriptions
  - GKE workloads subscribe via pull subscriptions
  - Dead-letter queue for failed events
  - Event ordering guarantees

### 10. Deployment Visibility and Rollback

- **Monitoring**:
  - Cloud Logging for build/deployment logs
  - Cloud Monitoring dashboards
  - PWA-specific metrics (service worker uptime, sync latency)
  - WAL/LSM metrics (flush frequency, compaction lag)

- **Rollback**:
  - Automatic rollback on deployment failure
  - Manual rollback to previous version
  - WAL-based state recovery
  - Audit trail of all deployments

## Non-Functional Requirements

### Infrastructure as Code

- All infrastructure provisioned via Terraform
- Version-controlled infrastructure definitions
- Environment separation: dev, staging, production
- Reproducible deployments

### Cost Optimization

- GKE autopilot with scale-to-zero
- Regional external Load Balancer (standard tier)
- Cloud Functions only for event triggers
- Spot/preemptible instances where possible
- Cloud Storage lifecycle policies
- Minimal instance configuration (0-N autoscaling)

### Security

- Service account with least-privilege access
- Secrets management via Secret Manager
- No hardcoded credentials in source control
- Signed and verified container images
- PWA served over HTTPS with security headers
- WAL event signatures for integrity
- Encryption at rest and in transit

### Performance

- PWA load time < 3 seconds
- WAL append latency < 10ms
- LSM flush completes within 30 seconds
- Sync latency < 2 seconds
- Build completion within 5 minutes
- Deployment completion within 3 minutes
- Graph query latency < 100ms (hot tier)

### Reliability

- 99.9% uptime for CI/CD pipeline
- Automatic retry for transient failures
- Graceful degradation during outages
- WAL replay for crash recovery
- LSM compaction does not block reads
- Redux state consistency guarantees

### Consistency Guarantees

- Redux stores (client + server) eventually consistent
- WAL provides single source of truth for events
- LSM provides consistent query view
- Sync acknowledgments prevent lost events
- Conflict resolution via vector clocks

## Acceptance Criteria

1. Code push triggers automated build pipeline
2. All tests pass (>80% coverage) before deployment
3. PWA is valid, installable, and offline-capable
4. Redux store correctly processes actions
5. WAL append-only log persists events
6. WAL flushes to LSM based on triggers
7. LSM provides efficient queries
8. Bidirectional sync maintains consistency
9. GKE scales to zero when idle, scales up on demand
10. Failed deployments trigger automatic rollback
11. WAL replay recovers state after crash
12. Infrastructure reproducible from Terraform
13. Adjacent services (MapReduce, AI, APIs) can access flushed LSM data

## Out of Scope

- Multi-region deployment (single region initially)
- Advanced observability (basic logging and metrics only)
- Native mobile apps (iOS/Android) - PWA only
- Complex conflict resolution (basic LWW for now)
- HFT trading optimizations (ledger, not microseconds)
- Multi-tenant SaaS (single tenant initially)
- Advanced compaction strategies (basic level compaction)
