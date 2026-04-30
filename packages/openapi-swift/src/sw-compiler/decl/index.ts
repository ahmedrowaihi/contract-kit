import type { SwDecl } from "../../sw-dsl/decl/types.js";
import { printClass } from "./class.js";
import { printEnum } from "./enum.js";
import { printExtension } from "./extension.js";
import { printProtocol } from "./protocol.js";
import { printStruct } from "./struct.js";
import { printTypeAlias } from "./typeAlias.js";

export function printDecl(d: SwDecl): string {
  switch (d.kind) {
    case "struct":
      return printStruct(d);
    case "enum":
      return printEnum(d);
    case "typeAlias":
      return printTypeAlias(d);
    case "protocol":
      return printProtocol(d);
    case "class":
      return printClass(d);
    case "extension":
      return printExtension(d);
  }
}

export { printClass } from "./class.js";
export { printEnum } from "./enum.js";
export { printExtension } from "./extension.js";
export { printFun, printFunParam, printParamsBlock } from "./fun.js";
export { printProtocol } from "./protocol.js";
export { printProp, printStruct } from "./struct.js";
export { printTypeAlias } from "./typeAlias.js";
