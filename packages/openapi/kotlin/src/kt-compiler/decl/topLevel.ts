import type { KtTopLevelFun } from "../../kt-dsl/decl/topLevel.js";
import { printFun } from "./fun.js";

export function printTopLevelFun(d: KtTopLevelFun): string {
  return printFun(d.fun);
}
