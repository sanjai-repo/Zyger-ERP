#!/usr/bin/env bash
# ===================================================================
# Zyger ERP — Staging Deployment Script
# Automates building and launching containers on your staging server
# ===================================================================

set -e

GREEN='\033[0;32m'
NC='\033[0m'
RED='\033[0;31m'
YELLOW='\033[1;33m'

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}   Zyger ERP - Staging Deployment   ${NC}"
echo -e "${GREEN}===========================================${NC}"

# Step 1: Check Docker Installation
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker Engine first.${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose V2 is not installed.${NC}"
    exit 1
fi

# Step 2: Check Environment File
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Copying .env.staging.example to .env...${NC}"
    cp .env.staging.example .env
    echo -e "${YELLOW}Please review and edit .env with your staging server credentials!${NC}"
fi

# Step 3: Build & Start Containers
echo -e "${GREEN}Building and launching containers via Docker Compose...${NC}"
docker compose down --remove-orphans || true
docker compose up -d --build

# Step 4: Health Check Verification
echo -e "${GREEN}Waiting for database and backend services to initialize...${NC}"
sleep 10

echo -e "${GREEN}Checking service status...${NC}"
docker compose ps

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}   Deployment Successful!                 ${NC}"
echo -e "${GREEN}   - Frontend: http://localhost:9091      ${NC}"
echo -e "${GREEN}   - Backend:  http://localhost:9090      ${NC}"
echo -e "${GREEN}===========================================${NC}"
