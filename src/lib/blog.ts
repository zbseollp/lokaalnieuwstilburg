/**
 * Normalize Payload-synced blog frontmatter for Astro templates.
 * Payload writes heroImage, featuredImage, image, and categories[] — this site
 * reads heroImage and category (singular).
 */

export type BlogFrontmatterInput = {
  heroImage?: string
  featuredImage?: string
  image?: string
  category?: string
  categories?: string[]
}

const DEFAULT_R2_BASE = 'https://pub-d4024ad3e57841448e0ee58a19abe46b.r2.dev'
const TENANT_SLUG = 'lokaalnieuwstilburg'

function mediaBase(): string {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_R2_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_PAYLOAD_MEDIA_URL) ||
    DEFAULT_R2_BASE
  ).replace(/\/+$/, '')
}

function tenantObjectKey(pathOrFilename: string): string {
  const clean = pathOrFilename.trim().replace(/^\/+/, '')
  if (!clean) return ''
  if (clean.startsWith('tenants/')) return clean
  const filename = clean.includes('/') ? clean.split('/').pop()! : clean
  return `tenants/${TENANT_SLUG}/${filename}`
}

function fixR2TenantUrl(url: string, base: string): string {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('.r2.dev')) return url
    if (parsed.pathname.includes('/tenants/')) return url
    const filename = parsed.pathname.split('/').filter(Boolean).pop()
    if (!filename) return url
    return `${base}/${tenantObjectKey(filename)}`
  } catch {
    return url
  }
}

/** Turn Payload/R2 paths into absolute tenant media URLs for cards and article heroes. */
export function absolutizeBlogMediaUrl(url?: string | null): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined

  const base = mediaBase()

  if (/^https?:\/\//i.test(trimmed)) {
    return fixR2TenantUrl(trimmed, base)
  }

  return `${base}/${tenantObjectKey(trimmed)}`
}

/** Resolve the display image from Payload-synced frontmatter (R2 https URLs supported). */
export function resolveBlogHeroImage(data: BlogFrontmatterInput): string | undefined {
  const hero = absolutizeBlogMediaUrl(data.heroImage)
  if (hero) return hero
  const featured = absolutizeBlogMediaUrl(data.featuredImage)
  if (featured) return featured
  return absolutizeBlogMediaUrl(data.image)
}

/** Resolve category label for cards and article badges. */
export function resolveBlogCategory(data: BlogFrontmatterInput): string {
  const single = data.category?.trim()
  if (single) return single
  const fromList = data.categories?.map((c) => c.trim()).find(Boolean)
  return fromList || "Nieuws"
}
