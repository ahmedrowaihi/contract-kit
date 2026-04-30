import type {
  GoCompositeLit,
  GoExpr,
  GoFuncLitExpr,
} from "../go-dsl/expr/types.js";
import { INDENT } from "./format.js";
import { printStmt } from "./stmt.js";
import { printType } from "./type.js";

export function printExpr(e: GoExpr): string {
  switch (e.kind) {
    case "ident":
      return e.name;
    case "selector":
      return `${printExpr(e.on)}.${e.name}`;
    case "index":
      return `${printExpr(e.on)}[${printExpr(e.index)}]`;
    case "str":
      return e.raw ? `\`${e.value}\`` : printDoubleQuoted(e.value);
    case "int":
      return String(e.value);
    case "float": {
      const s = String(e.value);
      return s.includes(".") ? s : `${s}.0`;
    }
    case "bool":
      return e.value ? "true" : "false";
    case "nil":
      return "nil";
    case "underscore":
      return "_";
    case "iota":
      return "iota";
    case "binOp":
      return `${printExpr(e.left)} ${e.op} ${printExpr(e.right)}`;
    case "unary":
      return `${e.op}${printExpr(e.operand)}`;
    case "typeAssert":
      return `${printExpr(e.expr)}.(${printType(e.type)})`;
    case "call":
      return printCall(e);
    case "funcLit":
      return printFuncLit(e);
    case "structLit":
    case "sliceLit":
    case "mapLit":
      return printCompositeLit(e);
    case "typeRef":
      return printType(e.type);
  }
}

function printDoubleQuoted(s: string): string {
  return JSON.stringify(s);
}

function printCall(e: Extract<GoExpr, { kind: "call" }>): string {
  const typeArgs =
    e.typeArgs && e.typeArgs.length > 0
      ? `[${e.typeArgs.map(printType).join(", ")}]`
      : "";
  const args = e.args
    .map((a) => `${printExpr(a.expr)}${a.spread ? "..." : ""}`)
    .join(", ");
  return `${printExpr(e.callee)}${typeArgs}(${args})`;
}

function printCompositeLit(e: GoCompositeLit): string {
  switch (e.kind) {
    case "structLit": {
      if (e.fields.length === 0) return `${printType(e.type)}{}`;
      const inner = e.fields
        .map((f) =>
          f.name ? `${f.name}: ${printExpr(f.value)}` : printExpr(f.value),
        )
        .join(", ");
      return `${printType(e.type)}{${inner}}`;
    }
    case "sliceLit": {
      if (e.items.length === 0) return `[]${printType(e.element)}{}`;
      return `[]${printType(e.element)}{${e.items.map(printExpr).join(", ")}}`;
    }
    case "mapLit": {
      if (e.pairs.length === 0)
        return `map[${printType(e.key)}]${printType(e.value)}{}`;
      const inner = e.pairs
        .map(([k, v]) => `${printExpr(k)}: ${printExpr(v)}`)
        .join(", ");
      return `map[${printType(e.key)}]${printType(e.value)}{${inner}}`;
    }
  }
}

export function printFuncLit(c: GoFuncLitExpr, indent: string = ""): string {
  const params = c.params
    .map((p) => `${p.name} ${printType(p.type)}`)
    .join(", ");
  const results =
    c.results.length === 0
      ? ""
      : c.results.length === 1 && c.results[0]!.name === undefined
        ? ` ${printType(c.results[0]!.type)}`
        : ` (${c.results
            .map((r) =>
              r.name ? `${r.name} ${printType(r.type)}` : printType(r.type),
            )
            .join(", ")})`;
  if (c.body.length === 0) return `func(${params})${results} {}`;
  const inner = c.body.map((s) => printStmt(s, indent + INDENT)).join("\n");
  return `func(${params})${results} {\n${inner}\n${indent}}`;
}
