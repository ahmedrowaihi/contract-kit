import type { KtFile } from "../kt-dsl/file.js";
import { printDecl } from "./decl/index.js";

export function printFile(f: KtFile): string {
  const out: string[] = [];
  if (f.pkg) {
    out.push(`package ${f.pkg}`);
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

export {
  printClass,
  printDataClass,
  printDecl,
  printEnum,
  printFun,
  printFunParam,
  printInterface,
  printObject,
  printProp,
  printSealedClass,
  printTopLevelFun,
  printTypeAlias,
} from "./decl/index.js";
export { printExpr } from "./expr.js";
export { printStmt } from "./stmt.js";
export { printType } from "./type.js";
