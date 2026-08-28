#!/usr/bin/env node
/**
 * Wrangler CLI shim: retry "deploy", pass everything else through to wrangler.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args[0] === "deploy") {
  await import("./wrangler-deploy.mjs");
  process.exit(process.exitCode ?? 0);
}

const require = createRequire(join(root, "package.json"));
const wranglerBin = require.resolve("wrangler/bin/wrangler.js");
const result = spawnSync(process.execPath, [wranglerBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
