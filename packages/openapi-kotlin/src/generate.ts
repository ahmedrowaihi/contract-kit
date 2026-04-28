import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { parseSpec } from "@ahmedrowaihi/openapi-tools/parse";
import { $RefParser } from "@hey-api/json-schema-ref-parser";

import { operationsToDecls, schemasToDecls } from "./ir/index.js";
import {
  type BuildOptions,
  type BuiltFile,
  buildKotlinProject,
} from "./project/index.js";

export interface GenerateOptions extends BuildOptions {
  /**
   * The OpenAPI spec source: a filesystem path, http(s) URL, or a
   * pre-parsed object. YAML and JSON inputs are both supported. External
   * `$ref`s are bundled inline; the spec is normalized to hey-api IR
   * before generation, so 2.0 / 3.0 / 3.1 inputs all produce the same
   * output shape.
   */
  input: string | Record<string, unknown>;
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
  const bundled = (await parser.bundle({
    pathOrUrlOrSchema: opts.input,
  })) as Record<string, unknown>;
  const ir = parseSpec(bundled);

  const decls = [
    ...schemasToDecls(ir.components?.schemas ?? {}),
    ...operationsToDecls(ir.paths),
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
