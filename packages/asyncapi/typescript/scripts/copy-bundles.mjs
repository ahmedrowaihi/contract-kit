#!/usr/bin/env node
/**
 * Copies each plugin's `src/plugins/<name>/bundle/` directory to the
 * corresponding `dist/plugins/<name>/bundle/` location so that built /
 * published consumers get the same runtime source files dev consumers
 * see at the same relative path. Mirrors `@hey-api/openapi-ts`'s
 * "copy bundle to dist" build step.
 */

import { cp, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginsDir = resolve(__dirname, "..", "src", "plugins");
const distPluginsDir = resolve(__dirname, "..", "dist", "plugins");

const entries = await readdir(pluginsDir);
let copied = 0;
for (const name of entries) {
  const bundleSrc = join(pluginsDir, name, "bundle");
  try {
    const s = await stat(bundleSrc);
    if (!s.isDirectory()) continue;
  } catch {
    continue;
  }
  const bundleDest = join(distPluginsDir, name, "bundle");
  await cp(bundleSrc, bundleDest, { recursive: true });
  copied++;
}
console.log(`copy-bundles: copied ${copied} bundle dir(s) to dist`);
