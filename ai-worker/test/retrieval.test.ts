import { describe, expect, it } from 'vitest';
import { lexicalTokens } from '../src/db';
import {
  diversifySources,
  isProfileIntroductionQuery,
  reciprocalRankFusion,
  toPublicSources,
  withTimeout,
} from '../src/retrieval';
import type { RetrievalMatch } from '../src/types';

const match = (id: string, sourceId: string): RetrievalMatch => ({
  id,
  sourceId,
  sourceType: 'blog',
  title: id,
  url: `/blog/${sourceId}`,
  content: id,
  contentHash: id,
  fusedScore: 0,
});

describe('hybrid retrieval', () => {
  it('promotes results present in both rankings', () => {
    const semantic = [match('semantic-only', 'a'), match('shared', 'b')];
    const lexical = [match('shared', 'b'), match('lexical-only', 'c')];
    const [first] = reciprocalRankFusion(semantic, lexical);
    expect(first.id).toBe('shared');
  });

  it('caps each source at two chunks', () => {
    const results = diversifySources([
      match('a1', 'a'),
      match('a2', 'a'),
      match('a3', 'a'),
      match('b1', 'b'),
    ]);
    expect(results.map((item) => item.id)).toEqual(['a1', 'a2', 'b1']);
  });

  it('preserves the person name in long Chinese questions', () => {
    const tokens = lexicalTokens('请用两句话介绍一下鲁旭东');
    expect(tokens).toContain('鲁旭东');
    expect(lexicalTokens('鲁旭东做过哪些合同编辑器相关工作')).toContain('合同');
  });

  it('routes profile introductions without requiring embeddings', () => {
    expect(isProfileIntroductionQuery('介绍一下鲁旭东')).toBe(true);
    expect(isProfileIntroductionQuery('你是谁')).toBe(true);
    expect(isProfileIntroductionQuery('你叫什么名字？')).toBe(true);
    expect(isProfileIntroductionQuery('Who are you?')).toBe(true);
    expect(isProfileIntroductionQuery('Who is Luxudong?')).toBe(true);
    expect(isProfileIntroductionQuery('找一下 React Server Components 的文章')).toBe(false);
    expect(isProfileIntroductionQuery('你是谁写的文章')).toBe(false);
  });

  it('times out stalled model calls promptly', async () => {
    await expect(withTimeout(
      new Promise<never>(() => undefined),
      5,
      'Embedding',
    )).rejects.toThrow('Embedding timed out');
  });

  it('renders one source card for multiple chunks from the same source', () => {
    expect(toPublicSources([
      match('profile-1', 'profile'),
      match('profile-2', 'profile'),
      match('career-1', 'career'),
    ])).toHaveLength(2);
  });
});
