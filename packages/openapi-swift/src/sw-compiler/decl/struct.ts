import type { SwProp, SwStruct } from "../../sw-dsl/decl/struct.js";
import { accessPrefix, conformanceTail, INDENT } from "../format.js";
import { printType } from "../type.js";

export function printProp(p: SwProp, indent: string = ""): string {
  const keyword = p.mutable ? "var" : "let";
  const def = p.default !== undefined ? ` = ${p.default}` : "";
  return `${indent}${accessPrefix(p.access)}${keyword} ${p.name}: ${printType(p.type)}${def}`;
}

export function printStruct(s: SwStruct): string {
  const head = `${accessPrefix(s.access)}struct ${s.name}${conformanceTail(s.conforms)}`;
  if (s.properties.length === 0) return `${head} {}`;
  const body = s.properties.map((p) => printProp(p, INDENT)).join("\n");
  return `${head} {\n${body}\n}`;
}
