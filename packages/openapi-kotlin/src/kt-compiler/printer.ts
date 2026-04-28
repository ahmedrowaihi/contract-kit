import type {
  KtAnnotation,
  KtDataClass,
  KtDecl,
  KtEnum,
  KtFile,
  KtFun,
  KtFunParam,
  KtInterface,
  KtProp,
  KtType,
  KtTypeAlias,
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

export function printEnum(e: KtEnum): string {
  const lines: string[] = [];
  for (const a of e.annotations) lines.push(printAnnotation(a));
  if (e.variants.length === 0) {
    lines.push(`enum class ${e.name}`);
    return lines.join("\n");
  }
  lines.push(`enum class ${e.name} {`);
  for (let i = 0; i < e.variants.length; i++) {
    const v = e.variants[i]!;
    const last = i === e.variants.length - 1;
    const prefix = v.annotations.map(printAnnotation).join(" ");
    const head = prefix ? `${prefix} ` : "";
    lines.push(`${INDENT}${head}${v.name}${last ? "," : ","}`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function printTypeAlias(a: KtTypeAlias): string {
  return `typealias ${a.name} = ${printType(a.type)}`;
}

export function printFunParam(p: KtFunParam): string {
  const annotations = p.annotations.map(printAnnotation).join(" ");
  const head = annotations ? `${annotations} ` : "";
  const def = p.default !== undefined ? ` = ${p.default}` : "";
  return `${head}${p.name}: ${printType(p.type)}${def}`;
}

export function printFun(fn: KtFun, indent: string = ""): string {
  const lines: string[] = [];
  for (const a of fn.annotations) lines.push(`${indent}${printAnnotation(a)}`);
  const mods = fn.modifiers.length > 0 ? `${fn.modifiers.join(" ")} ` : "";
  const head = `${indent}${mods}fun ${fn.name}`;
  const ret =
    fn.returnType.kind === "primitive" && fn.returnType.name === "Unit"
      ? ""
      : `: ${printType(fn.returnType)}`;
  const tail = fn.body !== undefined ? ` = ${fn.body}` : "";

  if (fn.params.length === 0) {
    lines.push(`${head}()${ret}${tail}`);
    return lines.join("\n");
  }

  lines.push(`${head}(`);
  for (const p of fn.params)
    lines.push(`${indent}${INDENT}${printFunParam(p)},`);
  lines.push(`${indent})${ret}${tail}`);
  return lines.join("\n");
}

export function printInterface(iface: KtInterface): string {
  const lines: string[] = [];
  for (const a of iface.annotations) lines.push(printAnnotation(a));
  if (iface.funs.length === 0) {
    lines.push(`interface ${iface.name}`);
    return lines.join("\n");
  }
  lines.push(`interface ${iface.name} {`);
  for (let i = 0; i < iface.funs.length; i++) {
    if (i > 0) lines.push("");
    lines.push(printFun(iface.funs[i]!, INDENT));
  }
  lines.push("}");
  return lines.join("\n");
}

export function printDecl(d: KtDecl): string {
  switch (d.kind) {
    case "dataClass":
      return printDataClass(d);
    case "enum":
      return printEnum(d);
    case "typeAlias":
      return printTypeAlias(d);
    case "interface":
      return printInterface(d);
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
