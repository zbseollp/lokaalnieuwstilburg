import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({
    base: "./src/content/blog",
    pattern: "**/*.{md,mdx}",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // legacy WordPress/Sanity field
    excerpt: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    // legacy date field
    date: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.string().default("Nieuws"),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default("Redactie"),
    draft: z.boolean().default(false),
  }).transform((data) => ({
    ...data,
    description: data.description ?? data.excerpt,
    pubDate: data.pubDate ?? data.date ?? new Date(),
  })),
});

export const collections = { blog };
