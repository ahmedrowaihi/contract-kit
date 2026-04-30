import type { GoExpr } from "../expr/types.js";
import type { GoType } from "../type/types.js";

export interface GoConstEntry {
  name: string;
  /** Optional value — first entry typically has one; subsequent
   *  entries inherit when omitted (Go's `iota` / typed-const idiom). */
  value?: GoExpr;
  doc?: string;
}

export interface GoConstBlock {
  kind: "constBlock";
  /** Optional shared type — `const ( a Foo = ...; b; c )`. */
  type?: GoType;
  entries: ReadonlyArray<GoConstEntry>;
  doc?: string;
  runtime?: boolean;
  /** Synthetic: when this const block is the "enum" form for an
   *  OpenAPI enum schema, the schema's name lives here so the project
   *  layout can route the file by name. */
  name?: string;
}

/** Single const-block entry. */
export const goConstEntry = (
  name: string,
  value?: GoExpr,
  doc?: string,
): GoConstEntry => ({ name, value, doc });

/**
 * `const ( ... )` block — Go's idiomatic shape for enum-like constants.
 * For OpenAPI string enums we emit:
 *
 *   type Status string
 *   const (
 *       StatusActive  Status = "active"
 *       StatusPending Status = "pending"
 *   )
 *
 * The matching `type Status string` decl is emitted separately as a
 * `goTypeAlias`.
 *
 * @example
 * ```go
 * // goConstBlock({ type: goRef("Status"), entries: [
 * //   goConstEntry("StatusActive", goStr("active")),
 * //   goConstEntry("StatusPending", goStr("pending")),
 * // ] })
 * ```
 */
export function goConstBlock(opts: {
  entries: ReadonlyArray<GoConstEntry>;
  type?: GoType;
  doc?: string;
  runtime?: boolean;
  name?: string;
}): GoConstBlock {
  return {
    kind: "constBlock",
    type: opts.type,
    entries: opts.entries,
    doc: opts.doc,
    runtime: opts.runtime,
    name: opts.name,
  };
}
