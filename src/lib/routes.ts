/**
 * File-based routes that share the root URL space with Payload articles.
 * A colliding getStaticPaths slug would abort the whole Jenkins build.
 */
export const RESERVED_SLUGS = new Set([
  "112-tilburg",
  "404",
  "activiteiten-tilburg",
  "bed-and-breakfast-tilburg",
  "bedrijvengids",
  "bekendmakingen",
  "benzineprijs-tilburg",
  "blog",
  "bowlen-tilburg",
  "camping-tilburg",
  "contact",
  "evenementen",
  "externe-berichten",
  "fotograaf-tilburg",
  "funda-tilburg",
  "fysio-tilburg",
  "gebedstijden-tilburg",
  "hotel-tilburg",
  "index",
  "kapper-tilburg",
  "kermis-tilburg",
  "kinderopvang-tilburg",
  "koningsdag-tilburg",
  "makelaar-tilburg",
  "massage-tilburg",
  "notaris-tilburg",
  "over-ons",
  "overlijdensberichten-tilburg",
  "pedicure-tilburg",
  "restaurant-tilburg",
  "rijschool-tilburg",
  "rommelmarkt-tilburg",
  "schoorsteenveger-tilburg",
  "sitemap",
  "snackbar-tilburg",
  "sportschool-tilburg",
  "stemwijzer-tilburg",
  "tandarts-tilburg",
  "tilburg-stroomstoring",
  "tuinmeubelen-tilburg",
  "vacatures-tilburg",
  "wandelen-tilburg",
  "weer-tilburg",
]);

export function isReservedSlug(slug: string | undefined | null): boolean {
  const clean = String(slug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  return !clean || RESERVED_SLUGS.has(clean);
}

export function postHref(slug: string): string {
  return `/${slug.replace(/^\/+|\/+$/g, "")}/`;
}
