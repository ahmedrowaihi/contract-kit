// Tiny shim: import the per-language generator from the runner-temp
// install location and call its `generate()`. ESM, dependency-free.

import { resolve } from "node:path";

const { TARGET, WORKDIR, SPEC, OUTPUT, PACKAGE_NAME, MANIFEST, NORMALIZE } =
  process.env;

if (!TARGET || !WORKDIR || !SPEC || !OUTPUT) {
  throw new Error(
    "regen.mjs: missing required env (TARGET / WORKDIR / SPEC / OUTPUT)",
  );
}

const pkg = `@ahmedrowaihi/openapi-${TARGET}`;
const entry = resolve(WORKDIR, "node_modules", pkg, "dist", "index.js");
const { generate } = await import(entry);

const isUrl = /^https?:\/\//i.test(SPEC);

/** @type {Record<string, unknown>} */
const opts = {
  input: isUrl ? SPEC : resolve(process.cwd(), SPEC),
  output: resolve(process.cwd(), OUTPUT),
};

if (PACKAGE_NAME) opts.packageName = PACKAGE_NAME;
if (NORMALIZE === "true") opts.normalize = true;

if (MANIFEST) {
  if (TARGET === "go") opts.gomod = { module: MANIFEST };
  else if (TARGET === "kotlin") opts.gradle = true;
  else if (TARGET === "swift") opts.package = { name: MANIFEST };
}

const result = await generate(opts);
console.log(`wrote ${result.files.length} file(s) → ${result.output}`);
