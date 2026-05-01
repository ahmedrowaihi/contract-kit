import type { SwProtocol } from "../../sw-dsl/decl/protocol.js";
import { accessPrefix, conformanceTail, INDENT } from "../format.js";
import { printFun } from "./fun.js";

export function printProtocol(p: SwProtocol): string {
  const head = `${accessPrefix(p.access)}protocol ${p.name}${conformanceTail(p.conforms)}`;
  if (p.funs.length === 0) return `${head} {}`;
  const lines = [`${head} {`];
  for (let i = 0; i < p.funs.length; i++) {
    if (i > 0) lines.push("");
    lines.push(printFun(p.funs[i]!, INDENT, /* protocolMember */ true));
  }
  lines.push("}");
  return lines.join("\n");
}
