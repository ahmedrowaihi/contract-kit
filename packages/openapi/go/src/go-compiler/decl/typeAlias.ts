import type { GoTypeAlias } from "../../go-dsl/decl/typeAlias.js";
import { printType } from "../type.js";
import { formatDoc } from "./struct.js";

export function printTypeAlias(d: GoTypeAlias): string {
  const docLines = formatDoc(d.doc, "");
  const op = d.alias ? "= " : "";
  return `${docLines}type ${d.name} ${op}${printType(d.type)}`;
}
