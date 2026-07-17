#!/usr/bin/env sh
set -eu

DEPLOY_ROOT=${DEPLOY_ROOT:-/opt/luxudong}
cd "$DEPLOY_ROOT/app/deploy"

docker compose --env-file "$DEPLOY_ROOT/.env" exec -T directus node /project/bootstrap.mjs
docker compose --env-file "$DEPLOY_ROOT/.env" exec -T directus npx directus schema snapshot --yes /project/snapshot.yaml
