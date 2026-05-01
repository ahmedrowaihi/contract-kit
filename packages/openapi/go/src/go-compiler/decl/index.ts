import type { GoDecl } from "../../go-dsl/decl/types.js";
import { printConstBlock } from "./const.js";
import { printFunc } from "./func.js";
import { printInterface } from "./interface.js";
import { printStruct } from "./struct.js";
import { printTypeAlias } from "./typeAlias.js";

export function printDecl(d: GoDecl): string {
  switch (d.kind) {
    case "struct":
      return printStruct(d);
    case "interface":
      return printInterface(d);
    case "func":
      return printFunc(d);
    case "typeAlias":
      return printTypeAlias(d);
    case "constBlock":
      return printConstBlock(d);
  }
}

export { printConstBlock } from "./const.js";
export { printFunc } from "./func.js";
export { printInterface, printMethodSig } from "./interface.js";
export { printStruct } from "./struct.js";
export { printTypeAlias } from "./typeAlias.js";
