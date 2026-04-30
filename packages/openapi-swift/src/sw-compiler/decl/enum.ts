import type { SwEnum, SwEnumCase } from "../../sw-dsl/decl/enum.js";
import { accessPrefix, INDENT } from "../format.js";
import { printType } from "../type.js";
import { printFun } from "./fun.js";

function printCaseLine(c: SwEnumCase): string {
  const hasAssocs = c.assocs && c.assocs.length > 0;
  if (c.rawValue !== undefined && hasAssocs) {
    throw new Error(
      `Enum case "${c.name}" has both a raw value and associated values; Swift forbids this combination.`,
    );
  }
  const raw =
    c.rawValue !== undefined ? ` = ${JSON.stringify(c.rawValue)}` : "";
  const assocs = hasAssocs
    ? `(${c
        .assocs!.map((a) =>
          a.label !== undefined
            ? `${a.label}: ${printType(a.type)}`
            : printType(a.type),
        )
        .join(", ")})`
    : "";
  return `${INDENT}case ${c.name}${assocs}${raw}`;
}

export function printEnum(e: SwEnum): string {
  const inheritance = [
    ...(e.rawType ? [printType(e.rawType)] : []),
    ...e.conforms,
  ];
  const tail = inheritance.length > 0 ? `: ${inheritance.join(", ")}` : "";
  const head = `${accessPrefix(e.access)}enum ${e.name}${tail}`;
  const empty = e.cases.length === 0 && e.funs.length === 0;
  if (empty) return `${head} {}`;

  const sections: string[] = [];
  if (e.cases.length > 0) {
    sections.push(e.cases.map(printCaseLine).join("\n"));
  }
  if (e.funs.length > 0) {
    sections.push(e.funs.map((fn) => printFun(fn, INDENT)).join("\n\n"));
  }
  return `${head} {\n${sections.join("\n\n")}\n}`;
}
