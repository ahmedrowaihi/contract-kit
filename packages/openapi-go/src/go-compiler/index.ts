import type { GoFile } from "../go-dsl/file.js";
import { printDecl } from "./decl/index.js";
import { partitionImports } from "./format.js";

export function printFile(f: GoFile): string {
  const out: string[] = [];
  out.push(`package ${f.pkg}`);
  if (f.imports.length > 0) {
    out.push("");
    out.push(printImports(f.imports));
  }
  for (const d of f.decls) {
    out.push("");
    out.push(printDecl(d));
  }
  return `${out.join("\n")}\n`;
}

function printImports(imports: ReadonlyArray<string>): string {
  const { stdlib, thirdParty } = partitionImports(imports);
  if (stdlib.length + thirdParty.length === 1) {
    return `import "${stdlib[0] ?? thirdParty[0]}"`;
  }
  const groups: string[] = [];
  if (stdlib.length > 0) {
    groups.push(stdlib.map((p) => `\t"${p}"`).join("\n"));
  }
  if (thirdParty.length > 0) {
    groups.push(thirdParty.map((p) => `\t"${p}"`).join("\n"));
  }
  return `import (\n${groups.join("\n\n")}\n)`;
}

export {
  printConstBlock,
  printDecl,
  printFunc,
  printInterface,
  printStruct,
  printTypeAlias,
} from "./decl/index.js";
export { printExpr } from "./expr.js";
export { printStmt } from "./stmt.js";
export { printType } from "./type.js";
