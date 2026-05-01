import ts from "typescript";

/**
 * Attach a multi-line `//` comment block as a leading synthetic comment
 * on the first statement; the printer outputs it verbatim. Mutates the
 * passed statement (TS comments are stored on nodes, not in a tree).
 */
export function attachHeader(
  statements: ReadonlyArray<ts.Statement>,
  header: string,
): ReadonlyArray<ts.Statement> {
  const first = statements[0];
  if (!first) return statements;
  const lines = header.replace(/\n$/, "").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    ts.addSyntheticLeadingComment(
      first,
      ts.SyntaxKind.SingleLineCommentTrivia,
      ` ${lines[i].replace(/^\/\/\s?/, "")}`,
      i === lines.length - 1,
    );
  }
  return statements;
}
