import type { GoStmt } from "../go-dsl/stmt/types.js";
import { printExpr } from "./expr.js";
import { INDENT } from "./format.js";
import { printType } from "./type.js";

export function printStmt(s: GoStmt, indent: string = ""): string {
  switch (s.kind) {
    case "shortDecl":
      return `${indent}${s.names.join(", ")} := ${s.values.map(printExpr).join(", ")}`;
    case "var": {
      const type = s.type ? ` ${printType(s.type)}` : "";
      const init = s.expr ? ` = ${printExpr(s.expr)}` : "";
      return `${indent}var ${s.name}${type}${init}`;
    }
    case "const": {
      const type = s.type ? ` ${printType(s.type)}` : "";
      return `${indent}const ${s.name}${type} = ${printExpr(s.expr)}`;
    }
    case "assign":
      return `${indent}${s.targets.map(printExpr).join(", ")} = ${s.values.map(printExpr).join(", ")}`;
    case "expr":
      return `${indent}${printExpr(s.expr)}`;
    case "defer":
      return `${indent}defer ${printExpr(s.expr)}`;
    case "go":
      return `${indent}go ${printExpr(s.expr)}`;
    case "return":
      return s.values.length === 0
        ? `${indent}return`
        : `${indent}return ${s.values.map(printExpr).join(", ")}`;
    case "break":
      return `${indent}break`;
    case "continue":
      return `${indent}continue`;
    case "if":
      return printIf(s, indent);
    case "for":
      return printFor(s, indent);
    case "forRange":
      return printForRange(s, indent);
    case "switch":
      return printSwitch(s, indent);
    case "typeSwitch":
      return printTypeSwitch(s, indent);
  }
}

export function printBlock(
  body: ReadonlyArray<GoStmt>,
  indent: string,
): string {
  if (body.length === 0) return "{}";
  const inner = body.map((s) => printStmt(s, indent + INDENT)).join("\n");
  return `{\n${inner}\n${indent}}`;
}

function printIf(s: Extract<GoStmt, { kind: "if" }>, indent: string): string {
  const init = s.init ? `${printStmt(s.init, "").trimStart()}; ` : "";
  const head = `${indent}if ${init}${printExpr(s.cond)} ${printBlock(s.then, indent)}`;
  if (!s.else_) return head;
  // `else_` is a statement list — emit as `else { ... }`. (The
  // `if-else if` chain is composed by callers nesting another `if`
  // statement inside the else body.)
  if (Array.isArray(s.else_)) {
    return `${head} else ${printBlock(s.else_, indent)}`;
  }
  return head;
}

function printFor(s: Extract<GoStmt, { kind: "for" }>, indent: string): string {
  // Bare `for { body }` (infinite loop) when no clauses given.
  const hasClauses =
    s.init !== undefined || s.cond !== undefined || s.post !== undefined;
  const head = hasClauses
    ? `${indent}for ${s.init ? printStmt(s.init, "").trimStart() : ""}; ${
        s.cond ? printExpr(s.cond) : ""
      }; ${s.post ? printStmt(s.post, "").trimStart() : ""}`
    : `${indent}for`;
  // Single-cond shorthand: `for cond { body }` (no init / post).
  const collapsed =
    s.init === undefined && s.post === undefined && s.cond !== undefined
      ? `${indent}for ${printExpr(s.cond)}`
      : head;
  return `${collapsed} ${printBlock(s.body, indent)}`;
}

function printForRange(
  s: Extract<GoStmt, { kind: "forRange" }>,
  indent: string,
): string {
  const op = s.assign ? "=" : ":=";
  const lhs = formatRangeLHS(s.key, s.value);
  const head = lhs
    ? `${indent}for ${lhs} ${op} range ${printExpr(s.source)}`
    : `${indent}for range ${printExpr(s.source)}`;
  return `${head} ${printBlock(s.body, indent)}`;
}

function formatRangeLHS(
  key: string | undefined,
  value: string | undefined,
): string {
  if (key === undefined && value === undefined) return "";
  if (key !== undefined && value === undefined) return key;
  if (key === undefined) return `_, ${value}`;
  return `${key}, ${value}`;
}

function printSwitch(
  s: Extract<GoStmt, { kind: "switch" }>,
  indent: string,
): string {
  const head = s.tag === undefined ? "switch" : `switch ${printExpr(s.tag)}`;
  const lines: string[] = [`${indent}${head} {`];
  for (const c of s.cases) {
    lines.push(`${indent}case ${c.patterns.map(printExpr).join(", ")}:`);
    if (c.body.length === 0) lines.push(`${indent}${INDENT}// (empty)`);
    for (const stmt of c.body) lines.push(printStmt(stmt, indent + INDENT));
  }
  if (s.default_) {
    lines.push(`${indent}default:`);
    for (const stmt of s.default_) lines.push(printStmt(stmt, indent + INDENT));
  }
  lines.push(`${indent}}`);
  return lines.join("\n");
}

function printTypeSwitch(
  s: Extract<GoStmt, { kind: "typeSwitch" }>,
  indent: string,
): string {
  const bind = s.bind ? `${s.bind} := ` : "";
  const head = `switch ${bind}${printExpr(s.expr)}.(type)`;
  const lines: string[] = [`${indent}${head} {`];
  for (const c of s.cases) {
    lines.push(`${indent}case ${c.types.map(printType).join(", ")}:`);
    if (c.body.length === 0) lines.push(`${indent}${INDENT}// (empty)`);
    for (const stmt of c.body) lines.push(printStmt(stmt, indent + INDENT));
  }
  if (s.default_) {
    lines.push(`${indent}default:`);
    for (const stmt of s.default_) lines.push(printStmt(stmt, indent + INDENT));
  }
  lines.push(`${indent}}`);
  return lines.join("\n");
}
