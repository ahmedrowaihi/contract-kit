import type { SwProp, SwStruct } from "../../sw-dsl/decl/struct.js";
import { accessPrefix, conformanceTail, INDENT } from "../format.js";
import { printType } from "../type.js";
import { printInit } from "./class.js";

export function printProp(p: SwProp, indent: string = ""): string {
  const keyword = p.mutable ? "var" : "let";
  const def = p.default !== undefined ? ` = ${p.default}` : "";
  return `${indent}${accessPrefix(p.access)}${keyword} ${p.name}: ${printType(p.type)}${def}`;
}

export function printStruct(s: SwStruct): string {
  const head = `${accessPrefix(s.access)}struct ${s.name}${conformanceTail(s.conforms)}`;
  const hasCodingKeys = s.codingKeys && s.codingKeys.length > 0;
  const hasInits = s.inits.length > 0;
  if (s.properties.length === 0 && !hasCodingKeys && !hasInits) {
    return `${head} {}`;
  }
  const sections: string[] = [];
  if (s.properties.length > 0) {
    sections.push(s.properties.map((p) => printProp(p, INDENT)).join("\n"));
  }
  if (hasInits) {
    sections.push(s.inits.map((i) => printInit(i, INDENT)).join("\n\n"));
  }
  if (hasCodingKeys) {
    sections.push(printCodingKeys(s.codingKeys!));
  }
  return `${head} {\n${sections.join("\n\n")}\n}`;
}

function printCodingKeys(
  entries: ReadonlyArray<{ swiftName: string; jsonKey: string }>,
): string {
  const lines = [`${INDENT}enum CodingKeys: String, CodingKey {`];
  for (const e of entries) {
    const right =
      e.swiftName === e.jsonKey ? "" : ` = ${JSON.stringify(e.jsonKey)}`;
    lines.push(`${INDENT}${INDENT}case ${e.swiftName}${right}`);
  }
  lines.push(`${INDENT}}`);
  return lines.join("\n");
}
