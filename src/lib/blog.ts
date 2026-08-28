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

/** Turn Payload/R2 paths into absolute URLs for cards and article heroes. */
export function absolutizeBlogMediaUrl(url?: string | null): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const base = (
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_R2_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_PAYLOAD_MEDIA_URL) ||
    DEFAULT_R2_BASE
  )
    .replace(/\/+$/, '')

  if (trimmed.startsWith('tenants/')) return `${base}/${trimmed.replace(/^\/+/, '')}`
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`
  return `${base}${path}`
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
