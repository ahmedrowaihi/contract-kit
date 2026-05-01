import type { KtAnnotation, KtProp } from "../../kt-dsl/decl/prop.js";
import { visibilityPrefix } from "../format.js";
import { printType } from "../type.js";

export function printAnnotation(a: KtAnnotation): string {
  return a.args === undefined ? `@${a.name}` : `@${a.name}(${a.args})`;
}

export function printAnnotations(
  annotations: ReadonlyArray<KtAnnotation>,
  indent: string,
  inline: boolean = false,
): string {
  if (annotations.length === 0) return "";
  const sep = inline ? " " : "\n";
  return (
    annotations.map((a) => `${indent}${printAnnotation(a)}`).join(sep) + sep
  );
}

/**
 * Body-level property — emitted as `[annotations] [vis] val|var name: T [= default]`.
 *
 * @example
 * ```kotlin
 * // ktProp({ name: "id", type: ktString })
 * //   → public val id: String
 * ```
 */
export function printProp(p: KtProp, indent: string = ""): string {
  const annLines = printAnnotations(p.annotations, indent);
  const vis = visibilityPrefix(p.visibility);
  const keyword = p.mutable ? "var" : "val";
  const def = p.default !== undefined ? ` = ${p.default}` : "";
  return `${annLines}${indent}${vis}${keyword} ${p.name}: ${printType(p.type)}${def}`;
}

/**
 * Primary-constructor property — emitted as a single line inside the
 * class header's parameter list. Annotations render inline so the
 * ctor block stays one-per-line readable.
 */
export function printPrimaryProp(p: KtProp, indent: string): string {
  const ann =
    p.annotations.length > 0
      ? `${p.annotations.map(printAnnotation).join(" ")} `
      : "";
  const vis = visibilityPrefix(p.visibility);
  const keyword = p.mutable ? "var" : "val";
  const def = p.default !== undefined ? ` = ${p.default}` : "";
  return `${indent}${ann}${vis}${keyword} ${p.name}: ${printType(p.type)}${def}`;
}
