import type { ExtractResult } from "../types.js";

export interface BundleEmitOptions {
  pretty?: boolean;
}

/**
 * Emit a single JSON document containing every signature keyed by id, plus
 * shared definitions. Useful for shipping one artifact instead of N files.
 */
export function toBundle(
  result: ExtractResult,
  opts: BundleEmitOptions = {},
): string {
  const doc = {
    $schema: "http://json-schema.org/draft-07/schema#",
    definitions: result.definitions,
    signatures: Object.fromEntries(
      result.signatures.map((s) => [
        s.id,
        { input: s.input, output: s.output },
      ]),
    ),
  };
  return opts.pretty ? JSON.stringify(doc, null, 2) : JSON.stringify(doc);
}
