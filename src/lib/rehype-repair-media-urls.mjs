/**
 * Rehype-plugin: herstelt afbeeldings-URL's in de artikeltekst.
 *
 * Payload schrijft afbeeldingen in de body als /media/<bestand>. Dat pad staat
 * niet in public/, dus zonder deze plugin toont elke inline afbeelding een
 * gebroken icoon. De frontmatter-hero wordt al opgelost in content.config.ts;
 * dit doet hetzelfde voor <img> in de body.
 *
 * Bewust zonder unist-util-visit: dat is een transitieve dependency van Astro
 * en staat niet in package.json, dus we lopen de boom zelf af.
 */

const DEFAULT_R2_BASE = "https://pub-d4024ad3e57841448e0ee58a19abe46b.r2.dev";
const TENANT_SLUG = "lokaalnieuwstilburg";

/** Paden die bij de site zelf horen en dus niet naar R2 verwijzen. */
const SITE_RELATIVE = /^\/(?:images|img|assets|static|wp-content|uploads|fonts|logo|favicon)\b/i;

function mediaBase() {
  const viteEnv = (typeof import.meta !== "undefined" && import.meta.env) || {};
  const nodeEnv = (typeof process !== "undefined" && process.env) || {};
  const base =
    viteEnv.PUBLIC_R2_URL ||
    viteEnv.PUBLIC_PAYLOAD_MEDIA_URL ||
    nodeEnv.R2_PUBLIC_URL ||
    nodeEnv.PUBLIC_R2_URL ||
    nodeEnv.PUBLIC_PAYLOAD_MEDIA_URL ||
    DEFAULT_R2_BASE;
  return String(base).replace(/\/+$/, "");
}

function tenantObjectKey(pathOrFilename) {
  const clean = String(pathOrFilename ?? "").trim().replace(/^\/+/, "");
  if (!clean) return "";
  if (clean.startsWith("tenants/")) return clean;
  const filename = clean.includes("/") ? clean.split("/").pop() : clean;
  return `tenants/${TENANT_SLUG}/${filename}`;
}

function fixR2TenantUrl(url, base) {
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

/** Geeft undefined terug als er niets te herstellen valt. */
export function resolveMediaUrl(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return undefined;
  if (/^data:/i.test(raw)) return undefined;
  if (/^https?:\/\//i.test(raw)) {
    const fixed = fixR2TenantUrl(raw, mediaBase());
    return fixed === raw ? undefined : fixed;
  }
  if (/^\/\//.test(raw)) return undefined;
  if (SITE_RELATIVE.test(raw)) return undefined;
  if (!raw.startsWith("/")) return undefined;
  return `${mediaBase()}/${tenantObjectKey(raw)}`;
}

/** srcset is "url 320w, url 640w" — elke URL apart herstellen. */
function repairSrcset(value) {
  let changed = false;
  const out = String(value)
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return part;
      const [url, ...rest] = trimmed.split(/\s+/);
      const fixed = resolveMediaUrl(url);
      if (!fixed) return part;
      changed = true;
      return [fixed, ...rest].join(" ");
    })
    .join(", ");
  return changed ? out : undefined;
}

/** HTML dat als losse tekst in de markdown stond (nog geen element-node). */
function repairRawHtml(html) {
  let changed = false;
  const out = String(html).replace(
    /(<img\b[^>]*?\bsrc=)(["'])([^"']+)\2/gi,
    (match, prefix, quote, url) => {
      const fixed = resolveMediaUrl(url);
      if (!fixed) return match;
      changed = true;
      return `${prefix}${quote}${fixed}${quote}`;
    },
  );
  return changed ? out : undefined;
}

function walk(node) {
  if (!node || typeof node !== "object") return;

  if (node.type === "element" && node.tagName === "img" && node.properties) {
    const src = resolveMediaUrl(node.properties.src);
    if (src) node.properties.src = src;
    if (node.properties.srcSet) {
      const srcSet = repairSrcset(node.properties.srcSet);
      if (srcSet) node.properties.srcSet = srcSet;
    }
  }

  if ((node.type === "raw" || node.type === "html") && typeof node.value === "string") {
    const repaired = repairRawHtml(node.value);
    if (repaired) node.value = repaired;
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child);
  }
}

export default function rehypeRepairMediaUrls() {
  return (tree) => {
    walk(tree);
  };
}
