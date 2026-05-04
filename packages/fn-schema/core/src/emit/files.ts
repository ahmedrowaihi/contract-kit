import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExtractResult, JSONSchema } from "../types.js";

export interface FileEmitOptions {
  /** Output directory; created if missing. */
  dir: string;
  /** Output format. Default: "json". */
  format?: "json" | "json-pretty";
  /** Optional definitions filename. Default: "_definitions.json". */
  definitionsFilename?: string;
  /**
   * How to compute the per-signature filename from the entry id.
   * Default: replaces "/" with "__" and appends ".json".
   */
  filename?: (id: string) => string;
}

export async function toFiles(
  result: ExtractResult,
  opts: FileEmitOptions,
): Promise<string[]> {
  const dir = path.resolve(opts.dir);
  await mkdir(dir, { recursive: true });
  const written: string[] = [];

  const fmt = opts.format ?? "json";
  const stringify = (s: unknown) =>
    fmt === "json-pretty" ? JSON.stringify(s, null, 2) : JSON.stringify(s);

  const filename = opts.filename ?? defaultFilename;

  for (const sig of result.signatures) {
    const file = path.join(dir, filename(sig.id));
    await writeFile(
      file,
      stringify({
        $schema: "http://json-schema.org/draft-07/schema#",
        title: sig.id,
        input: sig.input,
        output: sig.output,
      }),
    );
    written.push(file);
  }

  if (Object.keys(result.definitions).length > 0) {
    const file = path.join(
      dir,
      opts.definitionsFilename ?? "_definitions.json",
    );
    await writeFile(
      file,
      stringify(result.definitions satisfies Record<string, JSONSchema>),
    );
    written.push(file);
  }

  return written;
}

function defaultFilename(id: string): string {
  return `${id.replace(/[\\/]/g, "__")}.json`;
}
