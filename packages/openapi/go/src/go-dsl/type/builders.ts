import type { GoPrimitive, GoType } from "./types.js";

const prim = (name: GoPrimitive): GoType => ({ kind: "primitive", name });

/**
 * Common Go primitive shortcuts. Each renders to its bare type name.
 *
 * @example
 * ```go
 * // goString → string
 * // goInt    → int
 * // goAny    → any
 * ```
 */
export const goString = prim("string");
export const goInt = prim("int");
export const goInt32 = prim("int32");
export const goInt64 = prim("int64");
export const goFloat32 = prim("float32");
export const goFloat64 = prim("float64");
export const goBool = prim("bool");
export const goByte = prim("byte");
export const goRune = prim("rune");
export const goAny = prim("any");
export const goError = prim("error");
export const goContext = prim("context.Context");

/**
 * Pointer wrapper — renders as `*Inner`. Idempotent: wrapping an
 * already-pointer type collapses (`**T` is rare and we don't need it).
 *
 * @example
 * ```go
 * // goPtr(goString) → *string
 * ```
 */
export const goPtr = (inner: GoType): GoType =>
  inner.kind === "ptr" ? inner : { kind: "ptr", inner };

/**
 * `[]Element`.
 *
 * @example
 * ```go
 * // goSlice(goString) → []string
 * ```
 */
export const goSlice = (element: GoType): GoType => ({
  kind: "slice",
  element,
});

/**
 * `map[Key]Value`.
 *
 * @example
 * ```go
 * // goMap(goString, goInt) → map[string]int
 * ```
 */
export const goMap = (key: GoType, value: GoType): GoType => ({
  kind: "map",
  key,
  value,
});

/**
 * Named type reference, optionally with generic type-parameters.
 * Names may include a package qualifier (`http.Request`, `json.Encoder`)
 * — the printer doesn't validate, it just emits.
 *
 * @example
 * ```go
 * // goRef("Pet")                    → Pet
 * // goRef("http.Request")           → http.Request
 * // goRef("Result", [goString])     → Result[string]
 * ```
 */
export const goRef = (
  name: string,
  typeParams?: ReadonlyArray<GoType>,
): GoType => ({ kind: "ref", name, typeParams });

/**
 * Function type — `func(params...) (results...)`. Used for closure-typed
 * fields (interceptors, validators, transformers).
 *
 * @example
 * ```go
 * // goFunc([{ type: goRef("*http.Request") }],
 * //        [goRef("*http.Request"), goError])
 * //   → func(*http.Request) (*http.Request, error)
 * ```
 */
export const goFunc = (
  params: ReadonlyArray<{ name?: string; type: GoType }>,
  results: ReadonlyArray<GoType>,
): GoType => ({ kind: "func", params, results });

/**
 * Anonymous interface type — `interface{ M(...); ... }`. Used for
 * sealed-style sum types that hide their concrete impls behind a
 * marker method.
 *
 * @example
 * ```go
 * // goInterfaceType([{ name: "isFoo", signature: goFunc([], []) }])
 * //   → interface { isFoo() }
 * ```
 */
export const goInterfaceType = (
  methods: ReadonlyArray<{ name: string; signature: GoType }>,
): GoType => ({ kind: "interface", methods });
