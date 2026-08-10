import bundledPost from '../../src/content/posts/react-server-components.mdx';
import aiAssistantPost from '../../src/content/posts/personal-website-ai-assistant-rag.mdx';
import type { SourceDocument } from './types';

const parseFrontmatter = (raw: string) => {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { attributes: {} as Record<string, string>, body: raw };
  const attributes = Object.fromEntries(
    match[1].split('\n').flatMap((line) => {
      const separator = line.indexOf(':');
      if (separator < 0) return [];
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      return [[key, value]];
    }),
  );
  return { attributes, body: match[2] };
};

export const getBundledPostDocuments = (): SourceDocument[] => {
  const posts = [
    {
      raw: bundledPost as unknown as string,
      fallbackSlug: 'react-server-components',
      fallbackTitle: 'React Server Components',
      fallbackCategory: 'Engineering',
    },
    {
      raw: aiAssistantPost as unknown as string,
      fallbackSlug: 'personal-website-ai-assistant-rag',
      fallbackTitle: '我是如何为个人网站构建 AI 助手与 RAG 系统的',
      fallbackCategory: 'AI',
    },
  ];

  return posts.map((post) => {
    const { attributes, body } = parseFrontmatter(post.raw);
    const slug = attributes.slug || post.fallbackSlug;
    return {
      id: `blog:${slug}`,
      type: 'blog',
      title: attributes.title || post.fallbackTitle,
      url: `/blog/${slug}`,
      category: attributes.category || post.fallbackCategory,
      publishedAt: attributes.date,
      content: body,
    };
  });
};
