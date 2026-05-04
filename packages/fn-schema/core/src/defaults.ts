import type {
  ResolvedSchemaOptions,
  ResolvedSignatureOptions,
  SchemaOptions,
  SignatureOptions,
} from "./types.js";

export function resolveSignatureOptions(
  o?: SignatureOptions,
): ResolvedSignatureOptions {
  return {
    parameters: o?.parameters ?? "array",
    unwrapPromise: o?.unwrapPromise ?? true,
    generics: o?.generics ?? "skip",
    overloads: o?.overloads ?? "all",
    skipParameter: o?.skipParameter ?? null,
  };
}

export function resolveSchemaOptions(o?: SchemaOptions): ResolvedSchemaOptions {
  return {
    dialect: o?.dialect ?? "draft-07",
    refStrategy: o?.refStrategy ?? "definitions",
    definitionsPath: o?.definitionsPath ?? "#/definitions",
    topRef: o?.topRef ?? false,
    additionalProperties: o?.additionalProperties ?? false,
    encodeRefs: o?.encodeRefs ?? true,
    expose: o?.expose ?? "export",
  };
}
