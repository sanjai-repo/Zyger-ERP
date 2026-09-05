#!/usr/bin/env bash
# =====================================================================
# Zyger ERP — Staging Health Check Script
#
# Suitable for CI/CD and manual verification. Returns non-zero if any
# readiness check fails.
#
# Checks:
#   - Docker compose services are running
#   - PostgreSQL container healthy
#   - Backend container healthy
#   - Frontend/nginx container healthy
#   - Backend health endpoint via nginx
#   - Frontend reachable via nginx
#   - /api proxy wiring (returns expected status for unknown route / 404/401)
# =====================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.staging.yml"
ENV_FILE="$PROJECT_ROOT/.env.staging"

PORT="${NGINX_PORT:-80}"
BASE_URL="http://localhost:${PORT}"

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
PASS=0; FAIL=0

passed()  { echo -e "${GREEN}  [PASS]${NC} $1"; PASS=$((PASS+1)); }
failed()  { echo -e "${RED}  [FAIL]${NC} $1"; FAIL=$((FAIL+1)); }

echo "=== Zyger ERP — Staging Health Check ==="
echo "Endpoint: $BASE_URL"

# ---------- Compose project ----------
if ! docker compose -f "$COMPOSE_FILE" ps > /dev/null 2>&1; then
    failed "Docker Compose project not found / not running"
    echo -e "${RED}Start it first: ./scripts/deploy-staging.sh${NC}" >&2
    exit 1
fi

# ---------- Container health ----------
for svc in postgres backend frontend nginx; do
    cname="zyger-staging-$svc"
    state="$(docker inspect -f '{{.State.Health.Status}}' "$cname" 2>/dev/null || echo 'missing')"
    if [ "$state" = "healthy" ]; then
        passed "Container $cname is healthy"
    else
        failed "Container $cname health = $state (expected healthy)"
    fi
done

# ---------- Backend health via nginx ----------
code_backend="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BASE_URL/actuator/health" || echo '000')"
if [ "$code_backend" = "200" ]; then
    passed "Backend /actuator/health via nginx -> $code_backend"
else
    failed "Backend /actuator/health via nginx -> $code_backend (expected 200)"
fi

# ---------- Frontend reachable via nginx ----------
code_fe="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BASE_URL/" || echo '000')"
if [ "$code_fe" = "200" ]; then
    passed "Frontend via nginx -> $code_fe"
else
    failed "Frontend via nginx -> $code_fe (expected 200)"
fi

# ---------- API proxy wiring (non-2xx/3xx means proxy reached backend) ----------
code_api="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BASE_URL/api/nonexistent" || echo '000')"
if [ "$code_api" != "000" ] && [ "$code_api" != "502" ] && [ "$code_api" != "504" ]; then
    passed "API proxy /api reached backend (HTTP $code_api)"
else
    failed "API proxy /api did not reach backend (HTTP $code_api)"
fi

# ---------- Actuator restriction (non-health actuator must be blocked) ----------
code_mgmt="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BASE_URL/actuator/env" || echo '000')"
if [ "$code_mgmt" = "403" ] || [ "$code_mgmt" = "404" ]; then
    passed "Sensitive actuator endpoint blocked ($code_mgmt)"
else
    failed "Sensitive actuator endpoint not blocked (HTTP $code_mgmt, expected 403/404)"
fi

echo
echo "=== Result: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
