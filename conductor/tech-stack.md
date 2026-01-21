# Technology Stack (Serverless Cloud Run)

**Updated: 2026-01-21** - Repurposed for 100% serverless architecture

## Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | React | 19.2.3 | UI framework |
| Language | TypeScript | 5.8.2 | Type-safe development |
| Build Tool | Vite | 6.2.0 | Fast dev server & bundler |
| State Management | Redux | - | Client-side state |
| Styling | Tailwind CSS | CDN | Utility-first CSS |
| Icons | Lucide React | 0.561.0 | Icon library |
| Data Viz | D3.js | 7.8.5 | Charts, graphs |
| Diagrams | Mermaid | 10.6.1 | Flowcharts, diagrams |
| Documents | Mammoth | 1.6.0 | Word (.docx) parsing |
| Spreadsheets | XLSX | 0.18.5 | Excel processing |
| Auth | Firebase Auth SDK | 12.7.0 | Google OAuth login |
| AI | Google GenAI | 1.34.0 | Gemini API integration |

## Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 20 | Server runtime |
| Framework | Express 4.18 | API server |
| Hosting | **Cloud Run** | Serverless container (scale to zero) |
| Auth | Firebase Admin SDK | Token verification |
| Persistence | **GCS JSON** | Per-user state storage |
| WAL | **GCS Append** | Write-ahead log |
| API Gateway | **Cloud Endpoints** | OpenAPI routing |

## Storage Architecture (Per-User ACL)

| Tier | Storage | Path Pattern |
|------|---------|--------------|
| State | GCS JSON | `users/{uid}/state.json` |
| WAL | GCS Append | `users/{uid}/wal/{timestamp}.json` |
| Documents | GCS Objects | `users/{uid}/docs/{docId}` |

## APIs & Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| IRS IRIS A2A | 1099, W-2 information return filing | Active |
| NACHA | ACH file generation | Active |
| Plaid | Bank account validation | Mock (prod credentials pending) |
| Gemini | AI document analysis | Active |
| ~~IRS MeF~~ | ~~Modernized e-File~~ | Retired |
| ~~BSO~~ | ~~Business Services Online~~ | Retired |
| ~~SEC EDGAR~~ | ~~Corporate filings research~~ | Retired |
| ~~MSRB EMMA~~ | ~~Municipal securities data~~ | Retired |
| ~~FedLine~~ | ~~Federal Reserve wire~~ | Retired |

## Deployment (Single Target)

| Environment | Type | URL |
|-------------|------|-----|
| Local Dev | Vite | http://localhost:3000 |
| Local API | Express | http://localhost:3001 |
| **Production** | **Cloud Run** | https://trust-ledger-fullstack-388611398406.us-central1.run.app |

## Retired Technologies

| Technology | Reason |
|------------|--------|
| Kubernetes/GKE | Complexity - Cloud Run is simpler |
| Docker (manual) | Cloud Run uses buildpacks |
| Helm | No K8s |
| FoundationDB | GCS JSON is sufficient |
| RocksDB | GCS JSON is sufficient |
| Yjs/CRDTs | Single-user, no real-time collab needed |
| Firebase Hosting | Cloud Run serves static + API |
| GCS Static Hosting | Cloud Run serves static + API |

## Environment Variables (Production)

See `.env.production` for full configuration with sections:
- `GOOGLE_AUTH`: Firebase/Gmail OAuth
- `GCP_CORE`: Project settings
- `GCS_STORAGE`: Bucket configuration
- `GEMINI_AI`: AI features
- `IRS_IRIS`: Tax filing credentials
- `KEYSTORE`: JWT signing
- `NETWORK`: URL and CORS

## Deploy Command

```bash
./deploy-production.sh
```
