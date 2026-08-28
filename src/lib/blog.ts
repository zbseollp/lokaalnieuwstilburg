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

/** Resolve the display image from Payload-synced frontmatter (R2 https URLs supported). */
export function resolveBlogHeroImage(data: BlogFrontmatterInput): string | undefined {
  const hero = data.heroImage?.trim()
  if (hero) return hero
  const featured = data.featuredImage?.trim()
  if (featured) return featured
  const image = data.image?.trim()
  return image || undefined
}

/** Resolve category label for cards and article badges. */
export function resolveBlogCategory(data: BlogFrontmatterInput): string {
  const single = data.category?.trim()
  if (single) return single
  const fromList = data.categories?.map((c) => c.trim()).find(Boolean)
  return fromList || "Nieuws"
}
