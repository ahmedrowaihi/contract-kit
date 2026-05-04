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
        {
          name: s.name,
          file: s.file,
          input: s.input,
          output: s.output,
        },
      ]),
    ),
  };
  return opts.pretty ? JSON.stringify(doc, null, 2) : JSON.stringify(doc);
}

export interface BundleTypesOptions {
  /** Module specifier the wrapper imports the JSON from. Default: `./schemas.json`. */
  jsonImport?: string;
}

/**
 * Emit a TypeScript wrapper module that imports the bundle JSON and re-exports
 * it under a literal-typed shape. Pair with `toBundle` to get autocomplete on
 * signature ids and definition names + a typed `createReader<typeof schemas>()`.
 */
export function toBundleTypesModule(
  result: ExtractResult,
  opts: BundleTypesOptions = {},
): string {
  const jsonImport = opts.jsonImport ?? "./schemas.json";
  const sigKeys = result.signatures
    .map(
      (s) =>
        `    readonly ${quoteKey(s.id)}: { input: ${
          Array.isArray(s.input) ? "readonly unknown[]" : "unknown"
        }; output: unknown };`,
    )
    .join("\n");
  const defKeys = Object.keys(result.definitions)
    .map((name) => `    readonly ${quoteKey(name)}: JSONSchema;`)
    .join("\n");
  return [
    `import type { JSONSchema } from "@ahmedrowaihi/fn-schema-core";`,
    `import raw from "${jsonImport}" with { type: "json" };`,
    ``,
    `export interface Schemas {`,
    `  $schema?: string;`,
    `  signatures: {`,
    sigKeys,
    `  };`,
    `  definitions: {`,
    defKeys,
    `  };`,
    `}`,
    ``,
    `export const schemas: Schemas = raw as unknown as Schemas;`,
    `export default schemas;`,
    ``,
  ].join("\n");
}

function quoteKey(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}
