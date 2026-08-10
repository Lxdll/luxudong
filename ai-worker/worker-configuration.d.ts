type Ai = object;

interface VectorizeMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

interface VectorizeVector {
  id: string;
  values: number[];
  namespace?: string;
  metadata?: Record<string, string | number | boolean>;
}

interface VectorizeIndex {
  query(
    vector: number[],
    options: { topK: number; returnMetadata?: 'all' | 'indexed' | 'none' },
  ): Promise<{ matches: VectorizeMatch[] }>;
  upsert(vectors: VectorizeVector[]): Promise<{ count: number }>;
  deleteByIds(ids: string[]): Promise<{ count: number }>;
}

interface D1Result<T = Record<string, unknown>> {
  success: boolean;
  results: T[];
  meta?: Record<string, unknown>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1Result<T>>>;
}

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

interface ExportedHandler<Env> {
  fetch?(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response>;
  scheduled?(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): void | Promise<void>;
}
