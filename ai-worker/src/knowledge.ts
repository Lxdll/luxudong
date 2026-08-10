import knowledge from '../../content/knowledge.json';
import type { KnowledgeChunk, SourceDocument } from './types';

const placeholderPattern = /待补充|TBD|TODO|PLACEHOLDER/i;

type KnowledgeData = typeof knowledge;

const flattenStrings = (value: unknown, path = 'knowledge'): Array<{ path: string; value: string }> => {
  if (typeof value === 'string') return [{ path, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenStrings(item, `${path}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => flattenStrings(item, `${path}.${key}`));
  }
  return [];
};

export const validateKnowledge = (data: KnowledgeData = knowledge) => (
  flattenStrings(data)
    .filter((item) => placeholderPattern.test(item.value))
    .map((item) => `${item.path}: ${item.value}`)
);

export const buildProfileIntroduction = (
  language: 'zh' | 'en',
  data: KnowledgeData = knowledge,
) => {
  const { profile } = data;
  return language === 'zh'
    ? `我是${profile.name}的 AI 助手，会根据他的公开个人资料、项目和博客回答问题。${profile.name}，${profile.role}。${profile.summary}`
    : `I'm ${profile.englishName}'s AI assistant. I answer questions using his public profile, projects, and blog posts. ${profile.englishName} (${profile.name}) is a ${profile.role}. ${profile.summaryEn}`;
};

export const buildProfileDocuments = (
  data: KnowledgeData = knowledge,
  options: { strict?: boolean } = {},
): SourceDocument[] => {
  const issues = validateKnowledge(data);
  if (options.strict !== false && issues.length > 0) {
    throw new Error(`Knowledge profile is incomplete:\n${issues.join('\n')}`);
  }

  const documents: SourceDocument[] = [];
  const { profile } = data;
  const profileContent = [
    `# ${profile.name} / ${profile.englishName}`,
    profile.summary,
    profile.summaryEn,
    `## 身份\n${profile.role}`,
    `## 所在地\n${profile.location}`,
    `## 当前关注\n${profile.currentFocus.join('\n')}`,
    `## 技能\n${profile.skills.join('\n')}`,
    `## 站内入口\n${profile.links.map((link) => `${link.label}: ${link.url}`).join('\n')}`,
  ].join('\n\n');

  documents.push({
    id: 'profile:overview',
    type: 'profile',
    title: `${profile.name}的个人档案`,
    url: '/',
    category: '个人档案',
    content: profileContent,
  });

  data.career.forEach((entry, index) => {
    documents.push({
      id: `career:${index + 1}`,
      type: 'career',
      title: entry.title,
      url: '/career',
      category: '职业经历',
      content: [
        `# ${entry.title}`,
        `${entry.meta} / ${entry.entity} / ${entry.location}`,
        entry.lead,
        ...entry.facts.map((fact) => `## ${fact.label}\n${fact.value}`),
        `## 关键词\n${entry.tags.join('、')}`,
        entry.note,
      ].join('\n\n'),
    });
  });

  data.projects.forEach((project) => {
    documents.push({
      id: `project:${project.slug}`,
      type: 'project',
      title: project.title,
      url: project.url,
      category: '项目',
      content: [
        `# ${project.title}`,
        project.summary,
        `## 角色\n${project.role}`,
        `## 技术\n${project.technologies.join('、')}`,
        `## 亮点\n${project.highlights.join('\n')}`,
      ].join('\n\n'),
    });
  });

  return documents;
};

const normalizeText = (value: string) => (
  value
    .replace(/\r\n/g, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
);

const splitLongSection = (text: string, maxChars: number, overlapChars: number) => {
  if (text.length <= maxChars) return [text];
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  paragraphs.forEach((paragraph) => {
    if (!current) {
      current = paragraph;
      return;
    }
    if (`${current}\n\n${paragraph}`.length <= maxChars) {
      current = `${current}\n\n${paragraph}`;
      return;
    }
    chunks.push(current);
    const overlap = current.slice(-overlapChars);
    current = `${overlap}\n\n${paragraph}`;
  });
  if (current) chunks.push(current);
  return chunks;
};

export const chunkDocument = (
  document: SourceDocument,
  options: { maxChars?: number; minChars?: number; overlapChars?: number } = {},
): Array<Omit<KnowledgeChunk, 'id' | 'contentHash'>> => {
  const maxChars = options.maxChars || 800;
  const minChars = options.minChars || 300;
  const overlapChars = options.overlapChars || 100;
  const text = normalizeText(document.content);
  const lines = text.split('\n');
  const sections: Array<{ heading?: string; content: string }> = [];
  let heading: string | undefined;
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join('\n').trim();
    if (content) sections.push({ heading, content });
    buffer = [];
  };

  lines.forEach((line) => {
    const match = line.match(/^#{1,3}\s+(.+)$/);
    if (match) {
      flush();
      heading = match[1].trim();
    } else {
      buffer.push(line);
    }
  });
  flush();

  const pieces = sections.flatMap((section) => (
    splitLongSection(section.content, maxChars, overlapChars)
      .map((content) => ({ heading: section.heading, content }))
  ));

  const merged: typeof pieces = [];
  pieces.forEach((piece) => {
    const previous = merged.at(-1);
    if (previous && previous.content.length < minChars
      && `${previous.content}\n\n${piece.content}`.length <= maxChars) {
      previous.content = `${previous.content}\n\n${piece.content}`;
      previous.heading ||= piece.heading;
    } else {
      merged.push({ ...piece });
    }
  });

  return merged.map((piece) => ({
    sourceId: document.id,
    sourceType: document.type,
    title: document.title,
    url: document.url,
    category: document.category,
    publishedAt: document.publishedAt,
    heading: piece.heading,
    content: normalizeText(`${document.title}\n${piece.heading || ''}\n${piece.content}`),
  }));
};

export const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const createChunks = async (documents: SourceDocument[]): Promise<KnowledgeChunk[]> => {
  const output: KnowledgeChunk[] = [];
  for (const document of documents) {
    const pieces = chunkDocument(document);
    for (const [index, piece] of pieces.entries()) {
      const contentHash = await sha256(JSON.stringify(piece));
      output.push({
        ...piece,
        id: `${document.id}:${index}:${contentHash.slice(0, 12)}`,
        contentHash,
      });
    }
  }
  return output;
};
