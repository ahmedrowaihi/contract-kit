import type { GoStmt } from "../stmt/types.js";
import type { GoType } from "../type/types.js";

export interface GoFuncParam {
  name: string;
  type: GoType;
}

export interface GoFuncResult {
  name?: string;
  type: GoType;
}

export interface GoTypeParam {
  name: string;
  /** Type constraint — usually `any`, `comparable`, or a constraint
   *  interface name like `Decodable`. */
  constraint: string;
}

export interface GoFuncReceiver {
  name: string;
  /** The receiver type, e.g. `*OkHttpPetAPI`. Must be a `goPtr(...)` or
   *  a bare ref. */
  type: GoType;
}

export interface GoFunc {
  kind: "func";
  name: string;
  /** Method receiver — `func (c *Client) Method(...) ...`. */
  receiver?: GoFuncReceiver;
  typeParams: ReadonlyArray<GoTypeParam>;
  params: ReadonlyArray<GoFuncParam>;
  results: ReadonlyArray<GoFuncResult>;
  body?: ReadonlyArray<GoStmt>;
  doc?: string;
  runtime?: boolean;
}

/**
 * Function or method decl. `body === undefined` is reserved for
 * future use (interface-style externs); the printer treats it as
 * "no body" → `func name(...)` with no braces (rarely valid in Go
 * source — usually represents a forward declaration in cgo, etc.).
 *
 * @example
 * ```go
 * // goFunc({ name: "Hello",
 * //   params: [{ name: "name", type: goString }],
 * //   results: [{ type: goString }],
 * //   body: [goReturn([goCall(...)])] })
 * //   → func Hello(name string) string { ... }
 * //
 * // With receiver:
 * // goFunc({ name: "Method",
 * //   receiver: { name: "c", type: goPtr(goRef("Client")) },
 * //   params: [...], results: [...], body: [...] })
 * //   → func (c *Client) Method(...) ... { ... }
 * ```
 */
export function goFuncDecl(opts: {
  name: string;
  params?: ReadonlyArray<GoFuncParam>;
  results?: ReadonlyArray<GoFuncResult>;
  receiver?: GoFuncReceiver;
  typeParams?: ReadonlyArray<GoTypeParam>;
  body?: ReadonlyArray<GoStmt>;
  doc?: string;
  runtime?: boolean;
}): GoFunc {
  return {
    kind: "func",
    name: opts.name,
    receiver: opts.receiver,
    typeParams: opts.typeParams ?? [],
    params: opts.params ?? [],
    results: opts.results ?? [],
    body: opts.body,
    doc: opts.doc,
    runtime: opts.runtime,
  };
}

export const goFuncParam = (name: string, type: GoType): GoFuncParam => ({
  name,
  type,
});

export const goFuncResult = (type: GoType, name?: string): GoFuncResult => ({
  name,
  type,
});

export const goTypeParam = (
  name: string,
  constraint: string = "any",
): GoTypeParam => ({ name, constraint });

export const goReceiver = (name: string, type: GoType): GoFuncReceiver => ({
  name,
  type,
});
