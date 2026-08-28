#!/usr/bin/env node
/**
 * Patch node_modules/.bin/wrangler so Jenkins' "npx wrangler deploy" retries on 503.
 * Safe to run multiple times. Jenkins uses "npm ci --ignore-scripts", so this runs from "npm run build".
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "scripts", "wrangler-cli.mjs");
const binDir = path.join(root, "node_modules", ".bin");
const binPath = path.join(binDir, "wrangler");

if (!fs.existsSync(path.join(root, "node_modules", "wrangler"))) {
  console.warn("install-wrangler-wrapper: wrangler not installed yet; skipping");
  process.exit(0);
}

fs.mkdirSync(binDir, { recursive: true });

const shim = `#!/usr/bin/env node
import ${JSON.stringify(cliPath)};
`;

fs.writeFileSync(binPath, shim, { mode: 0o755 });
console.log("install-wrangler-wrapper: patched node_modules/.bin/wrangler for retry deploy");
