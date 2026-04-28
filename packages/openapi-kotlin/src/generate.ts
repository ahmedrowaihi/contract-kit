import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { $RefParser } from "@hey-api/json-schema-ref-parser";
import { operationsToDecls } from "./openapi/operations.js";
import { schemasToDecls } from "./openapi/schemas.js";
import type { SchemaOrRef } from "./openapi/types.js";
import {
  type BuildOptions,
  type BuiltFile,
  buildKotlinProject,
} from "./project/build.js";

type SpecLike = {
  components?: { schemas?: Record<string, SchemaOrRef> };
  paths?: Parameters<typeof operationsToDecls>[0];
};

export interface GenerateOptions extends BuildOptions {
  /**
   * The OpenAPI spec source: a filesystem path, http(s) URL, or a
   * pre-parsed object. YAML and JSON are both supported. External `$ref`s
   * are bundled inline; internal `$ref`s are preserved.
   */
  input: string | SpecLike;
  /** Directory the SDK is written to (created if missing). */
  output: string;
  /** Wipe `output` before writing. Default: `true`. */
  clean?: boolean;
}

export interface GenerateResult {
  files: BuiltFile[];
  output: string;
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const parser = new $RefParser();
  const spec = (await parser.bundle({
    pathOrUrlOrSchema: opts.input,
  })) as SpecLike;

  const decls = [
    ...schemasToDecls(
      (spec.components?.schemas ?? {}) as Record<string, SchemaOrRef>,
    ),
    ...operationsToDecls(spec.paths),
  ];
  const files = buildKotlinProject(decls, opts);

  const out = resolve(opts.output);
  if (opts.clean !== false) await rm(out, { recursive: true, force: true });
  for (const file of files) {
    const full = join(out, file.path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, file.content);
  }
  return { files, output: out };
}
