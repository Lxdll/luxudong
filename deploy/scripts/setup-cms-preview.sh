#!/usr/bin/env sh
set -eu

DEPLOY_ROOT=${DEPLOY_ROOT:-/opt/luxudong}
APP_DIR="$DEPLOY_ROOT/app"
ENV_FILE="$DEPLOY_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing deployment environment file: $ENV_FILE" >&2
  exit 1
fi

preview_secret=$(sed -n 's/^CMS_PREVIEW_SECRET=//p' "$ENV_FILE" | head -n 1)
if [ -z "$preview_secret" ] || [ "$preview_secret" = "replace-with-at-least-32-random-characters" ]; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "OpenSSL is required to generate CMS_PREVIEW_SECRET." >&2
    exit 1
  fi
  preview_secret=$(openssl rand -hex 32)
  if grep -q '^CMS_PREVIEW_SECRET=' "$ENV_FILE"; then
    sed -i "s/^CMS_PREVIEW_SECRET=.*/CMS_PREVIEW_SECRET=$preview_secret/" "$ENV_FILE"
  else
    printf '\nCMS_PREVIEW_SECRET=%s\n' "$preview_secret" >> "$ENV_FILE"
  fi
  chmod 600 "$ENV_FILE"
  echo "Generated CMS preview signing secret."
fi

if [ "${#preview_secret}" -lt 32 ]; then
  echo "CMS_PREVIEW_SECRET must contain at least 32 characters." >&2
  exit 1
fi

cd "$APP_DIR/deploy"
docker compose --env-file "$ENV_FILE" up -d --no-deps --force-recreate directus

ready=false
for _ in $(seq 1 30); do
  if docker compose --env-file "$ENV_FILE" exec -T directus \
    node -e "fetch('http://127.0.0.1:8055/server/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    ready=true
    break
  fi
  sleep 2
done

if [ "$ready" != true ]; then
  echo "Directus did not become healthy in time." >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" exec -T directus node /project/bootstrap.mjs

preview_status=$(docker compose --env-file "$ENV_FILE" exec -T directus node -e \
  "fetch('http://127.0.0.1:8055/cms-preview/start?item=00000000-0000-4000-8000-000000000000&version=main',{redirect:'manual'}).then(r=>process.stdout.write(String(r.status))).catch(()=>process.stdout.write('000'))")

if [ "$preview_status" != 401 ]; then
  echo "CMS preview extension check failed with HTTP $preview_status." >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" up -d --no-deps --force-recreate caddy
echo "CMS Markdown editor, content versions, and secure live preview are enabled."
