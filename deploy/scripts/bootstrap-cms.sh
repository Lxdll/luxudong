#!/usr/bin/env sh
set -eu

DEPLOY_ROOT=${DEPLOY_ROOT:-/opt/luxudong}
cd "$DEPLOY_ROOT/app/deploy"

docker compose --env-file "$DEPLOY_ROOT/.env" exec -T directus node /project/bootstrap.mjs
docker compose --env-file "$DEPLOY_ROOT/.env" exec -T directus npx directus schema snapshot /tmp/snapshot.yaml
docker cp luxudong-directus-1:/tmp/snapshot.yaml directus/snapshot.yaml
chmod 644 directus/snapshot.yaml
