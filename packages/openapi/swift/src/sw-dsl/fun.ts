import type { SwAccess } from "./access.js";
import type { SwStmt } from "./stmt/types.js";
import type { SwType } from "./type/types.js";

export interface SwFunParam {
  kind: "funParam";
  label?: string;
  name: string;
  type: SwType;
  default?: string;
}

export interface SwGenericParam {
  name: string;
  conformances?: ReadonlyArray<string>;
}

export interface SwFun {
  kind: "fun";
  name: string;
  access: SwAccess;
  effects: ReadonlyArray<"async" | "throws">;
  isStatic: boolean;
  isMutating: boolean;
  generics: ReadonlyArray<SwGenericParam>;
  params: ReadonlyArray<SwFunParam>;
  returnType: SwType;
  body?: ReadonlyArray<SwStmt>;
  doc?: string;
}

/**
 * Function parameter. Pass `label: "_"` to omit the external label or
 * any other string to override it; otherwise the external label
 * matches `name`.
 *
 * @example
 * ```swift
 * // swFunParam({ name: "request", label: "_", type: swRef("URLRequest") })
 * //   → _ request: URLRequest
 * // swFunParam({ name: "type", label: "as", type: swRef("T.Type") })
 * //   → as type: T.Type
 * // swFunParam({ name: "session", type: swRef("URLSession"), default: ".shared" })
 * //   → session: URLSession = .shared
 * ```
 */
export function swFunParam(opts: {
  name: string;
  type: SwType;
  label?: string;
  default?: string;
}): SwFunParam {
  return {
    kind: "funParam",
    name: opts.name,
    type: opts.type,
    label: opts.label,
    default: opts.default,
  };
}

/**
 * Generic parameter on a function: `<T: Constraint1 & Constraint2>`.
 *
 * @example
 * ```swift
 * // swGenericParam("T", ["Decodable"]) → T: Decodable
 * ```
 */
export const swGenericParam = (
  name: string,
  conformances?: ReadonlyArray<string>,
): SwGenericParam => ({ name, conformances });

/**
 * Function decl. Omit `body` for protocol requirements (no braces are
 * printed). `effects: ["async", "throws"]` renders both modifiers in
 * order.
 *
 * @example
 * ```swift
 * // swFun({ name: "execute",
 * //         generics: [swGenericParam("T", ["Decodable"])],
 * //         params: [swFunParam({ name: "request", label: "_", type: swRef("URLRequest") })],
 * //         returnType: swRef("T"),
 * //         effects: ["async", "throws"],
 * //         body: [swReturn(…)] })
 * //   → public func execute<T: Decodable>(_ request: URLRequest) async throws -> T { … }
 * ```
 */
export function swFun(opts: {
  name: string;
  params: ReadonlyArray<SwFunParam>;
  returnType: SwType;
  effects?: ReadonlyArray<"async" | "throws">;
  body?: ReadonlyArray<SwStmt>;
  doc?: string;
  access?: SwAccess;
  isStatic?: boolean;
  isMutating?: boolean;
  generics?: ReadonlyArray<SwGenericParam>;
}): SwFun {
  return {
    kind: "fun",
    name: opts.name,
    access: opts.access ?? "public",
    effects: opts.effects ?? [],
    isStatic: opts.isStatic ?? false,
    isMutating: opts.isMutating ?? false,
    generics: opts.generics ?? [],
    params: opts.params,
    returnType: opts.returnType,
    body: opts.body,
    doc: opts.doc,
  };
}
