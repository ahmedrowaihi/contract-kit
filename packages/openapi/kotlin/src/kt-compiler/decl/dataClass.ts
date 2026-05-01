import type { KtDataClass } from "../../kt-dsl/decl/dataClass.js";
import { INDENT, superTypeTail, visibilityPrefix } from "../format.js";
import { printFun } from "./fun.js";
import { printAnnotations, printPrimaryProp } from "./prop.js";

export function printDataClass(d: KtDataClass): string {
  const annLines = printAnnotations(d.annotations, "");
  const vis = visibilityPrefix(d.visibility);
  // Data classes carry all properties in the primary constructor.
  const primaryProps = d.properties
    .map((p) => printPrimaryProp({ ...p, inPrimary: true }, INDENT))
    .join(",\n");
  const ctor = d.properties.length === 0 ? "()" : `(\n${primaryProps},\n)`;
  const head = `${annLines}${vis}data class ${d.name}${ctor}${superTypeTail(d.superTypes)}`;

  if (d.funs.length === 0) return head;
  const funs = d.funs.map((f) => printFun(f, INDENT)).join("\n\n");
  return `${head} {\n${funs}\n}`;
}
