/**
 * Resolve Payload / R2 media paths to absolute URLs for blog frontmatter.
 * Correct format:
 *   https://pub-….r2.dev/tenants/lokaalnieuwstilburg/<filename>.jpg
 */

const DEFAULT_R2_BASE = 'https://pub-d4024ad3e57841448e0ee58a19abe46b.r2.dev';
const TENANT_SLUG = 'lokaalnieuwstilburg';

export function extractMediaPath(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    if (typeof value.url === 'string' && value.url.trim()) return value.url.trim();
    if (typeof value.filename === 'string' && value.filename.trim()) return value.filename.trim();
    if (typeof value.src === 'string' && value.src.trim()) return value.src.trim();
  }
  return '';
}

function mediaBase(env = {}) {
  return (
    env.R2_PUBLIC_URL ||
    env.PUBLIC_R2_URL ||
    env.PUBLIC_PAYLOAD_MEDIA_URL ||
    env.PUBLIC_MEDIA_URL ||
    DEFAULT_R2_BASE
  ).replace(/\/+$/, '');
}

function tenantObjectKey(pathOrFilename) {
  const clean = String(pathOrFilename ?? '').trim().replace(/^\/+/, '');
  if (!clean) return '';
  if (clean.startsWith('tenants/')) return clean;
  const filename = clean.includes('/') ? clean.split('/').pop() : clean;
  return `tenants/${TENANT_SLUG}/${filename}`;
}

function fixR2TenantUrl(url, base) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('.r2.dev')) return url;
    if (parsed.pathname.includes('/tenants/')) return url;
    const filename = parsed.pathname.split('/').filter(Boolean).pop();
    if (!filename) return url;
    return `${base}/${tenantObjectKey(filename)}`;
  } catch {
    return url;
  }
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg)(\?|#|$)/i;

function looksLikeImageUrl(raw) {
  try {
    const parsed = new URL(raw);
    if (IMAGE_EXT.test(parsed.pathname)) return true;
    if (parsed.hostname.includes('.r2.dev')) return true;
    if (parsed.pathname.includes('/media/') || parsed.pathname.includes('/tenants/')) return true;
    return false;
  } catch {
    return IMAGE_EXT.test(raw);
  }
}

export function resolveMediaUrl(pathOrUrl, options = {}) {
  const raw = String(pathOrUrl ?? '').trim();
  if (!raw) return options.fallback ?? '';

  const base = mediaBase(options.env ?? {});

  if (/^https?:\/\//i.test(raw)) {
    if (!looksLikeImageUrl(raw)) return options.fallback ?? '';
    return fixR2TenantUrl(raw, base);
  }

  if (!base) {
    const key = tenantObjectKey(raw);
    return key.startsWith('/') ? key : `/${key}`;
  }

  return `${base}/${tenantObjectKey(raw)}`;
}
