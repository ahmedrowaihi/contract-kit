import { mkdir, rm, writeFile } from "node:fs/promises";
import {
  basename,
  dirname,
  join,
  parse as parsePath,
  resolve,
} from "node:path";

import { parseSpec } from "@ahmedrowaihi/openapi-tools/parse";
import { $RefParser } from "@hey-api/json-schema-ref-parser";

import { operationsToDecls, schemasToDecls, securityKey } from "./ir/index.js";
import {
  type BuildOptions,
  type BuiltFile,
  buildSwiftProject,
  type PackageOptions,
  packageSwiftFile,
} from "./project/index.js";

export interface GenerateOptions extends BuildOptions {
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
    ...operationsToDecls(ir.paths, {
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

/**
 * Walk the bundled spec to extract per-operation security-scheme NAMES
 * keyed by `${path}|${method}`. Needed because the IR drops scheme
 * names from `op.security` (it inlines the resolved scheme objects),
 * leaving the orchestrator with no way to wire `client.auth["<name>"]`.
 *
 * Map shape: `"/me|get" → ["bearerAuth", "apiKeyAuth"]`.
 */
function extractSecuritySchemeNames(
  spec: Record<string, unknown>,
): Map<string, ReadonlyArray<string>> {
  const map = new Map<string, ReadonlyArray<string>>();
  const paths = (spec.paths ?? {}) as Record<string, unknown>;
  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const [method, op] of Object.entries(
      pathItem as Record<string, unknown>,
    )) {
      if (!op || typeof op !== "object") continue;
      const security = (op as { security?: unknown }).security;
      if (!Array.isArray(security)) continue;
      const names = new Set<string>();
      for (const requirement of security) {
        if (requirement && typeof requirement === "object") {
          for (const name of Object.keys(requirement)) names.add(name);
        }
      }
      if (names.size > 0) {
        map.set(securityKey(pathStr, method), [...names]);
      }
    }
  }
  return map;
}

/**
 * Refuse to wipe the current working directory or a filesystem root.
 * `clean: true` runs `rm -rf` on the resolved output dir, which would
 * destroy the user's repo if they pointed `output` at `.` or `/`.
 */
function assertSafeOutputDir(out: string): void {
  if (out === process.cwd() || out === parsePath(out).root) {
    throw new Error(
      `Refusing to clean output directory: ${out} (would wipe cwd or filesystem root). Use a dedicated subdirectory.`,
    );
  }
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
