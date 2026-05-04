/**
 * Marker functions consumers call in their app. The transformer replaces every
 * call site with the literal JSON Schema at compile time. The runtime stubs
 * below exist only so tsc / dev mode resolve the import — they never execute
 * after transformation.
 *
 * If the transformer is NOT applied, `schemaOf` returns `undefined` and
 * `inputSchemaOf` / `outputSchemaOf` likewise — useful for early adopters who
 * want a graceful fallback in environments where the transformer can't run.
 */

export interface FnSchemaPair<I = unknown, O = unknown> {
  input: I;
  output: O;
}

export function schemaOf<F extends (...args: never[]) => unknown>(
  _fn: F,
): FnSchemaPair | undefined {
  return undefined;
}

export function inputSchemaOf<F extends (...args: never[]) => unknown>(
  _fn: F,
): unknown {
  return undefined;
}

export function outputSchemaOf<F extends (...args: never[]) => unknown>(
  _fn: F,
): unknown {
  return undefined;
}
