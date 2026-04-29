import type { SwLetBinding, SwStmt } from "../sw-dsl/stmt/types.js";
import { printExpr } from "./expr.js";
import { INDENT } from "./format.js";
import { printType } from "./type.js";

export function printStmt(s: SwStmt, indent: string = ""): string {
  switch (s.kind) {
    case "let": {
      const type = s.type ? `: ${printType(s.type)}` : "";
      return `${indent}let ${printLetBinding(s.binding)}${type} = ${printExpr(s.expr)}`;
    }
    case "var": {
      const type = s.type ? `: ${printType(s.type)}` : "";
      return `${indent}var ${s.name}${type} = ${printExpr(s.expr)}`;
    }
    case "assign":
      return `${indent}${printExpr(s.target)} = ${printExpr(s.value)}`;
    case "expr":
      return `${indent}${printExpr(s.expr)}`;
    case "return":
      return s.expr === undefined
        ? `${indent}return`
        : `${indent}return ${printExpr(s.expr)}`;
    case "throw":
      return `${indent}throw ${printExpr(s.expr)}`;
    case "if":
      return printIf(s, indent);
    case "ifLet":
      return printIfLet(s, indent);
    case "guardLet":
      return printGuardLet(s, indent);
  }
}

function printLetBinding(b: SwLetBinding): string {
  return typeof b === "string" ? b : `(${b.names.join(", ")})`;
}

function printBlock(body: ReadonlyArray<SwStmt>, indent: string): string {
  if (body.length === 0) return "{}";
  const inner = body.map((s) => printStmt(s, indent + INDENT)).join("\n");
  return `{\n${inner}\n${indent}}`;
}

function printIf(s: Extract<SwStmt, { kind: "if" }>, indent: string): string {
  const head = `${indent}if ${printExpr(s.cond)} ${printBlock(s.then, indent)}`;
  if (!s.else_) return head;
  return `${head} else ${printBlock(s.else_, indent)}`;
}

function printIfLet(
  s: Extract<SwStmt, { kind: "ifLet" }>,
  indent: string,
): string {
  const head = `${indent}if let ${s.name} = ${printExpr(s.source)} ${printBlock(s.then, indent)}`;
  if (!s.else_) return head;
  return `${head} else ${printBlock(s.else_, indent)}`;
}

function printGuardLet(
  s: Extract<SwStmt, { kind: "guardLet" }>,
  indent: string,
): string {
  return `${indent}guard let ${s.name} = ${printExpr(s.source)} else ${printBlock(s.else_, indent)}`;
}
