import type { SwEnum } from "../../sw-dsl/decl/enum.js";
import { accessPrefix, INDENT } from "../format.js";
import { printType } from "../type.js";

export function printEnum(e: SwEnum): string {
  const inheritance = [
    ...(e.rawType ? [printType(e.rawType)] : []),
    ...e.conforms,
  ];
  const tail = inheritance.length > 0 ? `: ${inheritance.join(", ")}` : "";
  const head = `${accessPrefix(e.access)}enum ${e.name}${tail}`;
  if (e.cases.length === 0) return `${head} {}`;
  const lines = [`${head} {`];
  for (const c of e.cases) {
    const raw =
      c.rawValue !== undefined ? ` = ${JSON.stringify(c.rawValue)}` : "";
    const assocs =
      c.assocs && c.assocs.length > 0
        ? `(${c.assocs
            .map((a) =>
              a.label !== undefined
                ? `${a.label}: ${printType(a.type)}`
                : printType(a.type),
            )
            .join(", ")})`
        : "";
    lines.push(`${INDENT}case ${c.name}${assocs}${raw}`);
  }
  lines.push("}");
  return lines.join("\n");
}
