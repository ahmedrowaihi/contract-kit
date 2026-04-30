import type { KtStmt } from "../kt-dsl/stmt/types.js";
import { printExpr } from "./expr.js";
import { INDENT } from "./format.js";
import { printType } from "./type.js";

export function printStmt(s: KtStmt, indent: string = ""): string {
  switch (s.kind) {
    case "val": {
      const type = s.type ? `: ${printType(s.type)}` : "";
      return `${indent}val ${s.name}${type} = ${printExpr(s.expr)}`;
    }
    case "var": {
      const type = s.type ? `: ${printType(s.type)}` : "";
      return `${indent}var ${s.name}${type} = ${printExpr(s.expr)}`;
    }
    case "assign":
      return `${indent}${printExpr(s.target)} = ${printExpr(s.value)}`;
    case "expr":
      return `${indent}${printExpr(s.expr)}`;
    case "returnExpr":
      // Marker for single-expression bodies. The decl-printer recognizes
      // it and renders `= expr` instead of `{ expr }`. When emitted at
      // statement scope (e.g. inside a block), we treat it as a plain
      // `return expr` for safety.
      return `${indent}return ${printExpr(s.expr)}`;
    case "return":
      return s.expr === undefined
        ? `${indent}return`
        : `${indent}return ${printExpr(s.expr)}`;
    case "throw":
      return `${indent}throw ${printExpr(s.expr)}`;
    case "if":
      return printIf(s, indent);
    case "when":
      return printWhen(s, indent);
    case "tryCatch":
      return printTryCatch(s, indent);
    case "forIn":
      return `${indent}for (${s.name} in ${printExpr(s.source)}) ${printBlock(s.body, indent)}`;
  }
}

export function printBlock(
  body: ReadonlyArray<KtStmt>,
  indent: string,
): string {
  if (body.length === 0) return "{}";
  const inner = body.map((s) => printStmt(s, indent + INDENT)).join("\n");
  return `{\n${inner}\n${indent}}`;
}

function printIf(s: Extract<KtStmt, { kind: "if" }>, indent: string): string {
  const head = `${indent}if (${printExpr(s.cond)}) ${printBlock(s.then, indent)}`;
  if (!s.else_) return head;
  return `${head} else ${printBlock(s.else_, indent)}`;
}

function printWhen(
  s: Extract<KtStmt, { kind: "when" }>,
  indent: string,
): string {
  const head = s.on === undefined ? "when" : `when (${printExpr(s.on)})`;
  const lines: string[] = [`${indent}${head} {`];
  for (const c of s.cases) {
    const patterns = c.patterns.map(printExpr).join(", ");
    lines.push(
      `${indent}${INDENT}${patterns} -> ${printBlock(c.body, indent + INDENT)}`,
    );
  }
  if (s.default_) {
    lines.push(
      `${indent}${INDENT}else -> ${printBlock(s.default_, indent + INDENT)}`,
    );
  }
  lines.push(`${indent}}`);
  return lines.join("\n");
}

function printTryCatch(
  s: Extract<KtStmt, { kind: "tryCatch" }>,
  indent: string,
): string {
  const body = printBlock(s.body, indent);
  const catches = s.catches
    .map(
      (c) =>
        ` catch (${c.name}: ${printType(c.type)}) ${printBlock(c.body, indent)}`,
    )
    .join("");
  return `${indent}try ${body}${catches}`;
}
