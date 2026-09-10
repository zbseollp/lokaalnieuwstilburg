import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;

/** Every live Payload/git article, newest first. */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const posts = await getCollection("blog", ({ data }) => data.draft !== true);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
