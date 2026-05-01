import type { SwAccess } from "../access.js";
import type { SwType } from "../type/types.js";
import type { SwInit } from "./class.js";

export interface SwProp {
  kind: "prop";
  name: string;
  type: SwType;
  mutable: boolean;
  default?: string;
  access: SwAccess;
}

export interface SwCodingKeysEntry {
  swiftName: string;
  jsonKey: string;
}

export interface SwStruct {
  kind: "struct";
  name: string;
  access: SwAccess;
  conforms: ReadonlyArray<string>;
  properties: ReadonlyArray<SwProp>;
  inits: ReadonlyArray<SwInit>;
  codingKeys?: ReadonlyArray<SwCodingKeysEntry>;
  runtime?: boolean;
}

/**
 * Stored property on a struct/class.
 *
 * @example
 * ```swift
 * // swProp({ name: "id", type: swString })
 * //   → public let id: String
 * // swProp({ name: "session", type: swRef("URLSession"), mutable: true })
 * //   → public var session: URLSession
 * ```
 */
export function swProp(opts: {
  name: string;
  type: SwType;
  mutable?: boolean;
  default?: string;
  access?: SwAccess;
}): SwProp {
  return {
    kind: "prop",
    name: opts.name,
    type: opts.type,
    mutable: opts.mutable ?? false,
    default: opts.default,
    access: opts.access ?? "public",
  };
}

/**
 * Top-level struct decl. Pass `codingKeys` to emit a nested
 * `CodingKeys: String, CodingKey` enum — required when any Swift
 * property name differs from its JSON key.
 *
 * @example
 * ```swift
 * // swStruct({ name: "User", conforms: ["Codable"],
 * //            properties: [swProp({ name: "id", type: swString })] })
 * //   → public struct User: Codable { public let id: String }
 * ```
 */
export function swStruct(opts: {
  name: string;
  properties: ReadonlyArray<SwProp>;
  conforms?: ReadonlyArray<string>;
  access?: SwAccess;
  inits?: ReadonlyArray<SwInit>;
  codingKeys?: ReadonlyArray<SwCodingKeysEntry>;
}): SwStruct {
  return {
    kind: "struct",
    name: opts.name,
    access: opts.access ?? "public",
    inits: opts.inits ?? [],
    conforms: opts.conforms ?? [],
    properties: opts.properties,
    codingKeys: opts.codingKeys,
  };
}
