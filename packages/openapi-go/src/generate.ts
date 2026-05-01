import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { assertSafeOutputDir } from "@ahmedrowaihi/codegen-core";
import {
  extractSecuritySchemeNames,
  type NormalizeOptions,
  normalizeSpec,
  SAFE_NORMALIZE,
} from "@ahmedrowaihi/oas-core";
import { parseSpec } from "@ahmedrowaihi/openapi-tools/parse";
import { $RefParser } from "@hey-api/json-schema-ref-parser";

import {
  type OperationsOptions,
  operationsToDecls,
  schemasToDecls,
} from "./ir/index.js";
import { buildRuntimeFiles } from "./ir/runtime/index.js";
import {
  type BuildOptions,
  type BuiltFile,
  buildGoProject,
  type GomodOptions,
  gomodFile,
} from "./project/index.js";

type ForwardedOperationsOptions = Omit<
  OperationsOptions,
  "securitySchemeNames"
>;

export interface GenerateOptions
  extends BuildOptions,
    ForwardedOperationsOptions {
  /**
   * The OpenAPI spec source: a filesystem path, http(s) URL, or a
   * pre-parsed object. YAML and JSON inputs both work. External
   * `$ref`s are bundled inline; the spec is normalized to hey-api IR
   * before generation, so 2.0 / 3.0 / 3.1 inputs all produce the same
   * output shape.
   */
  input: string | Record<string, unknown>;
  /** Directory the SDK is written to (created if missing). */
  output: string;
  /** Wipe `output` before writing. Default: `true`. */
  clean?: boolean;
  /**
   * When set, emit `go.mod` at the output root. Pass a `module` path
   * (e.g. `"github.com/example/petstore-sdk"`) for the `module`
   * directive. Default: omitted — the output is a flat .go source
   * tree, ready to drop into an existing module.
   */
  gomod?: GomodOptions;
  /** Pre-codegen spec normalization. `true` enables the safe preset. */
  normalize?: boolean | NormalizeOptions;
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
  if (opts.normalize) {
    normalizeSpec(
      bundled,
      opts.normalize === true ? SAFE_NORMALIZE : opts.normalize,
    );
  }
  const ir = parseSpec(bundled);

  const schemaDecls = schemasToDecls(ir.components?.schemas ?? {});
  const opsResult = operationsToDecls(ir.paths, {
    defaultTag: opts.defaultTag,
    interfaceName: opts.interfaceName,
    clientStructName: opts.clientStructName,
    interfaceOnly: opts.interfaceOnly,
    securitySchemeNames: extractSecuritySchemeNames(bundled),
  });
  const decls = [...schemaDecls, ...opsResult.decls];
  const sdkFiles = buildGoProject(decls, opts);

  const pkg = opts.packageName ?? "api";
  const runtimeFiles = buildRuntimeFiles(
    {
      hasAuth: opsResult.needsAuth,
      hasMultipart: opsResult.needsMultipart,
    },
    pkg,
  ).map((rf) => ({ path: rf.name, content: rf.content }));

  const files: BuiltFile[] = [...sdkFiles, ...runtimeFiles];
  const out = resolve(opts.output);

  if (opts.gomod) files.push(gomodFile(opts.gomod));

  if (opts.clean !== false) {
    assertSafeOutputDir(out);
    await rm(out, { recursive: true, force: true });
  }
  for (const file of files) {
    const full = join(out, file.path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, file.content);
  }
  return { files, output: out };
}
