CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('profile', 'career', 'project', 'blog')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  published_at TEXT,
  heading TEXT,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx
ON knowledge_chunks(source_id);

CREATE INDEX IF NOT EXISTS knowledge_chunks_hash_idx
ON knowledge_chunks(content_hash);

CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
  id UNINDEXED,
  title,
  heading,
  content,
  tokenize = 'unicode61'
);

CREATE TABLE IF NOT EXISTS index_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_usage (
  usage_date TEXT PRIMARY KEY,
  generation_count INTEGER NOT NULL DEFAULT 0,
  retrieval_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
