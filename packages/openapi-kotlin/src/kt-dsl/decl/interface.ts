import type { KtFun } from "../fun.js";
import type { KtVisibility } from "../visibility.js";
import type { KtAnnotation } from "./prop.js";

export interface KtInterface {
  kind: "interface";
  name: string;
  visibility: KtVisibility;
  annotations: ReadonlyArray<KtAnnotation>;
  superTypes: ReadonlyArray<string>;
  funs: ReadonlyArray<KtFun>;
  runtime?: boolean;
}

/**
 * Interface declaration — Kotlin's protocol equivalent.
 *
 * @example
 * ```kotlin
 * // ktInterface({ name: "PetApi",
 * //               funs: [ktFun({ name: "getPet", params: [...],
 * //                              returnType: ktRef("Pet"),
 * //                              modifiers: ["suspend"] })] })
 * //   → public interface PetApi { suspend fun getPet(...): Pet }
 * ```
 */
export function ktInterface(opts: {
  name: string;
  funs: ReadonlyArray<KtFun>;
  annotations?: ReadonlyArray<KtAnnotation>;
  superTypes?: ReadonlyArray<string>;
  visibility?: KtVisibility;
  runtime?: boolean;
}): KtInterface {
  return {
    kind: "interface",
    name: opts.name,
    visibility: opts.visibility ?? "public",
    annotations: opts.annotations ?? [],
    superTypes: opts.superTypes ?? [],
    funs: opts.funs,
    runtime: opts.runtime,
  };
}
