import type { SwAccess } from "../access.js";
import type { SwFun } from "../fun.js";

export interface SwProtocol {
  kind: "protocol";
  name: string;
  access: SwAccess;
  conforms: ReadonlyArray<string>;
  funs: ReadonlyArray<SwFun>;
}

export function swProtocol(opts: {
  name: string;
  funs: ReadonlyArray<SwFun>;
  conforms?: ReadonlyArray<string>;
  access?: SwAccess;
}): SwProtocol {
  return {
    kind: "protocol",
    name: opts.name,
    access: opts.access ?? "public",
    conforms: opts.conforms ?? [],
    funs: opts.funs,
  };
}
