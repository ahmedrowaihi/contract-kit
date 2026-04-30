import type { SwAccess } from "../sw-dsl/access.js";

export const INDENT = "    ";

export const accessPrefix = (a: SwAccess): string =>
  a === "internal" ? "" : `${a} `;

export const conformanceTail = (conforms: ReadonlyArray<string>): string =>
  conforms.length > 0 ? `: ${conforms.join(", ")}` : "";

export const indented = (
  lines: ReadonlyArray<string>,
  indent: string,
): string => lines.map((l) => `${indent}${l}`).join("\n");
