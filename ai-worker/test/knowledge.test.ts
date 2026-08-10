import { describe, expect, it } from 'vitest';
import knowledge from '../../content/knowledge.json';
import {
  buildProfileIntroduction,
  buildProfileDocuments,
  chunkDocument,
  validateKnowledge,
} from '../src/knowledge';

describe('knowledge preparation', () => {
  it('blocks placeholder content from production indexing', () => {
    const incomplete = structuredClone(knowledge);
    incomplete.profile.summary = '个人介绍待补充';
    const issues = validateKnowledge(incomplete);
    expect(issues.length).toBeGreaterThan(0);
    expect(() => buildProfileDocuments(incomplete)).toThrow(/incomplete/i);
  });

  it('builds documents from a completed profile', () => {
    expect(validateKnowledge()).toEqual([]);
    const documents = buildProfileDocuments(knowledge);
    expect(documents.some((document) => document.type === 'profile')).toBe(true);
    expect(documents.some((document) => document.type === 'career')).toBe(true);
    expect(documents.some((document) => document.type === 'project')).toBe(true);
  });

  it('builds grounded bilingual profile introductions', () => {
    expect(buildProfileIntroduction('zh')).toContain('我是鲁旭东的 AI 助手');
    expect(buildProfileIntroduction('zh')).toContain('4 年前端开发经验');
    expect(buildProfileIntroduction('en')).toContain("I'm Luxudong's AI assistant");
    expect(buildProfileIntroduction('en')).toContain('four years of experience');
  });

  it('keeps headings and URLs when chunking long content', () => {
    const content = `# Overview\n${'个人网站内容。'.repeat(140)}\n\n## AI\n${'检索增强生成。'.repeat(140)}`;
    const chunks = chunkDocument({
      id: 'blog:test',
      type: 'blog',
      title: '测试文章',
      url: '/blog/test',
      content,
    }, { maxChars: 600, minChars: 200, overlapChars: 60 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.url === '/blog/test')).toBe(true);
    expect(chunks.some((chunk) => chunk.heading === 'AI')).toBe(true);
  });
});
