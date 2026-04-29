import type { SwAccess } from "../access.js";
import type { SwType } from "../type/types.js";

export interface SwTypeAlias {
  kind: "typeAlias";
  name: string;
  access: SwAccess;
  type: SwType;
}

export function swTypeAlias(opts: {
  name: string;
  type: SwType;
  access?: SwAccess;
}): SwTypeAlias {
  return {
    kind: "typeAlias",
    name: opts.name,
    access: opts.access ?? "public",
    type: opts.type,
  };
}
