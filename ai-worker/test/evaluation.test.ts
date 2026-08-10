import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dataset = JSON.parse(
  readFileSync(new URL('./evaluation.json', import.meta.url), 'utf8'),
) as Array<{
  language: string;
  question: string;
  expectedType: string | null;
  expectedUrl?: string;
  answerable: boolean;
}>;

describe('retrieval evaluation dataset', () => {
  it('contains at least 30 bilingual cases', () => {
    expect(dataset.length).toBeGreaterThanOrEqual(30);
    expect(new Set(dataset.map((item) => item.language))).toEqual(new Set(['zh', 'en']));
  });

  it('contains answerable, unanswerable, and exact-link cases', () => {
    expect(dataset.some((item) => item.answerable)).toBe(true);
    expect(dataset.some((item) => !item.answerable)).toBe(true);
    expect(dataset.some((item) => item.expectedUrl)).toBe(true);
  });
});
