/**
 * Payload -> Astro blog helpers voor deze tenant.
 *
 * Payload schrijft afbeeldingen als string ("/media/foto.jpg"), als absolute URL
 * of als media-object ({ url, filename, alt }). De bestanden staan op R2 onder
 * `tenants/<tenantSlug>/<bestandsnaam>`. Deze helpers maken daar een bruikbare
 * URL van, zodat cards en article-hero's geen gebroken <img> tonen.
 */

export type BlogMediaInput =
  | string
  | { url?: string; src?: string; filename?: string; alt?: string }
  | null
  | undefined;

export type BlogFrontmatterInput = {
  title?: string;
  heroImage?: BlogMediaInput;
  featuredImage?: BlogMediaInput;
  image?: BlogMediaInput;
  ogImage?: BlogMediaInput;
  featuredImageAlt?: string;
  heroImageAlt?: string;
  category?: string;
  categories?: (string | number)[];
  draft?: unknown;
  _status?: string;
};

const DEFAULT_R2_BASE = "https://pub-d4024ad3e57841448e0ee58a19abe46b.r2.dev";
const TENANT_SLUG = "lokaalnieuwstilburg";

/** Paden die bij de site zelf horen en dus niet naar R2 verwijzen. */
const SITE_RELATIVE = /^\/(?:images|img|assets|static|wp-content|uploads|fonts|logo|favicon)\b/i;

/**
 * Basis-URL van de mediabucket. PUBLIC_* komt uit de Vite-env (ook client-side),
 * R2_PUBLIC_URL alleen uit de build-omgeving (Jenkins / CI) zodat we geen
 * R2-secrets in de client-bundle hoeven te prefixen.
 */
function mediaBase(): string {
  const viteEnv: Record<string, string | undefined> =
    (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
  const nodeEnv: Record<string, string | undefined> =
    (typeof process !== "undefined" && process.env) || {};

  const base =
    viteEnv.PUBLIC_R2_URL ||
    viteEnv.PUBLIC_PAYLOAD_MEDIA_URL ||
    nodeEnv.R2_PUBLIC_URL ||
    nodeEnv.PUBLIC_R2_URL ||
    nodeEnv.PUBLIC_PAYLOAD_MEDIA_URL ||
    DEFAULT_R2_BASE;

  return String(base).replace(/\/+$/, "");
}

/** Haalt een pad/URL uit een string of Payload-media-object. */
export function extractMediaPath(value: BlogMediaInput): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    for (const key of ["url", "src", "filename"] as const) {
      const candidate = (value as Record<string, unknown>)[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  }
  return "";
}

function tenantObjectKey(pathOrFilename: string): string {
  const clean = pathOrFilename.replace(/^\/+/, "");
  if (!clean) return "";
  if (clean.startsWith("tenants/")) return clean;
  const filename = clean.includes("/") ? clean.split("/").pop()! : clean;
  return `tenants/${TENANT_SLUG}/${filename}`;
}

/** R2-URL zonder /tenants/<slug>/ alsnog naar de juiste sleutel wijzen. */
function fixR2TenantUrl(url: string, base: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes(".r2.dev")) return url;
    if (parsed.pathname.includes("/tenants/")) return url;
    const filename = parsed.pathname.split("/").filter(Boolean).pop();
    if (!filename) return url;
    return `${base}/${tenantObjectKey(filename)}`;
  } catch {
    return url;
  }
}

/** Maakt van Payload-media een bruikbare URL; lege waarde blijft undefined. */
export function absolutizeBlogMediaUrl(input: BlogMediaInput): string | undefined {
  const raw = extractMediaPath(input);
  if (!raw) return undefined;
  if (raw === "[object Object]" || /^\d+$/.test(raw)) return undefined;
  if (/^data:/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return fixR2TenantUrl(raw, mediaBase());
  if (/^\/\//.test(raw)) return `https:${raw}`;
  if (SITE_RELATIVE.test(raw)) return raw;
  return `${mediaBase()}/${tenantObjectKey(raw)}`;
}

/** Eerste bruikbare afbeelding uit de frontmatter (hero > featured > image > og). */
export function resolveBlogHeroImage(data: BlogFrontmatterInput): string | undefined {
  return (
    absolutizeBlogMediaUrl(data.heroImage) ??
    absolutizeBlogMediaUrl(data.featuredImage) ??
    absolutizeBlogMediaUrl(data.image) ??
    absolutizeBlogMediaUrl(data.ogImage)
  );
}

/** Alt-tekst bij de hero-afbeelding, met de titel als terugval. */
export function resolveBlogHeroImageAlt(data: BlogFrontmatterInput): string | undefined {
  const explicit = data.featuredImageAlt?.trim() || data.heroImageAlt?.trim();
  if (explicit) return explicit;
  for (const field of [data.heroImage, data.featuredImage, data.image]) {
    if (field && typeof field === "object" && typeof field.alt === "string" && field.alt.trim()) {
      return field.alt.trim();
    }
  }
  return data.title?.trim() || undefined;
}

/**
 * Categorie-label voor cards en badges. Payload dumpt in `categories` soms
 * jaartallen; die zijn als label waardeloos, dus we slaan pure getallen over.
 */
export function resolveBlogCategory(data: BlogFrontmatterInput): string {
  const labels = [data.category, ...(data.categories ?? [])]
    .map((c) => (c == null ? "" : String(c).trim()))
    .filter(Boolean);
  return labels.find((label) => !/^\d+$/.test(label)) || "Nieuws";
}

/**
 * Publicatiefilter: draft kan een boolean of string zijn en Payload zet
 * `_status` op "draft" zolang een bericht niet gepubliceerd is.
 */
export function isDraftFrontmatter(data: BlogFrontmatterInput): boolean {
  const draft = data.draft;
  if (draft === true) return true;
  if (typeof draft === "string" && ["true", "draft", "yes", "1"].includes(draft.trim().toLowerCase())) {
    return true;
  }
  const status = String(data._status ?? "").trim().toLowerCase();
  if (status && status !== "published") return true;
  return false;
}
