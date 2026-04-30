import type { KtTypeAlias } from "../../kt-dsl/decl/typeAlias.js";
import { visibilityPrefix } from "../format.js";
import { printType } from "../type.js";

export function printTypeAlias(d: KtTypeAlias): string {
  return `${visibilityPrefix(d.visibility)}typealias ${d.name} = ${printType(d.type)}`;
}
