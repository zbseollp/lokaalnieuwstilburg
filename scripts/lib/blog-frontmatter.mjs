/**
 * Shared blog frontmatter helpers for Astro schema and build scripts.
 */

export function resolveBlogHeroImage(data) {
  const pick = (value) => {
    if (typeof value === 'string') return value.trim() || undefined;
    if (value && typeof value === 'object') {
      for (const key of ['url', 'src', 'filename']) {
        const candidate = value[key];
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
      }
    }
    return undefined;
  };
  return pick(data.heroImage) || pick(data.featuredImage) || pick(data.image);
}

const UNPUBLISHED_STATUS = new Set([
  'draft',
  'private',
  'pending',
  'trash',
  'auto-draft',
  'inherit',
  'future',
  'scheduled',
  'unpublished',
]);
const PUBLISHED_STATUS = new Set(['publish', 'published', 'live', 'public']);

/** WordPress `_status: publish` and Payload `published` are both live. */
export function isPublishedFrontmatter(data) {
  const status = String(data?._status ?? data?.publishStatus ?? '')
    .trim()
    .toLowerCase();
  if (PUBLISHED_STATUS.has(status)) return true;
  if (UNPUBLISHED_STATUS.has(status)) return false;

  const draft = data?.draft;
  if (draft === true) return false;
  if (typeof draft === 'string' && ['true', 'draft', 'yes', '1'].includes(draft.trim().toLowerCase())) {
    return false;
  }
  return true;
}

export function resolveBlogCategory(data) {
  const labels = [data.category, ...(Array.isArray(data.categories) ? data.categories : [])]
    .map((item) => (item == null ? '' : String(item).trim()))
    .filter(Boolean);
  return labels.find((label) => !/^\d+$/.test(label)) || 'Nieuws';
}

export function splitFrontmatter(raw) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: '', body: normalized, data: {} };
  const data = parseSimpleYaml(match[1]);
  return { frontmatter: match[1], body: match[2], data };
}

export function parseSimpleYaml(yaml) {
  const data = {};
  let currentListKey = null;

  for (const line of yaml.split('\n')) {
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch && currentListKey) {
      data[currentListKey].push(stripYamlScalar(listMatch[1]));
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;

    const key = kv[1];
    const value = kv[2].trim();
    currentListKey = null;

    if (value === '') {
      data[key] = [];
      currentListKey = key;
      continue;
    }

    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((part) => stripYamlScalar(part.trim()))
        .filter(Boolean);
      continue;
    }

    data[key] = coerceYamlScalar(stripYamlScalar(value));
  }

  return data;
}

function stripYamlScalar(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function coerceYamlScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export function upsertFrontmatterField(yaml, key, value) {
  const line = `${key}: ${yamlEscape(value)}`;
  const re = new RegExp(`^${key}:\\s*.*$`, 'm');
  if (re.test(yaml)) return yaml.replace(re, line);
  return `${yaml.trimEnd()}\n${line}`;
}

export function removeFrontmatterField(yaml, key) {
  return yaml
    .replace(new RegExp(`^${key}:\\s*.*\\r?\\n?`, 'm'), '')
    .replace(new RegExp(`^${key}:\\s*\\n(?:\\s+- .+\\n)*`, 'm'), '');
}

export function yamlEscape(value) {
  return JSON.stringify(String(value ?? ''));
}

export function rebuildMarkdown(data, body) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (!value.length) continue;
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${yamlEscape(item)}`);
      continue;
    }
    if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
      continue;
    }
    if (typeof value === 'object') continue;
    lines.push(`${key}: ${yamlEscape(String(value))}`);
  }
  lines.push('---', '');
  return `${lines.join('\n')}${body.replace(/^\n+/, '')}`;
}
