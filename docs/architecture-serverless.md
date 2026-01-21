# Serverless Architecture - Trust Ledger System

## Deployment Overview

This system is **100% serverless** with scale-to-zero capability. All user data is isolated via Google Identity with per-user GCS paths.

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Browser Client"]
        React["React App<br/>(Redux Store)"]
        Firebase["Firebase Auth SDK"]
    end

    subgraph Google["Google Identity Platform"]
        OAuth["Google OAuth 2.0"]
        IAM["Cloud IAM"]
    end

    subgraph Serverless["100% Serverless - Scale to Zero"]
        subgraph Gateway["API Gateway"]
            APIGW["API Gateway<br/>(OpenAPI Spec)"]
        end
        
        subgraph Compute["Cloud Run"]
            CR["trust-ledger-fullstack<br/>(Express API)"]
        end
    end

    subgraph Storage["Per-User Storage (ACL-Protected)"]
        subgraph GCS["Cloud Storage"]
            Redux["Redux State<br/>gs://project/users/{uid}/state.json"]
            WAL["Write-Ahead Log<br/>gs://project/users/{uid}/wal/"]
            Docs["Documents<br/>gs://project/users/{uid}/docs/"]
        end
    end

    %% Auth Flow
    React -->|"1. Login"| Firebase
    Firebase -->|"2. Google Sign-In"| OAuth
    OAuth -->|"3. ID Token"| Firebase
    Firebase -->|"4. ID Token"| React

    %% API Flow
    React -->|"5. API Request<br/>+ Bearer Token"| APIGW
    APIGW -->|"6. Validate Token"| IAM
    IAM -->|"7. User Identity"| APIGW
    APIGW -->|"8. Route Request"| CR

    %% Storage Flow
    CR -->|"9. Load/Save State<br/>(user-scoped path)"| Redux
    CR -->|"10. Append Events"| WAL
    CR -->|"11. Store Files"| Docs

    %% Direct Storage (Optional)
    React -.->|"Signed URL Upload<br/>(optional)"| Docs

    style Client fill:#e1f5fe
    style Serverless fill:#e8f5e9
    style Storage fill:#fff3e0
    style Google fill:#fce4ec
```

## Component Details

| Component | GCP Service | Scale to Zero | Per-User ACL |
|-----------|-------------|---------------|--------------|
| **Frontend** | Cloud Run (static) | ✅ | N/A |
| **API** | Cloud Run | ✅ | Firebase Token |
| **Gateway** | API Gateway | ✅ | Token validation |
| **Auth** | Firebase Auth | ✅ | Google Identity |
| **State** | GCS | ✅ | `users/{uid}/` |
| **WAL** | GCS | ✅ | `users/{uid}/wal/` |

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as React App
    participant F as Firebase SDK
    participant G as Google OAuth
    participant A as API Gateway
    participant C as Cloud Run
    participant S as GCS

    U->>R: Click "Sign in with Google"
    R->>F: signInWithPopup()
    F->>G: OAuth 2.0 redirect
    G->>U: Consent screen
    U->>G: Approve
    G->>F: Auth code
    F->>R: ID Token + User info
    R->>R: Store token in Redux
    
    Note over R,C: Subsequent API Calls
    R->>A: GET /api/ledger (Bearer token)
    A->>A: Validate JWT signature
    A->>C: Forward with user identity
    C->>S: Load gs://bucket/users/{uid}/state.json
    S->>C: User's Redux state
    C->>A: Response
    A->>R: JSON data
    R->>R: Update Redux store
```

## Storage ACL Pattern

Each user's data is isolated by their Firebase UID:

```
gs://gen-lang-client-0754063985-trust-data/
├── users/
│   ├── {uid-1}/
│   │   ├── state.json          # Redux state
│   │   ├── wal/
│   │   │   ├── 2026-01-21T10:00:00.json
│   │   │   └── 2026-01-21T10:05:00.json
│   │   └── docs/
│   │       ├── affidavit-001.pdf
│   │       └── resolution-002.pdf
│   └── {uid-2}/
│       └── ...
```

## Cost Analysis

| Service | Free Tier | Overage |
|---------|-----------|---------|
| Cloud Run | 2M requests/month | $0.40/million |
| API Gateway | 2M calls/month | $3.00/million |
| GCS Storage | 5GB | $0.02/GB/month |
| Firebase Auth | 50K MAU | $0.01/MAU |

**Estimated cost at low scale: $0/month**

## Deployment Command

```bash
./deploy-production.sh 