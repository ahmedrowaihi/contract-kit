import type { SwClosureExpr, SwExpr } from "../sw-dsl/expr/types.js";
import { INDENT } from "./format.js";
import { printStmt } from "./stmt.js";
import { printType } from "./type.js";

export function printExpr(e: SwExpr): string {
  switch (e.kind) {
    case "ident":
      return e.name;
    case "dotCase":
      return `.${e.name}`;
    case "enumPattern": {
      const bindings =
        e.bindings.length === 0
          ? ""
          : `(${e.bindings.map((b) => `let ${b}`).join(", ")})`;
      return `.${e.case}${bindings}`;
    }
    case "str":
      return JSON.stringify(e.value);
    case "int":
      return String(e.value);
    case "bool":
      return e.value ? "true" : "false";
    case "nil":
      return "nil";
    case "underscore":
      return "_";
    case "interp":
      return printInterp(e.parts);
    case "arrayLit":
      return printArrayLit(e);
    case "dictLit":
      return printDictLit(e);
    case "member":
      return `${printExpr(e.on)}.${e.name}`;
    case "optChain":
      return `${printExpr(e.on)}?.${e.name}`;
    case "subscript":
      return `${printExpr(e.on)}[${printExpr(e.index)}]`;
    case "forceUnwrap":
      return `${printExpr(e.on)}!`;
    case "call":
      return printCall(e);
    case "try":
      return `${e.awaited ? "try await" : "try"} ${printExpr(e.expr)}`;
    case "tuple":
      return `(${e.items.map(printExpr).join(", ")})`;
    case "typeRef":
      return `${printType(e.type)}.self`;
    case "binOp":
      return `${printExpr(e.left)} ${e.op} ${printExpr(e.right)}`;
    case "closure":
      return printClosure(e);
    case "range": {
      const op = e.halfOpen ? "..<" : "...";
      return `${printExpr(e.low)}${op}${printExpr(e.high)}`;
    }
    case "as": {
      const op = e.optional ? "as?" : "as";
      return `${printExpr(e.expr)} ${op} ${printType(e.type)}`;
    }
  }
}

function escapeForSwiftLiteral(s: string): string {
  // Order matters: backslashes first so the escape sequences we add for
  // `"` / `\n` / `\r` / `\t` aren't double-escaped.
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function printInterp(parts: ReadonlyArray<string | SwExpr>): string {
  const inner = parts
    .map((p) =>
      typeof p === "string" ? escapeForSwiftLiteral(p) : `\\(${printExpr(p)})`,
    )
    .join("");
  return `"${inner}"`;
}

function printArrayLit(e: Extract<SwExpr, { kind: "arrayLit" }>): string {
  if (e.items.length === 0) {
    return e.elementType ? `[${printType(e.elementType)}]()` : "[]";
  }
  return `[${e.items.map(printExpr).join(", ")}]`;
}

function printDictLit(e: Extract<SwExpr, { kind: "dictLit" }>): string {
  if (e.pairs.length === 0) {
    if (e.keyType && e.valueType) {
      return `[${printType(e.keyType)}: ${printType(e.valueType)}]()`;
    }
    return "[:]";
  }
  return `[${e.pairs
    .map(([k, v]) => `${printExpr(k)}: ${printExpr(v)}`)
    .join(", ")}]`;
}

function printCall(e: Extract<SwExpr, { kind: "call" }>): string {
  const args = e.args
    .map((a) =>
      a.label === undefined
        ? printExpr(a.expr)
        : `${a.label}: ${printExpr(a.expr)}`,
    )
    .join(", ");
  const head =
    e.args.length > 0 || !e.trailingClosure
      ? `${printExpr(e.callee)}(${args})`
      : `${printExpr(e.callee)}`;
  return e.trailingClosure
    ? `${head} ${printClosure(e.trailingClosure)}`
    : head;
}

export function printClosure(c: SwClosureExpr, indent: string = ""): string {
  if (c.body.length === 1) {
    const only = c.body[0]!;
    if (only.kind === "return" && only.expr !== undefined) {
      const params = c.params.length === 0 ? "" : `${c.params.join(", ")} in `;
      return `{ ${params}${printExpr(only.expr)} }`;
    }
  }
  if (c.body.length === 0) {
    return c.params.length === 0 ? "{}" : `{ ${c.params.join(", ")} in }`;
  }
  const stmts = c.body.map((s) => printStmt(s, indent + INDENT)).join("\n");
  if (c.params.length === 0) {
    return `{\n${stmts}\n${indent}}`;
  }
  return `{ ${c.params.join(", ")} in\n${stmts}\n${indent}}`;
}
