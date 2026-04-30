import type { IR } from "@hey-api/shared";

const REF_SCHEMA_PREFIX = "#/components/schemas/";

export function refName(ref: string): string {
  return ref.startsWith(REF_SCHEMA_PREFIX)
    ? ref.slice(REF_SCHEMA_PREFIX.length)
    : ref;
}

/**
 * Empty / unknown / void schemas — used to short-circuit a 2xx response
 * to a `Unit` return.
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
