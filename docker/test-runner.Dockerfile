# =============================================================================
# Serverless Test Runner Image
# =============================================================================
# Purpose: Docker image for serverless OpenAPI bindings, fuzz testing,
# and smoke tests. Designed for ephemeral execution in Cloud Run Jobs.
#
# Features:
# - OpenAPI spec validation and contract testing
# - Fuzz testing with random payloads
# - Smoke tests against deployed endpoints
# - Single-point OAuth for account bucket billing
# =============================================================================

FROM node:22-alpine

LABEL org.opencontainers.image.title="Trust Ledger Test Runner"
LABEL org.opencontainers.image.description="Serverless test runner for OpenAPI validation and fuzz testing"
LABEL org.opencontainers.image.version="1.0.0"

# Install system dependencies
RUN apk add --no-cache \
    curl \
    jq \
    bash \
    ca-certificates \
    dumb-init

WORKDIR /app

# Install test tooling
RUN npm install -g \
    @apidevtools/swagger-cli \
    dredd \
    newman \
    ts-node \
    typescript

# Copy OpenAPI specs and test configs
COPY specs/ ./specs/
COPY tests/ ./tests/

# Copy test runner scripts
COPY --chmod=755 docker/scripts/ ./scripts/

# Default environment (overridden at runtime)
ENV API_BASE_URL="https://trust-ledger-fullstack.run.app"
ENV OPENAPI_SPEC_PATH="/app/specs/unified-api-openapi.yaml"
ENV TEST_MODE="smoke"
ENV LOG_LEVEL="info"

# Health check endpoint for readiness
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -sf http://localhost:8080/health || exit 1

# Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Default: run test suite based on TEST_MODE
CMD ["sh", "-c", "/app/scripts/run-tests.sh"]
