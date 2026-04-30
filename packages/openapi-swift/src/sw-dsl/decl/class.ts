import type { SwAccess } from "../access.js";
import type { SwFun, SwFunParam } from "../fun.js";
import type { SwStmt } from "../stmt/types.js";
import type { SwProp } from "./struct.js";

export type SwClassModifier = "final" | "open";

export interface SwInit {
  kind: "init";
  access: SwAccess;
  params: ReadonlyArray<SwFunParam>;
  body: ReadonlyArray<SwStmt>;
}

export interface SwClass {
  kind: "class";
  name: string;
  access: SwAccess;
  modifiers: ReadonlyArray<SwClassModifier>;
  conforms: ReadonlyArray<string>;
  properties: ReadonlyArray<SwProp>;
  inits: ReadonlyArray<SwInit>;
  funs: ReadonlyArray<SwFun>;
  runtime?: boolean;
}

/**
 * Class initializer. The printer auto-emits `self.x = x` for every
 * param before running `body`.
 *
 * @example
 * ```swift
 * // swInit({ params: [swFunParam({ name: "baseURL", type: swRef("URL") })] })
 * //   → public init(baseURL: URL) { self.baseURL = baseURL }
 * ```
 */
export function swInit(opts: {
  params: ReadonlyArray<SwFunParam>;
  body?: ReadonlyArray<SwStmt>;
  access?: SwAccess;
}): SwInit {
  return {
    kind: "init",
    access: opts.access ?? "public",
    params: opts.params,
    body: opts.body ?? [],
  };
}

/**
 * Top-level class decl. Default modifier is `final`; pass
 * `modifiers: ["open"]` to allow subclassing.
 *
 * @example
 * ```swift
 * // swClass({ name: "APIClient", properties: […], inits: […], funs: […] })
 * //   → public final class APIClient { … }
 * ```
 */
export function swClass(opts: {
  name: string;
  conforms?: ReadonlyArray<string>;
  properties?: ReadonlyArray<SwProp>;
  inits?: ReadonlyArray<SwInit>;
  funs?: ReadonlyArray<SwFun>;
  modifiers?: ReadonlyArray<SwClassModifier>;
  access?: SwAccess;
  runtime?: boolean;
}): SwClass {
  return {
    kind: "class",
    name: opts.name,
    access: opts.access ?? "public",
    modifiers: opts.modifiers ?? ["final"],
    conforms: opts.conforms ?? [],
    properties: opts.properties ?? [],
    inits: opts.inits ?? [],
    funs: opts.funs ?? [],
    runtime: opts.runtime,
  };
}
