# Track: CI/CD Infrastructure (RETIRED)

**Status: HIBERNATED** - 2026-01-21

This track has been replaced by the simplified serverless architecture.

## Retired Components

| Component | Replacement |
|-----------|-------------|
| GKE Autopilot | Cloud Run |
| Kubernetes manifests | N/A (source deploy) |
| Helm charts | N/A |
| Docker builds | Buildpacks (automatic) |
| FoundationDB | GCS JSON persistence |
| Pub/Sub event bus | Direct API calls |
| Cloud Functions orchestration | Cloud Run handles all |

## Active Replacement

See: `docs/architecture-serverless.md`

Deploy with:
```bash
./deploy-production.sh
```

## Historical Reference

The original spec envisioned:
- Event-driven CI/CD with Pub/Sub
- WAL + LSM tree compaction
- GKE with scale-to-zero
- FoundationDB for persistence
- Yjs CRDTs for sync

**Simplified to:**
- Manual deployment script
- GCS JSON for state
- GCS append-only for WAL
- Cloud Run serverless
- Firebase Auth for user isolation
