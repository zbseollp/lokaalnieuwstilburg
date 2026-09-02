import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import {
  isDraftFrontmatter,
  resolveBlogCategory,
  resolveBlogHeroImage,
  resolveBlogHeroImageAlt,
} from "./lib/blog";

/**
 * Payload kan velden weglaten, op null zetten of als media-object schrijven.
 * De schema's hieronder accepteren al die vormen; anders valt een heel bericht
 * uit de collectie en verdwijnt het van /blog/.
 */
const mediaValue = z
  .union([
    z.string(),
    z
      .object({
        url: z.string().optional(),
        src: z.string().optional(),
        filename: z.string().optional(),
        alt: z.string().optional(),
      })
      .passthrough(),
  ])
  .nullish();

const optionalText = z.preprocess(
  (val) => (val == null || val === "" ? undefined : String(val)),
  z.string().optional(),
);

const optionalDate = z.preprocess((val) => {
  if (val == null || val === "") return undefined;
  const parsed = val instanceof Date ? val : new Date(val as string | number);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}, z.date().optional());

/** Payload dumpt categorieën en tags soms als getallen (bijv. jaartallen). */
const stringList = z.preprocess((val) => {
  if (Array.isArray(val)) return val.map((item) => String(item).trim()).filter(Boolean);
  if (typeof val === "string" && val.trim()) return [val.trim()];
  return [];
}, z.array(z.string()));

const blog = defineCollection({
  loader: glob({
    base: "./src/content/blog",
    pattern: "**/*.{md,mdx}",
  }),
  schema: z
    .object({
      title: z.preprocess((val) => (val == null ? "" : String(val)), z.string()),
      description: optionalText,
      excerpt: optionalText,
      metaDescription: optionalText,
      pubDate: optionalDate,
      date: optionalDate,
      updatedDate: optionalDate,
      slug: optionalText,
      heroImage: mediaValue,
      featuredImage: mediaValue,
      image: mediaValue,
      ogImage: mediaValue,
      featuredImageAlt: optionalText,
      heroImageAlt: optionalText,
      category: optionalText,
      categories: stringList,
      tags: stringList,
      author: z.preprocess(
        (val) => (val == null || val === "" ? "Redactie" : String(val)),
        z.string(),
      ),
      draft: z.unknown().optional(),
      _status: optionalText,
    })
    .passthrough()
    .transform((data) => {
      const heroImage = resolveBlogHeroImage(data);
      return {
        ...data,
        description: data.description ?? data.excerpt ?? data.metaDescription,
        pubDate: data.pubDate ?? data.date ?? new Date(),
        heroImage,
        featuredImage: heroImage,
        featuredImageAlt: resolveBlogHeroImageAlt(data),
        category: resolveBlogCategory(data),
        draft: isDraftFrontmatter(data),
      };
    }),
});

export const collections = { blog };
