import { mkdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

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
import {
  type BuildOptions,
  type BuiltFile,
  buildSwiftProject,
  type PackageOptions,
  packageSwiftFile,
} from "./project/index.js";

/**
 * Operations options the consumer can pass through `generate()`. The
 * orchestrator owns `securitySchemeNames` (extracted from the bundled
 * spec), so it's stripped from the public surface.
 */
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
   * When set, emit `Package.swift` at the output root so the SDK is a
   * self-contained SwiftPM library. Pass `true` for sensible defaults
   * keyed off the output dir basename, or an options object for
   * fine-grained control (custom name, platforms, tools version).
   * Default: omitted — the output is just `API/` + `Models/` source
   * files, ready to drop into an existing Xcode target.
   */
  package?: boolean | PackageOptions;
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

  const decls = [
    ...schemasToDecls(ir.components?.schemas ?? {}),
    ...operationsToDecls(ir.paths, {
      defaultTag: opts.defaultTag,
      protocolName: opts.protocolName,
      clientClassName: opts.clientClassName,
      protocolOnly: opts.protocolOnly,
      openImpl: opts.openImpl,
      securitySchemeNames: extractSecuritySchemeNames(bundled),
    }),
  ];
  const sdkFiles = buildSwiftProject(decls, opts);
  const out = resolve(opts.output);
  const packageFile = opts.package
    ? packageSwiftFile(resolvePackageOptions(opts.package, out))
    : undefined;
  const files = packageFile ? [...sdkFiles, packageFile] : sdkFiles;
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

/**
 * Normalize the `package` option into a fully-resolved `PackageOptions`.
 * `package: true` means "use defaults keyed off the output dir": the
 * package + library name is the basename of the output dir
 * Pascal-cased (e.g. `…/sdk-swift` → `SdkSwift`, `…/petstore-sdk` →
 * `PetstoreSdk`). Pass an explicit `name` when that's not what you
 * want.
 */
function resolvePackageOptions(
  pkg: boolean | PackageOptions,
  outputDir: string,
): PackageOptions {
  if (typeof pkg === "object") return pkg;
  return { name: defaultPackageName(outputDir) };
}

function defaultPackageName(outputDir: string): string {
  const base = basename(outputDir)
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim();
  return (
    base
      .split(/\s+/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("") || "GeneratedSDK"
  );
}
