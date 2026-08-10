export type SourceType = 'profile' | 'career' | 'project' | 'blog';

export type SourceDocument = {
  id: string;
  type: SourceType;
  title: string;
  url: string;
  category?: string;
  publishedAt?: string;
  content: string;
};

export type KnowledgeChunk = {
  id: string;
  sourceId: string;
  sourceType: SourceType;
  title: string;
  url: string;
  category?: string;
  publishedAt?: string;
  heading?: string;
  content: string;
  contentHash: string;
};

export type RetrievalMatch = KnowledgeChunk & {
  semanticScore?: number;
  lexicalScore?: number;
  fusedScore: number;
};

export type PublicSource = {
  id: string;
  title: string;
  url: string;
  type: SourceType;
  excerpt: string;
  score: number;
};

export interface Env {
  AI: Ai;
  VECTOR_INDEX: VectorizeIndex;
  DB: D1Database;
  CHAT_RATE_LIMITER: RateLimit;
  ALLOWED_ORIGINS: string;
  DIRECTUS_URL: string;
  DAILY_GENERATION_LIMIT: string;
  TURNSTILE_BYPASS: string;
  TURNSTILE_SECRET_KEY: string;
  REINDEX_SECRET: string;
}

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};
