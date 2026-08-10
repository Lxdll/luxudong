import {
  deleteChunks,
  getExistingChunkHashes,
  setIndexState,
  upsertChunks,
} from './db';
import {
  buildProfileDocuments,
  createChunks,
} from './knowledge';
import { getBundledPostDocuments } from './bundled-posts';
import { embedTexts } from './retrieval';
import type { Env, SourceDocument } from './types';

type DirectusPost = {
  id: string;
  slug: string;
  title: string;
  body: string;
  published_at?: string | null;
  category?: { name?: string } | null;
};

const fetchDirectusDocuments = async (baseUrl: string): Promise<SourceDocument[]> => {
  const params = new URLSearchParams({
    fields: 'id,slug,title,body,published_at,category.name',
    sort: '-published_at',
    limit: '-1',
  });
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/items/posts?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Directus returned ${response.status}`);
  const payload = await response.json() as { data: DirectusPost[] };
  return payload.data.map((post) => ({
    id: `blog:${post.id}`,
    type: 'blog',
    title: post.title,
    url: `/blog/${post.slug}`,
    category: post.category?.name || '未分类',
    publishedAt: post.published_at || undefined,
    content: post.body,
  }));
};

const batchesOf = <T>(items: T[], size: number) => {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
};

export async function reindexKnowledge(env: Env) {
  const startedAt = Date.now();
  const profileDocuments = buildProfileDocuments(undefined, { strict: true });
  let blogDocuments: SourceDocument[];
  let blogSource = 'directus';

  try {
    const directusDocuments = await fetchDirectusDocuments(env.DIRECTUS_URL);
    const directusUrls = new Set(directusDocuments.map((document) => document.url));
    blogDocuments = [
      ...directusDocuments,
      ...getBundledPostDocuments().filter((document) => !directusUrls.has(document.url)),
    ];
    blogSource = 'directus+bundled-mdx';
  } catch (error) {
    blogSource = 'bundled-mdx';
    blogDocuments = getBundledPostDocuments();
    console.error(JSON.stringify({ event: 'directus_fallback', message: String(error) }));
  }

  const chunks = await createChunks([...profileDocuments, ...blogDocuments]);
  const existing = await getExistingChunkHashes(env.DB);
  const nextIds = new Set(chunks.map((chunk) => chunk.id));
  const changed = chunks.filter((chunk) => existing.get(chunk.id) !== chunk.contentHash);
  const staleIds = [...existing.keys()].filter((id) => !nextIds.has(id));

  for (const batch of batchesOf(changed, 32)) {
    const embeddings = await embedTexts(env.AI, batch.map((chunk) => chunk.content));
    if (embeddings.length !== batch.length) {
      throw new Error('Embedding count does not match chunk count');
    }
    await env.VECTOR_INDEX.upsert(batch.map((chunk, index) => ({
      id: chunk.id,
      values: embeddings[index],
      namespace: '',
      metadata: {
        sourceId: chunk.sourceId,
        sourceType: chunk.sourceType,
        title: chunk.title,
        url: chunk.url,
      },
    })));
    await upsertChunks(env.DB, batch);
  }

  for (const batch of batchesOf(staleIds, 1000)) {
    await env.VECTOR_INDEX.deleteByIds(batch);
    await deleteChunks(env.DB, batch);
  }

  const completedAt = new Date().toISOString();
  await setIndexState(env.DB, 'last_indexed_at', completedAt);
  await setIndexState(env.DB, 'blog_source', blogSource);

  return {
    documents: profileDocuments.length + blogDocuments.length,
    chunks: chunks.length,
    changed: changed.length,
    deleted: staleIds.length,
    blogSource,
    elapsedMs: Date.now() - startedAt,
    completedAt,
  };
}
