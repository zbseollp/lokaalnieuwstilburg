#!/usr/bin/env node
/**
 * Heal Payload-synced markdown that would abort `astro build`
 * (bare `<`, unclosed comments, null bytes, script tags).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuildMarkdown, splitFrontmatter } from './lib/blog-frontmatter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, '..', 'src/content/blog');

function sanitizeBody(body) {
  let out = String(body || '').replace(/\u0000/g, '');
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<!--(?![\s\S]*?-->)/g, '');
  // `a < b` is parsed as HTML and can abort the markdown compiler.
  out = out.replace(/<(?![a-zA-Z/!?])/g, '&lt;');
  return out;
}

let updated = 0;
let skipped = 0;

try {
  const files = (await fs.readdir(BLOG_DIR)).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  for (const file of files) {
    const filePath = path.join(BLOG_DIR, file);
    const raw = await fs.readFile(filePath, 'utf8');
    const { body, data } = splitFrontmatter(raw);
    const nextBody = sanitizeBody(body);
    if (nextBody === body) {
      skipped += 1;
      continue;
    }
    const next = rebuildMarkdown(data, nextBody);
    await fs.writeFile(filePath, next, 'utf8');
    updated += 1;
    console.log(`[sanitize:blog] healed ${file}`);
  }
} catch (err) {
  if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
    console.log('[sanitize:blog] No blog directory — skip.');
    process.exit(0);
  }
  throw err;
}

console.log(`[sanitize:blog] updated ${updated}, skipped ${skipped}`);
