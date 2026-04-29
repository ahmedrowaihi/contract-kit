import type { SwAccess } from "../access.js";
import type { SwFun, SwFunParam } from "../fun.js";
import type { SwStmt } from "../stmt/types.js";
import type { SwProp } from "./struct.js";

export type SwClassModifier = "final" | "open";

export interface SwInit {
  kind: "init";
  access: SwAccess;
  params: ReadonlyArray<SwFunParam>;
  /** Statements to run after auto `self.x = x` assignments. */
  body: ReadonlyArray<SwStmt>;
}

export interface SwClass {
  kind: "class";
  name: string;
  access: SwAccess;
  modifiers: ReadonlyArray<SwClassModifier>;
  /** Parent class first (if any), then protocols. */
  conforms: ReadonlyArray<string>;
  properties: ReadonlyArray<SwProp>;
  inits: ReadonlyArray<SwInit>;
  funs: ReadonlyArray<SwFun>;
}

export function swInit(opts: {
  params: ReadonlyArray<SwFunParam>;
  body?: ReadonlyArray<SwStmt>;
  access?: SwAccess;
}): SwInit {
  return {
    kind: "init",
    access: opts.access ?? "public",
    params: opts.params,
    body: opts.body ?? [],
  };
}

export function swClass(opts: {
  name: string;
  conforms?: ReadonlyArray<string>;
  properties?: ReadonlyArray<SwProp>;
  inits?: ReadonlyArray<SwInit>;
  funs?: ReadonlyArray<SwFun>;
  modifiers?: ReadonlyArray<SwClassModifier>;
  access?: SwAccess;
}): SwClass {
  return {
    kind: "class",
    name: opts.name,
    access: opts.access ?? "public",
    modifiers: opts.modifiers ?? ["final"],
    conforms: opts.conforms ?? [],
    properties: opts.properties ?? [],
    inits: opts.inits ?? [],
    funs: opts.funs ?? [],
  };
}
