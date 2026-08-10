import {
  getChunksByIds,
  getChunksBySourceId,
  lexicalSearch,
} from './db';
import type { Env, KnowledgeChunk, RetrievalMatch } from './types';

export const EMBEDDING_MODEL = '@cf/qwen/qwen3-embedding-0.6b';
export const GENERATION_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
export const EMBEDDING_TIMEOUT_MS = 8_000;
export const GENERATION_TIMEOUT_MS = 12_000;

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

export const isProfileIntroductionQuery = (query: string) => {
  const normalized = query.toLowerCase().replace(/\s+/g, '');
  return [
    /^(?:你是谁|你叫什么(?:名字)?|你是什么(?:助手)?)[？?。.！!]*$/,
    /^(?:whoareyou|whatareyou|what(?:'s|is)yourname)[?.!]*$/,
    /介绍(?:一下)?(?:鲁旭东|luxudong|你自己|自己)/,
    /(?:鲁旭东|luxudong).*(?:是谁|介绍|简介|个人资料|背景)/,
    /(?:自我介绍|个人介绍)/,
    /(?:whois|introduce|tellmeabout)(?:luxudong|luxu?dong|鲁旭东)/,
    /(?:luxudong|luxu?dong).*(?:profile|background|introduction)/,
  ].some((pattern) => pattern.test(normalized));
};

const getEmbeddingData = (result: unknown): number[][] => {
  const value = result as {
    data?: number[][] | Array<{ embedding: number[] }>;
    result?: { data?: number[][] | Array<{ embedding: number[] }> };
  };
  const data = value.data || value.result?.data;
  if (!Array.isArray(data)) throw new Error('Embedding model returned no vectors');
  if (Array.isArray(data[0])) return data as number[][];
  return (data as Array<{ embedding: number[] }>).map((item) => item.embedding);
};

export async function embedTexts(ai: Ai, texts: string[]) {
  const result = await (ai as unknown as {
    run(model: string, input: Record<string, unknown>): Promise<unknown>;
  }).run(EMBEDDING_MODEL, {
    text: texts,
    instruction: 'Given a personal website question, retrieve passages that answer it.',
  });
  return getEmbeddingData(result);
}

export function reciprocalRankFusion(
  semantic: RetrievalMatch[],
  lexical: RetrievalMatch[],
  limit = 8,
) {
  const matches = new Map<string, RetrievalMatch>();
  const add = (items: RetrievalMatch[], kind: 'semantic' | 'lexical') => {
    items.forEach((item, index) => {
      const previous = matches.get(item.id) || { ...item, fusedScore: 0 };
      previous.fusedScore += 1 / (60 + index + 1);
      if (kind === 'semantic') previous.semanticScore = item.semanticScore;
      else previous.lexicalScore = item.lexicalScore;
      matches.set(item.id, previous);
    });
  };
  add(semantic, 'semantic');
  add(lexical, 'lexical');
  return [...matches.values()]
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .slice(0, limit);
}

export function diversifySources(matches: RetrievalMatch[], limit = 5) {
  const counts = new Map<string, number>();
  return matches.filter((match) => {
    const count = counts.get(match.sourceId) || 0;
    if (count >= 2) return false;
    counts.set(match.sourceId, count + 1);
    return true;
  }).slice(0, limit);
}

export async function retrieve(
  env: Env,
  query: string,
  options: { semantic?: boolean; embeddingTimeoutMs?: number } = {},
) {
  if (isProfileIntroductionQuery(query)) {
    const matches = await getChunksBySourceId(env.DB, 'profile:overview');
    return {
      matches,
      embeddingAvailable: false,
      isRelevant: matches.length > 0,
      route: 'profile' as const,
    };
  }

  const lexicalPromise = lexicalSearch(env.DB, query, 8);
  let semantic: RetrievalMatch[] = [];
  let embeddingAvailable = options.semantic !== false;

  if (options.semantic !== false) {
    try {
      const [queryVector] = await withTimeout(
        embedTexts(env.AI, [query]),
        options.embeddingTimeoutMs || EMBEDDING_TIMEOUT_MS,
        'Embedding',
      );
      const result = await env.VECTOR_INDEX.query(queryVector, {
        topK: 8,
        returnMetadata: 'all',
      });
      const ids = result.matches.map((match) => match.id);
      const chunks = await getChunksByIds(env.DB, ids);
      semantic = result.matches.flatMap((match) => {
        const chunk = chunks.get(match.id);
        if (!chunk) return [];
        return [{
          ...chunk,
          semanticScore: match.score,
          fusedScore: 0,
        }];
      });
    } catch (error) {
      embeddingAvailable = false;
      console.error(JSON.stringify({ event: 'embedding_error', message: String(error) }));
    }
  }

  const lexical = await lexicalPromise;
  const fused = reciprocalRankFusion(semantic, lexical);
  const matches = diversifySources(fused);
  const isRelevant = matches.some((match) => (
    (match.semanticScore || 0) >= 0.42 || (match.lexicalScore || 0) >= 0.2
  ));

  return {
    matches,
    embeddingAvailable,
    isRelevant,
    route: embeddingAvailable ? 'hybrid' as const : 'lexical' as const,
  };
}

export const toPublicSource = (match: RetrievalMatch) => ({
  id: match.id,
  title: match.title,
  url: match.url,
  type: match.sourceType,
  excerpt: match.content.replace(/\s+/g, ' ').slice(0, 120),
  score: Number((match.semanticScore || match.lexicalScore || match.fusedScore).toFixed(4)),
});

export const toPublicSources = (matches: RetrievalMatch[]) => {
  const sourceIds = new Set<string>();
  return matches.flatMap((match) => {
    if (sourceIds.has(match.sourceId)) return [];
    sourceIds.add(match.sourceId);
    return [toPublicSource(match)];
  });
};

const escapeReference = (value: string) => (
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
);

export const buildContext = (chunks: KnowledgeChunk[]) => chunks.map((chunk, index) => [
  `<source id="${index + 1}" title="${escapeReference(chunk.title)}" url="${escapeReference(chunk.url)}">`,
  escapeReference(chunk.content.slice(0, 1800)),
  '</source>',
].join('\n')).join('\n\n');
