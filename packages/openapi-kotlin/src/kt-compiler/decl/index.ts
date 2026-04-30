import type { KtDecl } from "../../kt-dsl/decl/types.js";
import { printClass } from "./class.js";
import { printDataClass } from "./dataClass.js";
import { printEnum } from "./enum.js";
import { printInterface } from "./interface.js";
import { printObject } from "./object.js";
import { printSealedClass } from "./sealedClass.js";
import { printTopLevelFun } from "./topLevel.js";
import { printTypeAlias } from "./typeAlias.js";

export function printDecl(d: KtDecl): string {
  switch (d.kind) {
    case "dataClass":
      return printDataClass(d);
    case "class":
      return printClass(d);
    case "sealedClass":
      return printSealedClass(d);
    case "object":
      return printObject(d);
    case "interface":
      return printInterface(d);
    case "enum":
      return printEnum(d);
    case "typeAlias":
      return printTypeAlias(d);
    case "topLevelFun":
      return printTopLevelFun(d);
  }
}

export { printClass } from "./class.js";
export { printDataClass } from "./dataClass.js";
export { printEnum } from "./enum.js";
export { printFun, printFunParam, printParamsBlock } from "./fun.js";
export { printInterface } from "./interface.js";
export { printObject } from "./object.js";
export { printPrimaryProp, printProp } from "./prop.js";
export { printSealedClass } from "./sealedClass.js";
export { printTopLevelFun } from "./topLevel.js";
export { printTypeAlias } from "./typeAlias.js";
