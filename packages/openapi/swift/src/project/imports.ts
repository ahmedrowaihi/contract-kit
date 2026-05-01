import type { SwDecl } from "../sw-dsl/decl/types.js";

const FOUNDATION = "Foundation";

/**
 * Swift imports are at the module level, not the type level. Within a
 * single SDK module every generated type is implicitly accessible, so
 * there is no per-decl ref import work to do — only standard-library
 * modules (`Foundation` for `Data`, `URL`, `JSONEncoder`, etc.) get
 * imported, always.
 */
export function collectImports(_decl: SwDecl): string[] {
  return [FOUNDATION];
}
