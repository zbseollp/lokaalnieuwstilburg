#!/usr/bin/env node
/**
 * Purge Cloudflare edge cache for lokaalnieuwstilburg.nl after deploy.
 * Uses CLOUDFLARE_API_TOKEN from env (same as Jenkins wrangler deploy).
 */
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  console.error("[purge] CLOUDFLARE_API_TOKEN is required.");
  process.exit(1);
}

const domain = process.env.CACHE_PURGE_DOMAIN || "lokaalnieuwstilburg.nl";
const hosts = (process.env.CACHE_PURGE_HOSTS || `${domain},www.${domain}`)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

async function findZoneId() {
  if (process.env.CLOUDFLARE_ZONE_ID) return process.env.CLOUDFLARE_ZONE_ID;
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  return data?.result?.[0]?.id || "";
}

const zoneId = await findZoneId();
if (!zoneId) {
  console.error(`[purge] Could not find Cloudflare zone for ${domain}.`);
  process.exit(1);
}

const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ hosts }),
});

const data = await res.json().catch(() => null);
if (!res.ok || !data?.success) {
  console.error("[purge] Failed:", data?.errors?.[0]?.message || res.statusText);
  process.exit(1);
}

console.log(`[purge] Purged cache for: ${hosts.join(", ")}`);
