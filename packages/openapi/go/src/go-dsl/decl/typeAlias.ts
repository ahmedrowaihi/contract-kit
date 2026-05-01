import type { GoType } from "../type/types.js";

export interface GoTypeAlias {
  kind: "typeAlias";
  name: string;
  type: GoType;
  /** When true, render as `type Name = Underlying` (true alias —
   *  identical type). Default `false` renders as `type Name Underlying`
   *  (defined / nominal type — distinct identity). For OpenAPI primitive
   *  schemas, the nominal form is what we want. */
  alias: boolean;
  doc?: string;
  runtime?: boolean;
}

/**
 * Type definition or alias.
 *
 * @example
 * ```go
 * // goTypeAlias({ name: "PetID", type: goInt64 })
 * //   → type PetID int64
 * // goTypeAlias({ name: "ID", type: goInt64, alias: true })
 * //   → type ID = int64
 * ```
 */
export function goTypeAlias(opts: {
  name: string;
  type: GoType;
  alias?: boolean;
  doc?: string;
  runtime?: boolean;
}): GoTypeAlias {
  return {
    kind: "typeAlias",
    name: opts.name,
    type: opts.type,
    alias: opts.alias ?? false,
    doc: opts.doc,
    runtime: opts.runtime,
  };
}
