import type { SwFun, SwFunParam, SwGenericParam } from "../../sw-dsl/fun.js";
import { accessPrefix, INDENT } from "../format.js";
import { printStmt } from "../stmt.js";
import { printType } from "../type.js";

function printGenerics(generics: ReadonlyArray<SwGenericParam>): string {
  if (generics.length === 0) return "";
  return `<${generics
    .map((g) => {
      if (!g.conformances || g.conformances.length === 0) return g.name;
      return `${g.name}: ${g.conformances.join(" & ")}`;
    })
    .join(", ")}>`;
}

export function printFunParam(
  p: SwFunParam,
  includeDefault: boolean = true,
): string {
  const head =
    p.label === undefined
      ? p.name
      : p.label === p.name
        ? p.name
        : `${p.label} ${p.name}`;
  const def =
    includeDefault && p.default !== undefined ? ` = ${p.default}` : "";
  return `${head}: ${printType(p.type)}${def}`;
}

export function printParamsBlock(
  params: ReadonlyArray<SwFunParam>,
  indent: string,
  includeDefault: boolean = true,
): string {
  if (params.length === 0) return "()";
  return `(\n${params
    .map((p) => `${indent}${INDENT}${printFunParam(p, includeDefault)}`)
    .join(",\n")}\n${indent})`;
}

export function printFun(
  fn: SwFun,
  indent: string = "",
  /**
   * Suppress the access modifier — required for protocol requirements
   * (Swift forbids it) and helpful for extension members (the extension's
   * access level is inherited; an explicit modifier on each func is
   * redundant and warns).
   */
  suppressAccess: boolean = false,
): string {
  const lines: string[] = [];
  if (fn.doc) {
    for (const line of fn.doc.split("\n")) lines.push(`${indent}/// ${line}`);
  }
  const access = suppressAccess ? "" : accessPrefix(fn.access);
  const staticKw = fn.isStatic ? "static " : "";
  const mutatingKw = fn.isMutating ? "mutating " : "";
  const generics = printGenerics(fn.generics);
  const isProtocolRequirement = fn.body === undefined;
  const params = printParamsBlock(fn.params, indent, !isProtocolRequirement);
  const effects = fn.effects.length > 0 ? ` ${fn.effects.join(" ")}` : "";
  const isVoid =
    fn.returnType.kind === "primitive" && fn.returnType.name === "Void";
  const ret = isVoid ? "" : ` -> ${printType(fn.returnType)}`;
  const head = `${indent}${access}${staticKw}${mutatingKw}func ${fn.name}${generics}${params}${effects}${ret}`;

  if (fn.body === undefined) {
    lines.push(head);
    return lines.join("\n");
  }
  if (fn.body.length === 0) {
    lines.push(`${head} {}`);
    return lines.join("\n");
  }
  const body = fn.body.map((s) => printStmt(s, indent + INDENT)).join("\n");
  lines.push(`${head} {\n${body}\n${indent}}`);
  return lines.join("\n");
}
