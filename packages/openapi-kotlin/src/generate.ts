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

import {
  type OperationsOptions,
  operationsToDecls,
  schemasToDecls,
  securityKey,
} from "./ir/index.js";
import { buildRuntimeFiles } from "./ir/runtime/index.js";
import {
  type BuildOptions,
  type BuiltFile,
  buildGradleFile,
  buildKotlinProject,
  type GradleOptions,
  settingsGradleFile,
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
   * When set, emit a `build.gradle.kts` + `settings.gradle.kts` at the
   * output root so the SDK is a self-contained Gradle library. Pass
   * `true` for sensible defaults (project name keyed off the output
   * dir basename) or a `GradleOptions` object for fine-grained
   * control. Default: omitted — the output is just the Kotlin source
   * tree, ready to drop into an existing Gradle module.
   */
  gradle?: boolean | GradleOptions;
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

  const schemaDecls = schemasToDecls(ir.components?.schemas ?? {});
  const opsResult = operationsToDecls(ir.paths, {
    defaultTag: opts.defaultTag,
    interfaceName: opts.interfaceName,
    clientClassName: opts.clientClassName,
    interfaceOnly: opts.interfaceOnly,
    openImpl: opts.openImpl,
    securitySchemeNames: extractSecuritySchemeNames(bundled),
  });
  const decls = [...schemaDecls, ...opsResult.decls];
  const sdkFiles = buildKotlinProject(decls, opts);

  const pkg = opts.packageName ?? "com.example.api";
  const apiSubDir = (opts.layout ?? "split") === "flat" ? "" : "api";
  const runtimeFiles = buildRuntimeFiles(
    {
      hasAuth: opsResult.needsAuth,
      hasMultipart: opsResult.needsMultipart,
      hasFormUrlEncoded: false,
    },
    runtimeSubPackage(pkg, apiSubDir),
  ).map((rf) => ({
    path: runtimePath(pkg, apiSubDir, rf.name),
    content: rf.content,
  }));

  const files: BuiltFile[] = [...sdkFiles, ...runtimeFiles];
  const out = resolve(opts.output);

  if (opts.gradle) {
    const gradleOpts =
      typeof opts.gradle === "object" ? opts.gradle : ({} as GradleOptions);
    files.push(buildGradleFile(gradleOpts));
    files.push(settingsGradleFile(defaultProjectName(out)));
  }

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

function runtimeSubPackage(rootPkg: string, dir: string): string {
  if (dir === "") return rootPkg;
  return `${rootPkg}.${dir}`;
}

function runtimePath(rootPkg: string, dir: string, name: string): string {
  const pkgPath = rootPkg.replace(/\./g, "/");
  return dir === "" ? `${pkgPath}/${name}` : `${pkgPath}/${dir}/${name}`;
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

function defaultProjectName(outputDir: string): string {
  const base = basename(outputDir).replace(/[^A-Za-z0-9-]+/g, "-");
  return base || "generated-sdk";
}
