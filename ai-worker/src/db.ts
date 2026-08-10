import type { KnowledgeChunk, RetrievalMatch } from './types';

type ChunkRow = {
  id: string;
  source_id: string;
  source_type: KnowledgeChunk['sourceType'];
  title: string;
  url: string;
  category: string | null;
  published_at: string | null;
  heading: string | null;
  content: string;
  content_hash: string;
};

const toChunk = (row: ChunkRow): KnowledgeChunk => ({
  id: row.id,
  sourceId: row.source_id,
  sourceType: row.source_type,
  title: row.title,
  url: row.url,
  category: row.category || undefined,
  publishedAt: row.published_at || undefined,
  heading: row.heading || undefined,
  content: row.content,
  contentHash: row.content_hash,
});

const chunksOf = <T>(items: T[], size = 50) => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

export async function getExistingChunkHashes(db: D1Database) {
  const result = await db.prepare('SELECT id, content_hash FROM knowledge_chunks').all<{
    id: string;
    content_hash: string;
  }>();
  return new Map(result.results.map((row) => [row.id, row.content_hash]));
}

export async function upsertChunks(db: D1Database, chunks: KnowledgeChunk[]) {
  const now = new Date().toISOString();
  for (const batch of chunksOf(chunks)) {
    const statements: D1PreparedStatement[] = [];
    batch.forEach((chunk) => {
      statements.push(
        db.prepare('DELETE FROM knowledge_fts WHERE id = ?').bind(chunk.id),
        db.prepare(`
          INSERT INTO knowledge_chunks (
            id, source_id, source_type, title, url, category, published_at,
            heading, content, content_hash, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            source_id = excluded.source_id,
            source_type = excluded.source_type,
            title = excluded.title,
            url = excluded.url,
            category = excluded.category,
            published_at = excluded.published_at,
            heading = excluded.heading,
            content = excluded.content,
            content_hash = excluded.content_hash,
            updated_at = excluded.updated_at
        `).bind(
          chunk.id,
          chunk.sourceId,
          chunk.sourceType,
          chunk.title,
          chunk.url,
          chunk.category || null,
          chunk.publishedAt || null,
          chunk.heading || null,
          chunk.content,
          chunk.contentHash,
          now,
        ),
        db.prepare(`
          INSERT INTO knowledge_fts (id, title, heading, content)
          VALUES (?, ?, ?, ?)
        `).bind(chunk.id, chunk.title, chunk.heading || '', chunk.content),
      );
    });
    await db.batch(statements);
  }
}

export async function deleteChunks(db: D1Database, ids: string[]) {
  for (const batch of chunksOf(ids)) {
    const statements = batch.flatMap((id) => [
      db.prepare('DELETE FROM knowledge_fts WHERE id = ?').bind(id),
      db.prepare('DELETE FROM knowledge_chunks WHERE id = ?').bind(id),
    ]);
    await db.batch(statements);
  }
}

export async function getChunksByIds(db: D1Database, ids: string[]) {
  if (ids.length === 0) return new Map<string, KnowledgeChunk>();
  const placeholders = ids.map(() => '?').join(',');
  const result = await db
    .prepare(`SELECT * FROM knowledge_chunks WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<ChunkRow>();
  return new Map(result.results.map((row) => [row.id, toChunk(row)]));
}

export async function getChunksBySourceId(
  db: D1Database,
  sourceId: string,
  limit = 2,
) {
  const result = await db
    .prepare('SELECT * FROM knowledge_chunks WHERE source_id = ? ORDER BY id LIMIT ?')
    .bind(sourceId, limit)
    .all<ChunkRow>();
  return result.results.map((row, index) => ({
    ...toChunk(row),
    lexicalScore: 1 / (index + 1),
    fusedScore: 1 / (index + 1),
  }));
}

const prioritizeCjkTokens = (run: string) => {
  if (run.length <= 4) return [run];
  const pairs = Array.from(
    { length: run.length - 1 },
    (_, index) => run.slice(index, index + 2),
  );
  const alternatingPairs: string[] = [];
  for (let offset = 0; offset < pairs.length; offset += 1) {
    const fromEnd = pairs.at(-(offset + 1));
    const fromStart = pairs[offset];
    if (fromEnd) alternatingPairs.push(fromEnd);
    if (fromStart && fromStart !== fromEnd) alternatingPairs.push(fromStart);
  }
  return [
    ...(run.length <= 12 ? [run] : []),
    run.slice(-4),
    run.slice(-3),
    run.slice(0, 4),
    run.slice(0, 3),
    ...alternatingPairs,
  ];
};

export const lexicalTokens = (query: string) => {
  const rawLatin = query.toLowerCase().match(/[a-z0-9][a-z0-9.+#-]{1,}/g) || [];
  const latin = rawLatin.length > 1
    ? rawLatin.filter((token) => token !== 'luxudong')
    : rawLatin;
  const focusedCjk = query.replace(
    /鲁旭东|请用两句话|请用|请问|介绍一下|介绍|一下|做过|哪些|相关工作|相关|有关|关于|帮我|找一下|他的|他/g,
    ' ',
  );
  const focusedRuns = focusedCjk.match(/[\u3400-\u9fff]{2,}/g) || [];
  const cjkRuns = focusedRuns.length > 0
    ? focusedRuns
    : query.match(/[\u3400-\u9fff]{2,}/g) || [];
  const cjk = cjkRuns.flatMap(prioritizeCjkTokens);
  return [...new Set([...latin, ...cjk])].slice(0, 24);
};

export async function lexicalSearch(db: D1Database, query: string, limit = 8) {
  const tokens = lexicalTokens(query);
  if (tokens.length === 0) return [] as RetrievalMatch[];

  const latinTokens = tokens.filter((token) => /^[a-z0-9]/i.test(token));
  const rows = new Map<string, { chunk: KnowledgeChunk; rank: number }>();

  if (latinTokens.length > 0) {
    const matchQuery = latinTokens
      .map((token) => `"${token.replaceAll('"', '""')}"*`)
      .join(' OR ');
    const result = await db.prepare(`
      SELECT c.*, bm25(knowledge_fts, 0, 3, 2, 1) AS lexical_rank
      FROM knowledge_fts
      JOIN knowledge_chunks c ON c.id = knowledge_fts.id
      WHERE knowledge_fts MATCH ?
      ORDER BY lexical_rank
      LIMIT ?
    `).bind(matchQuery, limit).all<ChunkRow & { lexical_rank: number }>();
    result.results.forEach((row, index) => {
      rows.set(row.id, { chunk: toChunk(row), rank: index + 1 });
    });
  }

  const likeTokens = tokens.filter((token) => token.length >= 2).slice(0, 24);
  const conditions = likeTokens.flatMap(() => ['lower(title) LIKE ?', 'lower(content) LIKE ?']);
  const scoreParts = likeTokens.map((token, index) => {
    const phraseWeight = index === 0 && token.length >= 3 ? 50 : Math.min(token.length, 4);
    return `CASE WHEN lower(content) LIKE ? THEN ${phraseWeight} ELSE 0 END`;
  });
  const scoreBindings = likeTokens.map((token) => `%${token.toLowerCase()}%`);
  const conditionBindings = likeTokens.flatMap((token) => [
    `%${token.toLowerCase()}%`,
    `%${token.toLowerCase()}%`,
  ]);
  const likeResult = await db.prepare(`
    SELECT *, (${scoreParts.join(' + ')}) AS lexical_hits
    FROM knowledge_chunks
    WHERE ${conditions.join(' OR ')}
    ORDER BY lexical_hits DESC, title ASC
    LIMIT ?
  `).bind(...scoreBindings, ...conditionBindings, limit).all<ChunkRow & { lexical_hits: number }>();
  likeResult.results.forEach((row, index) => {
    if (!rows.has(row.id)) rows.set(row.id, { chunk: toChunk(row), rank: rows.size + index + 1 });
  });

  return [...rows.values()]
    .slice(0, limit)
    .map(({ chunk, rank }) => ({
      ...chunk,
      lexicalScore: 1 / rank,
      fusedScore: 0,
    }));
}

export async function setIndexState(db: D1Database, key: string, value: string) {
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO index_state (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).bind(key, value, now).run();
}

export async function getIndexMeta(db: D1Database) {
  const [counts, state] = await db.batch([
    db.prepare(`
      SELECT
        COUNT(*) AS chunk_count,
        COUNT(DISTINCT source_id) AS document_count
      FROM knowledge_chunks
    `),
    db.prepare(`SELECT key, value, updated_at FROM index_state WHERE key = 'last_indexed_at'`),
  ]);
  const countRow = (counts.results?.[0] || {}) as {
    chunk_count?: number;
    document_count?: number;
  };
  const stateRow = (state.results?.[0] || {}) as {
    value?: string;
    updated_at?: string;
  };
  return {
    chunkCount: Number(countRow.chunk_count || 0),
    documentCount: Number(countRow.document_count || 0),
    indexUpdatedAt: stateRow.value || stateRow.updated_at || null,
  };
}

const usageDate = () => new Date().toISOString().slice(0, 10);

export async function incrementUsage(
  db: D1Database,
  field: 'generation_count' | 'retrieval_count' | 'error_count',
) {
  const date = usageDate();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO daily_usage (usage_date, ${field}, updated_at)
    VALUES (?, 1, ?)
    ON CONFLICT(usage_date) DO UPDATE SET
      ${field} = ${field} + 1,
      updated_at = excluded.updated_at
  `).bind(date, now).run();
}

export async function getDailyGenerationCount(db: D1Database) {
  const row = await db.prepare(`
    SELECT generation_count FROM daily_usage WHERE usage_date = ?
  `).bind(usageDate()).first<{ generation_count: number }>();
  return Number(row?.generation_count || 0);
}
