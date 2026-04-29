import type { SwAccess } from "./access.js";
import type { SwStmt } from "./stmt/types.js";
import type { SwType } from "./type/types.js";

export interface SwFunParam {
  kind: "funParam";
  /** External label seen by the caller. Defaults to `name` when omitted. */
  label?: string;
  name: string;
  type: SwType;
  default?: string;
}

export interface SwFun {
  kind: "fun";
  name: string;
  access: SwAccess;
  effects: ReadonlyArray<"async" | "throws">;
  params: ReadonlyArray<SwFunParam>;
  returnType: SwType;
  /** Statement list; omit for protocol requirements. */
  body?: ReadonlyArray<SwStmt>;
  /** Optional doc comment placed above the declaration (`///` per line). */
  doc?: string;
}

export function swFunParam(opts: {
  name: string;
  type: SwType;
  label?: string;
  default?: string;
}): SwFunParam {
  return {
    kind: "funParam",
    name: opts.name,
    type: opts.type,
    label: opts.label,
    default: opts.default,
  };
}

export function swFun(opts: {
  name: string;
  params: ReadonlyArray<SwFunParam>;
  returnType: SwType;
  effects?: ReadonlyArray<"async" | "throws">;
  body?: ReadonlyArray<SwStmt>;
  doc?: string;
  access?: SwAccess;
}): SwFun {
  return {
    kind: "fun",
    name: opts.name,
    access: opts.access ?? "public",
    effects: opts.effects ?? [],
    params: opts.params,
    returnType: opts.returnType,
    body: opts.body,
    doc: opts.doc,
  };
}
