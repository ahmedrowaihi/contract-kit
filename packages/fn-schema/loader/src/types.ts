export interface BundleSignature {
  /** Original TS function name (independent of the `id` it's keyed by). */
  name?: string;
  /** Absolute path of the source file the signature was extracted from. */
  file?: string;
  input: unknown;
  output: unknown;
}

/**
 * Bundles carry vendor-extension keywords (`x-fn-schema-ts`, etc.), so
 * definition values are typed as plain objects rather than `JSONSchema7` —
 * the strict @types/json-schema type rejects unknown keys at construction.
 */
export interface Bundle {
  $schema?: string;
  signatures: Record<string, BundleSignature>;
  definitions: Record<string, Record<string, unknown>>;
}

export type SignatureId<T extends Bundle> = keyof T["signatures"] & string;
export type DefinitionName<T extends Bundle> = keyof T["definitions"] & string;

export interface Match {
  signatureId: string;
  position: "input" | "output";
  schema: unknown;
}

export const DEFAULT_IDENTITY_KEY = "x-fn-schema-ts";
export const DEFINITIONS_PREFIX = "#/definitions/";
