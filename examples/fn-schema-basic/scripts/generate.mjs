#!/usr/bin/env node
/**
 * Programmatic example: extract schemas from src/handlers.ts and write a
 * single bundled JSON document under `generated/schemas.json`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emit } from "@ahmedrowaihi/fn-schema-core";
import { extract } from "@ahmedrowaihi/fn-schema-typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const result = await extract({
  cwd: root,
  files: [path.join(root, "src/handlers.ts")],
  tsConfigPath: path.join(root, "tsconfig.json"),
  naming: "function-name",
  signature: { parameters: "first-only", unwrapPromise: true },
});

const outDir = path.join(root, "generated");
await mkdir(outDir, { recursive: true });

const bundle = emit.toBundle(result, { pretty: true });
await writeFile(path.join(outDir, "schemas.json"), `${bundle}\n`);

await emit.toFiles(result, {
  dir: path.join(outDir, "by-signature"),
  format: "json-pretty",
});

const errors = result.diagnostics.filter((d) => d.severity === "error");
const warnings = result.diagnostics.filter((d) => d.severity === "warning");

console.log(
  `fn-schema: ${result.signatures.length} signature(s), ` +
    `${Object.keys(result.definitions).length} definition(s), ` +
    `${warnings.length} warning(s), ${errors.length} error(s)`,
);
for (const w of warnings) console.warn(`  warn [${w.code}] ${w.message}`);
for (const e of errors) console.error(`  err  [${e.code}] ${e.message}`);

if (errors.length > 0) process.exit(1);
