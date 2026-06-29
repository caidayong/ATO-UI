import GithubSlugger from 'github-slugger';
import type { DocHeading } from '@/types/docs';

export function extractHeadings(markdown: string): DocHeading[] {
  const slugger = new GithubSlugger();
  const headings: DocHeading[] = [];

  for (const line of markdown.split('\n')) {
    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].replace(/\*\*/g, '').trim();
    const id = slugger.slug(text);
    headings.push({ level, text, id });
  }

  return headings;
}
