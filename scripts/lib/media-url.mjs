/**
 * Resolve Payload / R2 media paths to absolute URLs for blog frontmatter.
 * Supports tenant paths like:
 *   https://pub-….r2.dev/tenants/lokaalnieuwstilburg/<filename>.jpg
 */

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

export function resolveMediaUrl(pathOrUrl, options = {}) {
  const raw = String(pathOrUrl ?? '').trim();
  if (!raw) return options.fallback ?? '';
  if (/^https?:\/\//i.test(raw)) return raw;

  const env = options.env ?? {};
  const base =
    env.R2_PUBLIC_URL ||
    env.PUBLIC_R2_URL ||
    env.PUBLIC_PAYLOAD_MEDIA_URL ||
    env.PUBLIC_MEDIA_URL ||
    '';

  if (!base) return raw.startsWith('/') ? raw : `/${raw.replace(/^\/+/, '')}`;

  const normalizedBase = base.replace(/\/+$/, '');
  const path = raw.startsWith('/') ? raw : `/${raw.replace(/^\/+/, '')}`;
  return `${normalizedBase}${path}`;
}
