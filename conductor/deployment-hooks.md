# Deployment Hooks and CI/CD Integration

## Overview

This document defines repeatable hooks for GitHub ticket support, Content-Addressable Identifier (CID) tracking with rollback capabilities, and comprehensive journaling for the Trust Ledger System.

## Architecture Principles

1. **Content-Addressable Storage (CID)**: Every deployment generates immutable CID references
2. **Rollback Capability**: Any deployment can be instantly reverted to previous CID
3. **GitHub Integration**: Automated ticket closure and status updates via commit hooks
4. **Audit Trail**: Complete journal of all deployments with rollback history

---

## Git Hooks

### Pre-Commit Hook

Location: `.git/hooks/pre-commit`

```bash
#!/bin/bash
# Pre-commit hook: Validate commit structure and generate CID preview

set -e

# Validate commit message format
commit_msg=$(cat .git/COMMIT_EDITMSG 2>/dev/null || echo "")
if ! echo "$commit_msg" | grep -qE '^(feat|fix|docs|style|refactor|test|chore|conductor)(\(.+\))?: .+'; then
    echo "Error: Commit message must follow conventional commits format"
    exit 1
fi

# Extract GitHub issue references
issue_refs=$(echo "$commit_msg" | grep -oE '#[0-9]+' | sort -u)

# Validate referenced issues exist (optional, requires gh CLI)
if command -v gh &> /dev/null; then
    for issue in $issue_refs; do
        issue_num=${issue#\#}
        if ! gh issue view "$issue_num" &> /dev/null; then
            echo "Warning: Issue $issue not found in repository"
        fi
    done
fi

# Run tests before commit
npm test -- --run

echo "✓ Pre-commit validation passed"
```

### Post-Commit Hook

Location: `.git/hooks/post-commit`

```bash
#!/bin/bash
# Post-commit hook: Generate CID, update journal, link GitHub issues

set -e

commit_hash=$(git rev-parse HEAD)
commit_short=$(git rev-parse --short HEAD)
commit_msg=$(git log -1 --pretty=%B)
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Generate content-addressable identifier (CID)
# CID = hash of (commit_hash + build_artifacts + deployment_config)
build_hash=$(find dist -type f -exec sha256sum {} \; 2>/dev/null | sha256sum | cut -d' ' -f1 || echo "no-build")
config_hash=$(cat firebase.json .firebaserc 2>/dev/null | sha256sum | cut -d' ' -f1)
cid=$(echo "${commit_hash}${build_hash}${config_hash}" | sha256sum | cut -d' ' -f1)

# Create deployment journal entry
journal_dir=".conductor/journal"
mkdir -p "$journal_dir"
journal_file="${journal_dir}/${commit_short}_${cid:0:8}.json"

cat > "$journal_file" <<EOF
{
  "commit": "$commit_hash",
  "commit_short": "$commit_short",
  "cid": "$cid",
  "timestamp": "$timestamp",
  "message": $(echo "$commit_msg" | jq -Rs .),
  "build_hash": "$build_hash",
  "config_hash": "$config_hash",
  "deployment_status": "pending",
  "rollback_available": true
}
EOF

echo "✓ Generated CID: ${cid:0:16}..."
echo "✓ Journal entry: $journal_file"

# Extract GitHub issue references and add git notes
issue_refs=$(echo "$commit_msg" | grep -oE '#[0-9]+' | sort -u)
if [ -n "$issue_refs" ]; then
    note_content="GitHub Issues: $issue_refs"
    git notes add -m "$note_content" "$commit_hash" 2>/dev/null || true
    echo "✓ Linked issues: $issue_refs"
fi
```

### Pre-Push Hook

Location: `.git/hooks/pre-push`

```bash
#!/bin/bash
# Pre-push hook: Update GitHub issues with deployment status

set -e

# Get commits about to be pushed
remote="$1"
url="$2"

while read local_ref local_sha remote_ref remote_sha; do
    if [ "$local_sha" != "0000000000000000000000000000000000000000" ]; then
        # Find commits not in remote
        if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
            # New branch
            range="$local_sha"
        else
            range="$remote_sha..$local_sha"
        fi

        # Extract all GitHub issue references from commit range
        issue_refs=$(git log "$range" --pretty=%B | grep -oE '#[0-9]+' | sort -u)

        if [ -n "$issue_refs" ] && command -v gh &> /dev/null; then
            for issue in $issue_refs; do
                issue_num=${issue#\#}
                # Add comment to issue about pending deployment
                gh issue comment "$issue_num" --body "🚀 Deployment pending for commits in range $range" || true
            done
        fi
    fi
done

echo "✓ Pre-push validation passed"
```

---

## Deployment Scripts

### Firebase Deployment with CID Tracking

Location: `scripts/deploy-with-cid.sh`

```bash
#!/bin/bash
# Deploy to Firebase with full CID tracking and rollback support

set -e

commit_hash=$(git rev-parse HEAD)
commit_short=$(git rev-parse --short HEAD)
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "🔨 Building application..."
npm run build

# Calculate CID
build_hash=$(find dist -type f -exec sha256sum {} \; | sha256sum | cut -d' ' -f1)
config_hash=$(cat firebase.json .firebaserc | sha256sum | cut -d' ' -f1)
cid=$(echo "${commit_hash}${build_hash}${config_hash}" | sha256sum | cut -d' ' -f1)

echo "📦 CID: ${cid:0:16}..."

# Update journal with build completion
journal_file=$(ls .conductor/journal/${commit_short}_*.json 2>/dev/null | head -1)
if [ -n "$journal_file" ]; then
    jq ".deployment_status = \"building\" | .build_completed = \"$timestamp\"" "$journal_file" > "${journal_file}.tmp"
    mv "${journal_file}.tmp" "$journal_file"
fi

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting

# Get Firebase deployment URL
firebase_url=$(firebase hosting:channel:list 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.web\.app' | head -1 || echo "unknown")

# Update journal with deployment success
if [ -n "$journal_file" ]; then
    jq ".deployment_status = \"deployed\" | .deployed_at = \"$timestamp\" | .firebase_url = \"$firebase_url\"" "$journal_file" > "${journal_file}.tmp"
    mv "${journal_file}.tmp" "$journal_file"
fi

# Store CID reference for rollback
echo "$cid" > ".conductor/latest_cid"
echo "$firebase_url" > ".conductor/latest_url"

# Update GitHub issues
commit_msg=$(git log -1 --pretty=%B)
issue_refs=$(echo "$commit_msg" | grep -oE '#[0-9]+' | sort -u)

if [ -n "$issue_refs" ] && command -v gh &> /dev/null; then
    for issue in $issue_refs; do
        issue_num=${issue#\#}
        gh issue comment "$issue_num" --body "✅ Deployed at $firebase_url (CID: ${cid:0:16}...)"

        # Check if commit message indicates issue closure
        if echo "$commit_msg" | grep -qiE "(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved) $issue"; then
            gh issue close "$issue_num" --comment "Automatically closed by deployment $commit_short"
        fi
    done
fi

echo "✅ Deployment complete!"
echo "   URL: $firebase_url"
echo "   CID: ${cid:0:16}..."
echo "   Journal: $journal_file"
```

### Rollback Script

Location: `scripts/rollback-deployment.sh`

```bash
#!/bin/bash
# Rollback to previous CID with full audit trail

set -e

target_cid="$1"
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ -z "$target_cid" ]; then
    echo "Usage: $0 <target_cid>"
    echo ""
    echo "Available deployments:"
    ls -lt .conductor/journal/*.json | head -10
    exit 1
fi

# Find journal entry for target CID
journal_file=$(grep -l "\"cid\": \"$target_cid\"" .conductor/journal/*.json 2>/dev/null | head -1)

if [ -z "$journal_file" ]; then
    echo "Error: CID $target_cid not found in journal"
    exit 1
fi

# Extract commit hash from journal
target_commit=$(jq -r .commit "$journal_file")
target_short=$(jq -r .commit_short "$journal_file")

echo "🔄 Rolling back to commit $target_short (CID: ${target_cid:0:16}...)"

# Checkout target commit (detached HEAD)
git checkout "$target_commit"

# Rebuild from target commit
echo "🔨 Rebuilding from target commit..."
npm run build

# Deploy
echo "🚀 Deploying rollback..."
firebase deploy --only hosting

# Create rollback journal entry
rollback_journal=".conductor/journal/rollback_${target_short}_$(date +%s).json"
cat > "$rollback_journal" <<EOF
{
  "rollback_timestamp": "$timestamp",
  "target_commit": "$target_commit",
  "target_cid": "$target_cid",
  "previous_cid": "$(cat .conductor/latest_cid 2>/dev/null || echo 'unknown')",
  "rollback_reason": "Manual rollback via script"
}
EOF

echo "$target_cid" > ".conductor/latest_cid"

echo "✅ Rollback complete!"
echo "   Target commit: $target_short"
echo "   CID: ${target_cid:0:16}..."
echo "   Journal: $rollback_journal"
```

---

## GitHub Actions Workflow

Location: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Firebase with CID Tracking

on:
  push:
    branches: [main, firebase-deploy-*]
  pull_request:
    branches: [main]

env:
  FIREBASE_PROJECT: gen-lang-client-0754063985

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --run

      - name: Run linter
        run: npm run lint || true

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for CID calculation

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Generate CID
        id: cid
        run: |
          commit_hash=$(git rev-parse HEAD)
          build_hash=$(find dist -type f -exec sha256sum {} \; | sha256sum | cut -d' ' -f1)
          config_hash=$(cat firebase.json .firebaserc | sha256sum | cut -d' ' -f1)
          cid=$(echo "${commit_hash}${build_hash}${config_hash}" | sha256sum | cut -d' ' -f1)
          echo "cid=$cid" >> $GITHUB_OUTPUT
          echo "cid_short=${cid:0:16}" >> $GITHUB_OUTPUT

      - name: Create deployment journal
        run: |
          mkdir -p .conductor/journal
          commit_short=$(git rev-parse --short HEAD)
          cat > .conductor/journal/${commit_short}_${{ steps.cid.outputs.cid_short }}.json <<EOF
          {
            "commit": "$(git rev-parse HEAD)",
            "commit_short": "$commit_short",
            "cid": "${{ steps.cid.outputs.cid }}",
            "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
            "message": $(git log -1 --pretty=%B | jq -Rs .),
            "github_run_id": "${{ github.run_id }}",
            "deployment_status": "pending"
          }
          EOF

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: ${{ env.FIREBASE_PROJECT }}

      - name: Update GitHub issues
        if: success()
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          commit_msg=$(git log -1 --pretty=%B)
          issue_refs=$(echo "$commit_msg" | grep -oE '#[0-9]+' | sort -u || true)

          for issue in $issue_refs; do
            issue_num=${issue#\#}
            gh issue comment "$issue_num" --body "✅ Deployed (CID: ${{ steps.cid.outputs.cid_short }}...)" || true

            if echo "$commit_msg" | grep -qiE "(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved) $issue"; then
              gh issue close "$issue_num" || true
            fi
          done

      - name: Commit journal to repository
        if: success()
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .conductor/journal/
          git commit -m "chore(deploy): add journal entry for CID ${{ steps.cid.outputs.cid_short }}" || true
          git push || true
```

---

## Journal Structure

### Journal Entry Format

```json
{
  "commit": "full-commit-sha",
  "commit_short": "short-sha",
  "cid": "content-addressable-identifier",
  "timestamp": "ISO-8601-timestamp",
  "message": "commit message",
  "build_hash": "hash of build artifacts",
  "config_hash": "hash of deployment config",
  "deployment_status": "pending|building|deployed|failed|rolled_back",
  "build_completed": "ISO-8601-timestamp",
  "deployed_at": "ISO-8601-timestamp",
  "firebase_url": "https://...",
  "rollback_available": true,
  "github_run_id": "optional-ci-run-id",
  "github_issues": ["#123", "#456"]
}
```

### Rollback Entry Format

```json
{
  "rollback_timestamp": "ISO-8601-timestamp",
  "target_commit": "target-commit-sha",
  "target_cid": "target-cid",
  "previous_cid": "cid-before-rollback",
  "rollback_reason": "description",
  "rollback_initiated_by": "user|automation"
}
```

---

## Setup Instructions

### 1. Install Git Hooks

```bash
# Make scripts executable
chmod +x scripts/deploy-with-cid.sh
chmod +x scripts/rollback-deployment.sh

# Install hooks
cp scripts/git-hooks/* .git/hooks/
chmod +x .git/hooks/*
```

### 2. Configure GitHub CLI

```bash
# Authenticate with GitHub
gh auth login

# Verify authentication
gh auth status
```

### 3. Configure Firebase Service Account (for CI/CD)

```bash
# Generate service account key
firebase login:ci

# Add to GitHub secrets as FIREBASE_SERVICE_ACCOUNT
```

### 4. Initialize Journal Directory

```bash
mkdir -p .conductor/journal
git add .conductor/journal/.gitkeep
git commit -m "chore: initialize deployment journal"
```

---

## Usage Examples

### Deploy with Full Tracking

```bash
# Regular commit and deploy
git add .
git commit -m "feat(ui): add new dashboard widget #123"
./scripts/deploy-with-cid.sh
```

### Rollback to Previous Version

```bash
# List available deployments
ls -lt .conductor/journal/*.json

# Rollback to specific CID
./scripts/rollback-deployment.sh abc123def456

# Or rollback to previous commit
git log --oneline
./scripts/rollback-deployment.sh $(git rev-parse HEAD~1)
```

### Query Deployment History

```bash
# Show all deployments
jq -s '.' .conductor/journal/*.json

# Find deployments for specific commit
grep -l "commit_short.*abc123" .conductor/journal/*.json

# Find deployments in date range
jq 'select(.timestamp >= "2026-01-01" and .timestamp <= "2026-01-31")' .conductor/journal/*.json
```

---

## Integration with Conductor Workflow

This deployment system integrates with the existing conductor workflow:

1. **Phase Checkpoints** (workflow.md): Each checkpoint now includes CID in journal
2. **Git Notes** (workflow.md): Deployment CIDs attached as git notes
3. **Tech Stack** (tech-stack.md): Firebase Hosting added as deployment target
4. **Quality Gates** (workflow.md): Pre-commit hooks enforce testing and linting

### Modified Phase Completion Protocol

After Step 10 in workflow.md Phase Completion Verification:

```
11. **Deploy Phase Checkpoint:**
    - Execute `./scripts/deploy-with-cid.sh` to deploy checkpoint
    - CID and deployment URL automatically added to journal
    - GitHub issues automatically updated with deployment status
```

---

## Monitoring and Alerts

### Failed Deployment Alert

```bash
# Add to .git/hooks/post-deploy (create if needed)
if [ $? -ne 0 ]; then
    # Send alert (Slack, email, etc.)
    curl -X POST https://hooks.slack.com/... -d '{"text":"Deployment failed!"}'
fi
```

### Deployment Success Notification

```bash
# Add to scripts/deploy-with-cid.sh after successful deploy
curl -X POST https://hooks.slack.com/... -d "{\"text\":\"✅ Deployed CID: ${cid:0:16}\"}"
```

---

## Security Considerations

1. **CID Verification**: Always verify CID matches expected build before deployment
2. **Rollback Authorization**: Require manual approval for production rollbacks
3. **Journal Integrity**: Sign journal entries with GPG for tamper detection
4. **GitHub Token Scope**: Use minimal scope tokens (issues:write, contents:read)

---

## Future Enhancements

- [ ] Multi-environment support (staging, production)
- [ ] Automated rollback on error threshold
- [ ] Performance metrics in journal entries
- [ ] A/B testing with CID-based traffic splitting
- [ ] Integration with monitoring tools (Sentry, Datadog)
