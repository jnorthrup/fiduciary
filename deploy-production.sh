#!/bin/bash
# =============================================================================
# Production Deployment - Cloud Run Only
# =============================================================================
# Single deployment target: Cloud Run (API + Frontend)
# =============================================================================

set -euo pipefail

# Configuration
export GCP_PROJECT_ID="${GCP_PROJECT_ID:-gen-lang-client-0754063985}"
export GCP_REGION="${GCP_REGION:-us-central1}"
export SERVICE_NAME="${SERVICE_NAME:-trust-ledger-fullstack}"

echo "=== DEPLOYMENT: $SERVICE_NAME ==="
echo "Project: $GCP_PROJECT_ID"
echo "Region:  $GCP_REGION"

# Build frontend
echo ""
echo "Building frontend..."
VITE_FIREBASE_ENABLED=true \
VITE_GMAIL_AUTH_ENABLED=true \
VITE_IRS_API_URL=/api \
VITE_DEMO_MODE=false \
npm run build

# Copy to server
rm -rf server/public
cp -r dist server/public

# Deploy to Cloud Run
echo ""
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source ./server \
  --project "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --set-env-vars "NODE_ENV=production"

# Print URL
echo ""
echo "=== DEPLOYED ==="
gcloud run services describe "$SERVICE_NAME" \
  --project "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --format='value(status.url)'

cat >/tmp/deploy-flowchart.md <<EOF
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
EOF
