import type { KtEnum } from "../../kt-dsl/decl/enum.js";
import { INDENT, superTypeTail, visibilityPrefix } from "../format.js";
import { printFun } from "./fun.js";
import { printAnnotation, printAnnotations, printPrimaryProp } from "./prop.js";

export function printEnum(d: KtEnum): string {
  const annLines = printAnnotations(d.annotations, "");
  const vis = visibilityPrefix(d.visibility);
  const ctor =
    d.properties.length === 0
      ? ""
      : `(\n${d.properties.map((p) => printPrimaryProp({ ...p, inPrimary: true }, INDENT)).join(",\n")},\n)`;
  const head = `${annLines}${vis}enum class ${d.name}${ctor}${superTypeTail(d.superTypes)}`;

  if (d.entries.length === 0 && d.funs.length === 0) {
    return `${head} {}`;
  }

  const entryLines = d.entries.map((e) => {
    const annPrefix =
      e.annotations && e.annotations.length > 0
        ? `${e.annotations.map(printAnnotation).join(" ")} `
        : "";
    const args = e.args === undefined ? "" : `(${e.args})`;
    return `${INDENT}${annPrefix}${e.name}${args}`;
  });
  // Trailing semicolon is required by Kotlin when the enum class has
  // additional members (funs/companion) below the entry list.
  const entriesBlock =
    d.funs.length > 0
      ? `${entryLines.join(",\n")};`
      : `${entryLines.join(",\n")},`;

  const sections: string[] = [entriesBlock];
  if (d.funs.length > 0) {
    sections.push(d.funs.map((f) => printFun(f, INDENT)).join("\n\n"));
  }
  return `${head} {\n${sections.join("\n\n")}\n}`;
}
