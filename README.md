# luxudong.me

Personal website and blog for `luxudong.me`.

## Local development

```bash
npm ci
npm run dev
```

The frontend reads published articles from `VITE_CMS_URL`. If the CMS is unavailable,
the bundled MDX article remains available as a safe fallback.

## AI assistant

The repository includes a production-gated RAG assistant in `ai-worker/`.
Cloudflare Workers AI runs the open Qwen embedding and generation models;
Vectorize and D1 provide hybrid retrieval. The existing VPS does not run model
inference.

Personal, career, and project facts live in `content/knowledge.json`. The same
career data is rendered by the website and indexed by the assistant. Production
enablement is intentionally blocked while any field contains `待补充`.

```bash
npm run knowledge:check
```

Cloudflare resource creation, secrets, migration, and deployment instructions
are documented in `ai-worker/README.md`. The website-side environment variables
are listed in `.env.example`.

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

## CMS authoring and preview

The `posts.body` field uses Directus' Markdown interface, including its built-in
Edit and Preview views. The collection also enables content versions and a
site-accurate Live Preview rendered by the React article page.

Preview access is deliberately separate from the public content API:

- Directus only creates a preview grant for a signed-in Data Studio user.
- The grant expires after 10 minutes and is limited to one post and one version.
- The grant is passed in the URL fragment, then removed and kept in session storage.
- The public role remains limited to posts whose status is `published`.

After these files have been deployed to the VPS, enable the integration once:

```bash
cd /opt/luxudong/app
sudo deploy/scripts/setup-cms-preview.sh
```

The setup script generates `CMS_PREVIEW_SECRET` when it is missing, restarts
Directus with the local preview extension, updates the existing `posts` field
and collection metadata, verifies that the preview endpoint rejects anonymous
requests, and reloads Caddy.

To use it, save a new post once so Directus assigns its ID, then enable Preview
from the item header. When changing an already-published post, create a content
version first and promote it only after reviewing the preview.
