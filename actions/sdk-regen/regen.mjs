// Tiny shim: import the right per-language generator from the runner-temp
// install location and call its `generate()`. Kept ESM + dependency-free so
// the action's composite step doesn't need a bundler.

import { resolve } from "node:path";

const { TARGET, WORKDIR, SPEC, OUTPUT, PACKAGE_NAME, MANIFEST } = process.env;

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

// Translate the polymorphic `manifest` input into each generator's
// per-target option. Empty string → leave the SDK as a flat source
// tree drop-in (no go.mod / build.gradle.kts / Package.swift). The
// generators all default to that mode when their respective option
// is omitted, so we just don't set it.
if (MANIFEST) {
  if (TARGET === "go") opts.gomod = { module: MANIFEST };
  else if (TARGET === "kotlin") opts.gradle = true;
  else if (TARGET === "swift") opts.package = { name: MANIFEST };
}

const result = await generate(opts);
console.log(`wrote ${result.files.length} file(s) → ${result.output}`);
