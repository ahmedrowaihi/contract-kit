import type { KtStmt } from "./stmt/types.js";
import type { KtType } from "./type/types.js";
import type { KtVisibility } from "./visibility.js";

export interface KtFunParam {
  kind: "funParam";
  name: string;
  type: KtType;
  default?: string;
  /** True if this is the receiver of an extension. */
  receiver?: boolean;
}

export interface KtTypeParam {
  name: string;
  bounds?: ReadonlyArray<string>;
}

export type KtFunModifier = "override" | "open" | "abstract" | "suspend";

export interface KtFun {
  kind: "fun";
  name: string;
  visibility: KtVisibility;
  modifiers: ReadonlyArray<KtFunModifier>;
  typeParams: ReadonlyArray<KtTypeParam>;
  params: ReadonlyArray<KtFunParam>;
  returnType: KtType;
  /** Type the function extends (renders as `Receiver.name`). */
  receiver?: KtType;
  body?: ReadonlyArray<KtStmt>;
  doc?: string;
}

/**
 * Function parameter.
 *
 * @example
 * ```kotlin
 * // ktFunParam({ name: "client", type: ktRef("OkHttpClient"), default: "default()" })
 * //   → client: OkHttpClient = default()
 * ```
 */
export function ktFunParam(opts: {
  name: string;
  type: KtType;
  default?: string;
}): KtFunParam {
  return {
    kind: "funParam",
    name: opts.name,
    type: opts.type,
    default: opts.default,
  };
}

/**
 * Type parameter — `<T : Bound1, Bound2>`.
 */
export const ktTypeParam = (
  name: string,
  bounds?: ReadonlyArray<string>,
): KtTypeParam => ({ name, bounds });

/**
 * Function decl. Omit `body` for abstract / interface members.
 *
 * @example
 * ```kotlin
 * // ktFun({ name: "execute",
 * //         typeParams: [ktTypeParam("T", ["Any"])],
 * //         params: [ktFunParam({ name: "request", type: ktRef("Request") })],
 * //         returnType: ktRef("T"),
 * //         modifiers: ["suspend"],
 * //         body: [ktReturn(…)] })
 * //   → suspend fun <T : Any> execute(request: Request): T { … }
 * ```
 */
export function ktFun(opts: {
  name: string;
  params: ReadonlyArray<KtFunParam>;
  returnType: KtType;
  modifiers?: ReadonlyArray<KtFunModifier>;
  typeParams?: ReadonlyArray<KtTypeParam>;
  body?: ReadonlyArray<KtStmt>;
  doc?: string;
  visibility?: KtVisibility;
  receiver?: KtType;
}): KtFun {
  return {
    kind: "fun",
    name: opts.name,
    visibility: opts.visibility ?? "public",
    modifiers: opts.modifiers ?? [],
    typeParams: opts.typeParams ?? [],
    params: opts.params,
    returnType: opts.returnType,
    body: opts.body,
    receiver: opts.receiver,
    doc: opts.doc,
  };
}
