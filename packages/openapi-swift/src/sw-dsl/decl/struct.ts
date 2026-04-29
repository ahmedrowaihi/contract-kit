import type { SwAccess } from "../access.js";
import type { SwType } from "../type/types.js";

export interface SwProp {
  kind: "prop";
  name: string;
  type: SwType;
  /** `let` when false, `var` when true. Default: `let`. */
  mutable: boolean;
  default?: string;
  access: SwAccess;
}

export interface SwStruct {
  kind: "struct";
  name: string;
  access: SwAccess;
  conforms: ReadonlyArray<string>;
  properties: ReadonlyArray<SwProp>;
}

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

export function swStruct(opts: {
  name: string;
  properties: ReadonlyArray<SwProp>;
  conforms?: ReadonlyArray<string>;
  access?: SwAccess;
}): SwStruct {
  return {
    kind: "struct",
    name: opts.name,
    access: opts.access ?? "public",
    conforms: opts.conforms ?? [],
    properties: opts.properties,
  };
}
