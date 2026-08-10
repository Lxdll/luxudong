import knowledge from '../../content/knowledge.json';

export const profile = knowledge.profile;

export type CareerFact = {
  label: string;
  value: string;
};

export type CareerEntry = {
  kicker: string;
  meta: string;
  title: string;
  entity: string;
  location: string;
  lead: string;
  facts: CareerFact[];
  visual: string;
  visualLabel: string;
  tags: string[];
  note: string;
};

export const careerEntries = knowledge.career satisfies CareerEntry[];

export type ProjectEntry = {
  slug: string;
  title: string;
  summary: string;
  role: string;
  technologies: string[];
  highlights: string[];
  url: string;
};

export const projectEntries = knowledge.projects satisfies ProjectEntry[];

export const blogCategories = [
  '全部',
  'AI',
  'Frontend',
  'React',
  'TypeScript',
  'Engineering',
  'Design',
  'Tools',
  'Life',
];
