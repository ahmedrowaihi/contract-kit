import type { SwClass, SwInit } from "../../sw-dsl/decl/class.js";
import { accessPrefix, conformanceTail, INDENT } from "../format.js";
import { printStmt } from "../stmt.js";
import { printFun, printParamsBlock } from "./fun.js";
import { printProp } from "./struct.js";

export function printInit(init: SwInit, indent: string = ""): string {
  const params = printParamsBlock(init.params, indent);
  const access = accessPrefix(init.access);
  const auto = init.params.map(
    (p) => `${indent}${INDENT}self.${p.name} = ${p.name}`,
  );
  const tail = init.body.map((s) => printStmt(s, indent + INDENT));
  const stmts = [...auto, ...tail];
  if (stmts.length === 0) return `${indent}${access}init${params} {}`;
  return `${indent}${access}init${params} {\n${stmts.join("\n")}\n${indent}}`;
}

export function printClass(c: SwClass): string {
  const mods = c.modifiers.length > 0 ? `${c.modifiers.join(" ")} ` : "";
  const head = `${accessPrefix(c.access)}${mods}class ${c.name}${conformanceTail(c.conforms)}`;
  const empty =
    c.properties.length === 0 && c.inits.length === 0 && c.funs.length === 0;
  if (empty) return `${head} {}`;
  const sections: string[] = [`${head} {`];
  if (c.properties.length > 0) {
    sections.push(c.properties.map((p) => printProp(p, INDENT)).join("\n"));
  }
  if (c.inits.length > 0) {
    if (sections.length > 1) sections.push("");
    sections.push(c.inits.map((i) => printInit(i, INDENT)).join("\n\n"));
  }
  if (c.funs.length > 0) {
    if (sections.length > 1) sections.push("");
    sections.push(c.funs.map((fn) => printFun(fn, INDENT)).join("\n\n"));
  }
  sections.push("}");
  return sections.join("\n");
}
