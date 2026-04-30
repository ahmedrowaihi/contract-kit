import type {
  KtSealedClass,
  KtSealedSubclass,
} from "../../kt-dsl/decl/sealedClass.js";
import { INDENT, superTypeTail, visibilityPrefix } from "../format.js";
import { printFun } from "./fun.js";
import { printAnnotations, printPrimaryProp } from "./prop.js";

export function printSealedClass(d: KtSealedClass): string {
  const annLines = printAnnotations(d.annotations, "");
  const vis = visibilityPrefix(d.visibility);
  const head = `${annLines}${vis}sealed class ${d.name}${superTypeTail(d.superTypes)}`;

  const sections: string[] = [];
  if (d.subclasses.length > 0) {
    sections.push(
      d.subclasses.map((sc) => printSubclass(sc, d.name, INDENT)).join("\n\n"),
    );
  }
  if (d.funs.length > 0) {
    sections.push(d.funs.map((f) => printFun(f, INDENT)).join("\n\n"));
  }
  if (sections.length === 0) return head;
  return `${head} {\n${sections.join("\n\n")}\n}`;
}

function printSubclass(
  sc: KtSealedSubclass,
  parent: string,
  indent: string,
): string {
  const annLines =
    sc.annotations.length > 0
      ? `${sc.annotations.map((a) => `${indent}@${a.name}${a.args ? `(${a.args})` : ""}`).join("\n")}\n`
      : "";
  if (sc.variant === "object") {
    return `${annLines}${indent}public object ${sc.name} : ${parent}()`;
  }
  // data class subclass
  const props =
    sc.properties.length === 0
      ? "()"
      : `(\n${sc.properties.map((p) => printPrimaryProp({ ...p, inPrimary: true }, `${indent}${INDENT}`)).join(",\n")},\n${indent})`;
  return `${annLines}${indent}public data class ${sc.name}${props} : ${parent}()`;
}
