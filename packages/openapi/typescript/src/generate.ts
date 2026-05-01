import { readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import {
  type NormalizeOptions,
  normalizeSpec,
  SAFE_NORMALIZE,
} from "@ahmedrowaihi/openapi-core";
import { $RefParser } from "@hey-api/json-schema-ref-parser";
import { createClient, type UserConfig } from "@hey-api/openapi-ts";

/**
 * Default plugin set — emits a runnable client SDK ready to drop into a
 * TypeScript project: types from schemas, the SDK functions, and the
 * `fetch`-based runtime adapter. Consumers wanting alternative shapes
 * (axios / ofetch / TanStack Query / zod / faker / etc.) override
 * `plugins` with the hey-api plugin name they want; the rest of
 * hey-api's plugin ecosystem all plugs in here unchanged.
 */
const DEFAULT_PLUGINS: ReadonlyArray<string> = [
  "@hey-api/client-fetch",
  "@hey-api/typescript",
  "@hey-api/sdk",
];

export interface GenerateOptions {
  /**
   * Path or URL to the OpenAPI 3.x spec. Forwarded to hey-api which
   * delegates to `@hey-api/json-schema-ref-parser` and accepts both
   * shapes.
   */
  input: string;
  /** Directory the SDK is written to (created if missing). */
  output: string;
  /**
   * Override hey-api's plugin list. When omitted, defaults to
   * `@hey-api/client-fetch` + `@hey-api/typescript` + `@hey-api/sdk`.
   * Pass any combination of hey-api's first-party plugins (validators,
   * Faker, TanStack Query, oRPC, etc.) or third-party plugin packages.
   */
  plugins?: UserConfig["plugins"];
  /**
   * Pass-through for any other hey-api `UserConfig` field —
   * `parser.transforms`, `experimentalParser`, `dryRun`, custom client
   * options, etc. Merged on top of the resolved config last, so it
   * wins over the defaults set here.
   */
  heyApi?: Partial<UserConfig>;
  /**
   * Pre-codegen spec normalization. When enabled, the spec is bundled
   * + normalized before being handed to hey-api as a parsed object,
   * so all four targets share the same normalization logic.
   */
  normalize?: boolean | NormalizeOptions;
}

export interface BuiltFile {
  /** Path relative to `output`. */
  path: string;
}

export interface GenerateResult {
  /** Absolute output directory. */
  output: string;
  /** Files written under `output`, relative paths. */
  files: BuiltFile[];
}

/**
 * Run hey-api's TypeScript codegen against `input`, writing the result
 * to `output`. Thin wrapper around `createClient` that matches the
 * `generate()` shape of `@ahmedrowaihi/openapi-{go,kotlin,swift}` so
 * the same `sdk-regen` workflow drives all four targets uniformly.
 */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const out = resolve(process.cwd(), opts.output);
  const input = opts.normalize
    ? await bundleAndNormalize(opts.input, opts.normalize)
    : opts.input;
  const config: UserConfig = {
    input,
    output: out,
    plugins: (opts.plugins ?? DEFAULT_PLUGINS) as UserConfig["plugins"],
    ...opts.heyApi,
  };
  await createClient(config);
  const files = await collectFiles(out);
  return { output: out, files };
}

async function bundleAndNormalize(
  input: string,
  normalize: true | NormalizeOptions,
): Promise<Record<string, unknown>> {
  const parser = new $RefParser();
  const bundled = (await parser.bundle({
    pathOrUrlOrSchema: input,
  })) as Record<string, unknown>;
  return normalizeSpec(
    bundled,
    normalize === true ? SAFE_NORMALIZE : normalize,
  );
}

/**
 * Walk `dir` recursively and return every regular file under it as a
 * relative path. Used to surface a `GenerateResult.files` array
 * matching what our other generators return — hey-api's
 * `createClient` resolves to `Context[]`, not a file list, so we read
 * the result back from disk.
 */
async function collectFiles(dir: string): Promise<BuiltFile[]> {
  const out: BuiltFile[] = [];
  await walk(dir, dir, out);
  return out;
}

async function walk(
  base: string,
  current: string,
  out: BuiltFile[],
): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(current);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(current, entry);
    const s = await stat(full);
    if (s.isDirectory()) await walk(base, full, out);
    else out.push({ path: relative(base, full) });
  }
}
