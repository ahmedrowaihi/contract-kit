import type { KtObject } from "../../kt-dsl/decl/object.js";
import { INDENT, superTypeTail, visibilityPrefix } from "../format.js";
import { printFun } from "./fun.js";
import { printAnnotations, printProp } from "./prop.js";

export function printObject(d: KtObject): string {
  const annLines = printAnnotations(d.annotations, "");
  const vis = visibilityPrefix(d.visibility);
  const head = `${annLines}${vis}object ${d.name}${superTypeTail(d.superTypes)}`;

  const sections: string[] = [];
  if (d.properties.length > 0) {
    sections.push(d.properties.map((p) => printProp(p, INDENT)).join("\n"));
  }
  if (d.funs.length > 0) {
    sections.push(d.funs.map((f) => printFun(f, INDENT)).join("\n\n"));
  }
  if (sections.length === 0) return head;
  return `${head} {\n${sections.join("\n\n")}\n}`;
}
