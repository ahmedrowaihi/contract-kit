import type { SwAccess } from "../access.js";
import type { SwFun } from "../fun.js";

export interface SwExtension {
  kind: "extension";
  name: string;
  on: string;
  access: SwAccess;
  funs: ReadonlyArray<SwFun>;
  runtime?: boolean;
}

/**
 * Top-level `extension` decl. Use it to add convenience overloads or
 * default implementations to a protocol or struct without touching
 * the original declaration.
 *
 * @example
 * ```swift
 * // swExtension({
 * //   on: "PetAPI",
 * //   funs: [swFun({ name: "getPetById", params: [...], ... })],
 * // })
 * //   → public extension PetAPI { func getPetById(...) async throws -> Pet { ... } }
 * ```
 */
export function swExtension(opts: {
  on: string;
  funs: ReadonlyArray<SwFun>;
  name?: string;
  access?: SwAccess;
  runtime?: boolean;
}): SwExtension {
  return {
    kind: "extension",
    name: opts.name ?? `${opts.on}+Defaults`,
    on: opts.on,
    access: opts.access ?? "public",
    funs: opts.funs,
    runtime: opts.runtime,
  };
}
