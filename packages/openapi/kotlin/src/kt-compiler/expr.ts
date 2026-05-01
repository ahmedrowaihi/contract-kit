import type { KtExpr, KtLambdaExpr } from "../kt-dsl/expr/types.js";
import { INDENT, isSimpleIdent } from "./format.js";
import { printStmt } from "./stmt.js";
import { printType } from "./type.js";

export function printExpr(e: KtExpr): string {
  switch (e.kind) {
    case "ident":
      return e.name;
    case "this":
      return "this";
    case "str":
      return printStringLiteral(e.value);
    case "int":
      return String(e.value);
    case "long":
      return `${String(e.value)}L`;
    case "double": {
      const s = String(e.value);
      return s.includes(".") ? s : `${s}.0`;
    }
    case "bool":
      return e.value ? "true" : "false";
    case "null":
      return "null";
    case "underscore":
      return "_";
    case "interp":
      return printInterp(e.parts);
    case "listLit":
      return `listOf(${e.items.map(printExpr).join(", ")})`;
    case "mapLit":
      return e.pairs.length === 0
        ? "mapOf()"
        : `mapOf(${e.pairs.map(([k, v]) => `${printExpr(k)} to ${printExpr(v)}`).join(", ")})`;
    case "member":
      return `${printExpr(e.on)}.${e.name}`;
    case "safeMember":
      return `${printExpr(e.on)}?.${e.name}`;
    case "index":
      return `${printExpr(e.on)}[${printExpr(e.index)}]`;
    case "notNull":
      return `${printExpr(e.on)}!!`;
    case "call":
      return printCall(e);
    case "binOp":
      return `${printExpr(e.left)} ${e.op} ${printExpr(e.right)}`;
    case "lambda":
      return printLambda(e);
    case "range":
      return `${printExpr(e.low)} ${e.halfOpen ? "until" : ".."} ${printExpr(e.high)}`;
    case "cast":
      return `${printExpr(e.expr)} ${e.safe ? "as?" : "as"} ${printType(e.type)}`;
    case "typeRef":
      return `${printType(e.type)}::class`;
  }
}

function printStringLiteral(s: string): string {
  // Kotlin strings: same as JSON for the basic forms, but `$` is also
  // significant inside a `"…"` literal because of string templates, so
  // we escape it too.
  return JSON.stringify(s).replace(/\$/g, "\\$");
}

function escapeForKotlinTemplate(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\$/g, "\\$");
}

function printInterp(parts: ReadonlyArray<string | KtExpr>): string {
  const inner = parts
    .map((p) => {
      if (typeof p === "string") return escapeForKotlinTemplate(p);
      // Bare-identifier shorthand: `$ident` is preferred to `${ident}`
      // when the identifier is unambiguous.
      if (p.kind === "ident" && isSimpleIdent(p.name)) return `$${p.name}`;
      return `\${${printExpr(p)}}`;
    })
    .join("");
  return `"${inner}"`;
}

function printCall(e: Extract<KtExpr, { kind: "call" }>): string {
  const typeArgs =
    e.typeArgs && e.typeArgs.length > 0
      ? `<${e.typeArgs.map(printType).join(", ")}>`
      : "";
  const args = e.args
    .map((a) =>
      a.label === undefined
        ? printExpr(a.expr)
        : `${a.label} = ${printExpr(a.expr)}`,
    )
    .join(", ");
  // When a call has no positional args and a trailing lambda, the
  // empty parens are omitted: `client.execute { ... }`.
  const head =
    e.args.length > 0 || !e.trailingLambda
      ? `${printExpr(e.callee)}${typeArgs}(${args})`
      : `${printExpr(e.callee)}${typeArgs}`;
  return e.trailingLambda ? `${head} ${printLambda(e.trailingLambda)}` : head;
}

export function printLambda(c: KtLambdaExpr, indent: string = ""): string {
  if (c.body.length === 1) {
    const only = c.body[0]!;
    const params = c.params.length === 0 ? "" : `${c.params.join(", ")} -> `;
    if (only.kind === "returnExpr" || only.kind === "expr") {
      const expr =
        only.kind === "returnExpr"
          ? only.expr
          : (only as { expr: KtExpr }).expr;
      return `{ ${params}${printExpr(expr)} }`;
    }
    if (only.kind === "assign") {
      return `{ ${params}${printExpr(only.target)} = ${printExpr(only.value)} }`;
    }
  }
  if (c.body.length === 0) {
    return c.params.length === 0 ? "{}" : `{ ${c.params.join(", ")} -> }`;
  }
  const stmts = c.body.map((s) => printStmt(s, indent + INDENT)).join("\n");
  if (c.params.length === 0) return `{\n${stmts}\n${indent}}`;
  return `{ ${c.params.join(", ")} ->\n${stmts}\n${indent}}`;
}
