#!/bin/sh
# FRS §10: Nightly full backup via pg_dump
# Runs as a sidecar service in Docker Swarm

BACKUP_DIR="/backups"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_HOST="${DB_HOST:-db}"
DB_NAME="${DB_NAME:-zyger_erp}"
DB_USER="${DB_USER:-zyger}"

mkdir -p "$BACKUP_DIR"

while true; do
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/zyger_erp_${TIMESTAMP}.sql.gz"

    echo "[$(date -Iseconds)] Starting backup: $BACKUP_FILE"

    pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-privileges --verbose \
        2>/dev/null | gzip > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "[$(date -Iseconds)] Backup complete: $BACKUP_FILE ($SIZE)"
    else
        echo "[$(date -Iseconds)] ERROR: Backup failed!" >&2
        rm -f "$BACKUP_FILE"
    fi

    # Prune old backups
    find "$BACKUP_DIR" -name "zyger_erp_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null

    # Sleep 24 hours
    sleep 86400
done
