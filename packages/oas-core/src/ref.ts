import type { IR } from "@hey-api/shared";

const REF_SCHEMA_PREFIX = "#/components/schemas/";

/**
 * Extract the type name from a `$ref` pointing into
 * `#/components/schemas`. Non-schema refs pass through unchanged so
 * the caller can decide how to surface them; in practice generators
 * only see schema refs because hey-api's ref-parser inlines other
 * pointer types (parameters, requestBodies, responses) before the IR
 * stage.
 */
export function refName(ref: string): string {
  return ref.startsWith(REF_SCHEMA_PREFIX)
    ? ref.slice(REF_SCHEMA_PREFIX.length)
    : ref;
}

/**
 * Empty / unknown / void schemas — used to short-circuit a 2xx response
 * to a no-payload return type (Kotlin `Unit`, Swift `Void`, Go's
 * absence of a return type).
 */
export function isMeaningless(s: IR.SchemaObject): boolean {
  if (s.$ref || s.const !== undefined) return false;
  if (s.items && s.items.length > 0) return false;
  if (s.properties && Object.keys(s.properties).length > 0) return false;
  return (
    s.type === undefined ||
    s.type === "unknown" ||
    s.type === "void" ||
    s.type === "never"
  );
}
