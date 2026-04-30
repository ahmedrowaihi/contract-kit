import type { SwPrimitive, SwType } from "./types.js";

const prim = (name: SwPrimitive): SwType => ({ kind: "primitive", name });

/**
 * Common Swift primitive shortcuts. Each renders to its bare type
 * name in source.
 *
 * @example
 * ```swift
 * // swString → String
 * // swInt    → Int
 * // swData   → Data
 * // swVoid   → Void
 * ```
 */
export const swString = prim("String");
export const swInt = prim("Int");
export const swInt32 = prim("Int32");
export const swInt64 = prim("Int64");
export const swDouble = prim("Double");
export const swFloat = prim("Float");
export const swBool = prim("Bool");
export const swData = prim("Data");
export const swVoid = prim("Void");
export const swAny = prim("Any");

/**
 * Optional wrapper — renders as `Inner?`.
 *
 * @example
 * ```swift
 * // swOptional(swString) → String?
 * ```
 */
export const swOptional = (inner: SwType): SwType => ({
  kind: "optional",
  inner,
});

/**
 * Array of element type — renders as `[Element]`.
 *
 * @example
 * ```swift
 * // swArray(swString) → [String]
 * ```
 */
export const swArray = (element: SwType): SwType => ({
  kind: "array",
  element,
});

/**
 * Dictionary type — renders as `[Key: Value]`.
 *
 * @example
 * ```swift
 * // swDict(swString, swInt) → [String: Int]
 * ```
 */
export const swDict = (key: SwType, value: SwType): SwType => ({
  kind: "dictionary",
  key,
  value,
});

/**
 * Named type reference — for user-defined / Foundation types that
 * don't have a primitive shortcut.
 *
 * @example
 * ```swift
 * // swRef("URL")        → URL
 * // swRef("URLRequest") → URLRequest
 * // swRef("User")       → User
 * ```
 */
export const swRef = (name: string): SwType => ({ kind: "ref", name });

/**
 * Tuple type — renders as `(A, B, …)`. The expression-level builder
 * `swTuple` lives in `expr/misc.ts` and produces a *value*; this one
 * produces a *type*. They're disjoint so the names don't collide.
 *
 * @example
 * ```swift
 * // swTupleType([swData, swRef("HTTPURLResponse")])
 * //   → (Data, HTTPURLResponse)
 * ```
 */
export const swTupleType = (items: ReadonlyArray<SwType>): SwType => ({
  kind: "tuple",
  items,
});

/**
 * Function type — renders as `(Params...) [effects] -> Return`. Used
 * for closure-typed properties such as the `requestDecorator` hook.
 *
 * @example
 * ```swift
 * // swFunc([swRef("URLRequest")], swRef("URLRequest"), ["async", "throws"])
 * //   → (URLRequest) async throws -> URLRequest
 * ```
 */
export const swFunc = (
  params: ReadonlyArray<SwType>,
  returnType: SwType,
  effects: ReadonlyArray<"async" | "throws"> = [],
): SwType => ({ kind: "func", params, returnType, effects });
