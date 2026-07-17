#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ROOT=${DEPLOY_ROOT:-/opt/luxudong}
BACKUP_DIR="$DEPLOY_ROOT/backups"
ENV_FILE="$DEPLOY_ROOT/.env"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

mkdir -p "$BACKUP_DIR"
cd "$DEPLOY_ROOT/app/deploy"

docker compose --env-file "$ENV_FILE" exec -T database \
  pg_dump -U "$(sed -n 's/^POSTGRES_USER=//p' "$ENV_FILE")" \
  -d "$(sed -n 's/^POSTGRES_DB=//p' "$ENV_FILE")" \
  -Fc > "$BACKUP_DIR/database-$STAMP.dump"

docker run --rm \
  -v luxudong_directus_uploads:/source:ro \
  -v "$BACKUP_DIR:/backup" \
  alpine:3.22 tar -czf "/backup/uploads-$STAMP.tar.gz" -C /source .

find "$BACKUP_DIR" -type f -mtime +7 -delete
echo "Backup complete: $STAMP"
