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
