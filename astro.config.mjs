import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import compress from "astro-compress";
import rehypeRepairMediaUrls from "./src/lib/rehype-repair-media-urls.mjs";

export default defineConfig({
  site: "https://lokaalnieuwstilburg.nl",
  trailingSlash: "always",
  build: { format: "directory" },
  redirects: {
    "/112/": "/112-tilburg/",
    "/funda/": "/funda-tilburg/",
    "/vacatures/": "/vacatures-tilburg/",
    "/weer/": "/weer-tilburg/",
  },
  markdown: {
    rehypePlugins: [rehypeRepairMediaUrls],
  },
  integrations: [
    mdx(),
    sitemap(),
    compress({ CSS: true, HTML: true, JavaScript: true, Image: false }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
