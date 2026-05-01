/**
 * TypeScript AST builders for handler file generation.
 * Constructs import declarations, handler property assignments, and
 * complete handler file ASTs using the TypeScript compiler API.
 */

import ts from "typescript";

import type { HandlerMode, ProxyHandlerConfig } from "../../types";

export type {
  PropertyInfo,
  ResponseSchemaInfo,
} from "@ahmedrowaihi/openapi-ts-faker/core";

// ============================================================================
// Context for file generation
// ============================================================================

export interface FileGenContext {
  tag: string;
  procedures: string[];
  implementer: { name: string; from: string };
  mode: HandlerMode;
  clientName: string;
  proxyConfig?: ProxyHandlerConfig;
  fakerFactoryNames?: Map<string, string>;
  fakerGenImport?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** JS reserved words that cannot be used as variable names. */
const JS_RESERVED = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
]);

/** Returns a safe variable/export name — appends `Handlers` when tag is reserved. */
export function safeVarName(tag: string): string {
  return JS_RESERVED.has(tag) ? `${tag}Handlers` : tag;
}

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

/**
 * Empty source file used as printer context when printing individual nodes.
 * `updateSourceFile` returns a new node — this one is never mutated.
 */
const emptySourceFile = ts.createSourceFile(
  "_.ts",
  "",
  ts.ScriptTarget.Latest,
  false,
  ts.ScriptKind.TS,
);

// ============================================================================
// AST node builders
// ============================================================================

export function makeImport(
  names: string[],
  from: string,
): ts.ImportDeclaration {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports(
        names.map((n) =>
          ts.factory.createImportSpecifier(
            false,
            undefined,
            ts.factory.createIdentifier(n),
          ),
        ),
      ),
    ),
    ts.factory.createStringLiteral(from),
    undefined,
  );
}

// ============================================================================
// Handler body builders — one per mode
// ============================================================================

/** Stub mode: `async () => { throw new ORPCError('NOT_IMPLEMENTED'); }` */
function makeStubBody(): ts.ConciseBody {
  const throwStmt = ts.factory.createThrowStatement(
    ts.factory.createNewExpression(
      ts.factory.createIdentifier("ORPCError"),
      undefined,
      [ts.factory.createStringLiteral("NOT_IMPLEMENTED")],
    ),
  );
  return ts.factory.createBlock([throwStmt], true);
}

/** Faker mode: `async () => mockProcedure()` */
function makeFakerBody(factoryName: string): ts.ConciseBody {
  return ts.factory.createCallExpression(
    ts.factory.createIdentifier(factoryName),
    undefined,
    [],
  );
}

/** Proxy mode: `async ({ input }) => client.tag.procedure(input)` */
function makeProxyBody(
  tag: string,
  procedure: string,
  clientName: string,
): ts.ConciseBody {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier(clientName),
        ts.factory.createIdentifier(tag),
      ),
      ts.factory.createIdentifier(procedure),
    ),
    undefined,
    [ts.factory.createIdentifier("input")],
  );
}

// ============================================================================
// Handler property builder (unified for all modes)
// ============================================================================

interface HandlerPropertyOpts {
  tag: string;
  procedure: string;
  implementerName: string;
  mode: HandlerMode;
  clientName: string;
  factoryName?: string;
}

export function makeHandlerProperty({
  tag,
  procedure,
  implementerName,
  mode,
  clientName,
  factoryName,
}: HandlerPropertyOpts): ts.PropertyAssignment {
  let body: ts.ConciseBody;
  let params: ts.ParameterDeclaration[];

  switch (mode) {
    case "faker":
      body = makeFakerBody(
        factoryName ??
          `mock${procedure.charAt(0).toUpperCase()}${procedure.slice(1)}`,
      );
      params = [];
      break;
    case "proxy":
      body = makeProxyBody(tag, procedure, clientName);
      params = [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          ts.factory.createObjectBindingPattern([
            ts.factory.createBindingElement(
              undefined,
              undefined,
              ts.factory.createIdentifier("input"),
            ),
          ]),
        ),
      ];
      break;
    default: // stub
      body = makeStubBody();
      params = [];
      break;
  }

  const asyncArrow = ts.factory.createArrowFunction(
    [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
    undefined,
    params,
    undefined,
    ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    body,
  );

  const handlerCall = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier(implementerName),
          ts.factory.createIdentifier(tag),
        ),
        ts.factory.createIdentifier(procedure),
      ),
      ts.factory.createIdentifier("handler"),
    ),
    undefined,
    [asyncArrow],
  );

  return ts.factory.createPropertyAssignment(
    ts.factory.createIdentifier(procedure),
    handlerCall,
  );
}

// ============================================================================
// Import builder
// ============================================================================

export function getImports(ctx: FileGenContext): ts.ImportDeclaration[] {
  const imports: ts.ImportDeclaration[] = [];

  switch (ctx.mode) {
    case "stub":
      imports.push(makeImport(["ORPCError"], "@orpc/server"));
      imports.push(makeImport([ctx.implementer.name], ctx.implementer.from));
      break;
    case "faker": {
      const factoryNames = ctx.procedures
        .map((p) => ctx.fakerFactoryNames?.get(p))
        .filter((n): n is string => !!n);
      if (factoryNames.length > 0 && ctx.fakerGenImport) {
        imports.push(makeImport(factoryNames, ctx.fakerGenImport));
      }
      imports.push(makeImport([ctx.implementer.name], ctx.implementer.from));
      break;
    }
    case "proxy": {
      const clientImport = ctx.proxyConfig?.clientImport;
      if (clientImport) {
        imports.push(makeImport([clientImport.name], clientImport.from));
      }
      imports.push(makeImport([ctx.implementer.name], ctx.implementer.from));
      break;
    }
  }

  return imports;
}

// ============================================================================
// File builders
// ============================================================================

/**
 * Generates a complete handler file.
 * The full source file is constructed as a TypeScript AST and printed with
 * `ts.createPrinter` — no template strings involved.
 */
export function buildFile(ctx: FileGenContext): string {
  const varName = safeVarName(ctx.tag);
  const statements: ts.Statement[] = [
    ...getImports(ctx),
    ts.factory.createVariableStatement(
      undefined,
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier(varName),
            undefined,
            undefined,
            ts.factory.createObjectLiteralExpression(
              ctx.procedures.map((p) =>
                makeHandlerProperty({
                  tag: ctx.tag,
                  procedure: p,
                  implementerName: ctx.implementer.name,
                  mode: ctx.mode,
                  clientName: ctx.clientName,
                  factoryName: ctx.fakerFactoryNames?.get(p),
                }),
              ),
              /* multiLine */ true,
            ),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
    ts.factory.createExportAssignment(
      undefined,
      /* isExportEquals */ false,
      ts.factory.createIdentifier(varName),
    ),
  ];

  const sf = ts.factory.updateSourceFile(emptySourceFile, statements);
  return printer.printFile(sf);
}

// ============================================================================
// File analysis & patching
// ============================================================================

export interface HandlerObjectInfo {
  /** Property names already declared in the handler object. */
  existingNames: Set<string>;
  /**
   * Character position of the closing `}` of the handler object literal.
   * New properties are inserted just before this position.
   */
  closingBracePos: number;
}

/**
 * Parses the source file and locates the top-level handler object
 * (`const <tag> = { ... }`), returning the existing property names
 * and the insertion position for new properties.
 */
export function analyzeHandlerFile(
  source: string,
  varName: string,
): HandlerObjectInfo | null {
  const sf = ts.createSourceFile(
    "handler.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );

  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    const decl = stmt.declarationList.declarations[0];
    if (!decl || !ts.isIdentifier(decl.name) || decl.name.text !== varName)
      continue;
    const init = decl.initializer;
    if (!init || !ts.isObjectLiteralExpression(init)) continue;

    const existingNames = new Set<string>();
    for (const prop of init.properties) {
      if (ts.isPropertyAssignment(prop) || ts.isMethodDeclaration(prop)) {
        const name = prop.name;
        if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
          existingNames.add(name.text);
        }
      }
    }

    return { existingNames, closingBracePos: init.getEnd() - 1 };
  }

  return null;
}

/**
 * Detects the indentation unit (tabs or N spaces) used in a source file.
 * Falls back to two spaces.
 */
function detectIndent(source: string): string {
  const m = source.match(/^([ \t]+)\S/m);
  return m ? m[1] : "  ";
}

/**
 * Prints a single handler property assignment, re-indented to match the
 * surrounding file's style.
 *
 * `ts.createPrinter` uses 4-space indentation internally.  This function
 * converts that to the file's detected indent unit, then prepends the outer
 * indent (one level) to every line.
 */
function printProperty(
  ctx: FileGenContext,
  procedure: string,
  indent: string,
): string {
  const node = makeHandlerProperty({
    tag: ctx.tag,
    procedure,
    implementerName: ctx.implementer.name,
    mode: ctx.mode,
    clientName: ctx.clientName,
    factoryName: ctx.fakerFactoryNames?.get(procedure),
  });
  const raw = printer.printNode(ts.EmitHint.Unspecified, node, emptySourceFile);

  const normalized = raw
    .split("\n")
    .map((line) => {
      if (!line) return line;
      // Count leading 4-space groups emitted by the printer.
      const leading = line.match(/^( {4})+/)?.[0] ?? "";
      const depth = leading.length / 4;
      return indent + indent.repeat(depth) + line.slice(leading.length);
    })
    .join("\n");

  return normalized + ",";
}

/**
 * Inserts missing procedure stubs into an existing handler file.
 *
 * Detection is AST-based (TypeScript compiler API) — property names are
 * extracted from the parsed object literal, not by string search.
 * The original file content is preserved for all existing code; only the
 * new stubs are spliced in at the exact character position of the closing `}`.
 */
export function patchFile(
  source: string,
  ctx: FileGenContext,
  missing: string[],
): string {
  const info = analyzeHandlerFile(source, safeVarName(ctx.tag));
  if (!info) return source; // can't locate the object — leave the file untouched

  const indent = detectIndent(source);
  const insertion =
    missing.map((p) => `\n${printProperty(ctx, p, indent)}`).join("\n") + "\n";

  return (
    source.slice(0, info.closingBracePos) +
    insertion +
    source.slice(info.closingBracePos)
  );
}
