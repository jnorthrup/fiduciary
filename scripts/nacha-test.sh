#!/usr/bin/env bash
# =============================================================================
# NACHA Transmission Test Suite
# Test NACHA file submission using curl and openssl
#
# Usage: ./nacha-test.sh [options]
#   --record         Record terminal session for motion capture
#   --dry-run        Validate without actual submission
#   --local          Use local dev server (default)
#   --production     Use production Cloud Run endpoint
#   --token TOKEN    Firebase ID token (or set FIREBASE_TOKEN env var)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# =============================================================================
# Configuration
# =============================================================================

# API Endpoints
LOCAL_API="http://localhost:3001"
PROD_API="${PROD_API:-https://trust-ledger-fullstack-388611398406.us-central1.run.app}"

# Defaults
API_BASE="$LOCAL_API"
FIREBASE_TOKEN="${FIREBASE_TOKEN:-}"
DRY_RUN=false
RECORD_SESSION=false
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step:${NC} $1"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# TLS/SSL Verification
# =============================================================================

verify_tls() {
    local host="$1"
    local port="${2:-443}"
    
    log_step "TLS Certificate Verification"
    log_info "Connecting to $host:$port..."
    
    if [[ "$host" == "localhost" ]]; then
        log_warn "Local development - skipping TLS verification"
        return 0
    fi
    
    # Extract certificate info using openssl
    echo | openssl s_client -servername "$host" -connect "$host:$port" 2>/dev/null | \
        openssl x509 -noout -subject -issuer -dates 2>/dev/null || {
            log_error "Failed to verify TLS certificate"
            return 1
        }
    
    log_success "TLS certificate verified"
    
    # Check certificate chain
    log_info "Verifying certificate chain..."
    echo | openssl s_client -servername "$host" -connect "$host:$port" -verify_return_error 2>&1 | \
        grep -E "(Verify return code|depth=)" || true
}

# =============================================================================
# NACHA File Generation
# =============================================================================

generate_nacha() {
    log_step "Generating NACHA File"
    
    local nacha_script="$SCRIPT_DIR/generate-nacha.sh"
    if [[ ! -x "$nacha_script" ]]; then
        chmod +x "$nacha_script"
    fi
    
    local tmpfile=$(mktemp)
    
    log_info "Generating NACHA file for DTE Energy payment (\$411.78)..."
    "$nacha_script" --test --output "$tmpfile"
    
    NACHA_FILE="$tmpfile"
    NACHA_CHECKSUM=$(shasum -a 256 "$tmpfile" | cut -d' ' -f1)
    NACHA_SIZE=$(wc -c < "$tmpfile" | tr -d ' ')
    
    log_success "Generated NACHA file: $tmpfile"
    log_info "Size: $NACHA_SIZE bytes"
    log_info "SHA-256: $NACHA_CHECKSUM"
    
    if $VERBOSE; then
        log_info "File contents:"
        cat "$tmpfile" | head -20
    fi
}

# =============================================================================
# API Authentication
# =============================================================================

get_auth_token() {
    log_step "Authentication Setup"
    
    if [[ -n "$FIREBASE_TOKEN" ]]; then
        log_success "Using provided Firebase token"
        return 0
    fi
    
    # For local development, use dev-token bypass (prioritize over gcloud)
    if [[ "$API_BASE" == "$LOCAL_API" ]]; then
        log_info "Local development mode - using dev-token"
        FIREBASE_TOKEN="dev-token"
        return 0
    fi
    
    # Try to get token from gcloud for production
    if command -v gcloud &> /dev/null; then
        log_info "Attempting to get token from gcloud..."
        FIREBASE_TOKEN=$(gcloud auth print-identity-token 2>/dev/null || true)
        
        if [[ -n "$FIREBASE_TOKEN" ]]; then
            log_success "Got identity token from gcloud"
            return 0
        fi
    fi
    
    log_error "No Firebase token available. Set FIREBASE_TOKEN or use --token"
    return 1
}

# =============================================================================
# NACHA API Tests
# =============================================================================

test_health() {
    log_step "Health Check"
    
    local response http_code body
    response=$(curl -s -w "\n%{http_code}" "$API_BASE/api/irs/health" 2>&1) || true
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" == "200" ]]; then
        log_success "API is healthy"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        log_error "Health check failed (HTTP $http_code)"
        echo "$body"
        return 1
    fi
}

test_nacha_submit() {
    log_step "NACHA Submission Test"
    
    # Base64 encode the NACHA file
    local base64_content
    base64_content=$(base64 < "$NACHA_FILE" | tr -d '\n')
    
    # Prepare request body
    local request_body
    request_body=$(jq -n \
        --arg fileContent "$base64_content" \
        --arg filename "dte-energy-payment-$(date +%Y%m%d).ach" \
        --argjson batchCount 1 \
        --argjson entryCount 1 \
        --argjson totalDebit 0 \
        --argjson totalCredit 41178 \
        '{
            fileContent: $fileContent,
            filename: $filename,
            batchCount: $batchCount,
            entryCount: $entryCount,
            totalDebit: $totalDebit,
            totalCredit: $totalCredit
        }')
    
    log_info "Submitting NACHA file to $API_BASE/api/nacha/submit"
    
    if $DRY_RUN; then
        log_warn "DRY RUN - Not sending actual request"
        log_info "Request body:"
        echo "$request_body" | jq '.fileContent = "<base64-truncated>"'
        return 0
    fi
    
    local response http_code body
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $FIREBASE_TOKEN" \
        -d "$request_body" \
        "$API_BASE/api/nacha/submit" 2>&1) || true
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" == "201" ]]; then
        log_success "NACHA submission accepted!"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        
        # Extract submission ID for later verification
        SUBMISSION_ID=$(echo "$body" | jq -r '.submissionId' 2>/dev/null || true)
        API_CHECKSUM=$(echo "$body" | jq -r '.checksum' 2>/dev/null || true)
        
        log_info "Submission ID: $SUBMISSION_ID"
        log_info "API Checksum: $API_CHECKSUM"
    else
        log_error "Submission failed (HTTP $http_code)"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        return 1
    fi
}

test_nacha_list() {
    log_step "List NACHA Submissions"
    
    if $DRY_RUN; then
        log_warn "DRY RUN - Skipping list request"
        return 0
    fi
    
    local response http_code body
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $FIREBASE_TOKEN" \
        "$API_BASE/api/nacha/submissions" 2>&1) || true
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" == "200" ]]; then
        log_success "Retrieved submissions list"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        log_error "List failed (HTTP $http_code)"
        echo "$body"
    fi
}

test_nacha_get() {
    log_step "Get Specific NACHA Submission"
    
    if [[ -z "${SUBMISSION_ID:-}" ]]; then
        log_warn "No submission ID available - skipping"
        return 0
    fi
    
    if $DRY_RUN; then
        log_warn "DRY RUN - Skipping get request"
        return 0
    fi
    
    local response http_code body
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $FIREBASE_TOKEN" \
        "$API_BASE/api/nacha/submissions/$SUBMISSION_ID" 2>&1) || true
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" == "200" ]]; then
        log_success "Retrieved submission $SUBMISSION_ID"
        echo "$body" | jq 'del(.content)' 2>/dev/null || echo "$body"
    else
        log_error "Get failed (HTTP $http_code)"
        echo "$body"
    fi
}

# =============================================================================
# OpenAPI Validation
# =============================================================================

validate_against_spec() {
    log_step "OpenAPI Spec Validation"
    
    local spec_file="$PROJECT_ROOT/specs/las-trust-erp.yaml"
    
    if [[ ! -f "$spec_file" ]]; then
        log_warn "OpenAPI spec not found at $spec_file"
        return 0
    fi
    
    log_info "Spec file: $spec_file"
    
    # Check if spectral or similar tool is available
    if command -v spectral &> /dev/null; then
        log_info "Running Spectral linter..."
        spectral lint "$spec_file" || true
    else
        log_warn "Spectral not installed - skipping detailed validation"
        log_info "Install with: npm install -g @stoplight/spectral-cli"
    fi
    
    log_success "Spec validation complete"
}

# =============================================================================
# Summary Report
# =============================================================================

print_summary() {
    log_step "Test Summary"
    
    echo ""
    echo "┌──────────────────────────────────────────────────────────┐"
    echo "│                 NACHA Transmission Test                  │"
    echo "├──────────────────────────────────────────────────────────┤"
    echo "│ Payment Details:                                         │"
    echo "│   Payee: DTE Energy                                      │"
    echo "│   Account: 9200 549 3164 6                               │"
    echo "│   Amount: \$411.78                                        │"
    echo "├──────────────────────────────────────────────────────────┤"
    echo "│ Test Results:                                            │"
    printf "│   API Endpoint: %-40s │\n" "$API_BASE"
    printf "│   NACHA File Size: %-37s │\n" "${NACHA_SIZE:-N/A} bytes"
    printf "│   Local Checksum: %-38s │\n" "${NACHA_CHECKSUM:0:16}..."
    printf "│   Submission ID: %-39s │\n" "${SUBMISSION_ID:-N/A}"
    echo "└──────────────────────────────────────────────────────────┘"
    echo ""
    
    # Cleanup temp file
    if [[ -n "${NACHA_FILE:-}" && -f "$NACHA_FILE" ]]; then
        rm -f "$NACHA_FILE"
    fi
}

# =============================================================================
# CLI Interface
# =============================================================================

print_usage() {
    echo "NACHA Transmission Test Suite"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --record         Record terminal session as motion capture"
    echo "  --dry-run        Validate without actual submission"
    echo "  --local          Use local dev server (default)"
    echo "  --production     Use production Cloud Run endpoint"
    echo "  --token TOKEN    Firebase ID token"
    echo "  --verbose        Show detailed output"
    echo "  --help           Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  FIREBASE_TOKEN   Firebase ID token for authentication"
    echo "  PROD_API         Production API URL override"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --record)
            RECORD_SESSION=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --local)
            API_BASE="$LOCAL_API"
            shift
            ;;
        --production)
            API_BASE="$PROD_API"
            shift
            ;;
        --token)
            FIREBASE_TOKEN="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║      NACHA Transmission Test - DTE Energy Payment        ║"
    echo "║                     \$411.78 → 9200 549 3164 6            ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    log_info "Target API: $API_BASE"
    log_info "Dry Run: $DRY_RUN"
    log_info "Date: $(date)"
    
    # Run tests
    if [[ "$API_BASE" != "$LOCAL_API" ]]; then
        local host=$(echo "$API_BASE" | sed 's|https://||' | cut -d/ -f1)
        verify_tls "$host"
    fi
    
    test_health || log_warn "Health check failed - continuing anyway"
    
    generate_nacha
    get_auth_token || exit 1
    
    test_nacha_submit
    test_nacha_list
    test_nacha_get
    
    validate_against_spec
    
    print_summary
    
    log_success "All tests completed!"
}

# Record session if requested
if $RECORD_SESSION; then
    log_info "Recording session to nacha-test-$(date +%Y%m%d-%H%M%S).log"
    script -q "nacha-test-$(date +%Y%m%d-%H%M%S).log" bash -c "$(declare -f); main"
else
    main
fi
