// Tiny shim: import the right per-language generator from the runner-temp
// install location and call its `generate()`. Kept ESM + dependency-free so
// the action's composite step doesn't need a bundler.

import { resolve } from "node:path";

const { TARGET, WORKDIR, SPEC, OUTPUT, PACKAGE_NAME } = process.env;

if (!TARGET || !WORKDIR || !SPEC || !OUTPUT) {
  throw new Error(
    "regen.mjs: missing required env (TARGET / WORKDIR / SPEC / OUTPUT)",
  );
}

const pkg = `@ahmedrowaihi/openapi-${TARGET}`;
const entry = resolve(WORKDIR, "node_modules", pkg, "dist", "index.js");

const { generate } = await import(entry);

// Pass http(s) URLs through verbatim; only resolve filesystem paths
// against the consumer's repo root. The generators delegate to
// @hey-api/json-schema-ref-parser which accepts both shapes.
const isUrl = /^https?:\/\//i.test(SPEC);

/** @type {Record<string, unknown>} */
const opts = {
  input: isUrl ? SPEC : resolve(process.cwd(), SPEC),
  output: resolve(process.cwd(), OUTPUT),
};
if (PACKAGE_NAME) opts.packageName = PACKAGE_NAME;

const result = await generate(opts);
console.log(`wrote ${result.files.length} file(s) → ${result.output}`);
