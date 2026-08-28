#!/usr/bin/env node
/**
 * Deploy to Cloudflare Workers with retries for transient API failures (503, etc.).
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const wranglerBin = require.resolve("wrangler/bin/wrangler.js");

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [0, 15_000, 30_000, 60_000, 90_000];

const RETRY_PATTERNS = [
  /503\s+Service Unavailable/i,
  /upstream connect error/i,
  /connection termination/i,
  /malformed response from the API/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /fetch failed/i,
  /socket hang up/i,
  /network error/i,
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runWranglerDeploy() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [wranglerBin, "deploy"], {
      cwd: root,
      stdio: ["inherit", "pipe", "pipe"],
      env: process.env,
    });

    let output = "";

    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

async function purgeProductionCache() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    console.log("[deploy] Skip cache purge (no CLOUDFLARE_API_TOKEN).");
    return;
  }

  const zoneId =
    process.env.CLOUDFLARE_ZONE_ID ||
    (await findZoneId(token, process.env.CACHE_PURGE_DOMAIN || "lokaalnieuwstilburg.nl"));

  if (!zoneId) {
    console.warn("[deploy] Could not resolve Cloudflare zone id for cache purge.");
    return;
  }

  const hosts = (process.env.CACHE_PURGE_HOSTS || "lokaalnieuwstilburg.nl,www.lokaalnieuwstilburg.nl")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

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
    console.warn("[deploy] Cache purge failed:", data?.errors?.[0]?.message || res.statusText);
    return;
  }

  console.log(`[deploy] Purged Cloudflare cache for: ${hosts.join(", ")}`);
}

async function findZoneId(token, domain) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  return data?.result?.[0]?.id || "";
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      const wait = BACKOFF_MS[attempt - 1] ?? 120_000;
      console.warn(
        `\nCloudflare deploy failed; retrying in ${wait / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})...\n`,
      );
      await sleep(wait);
    }

    const { code, output } = await runWranglerDeploy();
    if (code === 0) {
      await purgeProductionCache();
      return;
    }

    const retryable = RETRY_PATTERNS.some((pattern) => pattern.test(output));
    if (!retryable || attempt === MAX_ATTEMPTS) {
      process.exitCode = code;
      return;
    }

    console.warn("Transient Cloudflare API error detected; will retry deploy.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
