import type { GoStruct } from "../../go-dsl/decl/struct.js";
import { INDENT } from "../format.js";
import { printType } from "../type.js";

export function printStruct(d: GoStruct): string {
  const docLines = formatDoc(d.doc, "");
  if (d.fields.length === 0) {
    return `${docLines}type ${d.name} struct{}`;
  }
  const lines: string[] = [];
  for (const f of d.fields) {
    if (f.doc) {
      for (const docLine of f.doc.split("\n")) {
        lines.push(`${INDENT}// ${docLine}`);
      }
    }
    const tag = f.tag ? ` ${f.tag}` : "";
    lines.push(`${INDENT}${f.name} ${printType(f.type)}${tag}`);
  }
  return `${docLines}type ${d.name} struct {\n${lines.join("\n")}\n}`;
}

export function formatDoc(doc: string | undefined, indent: string): string {
  if (!doc) return "";
  const lines = doc.split("\n").map((l) => `${indent}// ${l}`);
  return `${lines.join("\n")}\n`;
}
