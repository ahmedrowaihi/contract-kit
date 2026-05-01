import type { KtType } from "../type/types.js";
import type { KtVisibility } from "../visibility.js";

export interface KtAnnotation {
  name: string;
  /** Pre-rendered argument list inside the parens, e.g. `"\"id\""`. */
  args?: string;
}

export interface KtProp {
  kind: "prop";
  name: string;
  type: KtType;
  /** `true` for `var`, `false` for `val`. */
  mutable: boolean;
  /** Pre-rendered initializer (e.g. `"mutableListOf()"`). Cleaner than
   *  re-parsing an expression for property-level defaults. */
  default?: string;
  visibility: KtVisibility;
  annotations: ReadonlyArray<KtAnnotation>;
  /**
   * Constructor-level property — appears in the primary constructor's
   * parameter list rather than the class body. Only applicable when
   * the prop lives on a class with a primary constructor.
   */
  inPrimary?: boolean;
}

/**
 * Stored property. Defaults to `val` (immutable) and `public`.
 *
 * @example
 * ```kotlin
 * // ktProp({ name: "id", type: ktString })
 * //   → val id: String
 * // ktProp({ name: "client", type: ktRef("OkHttpClient"), mutable: true })
 * //   → var client: OkHttpClient
 * ```
 */
export function ktProp(opts: {
  name: string;
  type: KtType;
  mutable?: boolean;
  default?: string;
  visibility?: KtVisibility;
  annotations?: ReadonlyArray<KtAnnotation>;
  inPrimary?: boolean;
}): KtProp {
  return {
    kind: "prop",
    name: opts.name,
    type: opts.type,
    mutable: opts.mutable ?? false,
    default: opts.default,
    visibility: opts.visibility ?? "public",
    annotations: opts.annotations ?? [],
    inPrimary: opts.inPrimary,
  };
}

export const ktAnnotation = (name: string, args?: string): KtAnnotation => ({
  name,
  args,
});
