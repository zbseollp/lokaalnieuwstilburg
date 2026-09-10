/**
 * Legacy path. Astro 5 reads src/content.config.ts first; keep this file in
 * sync so a tooling fallback cannot apply the old strict schema and drop posts.
 */
export { collections } from "../content.config";
