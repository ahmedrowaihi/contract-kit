import type { GoConstBlock } from "../../go-dsl/decl/const.js";
import { printExpr } from "../expr.js";
import { INDENT } from "../format.js";
import { printType } from "../type.js";
import { formatDoc } from "./struct.js";

export function printConstBlock(d: GoConstBlock): string {
  const docLines = formatDoc(d.doc, "");
  if (d.entries.length === 0) return `${docLines}const ()`;
  const lines: string[] = [`${docLines}const (`];
  for (const e of d.entries) {
    if (e.doc) lines.push(`${INDENT}// ${e.doc}`);
    const type = d.type ? ` ${printType(d.type)}` : "";
    const value = e.value === undefined ? "" : ` = ${printExpr(e.value)}`;
    lines.push(`${INDENT}${e.name}${type}${value}`);
  }
  lines.push(")");
  return lines.join("\n");
}
