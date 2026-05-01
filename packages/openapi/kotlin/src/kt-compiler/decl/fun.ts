import type { KtFun, KtFunParam, KtTypeParam } from "../../kt-dsl/fun.js";
import { printExpr } from "../expr.js";
import { INDENT, visibilityPrefix } from "../format.js";
import { printStmt } from "../stmt.js";
import { printType } from "../type.js";

function printTypeParams(typeParams: ReadonlyArray<KtTypeParam>): string {
  if (typeParams.length === 0) return "";
  return `<${typeParams
    .map((t) => {
      if (!t.bounds || t.bounds.length === 0) return t.name;
      return `${t.name} : ${t.bounds.join(" & ")}`;
    })
    .join(", ")}>`;
}

export function printFunParam(
  p: KtFunParam,
  includeDefault: boolean = true,
): string {
  const def =
    includeDefault && p.default !== undefined ? ` = ${p.default}` : "";
  return `${p.name}: ${printType(p.type)}${def}`;
}

export function printParamsBlock(
  params: ReadonlyArray<KtFunParam>,
  indent: string,
  includeDefault: boolean = true,
): string {
  if (params.length === 0) return "()";
  return `(\n${params
    .map((p) => `${indent}${INDENT}${printFunParam(p, includeDefault)}`)
    .join(",\n")}\n${indent})`;
}

export function printFun(
  fn: KtFun,
  indent: string = "",
  /**
   * Suppress the visibility modifier — required when the function lives
   * inside an interface (members inherit the interface's visibility),
   * or as part of an enum entry's member list.
   */
  suppressVisibility: boolean = false,
): string {
  const lines: string[] = [];
  if (fn.doc) {
    for (const line of fn.doc.split("\n"))
      lines.push(`${indent}/** ${line} */`);
  }
  const vis = suppressVisibility ? "" : visibilityPrefix(fn.visibility);
  const isAbstract = fn.body === undefined;
  // `abstract`/`override`/`open` are mutually exclusive with `final`; the
  // DSL doesn't model `final` since Kotlin's default is final and we
  // don't need the keyword.
  const modifiers = fn.modifiers.length > 0 ? `${fn.modifiers.join(" ")} ` : "";
  const typeParams = printTypeParams(fn.typeParams);
  const params = printParamsBlock(fn.params, indent, !isAbstract);
  const isUnit =
    fn.returnType.kind === "primitive" && fn.returnType.name === "Unit";
  const ret = isUnit ? "" : `: ${printType(fn.returnType)}`;
  const receiver = fn.receiver ? `${printType(fn.receiver)}.` : "";
  const tp = typeParams ? `${typeParams} ` : "";
  const head = `${indent}${vis}${modifiers}fun ${tp}${receiver}${fn.name}${params}${ret}`;

  if (fn.body === undefined) {
    lines.push(head);
    return lines.join("\n");
  }
  if (fn.body.length === 0) {
    lines.push(`${head} {}`);
    return lines.join("\n");
  }
  // Single-expression body shorthand: `fun foo(): T = expr`.
  if (fn.body.length === 1 && fn.body[0]!.kind === "returnExpr") {
    lines.push(`${head} = ${printExpr(fn.body[0]!.expr)}`);
    return lines.join("\n");
  }
  const body = fn.body.map((s) => printStmt(s, indent + INDENT)).join("\n");
  lines.push(`${head} {\n${body}\n${indent}}`);
  return lines.join("\n");
}
