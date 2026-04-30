import type { KtFun } from "../fun.js";

export interface KtTopLevelFun {
  kind: "topLevelFun";
  fun: KtFun;
}

/**
 * Wrap a `KtFun` as a top-level (file-scope) declaration. Used for
 * extension funs and free helper funs that don't belong on a class.
 *
 * @example
 * ```kotlin
 * // ktTopLevelFun(ktFun({ name: "getPet", receiver: ktRef("PetApi"),
 * //                       params: [...], returnType: ktRef("Pet"),
 * //                       modifiers: ["suspend"] }))
 * //   → public suspend fun PetApi.getPet(...): Pet { … }
 * ```
 */
export const ktTopLevelFun = (fun: KtFun): KtTopLevelFun => ({
  kind: "topLevelFun",
  fun,
});
