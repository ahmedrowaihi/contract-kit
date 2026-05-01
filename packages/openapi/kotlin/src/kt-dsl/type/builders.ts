import type { KtPrimitive, KtType } from "./types.js";

const prim = (name: KtPrimitive): KtType => ({ kind: "primitive", name });

/**
 * Common Kotlin primitive shortcuts. Each renders to its bare type
 * name in source.
 *
 * @example
 * ```kotlin
 * // ktString → String
 * // ktLong   → Long
 * // ktUnit   → Unit
 * ```
 */
export const ktString = prim("String");
export const ktInt = prim("Int");
export const ktLong = prim("Long");
export const ktShort = prim("Short");
export const ktByte = prim("Byte");
export const ktDouble = prim("Double");
export const ktFloat = prim("Float");
export const ktBoolean = prim("Boolean");
export const ktUnit = prim("Unit");
export const ktAny = prim("Any");
export const ktNothing = prim("Nothing");
export const ktByteArray = prim("ByteArray");

/**
 * Nullable wrapper — renders as `Inner?`. Idempotent: wrapping an
 * already-nullable type is a no-op so callers don't have to track
 * nullability state.
 *
 * @example
 * ```kotlin
 * // ktNullable(ktString) → String?
 * ```
 */
export const ktNullable = (inner: KtType): KtType =>
  inner.kind === "nullable" ? inner : { kind: "nullable", inner };

/**
 * `List<Element>`.
 *
 * @example
 * ```kotlin
 * // ktList(ktString) → List<String>
 * ```
 */
export const ktList = (element: KtType): KtType => ({ kind: "list", element });

/**
 * `Map<Key, Value>`.
 *
 * @example
 * ```kotlin
 * // ktMap(ktString, ktInt) → Map<String, Int>
 * ```
 */
export const ktMap = (key: KtType, value: KtType): KtType => ({
  kind: "map",
  key,
  value,
});

/**
 * Named type reference, optionally parameterized.
 *
 * @example
 * ```kotlin
 * // ktRef("Request")              → Request
 * // ktRef("Pair", [ktString, ktInt]) → Pair<String, Int>
 * ```
 */
export const ktRef = (name: string, args?: ReadonlyArray<KtType>): KtType => ({
  kind: "ref",
  name,
  args,
});

/**
 * Function type — renders as `(Params...) -> Return` or
 * `suspend (Params...) -> Return`.
 *
 * @example
 * ```kotlin
 * // ktFunc([ktRef("Request")], ktRef("Request"), true)
 * //   → suspend (Request) -> Request
 * ```
 */
export const ktFunc = (
  params: ReadonlyArray<KtType>,
  returnType: KtType,
  suspend = false,
): KtType => ({ kind: "func", params, returnType, suspend });
