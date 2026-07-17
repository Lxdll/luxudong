const baseUrl = process.env.DIRECTUS_INTERNAL_URL || 'http://127.0.0.1:8055';

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.errors?.map((error) => error.message).join('; ') || response.statusText;
    const error = new Error(`${options.method || 'GET'} ${path}: ${response.status} ${detail}`);
    error.status = response.status;
    throw error;
  }
  return payload?.data ?? payload;
}

const login = await api('/auth/login', {
  method: 'POST',
  body: {
    email: process.env.ADMIN_EMAIL || process.env.DIRECTUS_ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD || process.env.DIRECTUS_ADMIN_PASSWORD,
  },
});
const token = login.access_token;

const fields = {
  categories: [
    { field: 'id', type: 'uuid', meta: { hidden: true, readonly: true, interface: 'input', special: ['uuid'] }, schema: { is_primary_key: true } },
    { field: 'name', type: 'string', meta: { interface: 'input', required: true, width: 'half' }, schema: { is_nullable: false, is_unique: true, max_length: 100 } },
    { field: 'slug', type: 'string', meta: { interface: 'input', required: true, width: 'half' }, schema: { is_nullable: false, is_unique: true, max_length: 100 } },
    { field: 'sort', type: 'integer', meta: { interface: 'input', hidden: true }, schema: { default_value: 0 } },
  ],
  posts: [
    { field: 'id', type: 'uuid', meta: { hidden: true, readonly: true, interface: 'input', special: ['uuid'] }, schema: { is_primary_key: true } },
    { field: 'status', type: 'string', meta: { interface: 'select-dropdown', width: 'half', options: { choices: [
      { text: '草稿', value: 'draft' }, { text: '已发布', value: 'published' }, { text: '已归档', value: 'archived' },
    ] } }, schema: { default_value: 'draft', max_length: 32 } },
    { field: 'slug', type: 'string', meta: { interface: 'input', required: true, width: 'half' }, schema: { is_nullable: false, is_unique: true, max_length: 255 } },
    { field: 'title', type: 'string', meta: { interface: 'input', required: true }, schema: { is_nullable: false, max_length: 255 } },
    { field: 'subtitle', type: 'text', meta: { interface: 'input-multiline' }, schema: {} },
    { field: 'body', type: 'text', meta: { interface: 'input-code', required: true, options: { language: 'markdown', lineNumber: true } }, schema: { is_nullable: false } },
    { field: 'published_at', type: 'timestamp', meta: { interface: 'datetime', width: 'half' }, schema: {} },
    { field: 'read_time', type: 'string', meta: { interface: 'input', width: 'half' }, schema: { max_length: 50 } },
    { field: 'cover_image', type: 'uuid', meta: { interface: 'file-image', special: ['file'] }, schema: {} },
    { field: 'category', type: 'uuid', meta: { interface: 'select-dropdown-m2o', special: ['m2o'], width: 'half' }, schema: {} },
    { field: 'seo_title', type: 'string', meta: { interface: 'input', width: 'half' }, schema: { max_length: 255 } },
    { field: 'seo_description', type: 'text', meta: { interface: 'input-multiline', width: 'half' }, schema: {} },
    { field: 'date_created', type: 'timestamp', meta: { special: ['date-created'], interface: 'datetime', readonly: true, hidden: true }, schema: {} },
    { field: 'date_updated', type: 'timestamp', meta: { special: ['date-updated'], interface: 'datetime', readonly: true, hidden: true }, schema: {} },
  ],
};

for (const [collection, collectionFields] of Object.entries(fields)) {
  try {
    await api('/collections', {
      method: 'POST', token,
      body: {
        collection,
        meta: collection === 'posts'
          ? { icon: 'article', note: '博客文章', display_template: '{{title}}', archive_field: 'status', archive_value: 'archived', unarchive_value: 'draft', sort_field: null }
          : { icon: 'category', note: '博客分类', display_template: '{{name}}', sort_field: 'sort' },
        schema: {},
        fields: collectionFields,
      },
    });
    console.log(`Created collection: ${collection}`);
  } catch (error) {
    if (error.status !== 409) throw error;
    console.log(`Collection already exists: ${collection}`);
  }
}

for (const relation of [
  { collection: 'posts', field: 'cover_image', related_collection: 'directus_files', meta: { many_collection: 'posts', many_field: 'cover_image', one_collection: 'directus_files' }, schema: { table: 'posts', column: 'cover_image', foreign_key_table: 'directus_files', foreign_key_column: 'id', on_delete: 'SET NULL' } },
  { collection: 'posts', field: 'category', related_collection: 'categories', meta: { many_collection: 'posts', many_field: 'category', one_collection: 'categories' }, schema: { table: 'posts', column: 'category', foreign_key_table: 'categories', foreign_key_column: 'id', on_delete: 'SET NULL' } },
]) {
  try {
    await api('/relations', { method: 'POST', token, body: relation });
  } catch (error) {
    if (error.status !== 409) throw error;
  }
}

const publicPolicies = await api('/policies?filter[name][_eq]=$t:public&limit=1', { token });
const publicPolicy = publicPolicies?.[0];
if (!publicPolicy) throw new Error('Directus public policy was not found');

const existingPermissions = await api(`/permissions?filter[policy][_eq]=${publicPolicy.id}&filter[collection][_in]=posts,categories`, { token });
for (const permission of [
  { collection: 'posts', action: 'read', fields: ['id', 'slug', 'title', 'subtitle', 'body', 'published_at', 'read_time', 'cover_image', 'category'], permissions: { status: { _eq: 'published' } } },
  { collection: 'categories', action: 'read', fields: ['id', 'name', 'slug', 'sort'], permissions: {} },
  { collection: 'directus_files', action: 'read', fields: ['id', 'type', 'width', 'height', 'filename_download'], permissions: {} },
]) {
  if (!existingPermissions.some((item) => item.collection === permission.collection && item.action === permission.action)) {
    await api('/permissions', { method: 'POST', token, body: { ...permission, policy: publicPolicy.id, validation: {}, presets: null } });
  }
}

const categoryPayload = await api('/items/categories?filter[slug][_eq]=engineering&limit=1', { token });
let category = categoryPayload?.[0];
if (!category) {
  category = await api('/items/categories', { method: 'POST', token, body: { name: 'Engineering', slug: 'engineering', sort: 1 } });
}

const existingPost = await api('/items/posts?filter[slug][_eq]=react-server-components&limit=1', { token });
if (!existingPost?.length) {
  await api('/items/posts', {
    method: 'POST', token,
    body: {
      status: 'published',
      slug: 'react-server-components',
      title: 'The Future of React: Server Components Explained',
      subtitle: 'Diving deep into how RSC changes the mental model of React development and performance optimization strategies.',
      published_at: '2024-10-24T00:00:00.000Z',
      read_time: '8 min read',
      category: category.id,
      body: `React Server Components (RSC) represent the biggest architectural shift in the React ecosystem since hooks. They allow us to render components on the server that have zero impact on the client-side bundle size. But what does this actually mean for how we build applications?

## The Mental Model Shift

Traditionally, we've thought of React components as client-side entities that might occasionally be server-rendered for initial HTML. With RSC, we flip this model: components are server-first by default, and we opt-in to client-side interactivity only when needed.

> Server Components allow developers to build apps that span the server and client, combining rich interactivity with improved performance.

### Interactive Component Demo

:::counter

### Key Benefits

* **Zero Bundle Size:** Server components are not sent to the browser.
* **Direct Backend Access:** Access your database directly from your components.
* **Automatic Code Splitting:** Client components imported by server components are automatically code-split.

\`\`\`tsx
async function ProductDetails({ id }) {
  const product = await db.products.findById(id);
  return <h1>{product.name}</h1>;
}
\`\`\`

## When to use Client Components?

You still need Client Components for interactivity, state, lifecycle effects, and browser-only APIs.`,
    },
  });
}

console.log('Directus bootstrap complete.');
