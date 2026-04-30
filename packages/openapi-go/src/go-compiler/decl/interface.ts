import type {
  GoInterface,
  GoMethodSignature,
} from "../../go-dsl/decl/interface.js";
import { INDENT } from "../format.js";
import { printType } from "../type.js";
import { formatDoc } from "./struct.js";

export function printInterface(d: GoInterface): string {
  const docLines = formatDoc(d.doc, "");
  const body: string[] = [];
  for (const e of d.embedded) body.push(`${INDENT}${e}`);
  for (const m of d.methods) {
    if (m.doc) body.push(`${INDENT}// ${m.doc}`);
    body.push(`${INDENT}${printMethodSig(m)}`);
  }
  if (body.length === 0) return `${docLines}type ${d.name} interface{}`;
  return `${docLines}type ${d.name} interface {\n${body.join("\n")}\n}`;
}

export function printMethodSig(m: GoMethodSignature): string {
  const params = m.params
    .map((p) => `${p.name} ${printType(p.type)}`)
    .join(", ");
  const results =
    m.results.length === 0
      ? ""
      : m.results.length === 1 && m.results[0]!.name === undefined
        ? ` ${printType(m.results[0]!.type)}`
        : ` (${m.results
            .map((r) =>
              r.name ? `${r.name} ${printType(r.type)}` : printType(r.type),
            )
            .join(", ")})`;
  return `${m.name}(${params})${results}`;
}
