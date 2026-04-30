export const INDENT = "\t";

export const indented = (
  lines: ReadonlyArray<string>,
  indent: string,
): string => lines.map((l) => `${indent}${l}`).join("\n");

/**
 * Group import paths into stdlib vs third-party. Stdlib paths have no
 * `.` in the first segment (`fmt`, `net/http`, `encoding/json`);
 * third-party paths have a domain (`github.com/...`, `golang.org/x/...`).
 *
 * `gofmt` emits two blank-line-separated groups inside `import (...)`,
 * so we mirror that.
 */
export function partitionImports(imports: ReadonlyArray<string>): {
  stdlib: string[];
  thirdParty: string[];
} {
  const stdlib: string[] = [];
  const thirdParty: string[] = [];
  for (const path of imports) {
    const firstSeg = path.split("/", 1)[0]!;
    if (firstSeg.includes(".")) thirdParty.push(path);
    else stdlib.push(path);
  }
  stdlib.sort();
  thirdParty.sort();
  return { stdlib, thirdParty };
}
