import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createProject,
  type ExtractOptions,
  type ExtractResult,
  emit,
} from "@ahmedrowaihi/fn-schema-core";
import { typescript } from "@ahmedrowaihi/fn-schema-typescript";
import chokidar from "chokidar";
import { defineCommand, runMain } from "citty";
import consola from "consola";
import fg from "fast-glob";
import { loadFnSchemaConfig } from "./config.js";

const main = defineCommand({
  meta: {
    name: "fn-schema",
    version: "0.1.0",
    description:
      "Extract JSON Schemas for function inputs and outputs from TypeScript source.",
  },
  args: {
    patterns: {
      type: "positional",
      required: false,
      description:
        "Glob pattern(s) for source files (overrides `files` from config).",
    },
    out: {
      type: "string",
      alias: "o",
      description: "Output directory (per-signature files).",
    },
    bundle: {
      type: "string",
      description:
        "Write a single bundled JSON file at this path instead of per-signature files.",
    },
    "bundle-types": {
      type: "boolean",
      default: false,
      description:
        "When --bundle is set, also emit a sibling .ts wrapper that re-exports the JSON with literal-typed signature ids and definition names.",
    },
    watch: {
      type: "boolean",
      default: false,
      description:
        "Re-extract on file change. Keeps the ts-morph project warm between runs for low-latency rebuilds.",
    },
    openapi: {
      type: "string",
      description:
        "Write an OpenAPI 3.1 components-only document to this path.",
    },
    tsconfig: {
      type: "string",
      description: "Path to tsconfig.json. Default: nearest from cwd.",
    },
    "include-tag": {
      type: "string",
      description: "Only include functions carrying this JSDoc tag.",
    },
    "exclude-name": {
      type: "string",
      description: "Exclude functions whose name matches this regex.",
    },
    params: {
      type: "string",
      description: "How to render parameters: array | first-only | object.",
    },
    "unwrap-promise": {
      type: "boolean",
      // No default — let config-file value win when the flag is omitted.
      // Resolution chain: CLI flag → config.signature.unwrapPromise → core default (true).
      description: "Unwrap Promise<T> in return types (default: true).",
    },
    naming: {
      type: "string",
      description:
        "Naming strategy: function-name | file-function | jsdoc-tag.",
    },
    dialect: {
      type: "string",
      description:
        "JSON Schema dialect: draft-07 | draft-2020-12 | openapi-3.1.",
    },
    identity: {
      type: "string",
      description:
        'Attach the originating TS type name under this keyword (e.g. "x-fn-schema-ts"). Off when omitted.',
    },
    transport: {
      type: "string",
      description:
        'Attach a transport hint (multipart/base64) for binary types under this keyword (e.g. "x-fn-schema-transport"). Off when omitted.',
    },
    "source-locations": {
      type: "string",
      description:
        'Attach a "file:line:col" location to named definitions under this keyword (e.g. "x-fn-schema-source"). Off when omitted.',
    },
    pretty: {
      type: "boolean",
      default: false,
      description: "Pretty-print JSON output.",
    },
    quiet: {
      type: "boolean",
      default: false,
      description: "Suppress non-error logs.",
    },
    cwd: {
      type: "string",
      description: "Working directory. Default: process.cwd().",
    },
  },
  async run({ args }) {
    const cwd = path.resolve(args.cwd ?? process.cwd());
    const config = await loadFnSchemaConfig(cwd);

    if (args.quiet) consola.level = 1;

    const patternList = collectPatterns(args.patterns, config.files);
    if (patternList.length === 0) {
      consola.error(
        "No source patterns supplied. Pass globs as positional args or set `files` in fn-schema.config.{ts,js,json}.",
      );
      process.exitCode = 1;
      return;
    }

    const listFiles = (): Promise<string[]> =>
      fg(patternList, {
        cwd,
        absolute: true,
        onlyFiles: true,
        ignore: [
          "**/node_modules/**",
          "**/dist/**",
          "**/__fn_schema_virtual__/**",
        ],
      });

    const initialFiles = await listFiles();
    if (initialFiles.length === 0) {
      consola.warn(`No files matched: ${patternList.join(", ")}`);
      return;
    }

    const extractOpts: ExtractOptions = {
      cwd,
      tsConfigPath: args.tsconfig ?? config.tsConfigPath,
      include: mergeInclude(config.include, args["include-tag"]),
      exclude: mergeExclude(config.exclude, args["exclude-name"]),
      signature: {
        ...(config.signature ?? {}),
        parameters:
          (args.params as "array" | "first-only" | "object" | undefined) ??
          config.signature?.parameters,
        unwrapPromise:
          args["unwrap-promise"] ?? config.signature?.unwrapPromise,
      },
      schema: {
        ...(config.schema ?? {}),
        dialect:
          (args.dialect as
            | "draft-07"
            | "draft-2020-12"
            | "openapi-3.1"
            | undefined) ?? config.schema?.dialect,
        identity: pickKey(args.identity, config.schema?.identity),
        transport: pickKey(args.transport, config.schema?.transport),
        sourceLocations: pickKey(
          args["source-locations"],
          config.schema?.sourceLocations,
        ),
      },
      naming:
        (args.naming as
          | "function-name"
          | "file-function"
          | "jsdoc-tag"
          | undefined) ?? config.naming,
    };

    const outDir = args.out ?? config.out;
    const bundlePath = args.bundle as string | undefined;
    const bundleTypes = Boolean(args["bundle-types"]);
    const openapiPath = args.openapi as string | undefined;

    if (!outDir && !bundlePath && !openapiPath) {
      consola.warn(
        "No output target specified (--out, --bundle, --openapi). Printing summary only.",
      );
    }

    const project = createProject({
      cwd,
      tsConfigPath: extractOpts.tsConfigPath,
      extractors: [typescript(config.typescript)],
    });

    const runOnce = async (
      currentFiles: string[] = initialFiles,
    ): Promise<number> => {
      const files = await listFiles();
      const fileList = files.length > 0 ? files : currentFiles;
      const start = Date.now();
      consola.start(`Extracting from ${fileList.length} file(s)...`);
      const result = await project.extract({
        ...extractOpts,
        files: fileList,
      });
      logDiagnostics(result);
      await emitOutputs(result, {
        cwd,
        pretty: args.pretty,
        dialect: extractOpts.schema?.dialect,
        outDir,
        bundlePath,
        bundleTypes,
        openapiPath,
      });
      const errs = result.diagnostics.filter(
        (d) => d.severity === "error",
      ).length;
      const ms = Date.now() - start;
      consola.box(
        `Found ${result.signatures.length} signature(s) in ${ms}ms ${
          errs > 0 ? `— ${errs} error(s)` : ""
        }`,
      );
      return errs;
    };

    const errors = await runOnce(initialFiles);

    if (!args.watch) {
      project.dispose();
      if (errors > 0) process.exitCode = 1;
      return;
    }

    consola.info(`Watching ${patternList.length} pattern(s) for changes...`);
    let pending: Promise<number> | null = null;
    let queued = false;
    const trigger = async () => {
      if (pending) {
        queued = true;
        return;
      }
      pending = (async () => {
        try {
          return await runOnce();
        } finally {
          pending = null;
          if (queued) {
            queued = false;
            void trigger();
          }
        }
      })();
      void pending;
    };

    const watcher = chokidar.watch(patternList, {
      cwd,
      ignoreInitial: true,
      ignored: ["**/node_modules/**", "**/__fn_schema_virtual__/**"],
    });
    watcher.on("change", (changedRel) => {
      const abs = path.resolve(cwd, changedRel);
      project.refresh([abs]);
      void trigger();
    });
    watcher.on("add", (addedRel) => {
      const abs = path.resolve(cwd, addedRel);
      project.refresh([abs]);
      void trigger();
    });
    watcher.on("unlink", () => void trigger());

    process.on("SIGINT", () => {
      void watcher.close();
      project.dispose();
      process.exit(0);
    });
  },
});

async function emitOutputs(
  result: ExtractResult,
  opts: {
    cwd: string;
    pretty: boolean;
    dialect?: "draft-07" | "draft-2020-12" | "openapi-3.1";
    outDir?: string;
    bundlePath?: string;
    bundleTypes: boolean;
    openapiPath?: string;
  },
): Promise<void> {
  if (opts.outDir) {
    const written = await emit.toFiles(result, {
      dir: path.resolve(opts.cwd, opts.outDir),
      format: opts.pretty ? "json-pretty" : "json",
    });
    consola.success(`Wrote ${written.length} file(s) to ${opts.outDir}`);
  }
  if (opts.bundlePath) {
    const abs = path.resolve(opts.cwd, opts.bundlePath);
    await mkdir(path.dirname(abs), { recursive: true });
    const json = emit.toBundle(result, {
      pretty: opts.pretty,
      dialect: opts.dialect,
    });
    await writeFile(abs, json);
    consola.success(`Wrote bundle to ${opts.bundlePath}`);
    if (opts.bundleTypes) {
      const typesPath = abs.replace(/\.json$/i, "") + ".ts";
      const jsonImport = `./${path.basename(abs)}`;
      const tsSource = emit.toBundleTypesModule(result, { jsonImport });
      await writeFile(typesPath, tsSource);
      consola.success(
        `Wrote bundle types to ${path.relative(opts.cwd, typesPath)}`,
      );
    }
  }
  if (opts.openapiPath) {
    const abs = path.resolve(opts.cwd, opts.openapiPath);
    await mkdir(path.dirname(abs), { recursive: true });
    const doc = emit.toOpenAPI(result, { title: "fn-schema" });
    await writeFile(abs, JSON.stringify(doc, null, opts.pretty ? 2 : 0));
    consola.success(`Wrote OpenAPI document to ${opts.openapiPath}`);
  }
}

function logDiagnostics(result: ExtractResult): void {
  for (const d of result.diagnostics) {
    const msg = d.function ? `[${d.function}] ${d.message}` : d.message;
    if (d.severity === "error") consola.error(msg);
    else if (d.severity === "warning") consola.warn(msg);
    else consola.info(msg);
  }
}

function collectPatterns(
  cliPatterns: unknown,
  configFiles?: string | string[],
): string[] {
  const fromCli =
    typeof cliPatterns === "string"
      ? [cliPatterns]
      : Array.isArray(cliPatterns)
        ? (cliPatterns as string[])
        : [];
  if (fromCli.length > 0) return fromCli;
  if (!configFiles) return [];
  return Array.isArray(configFiles) ? configFiles : [configFiles];
}

function mergeInclude(
  configInclude: { jsDocTag?: string | string[] } | undefined,
  cliTag: string | undefined,
): { jsDocTag?: string | string[] } | undefined {
  if (!cliTag && !configInclude) return undefined;
  return {
    ...(configInclude ?? {}),
    ...(cliTag ? { jsDocTag: cliTag } : {}),
  };
}

/** Resolve a CLI string flag against a config-file fallback. Empty string or
 *  literal "false" turns the feature off; any other non-empty string is the
 *  vendor-extension keyword. */
function pickKey(
  cli: string | undefined,
  fallback: false | string | undefined,
): false | string {
  if (typeof cli === "string") {
    if (cli === "" || cli === "false") return false;
    return cli;
  }
  return fallback ?? false;
}

function mergeExclude(
  configExclude: { name?: string | RegExp | (string | RegExp)[] } | undefined,
  cliName: string | undefined,
): { name?: RegExp | (string | RegExp)[] } | undefined {
  if (!cliName && !configExclude) return undefined;
  const out: { name?: RegExp | (string | RegExp)[] } = {
    ...(configExclude as object),
  };
  if (cliName) {
    try {
      out.name = new RegExp(cliName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid --exclude-name regex "${cliName}": ${msg}`);
    }
  }
  return out;
}

export function run(): void {
  void runMain(main);
}
