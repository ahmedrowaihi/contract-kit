import type { KtType } from "../type/types.js";
import type { KtVisibility } from "../visibility.js";

export interface KtTypeAlias {
  kind: "typeAlias";
  name: string;
  visibility: KtVisibility;
  type: KtType;
}

/**
 * Type alias decl.
 *
 * @example
 * ```kotlin
 * // ktTypeAlias({ name: "Headers", type: ktMap(ktString, ktString) })
 * //   → public typealias Headers = Map<String, String>
 * ```
 */
export function ktTypeAlias(opts: {
  name: string;
  type: KtType;
  visibility?: KtVisibility;
}): KtTypeAlias {
  return {
    kind: "typeAlias",
    name: opts.name,
    visibility: opts.visibility ?? "public",
    type: opts.type,
  };
}
