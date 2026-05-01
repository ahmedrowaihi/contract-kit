import type { KtFun, KtFunParam } from "../fun.js";
import type { KtStmt } from "../stmt/types.js";
import type { KtVisibility } from "../visibility.js";
import type { KtAnnotation, KtProp } from "./prop.js";

export type KtClassModifier = "open" | "abstract" | "final";

export interface KtClass {
  kind: "class";
  name: string;
  visibility: KtVisibility;
  modifiers: ReadonlyArray<KtClassModifier>;
  annotations: ReadonlyArray<KtAnnotation>;
  /** Primary-constructor parameters that are NOT also props (rare in Kotlin SDK code). */
  ctorParams: ReadonlyArray<KtFunParam>;
  superTypes: ReadonlyArray<string>;
  properties: ReadonlyArray<KtProp>;
  funs: ReadonlyArray<KtFun>;
  /** `init { ... }` block contents — runs after primary-ctor binding. */
  initBlock?: ReadonlyArray<KtStmt>;
  runtime?: boolean;
}

/**
 * Top-level class. Default modifier is `final` (Kotlin's default — no
 * explicit keyword printed). Pass `["open"]` to allow subclassing.
 *
 * Property-style class members:
 *  - props with `inPrimary: true` go into the primary constructor
 *    parameter list as `val name: T` / `var name: T`.
 *  - props without `inPrimary` are emitted in the body.
 *
 * @example
 * ```kotlin
 * // ktClass({ name: "ApiClient",
 * //           properties: [ktProp({ name: "baseUrl", type: ktString, inPrimary: true })],
 * //           funs: [...] })
 * //   → public class ApiClient(public val baseUrl: String) { … }
 * ```
 */
export function ktClass(opts: {
  name: string;
  properties?: ReadonlyArray<KtProp>;
  funs?: ReadonlyArray<KtFun>;
  ctorParams?: ReadonlyArray<KtFunParam>;
  superTypes?: ReadonlyArray<string>;
  modifiers?: ReadonlyArray<KtClassModifier>;
  annotations?: ReadonlyArray<KtAnnotation>;
  initBlock?: ReadonlyArray<KtStmt>;
  visibility?: KtVisibility;
  runtime?: boolean;
}): KtClass {
  return {
    kind: "class",
    name: opts.name,
    visibility: opts.visibility ?? "public",
    modifiers: opts.modifiers ?? [],
    annotations: opts.annotations ?? [],
    ctorParams: opts.ctorParams ?? [],
    superTypes: opts.superTypes ?? [],
    properties: opts.properties ?? [],
    funs: opts.funs ?? [],
    initBlock: opts.initBlock,
    runtime: opts.runtime,
  };
}
