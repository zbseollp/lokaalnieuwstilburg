#!/usr/bin/env node
/**
 * Normalize Payload-synced blog markdown before Astro build.
 * Ensures heroImage and category are written when Payload only synced
 * featuredImage / categories[] (site-only fix; no platform/Jenkins changes).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  rebuildMarkdown,
  resolveBlogCategory,
  resolveBlogHeroImage,
  splitFrontmatter,
  upsertFrontmatterField,
} from './lib/blog-frontmatter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');

let updated = 0;
let skipped = 0;

try {
  const files = (await fs.readdir(BLOG_DIR)).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  for (const file of files) {
    const filePath = path.join(BLOG_DIR, file);
    const raw = await fs.readFile(filePath, 'utf8');
    const { frontmatter, body, data } = splitFrontmatter(raw);

    const heroImage = resolveBlogHeroImage(data);
    const category = resolveBlogCategory(data);

    let nextYaml = frontmatter;
    let changed = false;

    if (heroImage && data.heroImage !== heroImage) {
      nextYaml = upsertFrontmatterField(nextYaml, 'heroImage', heroImage);
      changed = true;
    }
    if (category && data.category !== category) {
      nextYaml = upsertFrontmatterField(nextYaml, 'category', category);
      changed = true;
    }

    if (!changed) {
      skipped += 1;
      continue;
    }

    const nextData = { ...data, ...(heroImage ? { heroImage } : {}), category };
    const next = rebuildMarkdown(nextData, body);
    if (next !== raw.replace(/\r\n/g, '\n')) {
      await fs.writeFile(filePath, next, 'utf8');
      updated += 1;
    } else {
      skipped += 1;
    }
  }
} catch (err) {
  if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
    console.log('[normalize:blog] No blog directory — skip.');
    process.exit(0);
  }
  throw err;
}

console.log(`[normalize:blog] updated ${updated}, skipped ${skipped}`);
