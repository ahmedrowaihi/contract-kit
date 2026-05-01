import type { SwAccess } from "../access.js";
import type { SwFun } from "../fun.js";

export interface SwProtocol {
  kind: "protocol";
  name: string;
  access: SwAccess;
  conforms: ReadonlyArray<string>;
  funs: ReadonlyArray<SwFun>;
}

/**
 * Top-level protocol decl. Pass each requirement as a `SwFun` with no
 * body — the printer omits the braces.
 *
 * @example
 * ```swift
 * // swProtocol({ name: "UsersAPI",
 * //              funs: [swFun({ name: "getUser", params: […],
 * //                             returnType: swRef("User"),
 * //                             effects: ["async", "throws"] })] })
 * //   → public protocol UsersAPI { func getUser(…) async throws -> User }
 * ```
 */
export function swProtocol(opts: {
  name: string;
  funs: ReadonlyArray<SwFun>;
  conforms?: ReadonlyArray<string>;
  access?: SwAccess;
}): SwProtocol {
  return {
    kind: "protocol",
    name: opts.name,
    access: opts.access ?? "public",
    conforms: opts.conforms ?? [],
    funs: opts.funs,
  };
}
