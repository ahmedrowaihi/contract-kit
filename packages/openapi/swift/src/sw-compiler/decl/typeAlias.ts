import type { SwTypeAlias } from "../../sw-dsl/decl/typeAlias.js";
import { accessPrefix } from "../format.js";
import { printType } from "../type.js";

export function printTypeAlias(a: SwTypeAlias): string {
  return `${accessPrefix(a.access)}typealias ${a.name} = ${printType(a.type)}`;
}
