import type {
  KtAnnotation,
  KtDataClass,
  KtDecl,
  KtFile,
  KtProp,
  KtType,
} from "../kt-dsl/types.js";

const INDENT = "    ";

export function printType(t: KtType): string {
  switch (t.kind) {
    case "primitive":
      return t.name;
    case "list":
      return `List<${printType(t.element)}>`;
    case "map":
      return `Map<${printType(t.key)}, ${printType(t.value)}>`;
    case "ref":
      return t.name;
    case "nullable":
      return `${printType(t.inner)}?`;
  }
}

export function printAnnotation(a: KtAnnotation): string {
  const args = a.args && a.args.length > 0 ? `(${a.args.join(", ")})` : "";
  return `@${a.name}${args}`;
}

export function printProp(p: KtProp): string {
  const annotations = p.annotations.map(printAnnotation);
  const keyword = p.mutable ? "var" : "val";
  const def = p.default !== undefined ? ` = ${p.default}` : "";
  const decl = `${keyword} ${p.name}: ${printType(p.type)}${def}`;
  if (annotations.length === 0) return decl;
  return `${annotations.join(" ")} ${decl}`;
}

export function printDataClass(c: KtDataClass): string {
  const lines: string[] = [];
  for (const a of c.annotations) lines.push(printAnnotation(a));
  if (c.properties.length === 0) {
    lines.push(`data class ${c.name}()`);
    return lines.join("\n");
  }
  lines.push(`data class ${c.name}(`);
  for (const p of c.properties) lines.push(`${INDENT}${printProp(p)},`);
  lines.push(")");
  return lines.join("\n");
}

export function printDecl(d: KtDecl): string {
  switch (d.kind) {
    case "dataClass":
      return printDataClass(d);
  }
}

export function printFile(f: KtFile): string {
  const out: string[] = [];
  if (f.packageName) {
    out.push(`package ${f.packageName}`);
    out.push("");
  }
  if (f.imports.length > 0) {
    for (const imp of f.imports) out.push(`import ${imp}`);
    out.push("");
  }
  for (let i = 0; i < f.decls.length; i++) {
    out.push(printDecl(f.decls[i]!));
    if (i < f.decls.length - 1) out.push("");
  }
  return `${out.join("\n")}\n`;
}
