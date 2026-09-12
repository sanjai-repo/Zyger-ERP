#!/usr/bin/env bash
# =====================================================================
# Zyger ERP — Staging Database Restore
#
#   Usage: ./scripts/restore-staging.sh <backup-file.dump.gz>
#
# Restores a backup created by backup-staging.sh (custom pg_dump format,
# gzipped) into the running staging PostgreSQL database.
#
# WARNING: This REPLACES the current staging data. Existing objects are
# dropped and recreated from the backup. This is DESTRUCTIVE and requires
# an explicit typed confirmation before any action is taken.
#
# The PostgreSQL container is not exposed to the host, so restore runs
# inside the container via `docker compose exec`. No password is printed.
# =====================================================================
set -Eeuo pipefail

if [ "$#" -lt 1 ] || [ -z "$1" ]; then
    echo "Usage: $0 <backup-file.dump.gz>" >&2
    echo "Example: $0 backups/zyger_erp_20260902_193000.dump.gz" >&2
    exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.staging.yml"
ENV_FILE="$PROJECT_ROOT/.env.staging"

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

DB_NAME="${POSTGRES_DB:?POSTGRES_DB not set}"
DB_USER="${POSTGRES_USER:?POSTGRES_USER not set}"
CONTAINER="zyger-staging-postgres"

echo "=== Zyger ERP — Database Restore ==="
echo "Backup file  : $BACKUP_FILE"
echo "Target DB    : $DB_NAME@$CONTAINER"
echo

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: PostgreSQL container '$CONTAINER' is not running." >&2
    exit 1
fi

echo "WARNING: This will REPLACE all current data in '$DB_NAME' with the"
echo "         content of the backup. This is DESTRUCTIVE and cannot be undone."
echo
read -r -p "Type 'RESTORE' (uppercase) to confirm: " confirm
if [ "$confirm" != "RESTORE" ]; then
    echo "Aborted. No changes were made."
    exit 1
fi

echo "Restoring '$BACKUP_FILE' into '$DB_NAME' ..."
if ! gunzip -c "$BACKUP_FILE" \
    | docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges; then
    echo "ERROR: Restore failed. The database may be partially modified." >&2
    exit 1
fi

echo "=== Restore complete ==="
echo "NOTE: Restart the backend to re-load any cached data: docker compose -f docker-compose.staging.yml restart backend"
