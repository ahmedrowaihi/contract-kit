import type { KtClass } from "../../kt-dsl/decl/class.js";
import { INDENT, superTypeTail, visibilityPrefix } from "../format.js";
import { printStmt } from "../stmt.js";
import { printType } from "../type.js";
import { printFun, printFunParam } from "./fun.js";
import { printAnnotations, printPrimaryProp, printProp } from "./prop.js";

export function printClass(d: KtClass): string {
  const annLines = printAnnotations(d.annotations, "");
  const vis = visibilityPrefix(d.visibility);
  const modifiers = d.modifiers.length > 0 ? `${d.modifiers.join(" ")} ` : "";

  const primaryProps = d.properties.filter((p) => p.inPrimary);
  const bodyProps = d.properties.filter((p) => !p.inPrimary);

  const ctorEntries: string[] = [];
  for (const p of primaryProps) ctorEntries.push(printPrimaryProp(p, INDENT));
  for (const p of d.ctorParams)
    ctorEntries.push(`${INDENT}${printFunParam(p)}`);
  const ctor =
    ctorEntries.length === 0 ? "" : `(\n${ctorEntries.join(",\n")},\n)`;

  const head = `${annLines}${vis}${modifiers}class ${d.name}${ctor}${superTypeTail(d.superTypes)}`;

  const sections: string[] = [];
  if (bodyProps.length > 0) {
    sections.push(bodyProps.map((p) => printProp(p, INDENT)).join("\n"));
  }
  if (d.initBlock && d.initBlock.length > 0) {
    const inner = d.initBlock
      .map((s) => printStmt(s, INDENT + INDENT))
      .join("\n");
    sections.push(`${INDENT}init {\n${inner}\n${INDENT}}`);
  }
  if (d.funs.length > 0) {
    sections.push(d.funs.map((f) => printFun(f, INDENT)).join("\n\n"));
  }

  if (sections.length === 0) return head;
  return `${head} {\n${sections.join("\n\n")}\n}`;
}

/** Used by sealed-subclass lowering. */
export { printType };
