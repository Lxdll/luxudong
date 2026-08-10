import { createHmac, timingSafeEqual } from 'node:crypto';

const POST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION_PATTERN = /^(main|[a-zA-Z0-9._-]{1,100})$/;
const PREVIEW_FIELDS = [
  'id',
  'slug',
  'title',
  'subtitle',
  'body',
  'published_at',
  'read_time',
  'cover_image',
  'category.name',
];

const encode = (value) => Buffer.from(value).toString('base64url');
const decode = (value) => Buffer.from(value, 'base64url').toString('utf8');

const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('base64url');

const createGrant = (payload, secret) => {
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
};

const verifyGrant = (grant, secret) => {
  if (!grant || !grant.includes('.')) return null;

  const [encodedPayload, signature, ...rest] = grant.split('.');
  if (!encodedPayload || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(encodedPayload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const payload = JSON.parse(decode(encodedPayload));
    if (!payload || typeof payload !== 'object' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};

const readBearerGrant = (authorization) => {
  if (typeof authorization !== 'string' || !authorization.startsWith('Preview ')) return '';
  return authorization.slice('Preview '.length).trim();
};

export default {
  id: 'cms-preview',
  handler: (router, { env, getSchema, services, logger }) => {
    const secret = String(env.CMS_PREVIEW_SECRET || '');
    const webUrl = String(env.CMS_PREVIEW_WEB_URL || 'https://luxudong.me');
    const ttl = Math.min(Math.max(Number(env.CMS_PREVIEW_TTL_SECONDS) || 600, 60), 1800);

    const ensureConfigured = (res) => {
      if (secret.length >= 32) return true;
      logger.error('CMS_PREVIEW_SECRET must contain at least 32 characters');
      res.status(503).json({ errors: [{ message: 'CMS preview is not configured' }] });
      return false;
    };

    router.get('/start', (req, res) => {
      if (!ensureConfigured(res)) return;
      if (!req.accountability?.user) {
        res.status(401).json({ errors: [{ message: 'Sign in to Directus before opening a preview' }] });
        return;
      }

      const item = String(req.query.item || '');
      const version = String(req.query.version || 'main');
      if (!POST_ID_PATTERN.test(item) || !VERSION_PATTERN.test(version)) {
        res.status(400).json({ errors: [{ message: 'Invalid preview target' }] });
        return;
      }

      const grant = createGrant({
        item,
        version,
        exp: Math.floor(Date.now() / 1000) + ttl,
      }, secret);

      const destination = new URL(`/preview/posts/${encodeURIComponent(item)}`, webUrl);
      destination.searchParams.set('version', version);
      destination.hash = new URLSearchParams({ grant }).toString();

      res.set('Cache-Control', 'private, no-store');
      res.set('Referrer-Policy', 'no-referrer');
      res.redirect(303, destination.toString());
    });

    router.get('/item/:id', async (req, res) => {
      if (!ensureConfigured(res)) return;

      const id = String(req.params.id || '');
      const version = String(req.query.version || 'main');
      const grant = verifyGrant(readBearerGrant(req.headers.authorization), secret);

      if (!grant || grant.item !== id || grant.version !== version) {
        res.status(401).json({ errors: [{ message: 'Preview grant is invalid or expired' }] });
        return;
      }
      if (!POST_ID_PATTERN.test(id) || !VERSION_PATTERN.test(version)) {
        res.status(400).json({ errors: [{ message: 'Invalid preview target' }] });
        return;
      }

      try {
        const schema = await getSchema();
        const posts = new services.ItemsService('posts', {
          schema,
          accountability: { admin: true },
        });
        const post = await posts.readOne(id, { fields: PREVIEW_FIELDS, version });

        res.set('Cache-Control', 'private, no-store');
        res.json({ data: post });
      } catch (error) {
        logger.warn({ error, id, version }, 'CMS preview item could not be read');
        res.status(404).json({ errors: [{ message: 'Preview item not found' }] });
      }
    });
  },
};
