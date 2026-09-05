#!/usr/bin/env bash
# =====================================================================
# Zyger ERP — Staging Database Backup
#
# Runs pg_dump inside the (internal) PostgreSQL container and writes a
# timestamped compressed backup to the configured backup directory.
#
#   Usage: ./scripts/backup-staging.sh [backup-dir]
#
# PostgreSQL is not exposed to the host, so the dump is taken inside the
# container via `docker compose exec`. No database password is printed.
# =====================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.staging.yml"
ENV_FILE="$PROJECT_ROOT/.env.staging"

# Configurable backup directory (default: ./backups)
BACKUP_DIR="${1:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-0}"   # 0 = keep forever (no auto-delete)

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

DB_NAME="${POSTGRES_DB:?POSTGRES_DB not set}"
DB_USER="${POSTGRES_USER:?POSTGRES_USER not set}"
CONTAINER="zyger-staging-postgres"

echo "=== Zyger ERP — Database Backup ==="

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: PostgreSQL container '$CONTAINER' is not running." >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump.gz"

echo "Dumping database '$DB_NAME'..."
# -Fc -> custom format, supports selective restore via pg_restore; piped to gzip.
if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc \
    | gzip > "$BACKUP_FILE"; then
    echo "ERROR: Backup failed." >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
echo "Backup written: $BACKUP_FILE ($SIZE)"

if [ "$RETENTION_DAYS" -gt 0 ]; then
    echo "Pruning backups older than ${RETENTION_DAYS} days..."
    find "$BACKUP_DIR" -name "${DB_NAME}_*.dump.gz" -mtime "+${RETENTION_DAYS}" -delete
fi

echo "=== Backup complete ==="
