#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Starting Local Launch (No Compose/K8s mode)...${NC}"

# 1. Start Infrastructure
echo -e "${BLUE}Booting Infrastructure Containers...${NC}"
docker rm -f redis rabbitmq ledger-db audit-db 2>/dev/null || true

docker run -d --name redis -p 6379:6379 redis:7.2-alpine
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=admin rabbitmq:3.12-management-alpine

# Ledger DB (Port 5433)
docker run -d --name ledger-db -p 5433:5432 \
  -e POSTGRES_PASSWORD=ledger_service \
  -e POSTGRES_USER=ledger_service \
  -e POSTGRES_DB=ledger_service \
  postgres:15-alpine

# Audit DB (Port 5435)
docker run -d --name audit-db -p 5435:5432 \
  -e POSTGRES_PASSWORD=audit_service \
  -e POSTGRES_USER=audit_service \
  -e POSTGRES_DB=audit_service \
  postgres:15-alpine

echo "Waiting for infrastructure to initialize..."
sleep 5

# 2. Install Dependencies
echo -e "${BLUE}Installing Node dependencies in server/...${NC}"
cd server
npm install --silent
npm install --save-dev concurrently --silent

# 3. Start Services
echo -e "${GREEN}Starting Microservices via Concurrently...${NC}"
echo "API Gateway: http://localhost:8080"
echo "RabbitMQ Console: http://localhost:15672 (admin/admin)"

# Define Service Commands
# Note: Using 'npm start' which runs 'tsx index.js'

CMD_GATEWAY="SERVICE_NAME=api-gateway PORT=8080 LEDGER_SERVICE_URL=http://localhost:3003 AUDIT_SERVICE_URL=http://localhost:3006 RABBITMQ_HOST=localhost RABBITMQ_PORT=5672 RABBITMQ_USER=admin RABBITMQ_PASS=admin REDIS_HOST=localhost npm start"

CMD_LEDGER="SERVICE_NAME=ledger-service PORT=3003 DB_HOST=localhost DB_PORT=5433 DB_NAME=ledger_service DB_USER=ledger_service DB_PASSWORD=ledger_service RABBITMQ_HOST=localhost RABBITMQ_PORT=5672 RABBITMQ_USER=admin RABBITMQ_PASS=admin REDIS_HOST=localhost npm start"

CMD_AUDIT="SERVICE_NAME=audit-service PORT=3006 DB_HOST=localhost DB_PORT=5435 DB_NAME=audit_service DB_USER=audit_service DB_PASSWORD=audit_service RABBITMQ_HOST=localhost RABBITMQ_PORT=5672 RABBITMQ_USER=admin RABBITMQ_PASS=admin REDIS_HOST=localhost npm start"

# Run concurrently
npx concurrently -k \
  -n "GATEWAY,LEDGER,AUDIT" \
  -c "blue,green,red" \
  "$CMD_GATEWAY" \
  "$CMD_LEDGER" \
  "$CMD_AUDIT"
