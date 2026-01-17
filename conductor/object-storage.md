# Object Storage for Ledger Records

## Overview

Ledgers of record are stored in private cloud object stores (S3, Azure Blob, GCS) to minimize hosting costs. Firebase Hosting serves the application shell, while immutable ledger data is sourced directly from bucket storage via CID references.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Hosting                         │
│              (Application Shell + Router)                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Request ledger data by CID
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Object Storage (S3/Blob/GCS)                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Ledger     │  │ Journal    │  │ Snapshot   │            │
│  │ CID: abc.. │  │ CID: def.. │  │ CID: ghi.. │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Storage Strategy

### 1. Ledger Records (Immutable)

```
s3://fiduciary-ledgers/
  ├── ledgers/
  │   ├── {cid}/
  │   │   ├── metadata.json
  │   │   ├── transactions.jsonl
  │   │   └── signatures.json
  │   └── index/
  │       ├── by-entity/{entity-id}.json
  │       ├── by-date/{yyyy-mm-dd}.json
  │       └── latest.json
  ├── journals/
  │   ├── deployments/{cid}.json
  │   ├── rollbacks/{cid}.json
  │   └── audit-log.jsonl
  └── snapshots/
      ├── {entity-id}/{timestamp}-{cid}.duckdb
      └── manifests/{cid}.json
```

### 2. Access Patterns

**Read-Heavy (99% of traffic)**
- Static assets served from Firebase CDN
- Ledger data fetched from S3 with CloudFront/CDN
- Aggressive browser caching with CID-based URLs

**Write-Infrequent (1% of traffic)**
- New ledger entries written to S3
- Atomic writes using CID as object key
- No overwrites (immutable append-only)

### 3. Cost Optimization

| Storage Tier | Use Case | Cost per GB/month |
|--------------|----------|-------------------|
| S3 Standard | Active ledgers (last 90 days) | $0.023 |
| S3 Infrequent Access | Historical ledgers (90-365 days) | $0.0125 |
| S3 Glacier Instant | Archive (>365 days) | $0.004 |
| S3 Intelligent-Tiering | Unknown access patterns | $0.0025 + storage |

**Estimated Costs:**
- Firebase Hosting: $0/month (under free tier limits)
- S3 Storage (100GB active): $2.30/month
- S3 Requests (100k GET/month): $0.04/month
- CloudFront (1TB transfer): $0 (free tier) or $85/month
- **Total: ~$2.50/month** (excluding CloudFront if over free tier)

---

## Implementation

### Backend API Layer

Location: `server/storage/object-store.ts`

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createHash } from "crypto";

interface LedgerRecord {
  entityId: string;
  timestamp: string;
  transactions: Transaction[];
  signatures: Signature[];
}

interface StorageConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string; // For S3-compatible services
}

class ObjectStoreLedger {
  private s3: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.s3 = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint, // For MinIO, Wasabi, etc.
    });
    this.bucket = config.bucket;
  }

  /**
   * Calculate CID for ledger record
   */
  private calculateCID(record: LedgerRecord): string {
    const content = JSON.stringify(record, null, 0);
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Store ledger record (immutable, content-addressed)
   */
  async storeLedger(record: LedgerRecord): Promise<{ cid: string; url: string }> {
    const cid = this.calculateCID(record);
    const key = `ledgers/${cid}/metadata.json`;

    // Check if CID already exists (deduplication)
    try {
      await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      // Already exists, return existing CID
      return {
        cid,
        url: `https://${this.bucket}.s3.amazonaws.com/${key}`,
      };
    } catch (err) {
      // Does not exist, proceed with upload
    }

    // Store metadata
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: JSON.stringify(record, null, 2),
        ContentType: "application/json",
        CacheControl: "public, max-age=31536000, immutable", // 1 year cache
        Metadata: {
          cid,
          entity_id: record.entityId,
          timestamp: record.timestamp,
        },
      })
    );

    // Store transactions as JSONL for streaming
    const transactionsKey = `ledgers/${cid}/transactions.jsonl`;
    const transactionsBody = record.transactions.map((t) => JSON.stringify(t)).join("\n");

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: transactionsKey,
        Body: transactionsBody,
        ContentType: "application/jsonlines",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    // Update index for entity
    await this.updateEntityIndex(record.entityId, cid);

    return {
      cid,
      url: `https://${this.bucket}.s3.amazonaws.com/${key}`,
    };
  }

  /**
   * Retrieve ledger record by CID
   */
  async getLedger(cid: string): Promise<LedgerRecord | null> {
    const key = `ledgers/${cid}/metadata.json`;

    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      const body = await response.Body?.transformToString();
      return body ? JSON.parse(body) : null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Get latest ledger CID for entity
   */
  async getLatestLedgerCID(entityId: string): Promise<string | null> {
    const key = `ledgers/index/by-entity/${entityId}.json`;

    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      const body = await response.Body?.transformToString();
      if (!body) return null;

      const index = JSON.parse(body);
      return index.latest_cid || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Update entity index with new CID
   */
  private async updateEntityIndex(entityId: string, cid: string): Promise<void> {
    const key = `ledgers/index/by-entity/${entityId}.json`;

    // Read existing index or create new
    let index: { entity_id: string; cids: string[]; latest_cid: string } = {
      entity_id: entityId,
      cids: [],
      latest_cid: cid,
    };

    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      const body = await response.Body?.transformToString();
      if (body) {
        index = JSON.parse(body);
      }
    } catch (err) {
      // Index does not exist, use default
    }

    // Append new CID
    if (!index.cids.includes(cid)) {
      index.cids.push(cid);
      index.latest_cid = cid;
    }

    // Write updated index
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: JSON.stringify(index, null, 2),
        ContentType: "application/json",
        CacheControl: "public, max-age=300", // 5 minute cache (mutable)
      })
    );
  }

  /**
   * Store deployment journal entry
   */
  async storeDeploymentJournal(journal: any): Promise<string> {
    const cid = journal.cid;
    const key = `journals/deployments/${cid}.json`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: JSON.stringify(journal, null, 2),
        ContentType: "application/json",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    // Append to audit log
    const auditKey = `journals/audit-log.jsonl`;
    const auditEntry = JSON.stringify({ type: "deployment", ...journal });

    // Note: S3 does not support append operations
    // For audit log, consider using DynamoDB or append to local file and upload periodically
    // Or use S3 multipart upload to simulate append

    return cid;
  }
}

export { ObjectStoreLedger, StorageConfig, LedgerRecord };
```

### Frontend Integration

Location: `src/services/ledger-client.ts`

```typescript
interface LedgerClient {
  /**
   * Fetch ledger by CID from object storage
   */
  fetchLedgerByCID(cid: string): Promise<LedgerRecord>;

  /**
   * Fetch latest ledger for entity
   */
  fetchLatestLedger(entityId: string): Promise<LedgerRecord>;

  /**
   * Submit new ledger entry (via backend API)
   */
  submitLedgerEntry(record: LedgerRecord): Promise<{ cid: string; url: string }>;
}

class S3LedgerClient implements LedgerClient {
  private cdnBaseUrl: string;
  private apiBaseUrl: string;

  constructor(cdnBaseUrl: string, apiBaseUrl: string) {
    this.cdnBaseUrl = cdnBaseUrl; // e.g., https://d1234567.cloudfront.net
    this.apiBaseUrl = apiBaseUrl; // e.g., https://api.fiduciary.app
  }

  async fetchLedgerByCID(cid: string): Promise<LedgerRecord> {
    // Fetch directly from CDN (cached, fast, cheap)
    const url = `${this.cdnBaseUrl}/ledgers/${cid}/metadata.json`;

    const response = await fetch(url, {
      cache: "force-cache", // Aggressive browser caching
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ledger ${cid}: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchLatestLedger(entityId: string): Promise<LedgerRecord> {
    // Fetch index to get latest CID
    const indexUrl = `${this.cdnBaseUrl}/ledgers/index/by-entity/${entityId}.json`;

    const indexResponse = await fetch(indexUrl, {
      cache: "default", // 5 minute cache
    });

    if (!indexResponse.ok) {
      throw new Error(`Failed to fetch index for ${entityId}: ${indexResponse.statusText}`);
    }

    const index = await indexResponse.json();
    const latestCID = index.latest_cid;

    // Fetch ledger by CID
    return this.fetchLedgerByCID(latestCID);
  }

  async submitLedgerEntry(record: LedgerRecord): Promise<{ cid: string; url: string }> {
    // Submit via backend API (authenticated)
    const response = await fetch(`${this.apiBaseUrl}/v1/ledgers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit ledger: ${response.statusText}`);
    }

    return response.json();
  }

  private getAuthToken(): string {
    // Retrieve JWT token from localStorage or context
    return localStorage.getItem("auth_token") || "";
  }
}

export { S3LedgerClient, LedgerClient };
```

---

## Deployment Process

### 1. Build and Upload Ledger Data

```bash
#!/bin/bash
# scripts/upload-ledgers-to-s3.sh

set -e

S3_BUCKET="fiduciary-ledgers"
AWS_REGION="us-east-1"

echo "📦 Exporting ledgers from DuckDB..."

# Export ledgers to JSON files
duckdb ledger.db <<SQL
COPY (
  SELECT * FROM ledgers ORDER BY timestamp DESC
) TO 'exports/ledgers.jsonl' (FORMAT JSON, ARRAY false);
SQL

echo "🔨 Calculating CIDs and organizing files..."

# Process each ledger entry
while IFS= read -r line; do
  cid=$(echo "$line" | jq -r '. | tostring' | sha256sum | cut -d' ' -f1)
  entity_id=$(echo "$line" | jq -r '.entity_id')

  # Create directory structure
  mkdir -p "uploads/ledgers/$cid"
  echo "$line" | jq '.' > "uploads/ledgers/$cid/metadata.json"

  # Extract transactions
  echo "$line" | jq -r '.transactions[]' > "uploads/ledgers/$cid/transactions.jsonl"

  echo "  ✓ Prepared $cid"
done < exports/ledgers.jsonl

echo "☁️  Uploading to S3..."

# Upload with caching headers
aws s3 sync uploads/ledgers/ "s3://$S3_BUCKET/ledgers/" \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "application/json"

echo "✅ Upload complete!"
```

### 2. Deploy Application Shell to Firebase

```bash
#!/bin/bash
# scripts/deploy-hybrid.sh

set -e

echo "🔨 Building application shell..."
npm run build

echo "☁️  Uploading ledgers to S3..."
./scripts/upload-ledgers-to-s3.sh

echo "🚀 Deploying app shell to Firebase..."
firebase deploy --only hosting

echo "✅ Hybrid deployment complete!"
echo "   App shell: https://gen-lang-client-0754063985.web.app"
echo "   Ledgers: s3://fiduciary-ledgers/ledgers/"
```

---

## Configuration

### Environment Variables

```bash
# .env.production
VITE_CDN_BASE_URL=https://d1234567.cloudfront.net
VITE_API_BASE_URL=https://api.fiduciary.app
VITE_S3_BUCKET=fiduciary-ledgers
VITE_AWS_REGION=us-east-1
```

### Firebase Hosting Configuration

Location: `firebase.json`

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|woff2|woff|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "/ledgers/**/*.json",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          },
          {
            "key": "Access-Control-Allow-Methods",
            "value": "GET, OPTIONS"
          }
        ]
      }
    ]
  }
}
```

### AWS S3 Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::fiduciary-ledgers/ledgers/*"
    },
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::fiduciary-ledgers/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1234567890ABC"
        }
      }
    }
  ]
}
```

### CloudFront Distribution Configuration

```yaml
# CloudFormation template (optional)
Resources:
  LedgerCDN:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - Id: S3Origin
            DomainName: fiduciary-ledgers.s3.amazonaws.com
            S3OriginConfig:
              OriginAccessIdentity: !Sub "origin-access-identity/cloudfront/${CloudFrontOAI}"
        Enabled: true
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          Compress: true
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6 # CachingOptimized
          OriginRequestPolicyId: 88a5eaf4-2fd4-4709-b370-b4c650ea3fcf # CORS-S3Origin
        PriceClass: PriceClass_100 # US, Canada, Europe
        ViewerCertificate:
          CloudFrontDefaultCertificate: true
```

---

## Rollback with Object Storage

### Ledger Rollback Process

```bash
#!/bin/bash
# scripts/rollback-ledger.sh

set -e

target_cid="$1"

if [ -z "$target_cid" ]; then
  echo "Usage: $0 <target_cid>"
  exit 1
fi

echo "🔄 Rolling back ledger state to CID: $target_cid"

# Download target ledger from S3
aws s3 cp "s3://fiduciary-ledgers/ledgers/$target_cid/metadata.json" \
  "/tmp/rollback-$target_cid.json"

# Verify CID matches
downloaded_cid=$(sha256sum "/tmp/rollback-$target_cid.json" | cut -d' ' -f1)
if [ "$downloaded_cid" != "$target_cid" ]; then
  echo "❌ CID mismatch! Download corrupted."
  exit 1
fi

# Update index to point to rollback CID
entity_id=$(jq -r '.entity_id' "/tmp/rollback-$target_cid.json")

aws s3 cp "s3://fiduciary-ledgers/ledgers/index/by-entity/$entity_id.json" \
  "/tmp/index-$entity_id.json"

jq ".latest_cid = \"$target_cid\"" "/tmp/index-$entity_id.json" > "/tmp/index-$entity_id-new.json"

aws s3 cp "/tmp/index-$entity_id-new.json" \
  "s3://fiduciary-ledgers/ledgers/index/by-entity/$entity_id.json" \
  --cache-control "public, max-age=300"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/ledgers/index/by-entity/$entity_id.json"

echo "✅ Rollback complete! Latest CID for $entity_id is now $target_cid"
```

---

## Cost Analysis

### Monthly Cost Breakdown (100 Entities, 10k Transactions/month)

| Service | Usage | Cost |
|---------|-------|------|
| **Firebase Hosting** | 10 GB storage, 10 GB transfer | $0 (free tier) |
| **S3 Standard Storage** | 100 GB | $2.30 |
| **S3 GET Requests** | 100k requests | $0.04 |
| **S3 PUT Requests** | 10k requests | $0.05 |
| **CloudFront Transfer** | 1 TB (1000 GB) | $0 (free tier) or $85 |
| **CloudFront Requests** | 1M requests | $0 (free tier) or $10 |
| **Data Transfer Out (S3)** | Minimal (via CloudFront) | $0 |
| **Total (with free tier)** | | **$2.39/month** |
| **Total (production scale)** | | **$97.39/month** |

### Cost Comparison

| Architecture | Cost/month | Notes |
|--------------|------------|-------|
| Firebase Hosting only | $25 | 50 GB storage + 50 GB transfer |
| Vercel Pro | $20 | 100 GB bandwidth |
| AWS Amplify | $15 | Per GB pricing |
| **Hybrid (Firebase + S3)** | **$2-97** | Best cost efficiency |

---

## Monitoring

### S3 Metrics

```bash
# Monitor S3 bucket size
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=fiduciary-ledgers Name=StorageType,Value=StandardStorage \
  --start-time 2026-01-01T00:00:00Z \
  --end-time 2026-01-31T23:59:59Z \
  --period 86400 \
  --statistics Average

# Monitor request count
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name NumberOfObjects \
  --dimensions Name=BucketName,Value=fiduciary-ledgers \
  --start-time 2026-01-01T00:00:00Z \
  --end-time 2026-01-31T23:59:59Z \
  --period 86400 \
  --statistics Average
```

### Alert on Anomalies

```yaml
# CloudWatch Alarm
Resources:
  HighRequestRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: S3-High-Request-Rate
      MetricName: NumberOfRequests
      Namespace: AWS/S3
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 2
      Threshold: 100000
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref SNSTopic
```

---

## Security

### Access Control

- **Public Read**: Ledger data (immutable, no PII)
- **Private Write**: Only backend API can write
- **Signed URLs**: For sensitive data (optional)

### Encryption

- **At Rest**: S3 SSE-S3 or SSE-KMS
- **In Transit**: HTTPS/TLS 1.3
- **Client-Side**: Optional for PII fields

### Audit Trail

All writes logged to `journals/audit-log.jsonl` with:
- Timestamp
- User/Service identity
- CID written
- Operation type
- Request signature

---

## Integration with Conductor

Update `conductor/tech-stack.md`:

```markdown
## Cloud Storage
| Technology | Version | Purpose |
|------------|---------|---------|
| **AWS S3** | - | Primary ledger storage (content-addressed) |
| **CloudFront** | - | CDN for global ledger access |
| **Firebase Hosting** | - | Application shell delivery |
```

Update `conductor/deployment-hooks.md`:

Add to deployment script:
```bash
# After Firebase deploy
./scripts/upload-ledgers-to-s3.sh
```
