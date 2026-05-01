import ts from "typescript";

/**
 * Tiny ergonomic shorthands over `ts.factory`. Inspired by hey-api's
 * unpublished ts-dsl — same idea (typed AST builders + printer), built
 * directly on the official TypeScript compiler API.
 *
 * Use these from plugins instead of string concatenation: refactor-safe,
 * properly formatted, mistakes caught at compile time.
 */

const f = ts.factory;

// ============================================================
//  Expressions
// ============================================================

export const lit = {
  string: (s: string) => f.createStringLiteral(s),
  number: (n: number) => f.createNumericLiteral(n),
  boolean: (b: boolean) => (b ? f.createTrue() : f.createFalse()),
  null: () => f.createNull(),
  undefined: () => f.createIdentifier("undefined"),
} as const;

export function obj(
  entries: Readonly<Record<string, ts.Expression>>,
): ts.ObjectLiteralExpression {
  return f.createObjectLiteralExpression(
    Object.entries(entries).map(([k, v]) =>
      f.createPropertyAssignment(asPropertyName(k), v),
    ),
    /* multiLine */ true,
  );
}

export function arr(
  elements: ReadonlyArray<ts.Expression>,
): ts.ArrayLiteralExpression {
  return f.createArrayLiteralExpression([...elements], /* multiLine */ true);
}

export function asConst(expr: ts.Expression): ts.AsExpression {
  return f.createAsExpression(
    expr,
    f.createTypeReferenceNode("const", undefined),
  );
}

// ============================================================
//  Statements / declarations
// ============================================================

export function exportConst(
  name: string,
  init: ts.Expression,
): ts.VariableStatement {
  return f.createVariableStatement(
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    f.createVariableDeclarationList(
      [f.createVariableDeclaration(name, undefined, undefined, init)],
      ts.NodeFlags.Const,
    ),
  );
}

export function exportTypeAlias(
  name: string,
  type: ts.TypeNode,
): ts.TypeAliasDeclaration {
  return f.createTypeAliasDeclaration(
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    name,
    undefined,
    type,
  );
}

export function exportInterface(
  name: string,
  members: ReadonlyArray<ts.TypeElement>,
): ts.InterfaceDeclaration {
  return f.createInterfaceDeclaration(
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    name,
    undefined,
    undefined,
    [...members],
  );
}

export function exportFromBarrel(
  named: ReadonlyArray<{ name: string; isType?: boolean }>,
  module: string,
): ts.ExportDeclaration {
  return f.createExportDeclaration(
    undefined,
    /* isTypeOnly */ false,
    f.createNamedExports(
      named.map((n) =>
        f.createExportSpecifier(
          n.isType ?? false,
          undefined,
          f.createIdentifier(n.name),
        ),
      ),
    ),
    f.createStringLiteral(module),
  );
}

export function exportTypeStarFrom(module: string): ts.ExportDeclaration {
  return f.createExportDeclaration(
    undefined,
    /* isTypeOnly */ true,
    undefined,
    f.createStringLiteral(module),
  );
}

// ============================================================
//  Type nodes
// ============================================================

export const tn = {
  ref: (name: string, args?: ReadonlyArray<ts.TypeNode>) =>
    f.createTypeReferenceNode(name, args ? [...args] : undefined),
  string: () => f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
  number: () => f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
  boolean: () => f.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
  any: () => f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
  unknown: () => f.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
  never: () => f.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
  literalString: (s: string) =>
    f.createLiteralTypeNode(f.createStringLiteral(s)),
  /** Property signature for an interface body: `name: type;` (or `name?: type;`). */
  property: (name: string, type: ts.TypeNode, optional = false) =>
    f.createPropertySignature(
      undefined,
      asPropertyName(name),
      optional ? f.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      type,
    ),
  typeOf: (name: string) =>
    f.createTypeQueryNode(f.createIdentifier(name), undefined),
  /** `keyof T` */
  keyOf: (inner: ts.TypeNode) =>
    f.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, inner),
} as const;

// ============================================================
//  Printer
// ============================================================

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

const blankSourceFile = ts.createSourceFile(
  "_.ts",
  "",
  ts.ScriptTarget.ESNext,
  /* setParentNodes */ false,
  ts.ScriptKind.TS,
);

/**
 * Print a list of top-level statements as the body of a TypeScript file.
 * `header` is prepended verbatim (use it for the `// AUTO-GENERATED` line).
 */
export function printFile(
  statements: ReadonlyArray<ts.Node>,
  options: { header?: string } = {},
): string {
  const body = printer.printList(
    ts.ListFormat.MultiLine,
    f.createNodeArray([...statements]),
    blankSourceFile,
  );
  const header = options.header ?? "";
  return header + (header && !header.endsWith("\n") ? "\n" : "") + body;
}

// ============================================================
//  Internals
// ============================================================

/** Use a string literal property name when it isn't a valid identifier. */
function asPropertyName(name: string): ts.PropertyName {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
    ? f.createIdentifier(name)
    : f.createStringLiteral(name);
}
