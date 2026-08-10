import { readFile } from 'node:fs/promises';

const strict = process.argv.includes('--strict');
const knowledgeUrl = new URL('../content/knowledge.json', import.meta.url);
const knowledge = JSON.parse(await readFile(knowledgeUrl, 'utf8'));
const placeholderPattern = /待补充|TBD|TODO|PLACEHOLDER/i;
const issues = [];

const visit = (value, path = 'knowledge') => {
  if (typeof value === 'string' && placeholderPattern.test(value)) {
    issues.push(`${path}: ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => visit(item, `${path}.${key}`));
  }
};

visit(knowledge);

if (issues.length > 0) {
  console.error(`Knowledge profile has ${issues.length} unfinished field(s):`);
  issues.forEach((issue) => console.error(`- ${issue}`));
  if (strict) process.exit(1);
  console.error('AI production enablement remains blocked until these fields are completed.');
} else {
  console.log('Knowledge profile is ready for AI indexing.');
}
