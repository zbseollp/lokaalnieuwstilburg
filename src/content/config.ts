import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { resolveBlogCategory, resolveBlogHeroImage } from "../lib/blog";

const blog = defineCollection({
  loader: glob({
    base: "./src/content/blog",
    pattern: "**/*.{md,mdx}",
  }),
  schema: z
    .object({
      title: z.string(),
      description: z.string().optional(),
      excerpt: z.string().optional(),
      pubDate: z.coerce.date().optional(),
      date: z.coerce.date().optional(),
      updatedDate: z.coerce.date().optional(),
      slug: z.string().optional(),
      heroImage: z.string().optional(),
      featuredImage: z.string().optional(),
      image: z.string().optional(),
      category: z.string().optional(),
      categories: z.array(z.string()).optional(),
      tags: z.array(z.string()).default([]),
      author: z.string().default("Redactie"),
      draft: z.boolean().default(false),
    })
    .transform((data) => ({
      ...data,
      description: data.description ?? data.excerpt,
      pubDate: data.pubDate ?? data.date ?? new Date(),
      heroImage: resolveBlogHeroImage(data),
      category: resolveBlogCategory(data),
    })),
});

export const collections = { blog };
