#!/usr/bin/env node
/**
 * Fail the build when markdown exists but would all be treated as drafts.
 * That is the "Payload published, site stayed empty" failure mode.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isPublishedFrontmatter, splitFrontmatter } from './lib/blog-frontmatter.mjs';

const BLOG_DIR = 'src/content/blog';
const FLOOR_FILE = '.blog-count-floor';

if (!existsSync(BLOG_DIR)) {
  console.log('[assert-publish-ready] geen blogmap — skip');
  process.exit(0);
}

const files = readdirSync(BLOG_DIR).filter((f) => /\.mdx?$/i.test(f));
let live = 0;
let drafts = 0;

for (const file of files) {
  const raw = readFileSync(path.join(BLOG_DIR, file), 'utf8');
  const { data } = splitFrontmatter(raw);
  if (isPublishedFrontmatter(data)) live += 1;
  else drafts += 1;
}

let floor = 0;
if (existsSync(FLOOR_FILE)) {
  floor = Number.parseInt(readFileSync(FLOOR_FILE, 'utf8').trim(), 10) || 0;
}

if (files.length > 0 && live === 0) {
  console.error(
    `\n[assert-publish-ready] BUILD AFGEBROKEN — ${files.length} bestand(en), 0 live.\n` +
      `Alle artikelen worden als draft gezien (draft/_status/publishStatus). ` +
      `De live site blijft staan.\n`,
  );
  process.exit(1);
}

if (floor > 0 && live < floor) {
  console.error(
    `\n[assert-publish-ready] BUILD AFGEBROKEN — ${live} live artikel(en), ondergrens ${floor}` +
      `${drafts ? ` (${drafts} draft)` : ''}.\n`,
  );
  process.exit(1);
}

console.log(
  `[assert-publish-ready] ${live} live artikel(en)` +
    `${drafts ? `, ${drafts} draft` : ''} — in orde`,
);
