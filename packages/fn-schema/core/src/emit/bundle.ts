import type { ExtractResult, SchemaDialect } from "../types.js";

export interface BundleEmitOptions {
  pretty?: boolean;
  /** Schema dialect URL stamped into the bundle's `$schema`. Default: draft-07. */
  dialect?: SchemaDialect;
}

const DIALECT_URL: Record<SchemaDialect, string> = {
  "draft-07": "http://json-schema.org/draft-07/schema#",
  "draft-2020-12": "https://json-schema.org/draft/2020-12/schema",
  "openapi-3.1": "https://spec.openapis.org/oas/3.1/dialect/base",
};

/**
 * Emit a single JSON document containing every signature keyed by id, plus
 * shared definitions. Useful for shipping one artifact instead of N files.
 */
export function toBundle(
  result: ExtractResult,
  opts: BundleEmitOptions = {},
): string {
  const dialect = opts.dialect ?? "draft-07";
  const doc = {
    $schema: DIALECT_URL[dialect],
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
