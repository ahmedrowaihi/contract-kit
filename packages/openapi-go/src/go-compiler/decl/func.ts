import type { GoFunc } from "../../go-dsl/decl/func.js";
import { INDENT } from "../format.js";
import { printStmt } from "../stmt.js";
import { printType } from "../type.js";
import { formatDoc } from "./struct.js";

export function printFunc(fn: GoFunc): string {
  const docLines = formatDoc(fn.doc, "");
  const recv = fn.receiver
    ? `(${fn.receiver.name ? `${fn.receiver.name} ` : ""}${printType(fn.receiver.type)}) `
    : "";
  const tps =
    fn.typeParams.length > 0
      ? `[${fn.typeParams.map((t) => `${t.name} ${t.constraint}`).join(", ")}]`
      : "";
  const params = fn.params
    .map((p) => `${p.name} ${printType(p.type)}`)
    .join(", ");
  const results =
    fn.results.length === 0
      ? ""
      : fn.results.length === 1 && fn.results[0]!.name === undefined
        ? ` ${printType(fn.results[0]!.type)}`
        : ` (${fn.results
            .map((r) =>
              r.name ? `${r.name} ${printType(r.type)}` : printType(r.type),
            )
            .join(", ")})`;
  const head = `func ${recv}${fn.name}${tps}(${params})${results}`;
  if (fn.body === undefined) return `${docLines}${head}`;
  if (fn.body.length === 0) return `${docLines}${head} {}`;
  const body = fn.body.map((s) => printStmt(s, INDENT)).join("\n");
  return `${docLines}${head} {\n${body}\n}`;
}
