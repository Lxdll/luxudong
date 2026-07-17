const CMS_URL = (import.meta.env.VITE_CMS_URL || '').replace(/\/$/, '');

type DirectusPost = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  body: string;
  published_at?: string | null;
  read_time?: string | null;
  cover_image?: string | null;
  category?: { name?: string } | null;
};

export interface Post {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  body?: string;
  component?: React.ComponentType;
}

const formatDate = (value?: string | null) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
};

const mapPost = (post: DirectusPost): Post => ({
  id: post.id,
  slug: post.slug,
  title: post.title,
  subtitle: post.subtitle || '',
  body: post.body,
  date: formatDate(post.published_at),
  readTime: post.read_time || '',
  category: post.category?.name || '未分类',
  image: post.cover_image && CMS_URL
    ? `${CMS_URL}/assets/${post.cover_image}`
    : '',
});

async function fetchCmsPosts(slug?: string): Promise<Post[]> {
  if (!CMS_URL) throw new Error('CMS URL is not configured');

  const params = new URLSearchParams({
    fields: 'id,slug,title,subtitle,body,published_at,read_time,cover_image,category.name',
    sort: '-published_at',
  });
  if (slug) params.set('filter[slug][_eq]', slug);

  const response = await fetch(`${CMS_URL}/items/posts?${params}`);
  if (!response.ok) throw new Error(`CMS request failed: ${response.status}`);
  const payload = await response.json() as { data: DirectusPost[] };
  return payload.data.map(mapPost);
}

function getBundledPosts(): Post[] {
  const modules = import.meta.glob('../content/posts/*.mdx', { eager: true });

  return Object.entries(modules).map(([path, mod]: [string, any]) => {
    const slug = path.split('/').pop()?.replace('.mdx', '') || '';
    return {
      id: slug,
      slug,
      ...mod.frontmatter,
      component: mod.default,
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getAllPosts(): Promise<Post[]> {
  try {
    return await fetchCmsPosts();
  } catch (error) {
    console.warn('CMS unavailable; using bundled articles.', error);
    return getBundledPosts();
  }
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  try {
    return (await fetchCmsPosts(slug))[0];
  } catch (error) {
    console.warn('CMS unavailable; using bundled article.', error);
    return getBundledPosts().find((post) => post.slug === slug);
  }
}
