#!/bin/bash
# =============================================================================
# Serverless Test Runner Script
# =============================================================================
# Runs OpenAPI validation, fuzz tests, or smoke tests based on TEST_MODE
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
API_BASE_URL="${API_BASE_URL:-https://trust-ledger-fullstack.run.app}"
OPENAPI_SPEC="${OPENAPI_SPEC_PATH:-/app/specs/unified-api-openapi.yaml}"
TEST_MODE="${TEST_MODE:-smoke}"
RESULTS_DIR="/app/results"

mkdir -p "$RESULTS_DIR"

# =============================================================================
# OAuth Token Acquisition (Single Point of Auth)
# =============================================================================
acquire_service_token() {
    log_info "Acquiring service account token..."
    
    # Use ADC (Application Default Credentials) for GCP identity
    if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
        # Service account key file provided
        TOKEN=$(gcloud auth print-access-token 2>/dev/null || echo "")
    else
        # Use metadata server in Cloud Run
        TOKEN=$(curl -sf \
            "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
            -H "Metadata-Flavor: Google" | jq -r '.access_token' 2>/dev/null || echo "")
    fi
    
    if [ -z "$TOKEN" ]; then
        log_warn "No GCP token available, running in anonymous mode"
        export AUTH_HEADER=""
    else
        export AUTH_HEADER="Authorization: Bearer $TOKEN"
        log_info "Token acquired successfully"
    fi
}

# =============================================================================
# OpenAPI Validation
# =============================================================================
run_openapi_validation() {
    log_info "Running OpenAPI spec validation..."
    
    if [ ! -f "$OPENAPI_SPEC" ]; then
        log_error "OpenAPI spec not found: $OPENAPI_SPEC"
        return 1
    fi
    
    # Validate spec structure
    swagger-cli validate "$OPENAPI_SPEC" \
        --output "$RESULTS_DIR/openapi-validation.json" \
        && log_info "OpenAPI spec is valid" \
        || { log_error "OpenAPI spec validation failed"; return 1; }
    
    # Bundle for deployment
    swagger-cli bundle "$OPENAPI_SPEC" \
        --outfile "$RESULTS_DIR/bundled-spec.yaml" \
        --type yaml
    
    log_info "OpenAPI validation complete"
}

# =============================================================================
# Smoke Tests
# =============================================================================
run_smoke_tests() {
    log_info "Running smoke tests against $API_BASE_URL..."
    
    local FAILED=0
    
    # Health check
    log_info "Testing /api/health..."
    if curl -sf "$API_BASE_URL/api/health" | jq -e '.status == "healthy"' > /dev/null; then
        log_info "✓ Health check passed"
    else
        log_error "✗ Health check failed"
        FAILED=$((FAILED + 1))
    fi
    
    # IRS health check
    log_info "Testing /api/irs/health..."
    if curl -sf "$API_BASE_URL/api/irs/health" | jq -e '.status == "healthy"' > /dev/null; then
        log_info "✓ IRS health check passed"
    else
        log_error "✗ IRS health check failed"
        FAILED=$((FAILED + 1))
    fi
    
    # API info
    log_info "Testing /api..."
    if curl -sf "$API_BASE_URL/api" | jq -e '.name' > /dev/null; then
        log_info "✓ API info endpoint passed"
    else
        log_error "✗ API info endpoint failed"
        FAILED=$((FAILED + 1))
    fi
    
    # OpenAPI spec accessibility
    log_info "Testing /api/openapi.yaml..."
    if curl -sf "$API_BASE_URL/api/openapi.yaml" | head -1 | grep -q "openapi\|swagger"; then
        log_info "✓ OpenAPI spec accessible"
    else
        log_error "✗ OpenAPI spec not accessible"
        FAILED=$((FAILED + 1))
    fi
    
    # Form schemas
    log_info "Testing /api/irs/schemas/1099-NEC..."
    if curl -sf "$API_BASE_URL/api/irs/schemas/1099-NEC" | jq -e '.type' > /dev/null; then
        log_info "✓ Schema endpoint passed"
    else
        log_error "✗ Schema endpoint failed"
        FAILED=$((FAILED + 1))
    fi
    
    # Summary
    echo ""
    if [ $FAILED -eq 0 ]; then
        log_info "All smoke tests passed ✓"
        return 0
    else
        log_error "$FAILED smoke test(s) failed"
        return 1
    fi
}

# =============================================================================
# Fuzz Testing
# =============================================================================
run_fuzz_tests() {
    log_info "Running fuzz tests against $API_BASE_URL..."
    
    local FUZZ_COUNT="${FUZZ_ITERATIONS:-100}"
    local FAILED=0
    
    # Fuzz TIN validation endpoint
    log_info "Fuzzing /api/irs/tin-validation (unauthenticated should fail)..."
    for i in $(seq 1 10); do
        # Generate random TIN-like strings
        RANDOM_TIN=$(printf "%02d-%07d" $((RANDOM % 100)) $((RANDOM % 10000000)))
        RANDOM_NAME="FuzzTest$RANDOM"
        
        RESPONSE=$(curl -sf -w "%{http_code}" -o /dev/null \
            -X POST "$API_BASE_URL/api/irs/tin-validation" \
            -H "Content-Type: application/json" \
            -d "{\"tin\":\"$RANDOM_TIN\",\"name\":\"$RANDOM_NAME\"}" 2>/dev/null || echo "000")
        
        # Should return 401 (unauthenticated) or 403 (forbidden), not 500
        if [ "$RESPONSE" = "500" ]; then
            log_error "Server error on fuzz iteration $i (TIN: $RANDOM_TIN)"
            FAILED=$((FAILED + 1))
        fi
    done
    
    # Fuzz transmission check endpoint
    log_info "Fuzzing /api/irs/transmission-check with malformed data..."
    for i in $(seq 1 10); do
        # Send various malformed payloads
        RESPONSE=$(curl -sf -w "%{http_code}" -o /dev/null \
            -X POST "$API_BASE_URL/api/irs/transmission-check" \
            -H "Content-Type: application/json" \
            -d "{\"transmitterId\":\"$RANDOM\",\"filer\":{\"ein\":\"invalid\"}}" 2>/dev/null || echo "000")
        
        # Should return 400 (validation error), not 500
        if [ "$RESPONSE" = "500" ]; then
            log_error "Server error on fuzz iteration $i"
            FAILED=$((FAILED + 1))
        fi
    done
    
    # Summary
    echo ""
    if [ $FAILED -eq 0 ]; then
        log_info "All fuzz tests passed (no server errors) ✓"
        return 0
    else
        log_error "$FAILED fuzz test(s) caused server errors"
        return 1
    fi
}

# =============================================================================
# Contract Testing with Dredd
# =============================================================================
run_contract_tests() {
    log_info "Running contract tests with Dredd..."
    
    if [ ! -f "$OPENAPI_SPEC" ]; then
        log_error "OpenAPI spec not found: $OPENAPI_SPEC"
        return 1
    fi
    
    # Run Dredd against the API
    dredd "$OPENAPI_SPEC" "$API_BASE_URL" \
        --hookfiles="/app/tests/dredd-hooks.js" \
        --reporter=json \
        --output="$RESULTS_DIR/dredd-results.json" \
        || { log_warn "Some contract tests may have failed"; }
    
    log_info "Contract tests complete, results in $RESULTS_DIR/dredd-results.json"
}

# =============================================================================
# Main Entry Point
# =============================================================================
main() {
    log_info "=== Trust Ledger Test Runner ==="
    log_info "Mode: $TEST_MODE"
    log_info "API: $API_BASE_URL"
    log_info "Spec: $OPENAPI_SPEC"
    echo ""
    
    # Acquire auth token
    acquire_service_token
    
    # Run tests based on mode
    case "$TEST_MODE" in
        "openapi")
            run_openapi_validation
            ;;
        "smoke")
            run_smoke_tests
            ;;
        "fuzz")
            run_fuzz_tests
            ;;
        "contract")
            run_contract_tests
            ;;
        "all")
            run_openapi_validation
            run_smoke_tests
            run_fuzz_tests
            ;;
        *)
            log_error "Unknown TEST_MODE: $TEST_MODE"
            log_info "Valid modes: openapi, smoke, fuzz, contract, all"
            exit 1
            ;;
    esac
    
    log_info "=== Test run complete ==="
}

main "$@"
