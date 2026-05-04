import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { emit } from "@ahmedrowaihi/fn-schema-core";
import { extract } from "@ahmedrowaihi/fn-schema-typescript";
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

    const files = await fg(patternList, {
      cwd,
      absolute: true,
      onlyFiles: true,
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/__fn_schema_virtual__/**",
      ],
    });

    if (files.length === 0) {
      consola.warn(`No files matched: ${patternList.join(", ")}`);
      return;
    }

    consola.start(`Extracting from ${files.length} file(s)...`);

    const result = await extract({
      cwd,
      files,
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
      typescript: config.typescript,
    });

    for (const d of result.diagnostics) {
      const msg = d.function ? `[${d.function}] ${d.message}` : d.message;
      if (d.severity === "error") consola.error(msg);
      else if (d.severity === "warning") consola.warn(msg);
      else consola.info(msg);
    }

    const outDir = args.out ?? config.out;
    const bundlePath = args.bundle as string | undefined;
    const openapiPath = args.openapi as string | undefined;

    if (!outDir && !bundlePath && !openapiPath) {
      consola.warn(
        "No output target specified (--out, --bundle, --openapi). Printing summary only.",
      );
      consola.box(
        `Found ${result.signatures.length} signature(s) across ${result.stats.filesScanned} file(s) in ${result.stats.durationMs}ms`,
      );
      return;
    }

    if (outDir) {
      const written = await emit.toFiles(result, {
        dir: path.resolve(cwd, outDir),
        format: args.pretty ? "json-pretty" : "json",
      });
      consola.success(`Wrote ${written.length} file(s) to ${outDir}`);
    }
    if (bundlePath) {
      const abs = path.resolve(cwd, bundlePath);
      await mkdir(path.dirname(abs), { recursive: true });
      const json = emit.toBundle(result, { pretty: args.pretty });
      await writeFile(abs, json);
      consola.success(`Wrote bundle to ${bundlePath}`);
    }
    if (openapiPath) {
      const abs = path.resolve(cwd, openapiPath);
      await mkdir(path.dirname(abs), { recursive: true });
      const doc = emit.toOpenAPI(result, { title: "fn-schema" });
      await writeFile(abs, JSON.stringify(doc, null, args.pretty ? 2 : 0));
      consola.success(`Wrote OpenAPI document to ${openapiPath}`);
    }

    const errors = result.diagnostics.filter(
      (d) => d.severity === "error",
    ).length;
    if (errors > 0) process.exitCode = 1;
  },
});

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
