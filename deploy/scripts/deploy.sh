#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 || ! $1 =~ ^sha-[0-9a-f]{40}$ ]]; then
  echo "Usage: $0 sha-<40-character-git-commit>" >&2
  exit 2
fi

DEPLOY_ROOT=${DEPLOY_ROOT:-/opt/luxudong}
APP_DIR="$DEPLOY_ROOT/app"
ENV_FILE="$DEPLOY_ROOT/.env"
NEW_TAG=$1

cd "$APP_DIR"
git fetch --quiet origin main
git checkout --quiet main
git pull --ff-only --quiet origin main

cd deploy
OLD_TAG=$(sed -n 's/^WEB_IMAGE_TAG=//p' "$ENV_FILE" | head -n1)
sed -i "s/^WEB_IMAGE_TAG=.*/WEB_IMAGE_TAG=$NEW_TAG/" "$ENV_FILE"

rollback() {
  echo "Deployment failed; restoring ${OLD_TAG:-previous image}." >&2
  if [[ -n ${OLD_TAG:-} ]]; then
    sed -i "s/^WEB_IMAGE_TAG=.*/WEB_IMAGE_TAG=$OLD_TAG/" "$ENV_FILE"
    docker compose --env-file "$ENV_FILE" up -d --no-deps web
  fi
}
trap rollback ERR

docker compose --env-file "$ENV_FILE" pull web
docker compose --env-file "$ENV_FILE" up -d --no-deps web

for _ in {1..30}; do
  STATUS=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' luxudong-web-1 2>/dev/null || true)
  [[ $STATUS == healthy ]] && break
  sleep 2
done

[[ ${STATUS:-} == healthy ]]
curl --fail --silent --show-error --max-time 10 --resolve luxudong.me:80:127.0.0.1 http://luxudong.me/healthz >/dev/null || true
trap - ERR
echo "Deployment complete: $NEW_TAG"
