# luxudong.me

Personal website and blog for `luxudong.me`.

## Local development

```bash
npm ci
npm run dev
```

The frontend reads published articles from `VITE_CMS_URL`. If the CMS is unavailable,
the bundled MDX article remains available as a safe fallback.

## Checks

```bash
npm run lint
npm run build
```

## Production

Production uses Docker Compose with Caddy, the frontend image, Directus, and PostgreSQL.
Configuration lives in `deploy/`; secrets live only in `/opt/luxudong/.env` on the server.

Deployment is automatic after a successful push to `main`. Images are published to
`ghcr.io/lxdll/luxudong-web` with immutable commit tags. The server deployment script
performs a health check and restores the previous image if the new container is unhealthy.

DNS records required after the first deployment is verified:

- `luxudong.me` → `47.88.48.225`
- `www.luxudong.me` → `47.88.48.225`
- `cms.luxudong.me` → `47.88.48.225`

`www` permanently redirects to the apex domain. Directus is available at
`https://cms.luxudong.me` after DNS cutover.
