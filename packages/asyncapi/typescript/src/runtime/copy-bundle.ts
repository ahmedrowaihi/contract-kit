import { readdir, readFile, stat } from "node:fs/promises";
import { join, posix, relative } from "node:path";

import type { GeneratedFile } from "../plugin.js";

/**
 * Recursively walk a `bundle/` directory and return the files it contains
 * as a flat array of `GeneratedFile`s, ready for plugins to emit.
 *
 * Mirrors the shape of `@hey-api/openapi-ts`'s `generateClientBundle` —
 * static runtime source lives next to the plugin, gets copied to the
 * caller's output verbatim. Filenames in the bundle become file names
 * in the output (file at `<bundleDir>/foo/bar.gen.ts` → output path
 * `foo/bar.gen.ts`).
 *
 * Files are read as utf8; this helper is for TypeScript source / JSON
 * configs / other text. Binary bundle files would need a different path.
 */
export async function readBundle(
  bundleDir: string,
): Promise<ReadonlyArray<GeneratedFile>> {
  const out: GeneratedFile[] = [];
  await walk(bundleDir, bundleDir, out);
  return out;
}

async function walk(
  bundleRoot: string,
  current: string,
  out: GeneratedFile[],
): Promise<void> {
  const entries = await readdir(current);
  for (const entry of entries) {
    const fullPath = join(current, entry);
    const s = await stat(fullPath);
    if (s.isDirectory()) {
      await walk(bundleRoot, fullPath, out);
    } else {
      const relativePath = relative(bundleRoot, fullPath)
        .split(/\\|\//)
        .join(posix.sep);
      const content = await readFile(fullPath, "utf8");
      out.push({ path: relativePath, content });
    }
  }
}
