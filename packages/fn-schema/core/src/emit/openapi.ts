import type { ExtractResult, JSONSchema } from "../types.js";

export interface OpenAPIEmitOptions {
  title?: string;
  version?: string;
}

/**
 * Best-effort lift of fn-schema results into an OpenAPI 3.1 components-only
 * document — every signature becomes two named schemas: `<id>Input`,
 * `<id>Output`. Path mapping is left to the caller.
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

  for (const sig of result.signatures) {
    schemas[`${sig.id}Input`] = Array.isArray(sig.input)
      ? ({ type: "array", items: sig.input } as JSONSchema)
      : sig.input;
    schemas[`${sig.id}Output`] = sig.output;
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
