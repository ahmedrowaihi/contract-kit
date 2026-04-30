import type { SwFile } from "../sw-dsl/file.js";
import { printDecl } from "./decl/index.js";

export function printFile(f: SwFile): string {
  const out: string[] = [];
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
  printDecl,
  printEnum,
  printFun,
  printFunParam,
  printProp,
  printProtocol,
  printStruct,
  printTypeAlias,
} from "./decl/index.js";
export { printExpr } from "./expr.js";
export { printStmt } from "./stmt.js";
export { printType } from "./type.js";
