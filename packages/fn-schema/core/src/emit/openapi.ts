import type { ExtractResult, JSONSchema } from "../types.js";

export interface OpenAPIEmitOptions {
  title?: string;
  version?: string;
  /**
   * How to name the per-signature schemas. Defaults produce `<id>Input` and
   * `<id>Output`. Override to avoid collisions with existing `definitions`.
   */
  naming?: {
    input?: (id: string) => string;
    output?: (id: string) => string;
  };
}

/**
 * Best-effort lift of fn-schema results into an OpenAPI 3.1 components-only
 * document. Path mapping is left to the caller.
 *
 * Tuple inputs (when `parameters: "array"`) are rendered with `prefixItems`
 * per the JSON Schema 2020-12 / OpenAPI 3.1 tuple convention.
 */
export function toOpenAPI(
  result: ExtractResult,
  opts: OpenAPIEmitOptions = {},
): {
  openapi: "3.1.0";
  info: { title: string; version: string };
  components: { schemas: Record<string, JSONSchema> };
} {
  const schemas: Record<string, JSONSchema> = { ...result.definitions };
  const inputName = opts.naming?.input ?? ((id) => `${id}Input`);
  const outputName = opts.naming?.output ?? ((id) => `${id}Output`);

  for (const sig of result.signatures) {
    const iKey = pickFreeKey(inputName(sig.id), schemas);
    const oKey = pickFreeKey(outputName(sig.id), schemas);
    schemas[iKey] = Array.isArray(sig.input)
      ? // OpenAPI 3.1 / Draft 2020-12: tuples use `prefixItems`. Cast to
        // JSONSchema7-compatible shape via index signature — `prefixItems`
        // isn't in the JSONSchema7 type but is valid in the emitted JSON.
        ({
          type: "array",
          prefixItems: sig.input,
          items: false,
          minItems: sig.input.length,
          maxItems: sig.input.length,
        } as unknown as JSONSchema)
      : sig.input;
    schemas[oKey] = sig.output;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: opts.title ?? "fn-schema",
      version: opts.version ?? "0.0.0",
    },
    components: { schemas },
  };
}

function pickFreeKey(
  desired: string,
  schemas: Record<string, JSONSchema>,
): string {
  if (!(desired in schemas)) return desired;
  let n = 2;
  while (`${desired}__${n}` in schemas) n++;
  return `${desired}__${n}`;
}
