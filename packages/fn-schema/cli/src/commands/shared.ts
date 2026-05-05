import path from "node:path";
import type {
  ExcludeFilter,
  ExtractOptions,
  IncludeFilter,
} from "@ahmedrowaihi/fn-schema-core";
import fg from "fast-glob";
import type { FnSchemaConfig } from "../config.js";

export interface CommonArgs {
  patterns?: string | string[];
  cwd?: string;
  tsconfig?: string;
  "include-tag"?: string;
  "exclude-name"?: string;
}

export function collectPatterns(
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

export function makeListFiles(
  patternList: string[],
  cwd: string,
): () => Promise<string[]> {
  return () =>
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
}

export function resolveCwd(cwd: string | undefined): string {
  return path.resolve(cwd ?? process.cwd());
}

export function mergeInclude(
  configInclude: IncludeFilter | undefined,
  cliTag: string | undefined,
): IncludeFilter | undefined {
  if (!cliTag && !configInclude) return undefined;
  return {
    ...(configInclude ?? {}),
    ...(cliTag ? { jsDocTag: cliTag } : {}),
  };
}

export function mergeExclude(
  configExclude: ExcludeFilter | undefined,
  cliName: string | undefined,
): ExcludeFilter | undefined {
  if (!cliName && !configExclude) return undefined;
  const out: ExcludeFilter = { ...(configExclude ?? {}) };
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

/**
 * Build the minimal ExtractOptions every command shares — filter-related,
 * tsconfig, cwd. Pipeline-specific options (signature.parameters,
 * schema.identity, etc.) are added by individual commands.
 */
export function baseExtractOpts(
  args: CommonArgs,
  config: FnSchemaConfig,
  cwd: string,
): ExtractOptions {
  return {
    cwd,
    tsConfigPath: args.tsconfig ?? config.tsConfigPath,
    include: mergeInclude(config.include, args["include-tag"]),
    exclude: mergeExclude(config.exclude, args["exclude-name"]),
  };
}
