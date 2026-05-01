import type { KtInterface } from "../../kt-dsl/decl/interface.js";
import { INDENT, superTypeTail, visibilityPrefix } from "../format.js";
import { printFun } from "./fun.js";
import { printAnnotations } from "./prop.js";

export function printInterface(d: KtInterface): string {
  const annLines = printAnnotations(d.annotations, "");
  const vis = visibilityPrefix(d.visibility);
  const head = `${annLines}${vis}interface ${d.name}${superTypeTail(d.superTypes)}`;
  if (d.funs.length === 0) return `${head} {}`;
  // Members of an interface inherit the interface's visibility — emitting
  // `public` on each requirement is redundant and noisy.
  const funs = d.funs.map((f) => printFun(f, INDENT, true)).join("\n\n");
  return `${head} {\n${funs}\n}`;
}
