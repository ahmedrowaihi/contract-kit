import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

import type { RouterNode } from "../router-organizer";
import { normalizeOperationName, toCamelCase } from "../utils";

// JS reserved words that cannot be used as variable names.
const JS_RESERVED = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "enum", "export", "extends", "false",
  "finally", "for", "function", "if", "import", "in", "instanceof", "let",
  "new", "null", "return", "static", "super", "switch", "this", "throw",
  "true", "try", "typeof", "var", "void", "while", "with", "yield",
  "implements", "interface", "package", "private", "protected", "public",
]);

/** Returns a safe variable/export name — appends `Handlers` when tag is reserved. */
function safeVarName(tag: string): string {
  return JS_RESERVED.has(tag) ? `${tag}Handlers` : tag;
}

export interface HandlersGeneratorInput {
  /** Absolute path to the handlers directory. */
  handlersDir: string;
  /** Relative import path from a handler file to server.gen.js. */
  serverGenImport: string;
  routerStructure: Map<string, RouterNode[]>;
}

// ─── AST analysis ────────────────────────────────────────────────────────────

interface HandlerObjectInfo {
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
function analyzeHandlerFile(source: string, varName: string): HandlerObjectInfo | null {
  const sf = ts.createSourceFile("handler.ts", source, ts.ScriptTarget.Latest, true);

  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    const decl = stmt.declarationList.declarations[0];
    if (!decl || !ts.isIdentifier(decl.name) || decl.name.text !== varName) continue;
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

// ─── AST node factories ───────────────────────────────────────────────────────

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

function makeImport(names: string[], from: string): ts.ImportDeclaration {
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

/**
 * Builds the AST node for a single handler property:
 *
 *   procedure: os.tag.procedure.handler(async () => {
 *     throw new ORPCError('NOT_IMPLEMENTED');
 *   })
 */
function makeHandlerProperty(tag: string, procedure: string): ts.PropertyAssignment {
  const throwStmt = ts.factory.createThrowStatement(
    ts.factory.createNewExpression(
      ts.factory.createIdentifier("ORPCError"),
      undefined,
      [ts.factory.createStringLiteral("NOT_IMPLEMENTED")],
    ),
  );

  const asyncArrow = ts.factory.createArrowFunction(
    [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
    undefined,
    [],
    undefined,
    ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    ts.factory.createBlock([throwStmt], /* multiLine */ true),
  );

  const handlerCall = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier("os"),
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

// ─── Code generation ─────────────────────────────────────────────────────────

/**
 * Generates a complete handler file.
 * The full source file is constructed as a TypeScript AST and printed with
 * `ts.createPrinter` — no template strings involved.
 */
function stubFile(tag: string, procedures: string[], serverGenImport: string): string {
  const varName = safeVarName(tag);
  const statements: ts.Statement[] = [
    makeImport(["ORPCError"], "@orpc/server"),
    makeImport(["os"], serverGenImport),
    ts.factory.createVariableStatement(
      undefined,
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier(varName),
            undefined,
            undefined,
            ts.factory.createObjectLiteralExpression(
              procedures.map((p) => makeHandlerProperty(tag, p)),
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
function printStubProperty(tag: string, procedure: string, indent: string): string {
  const node = makeHandlerProperty(tag, procedure);
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
function patchFile(source: string, tag: string, missing: string[]): string {
  const info = analyzeHandlerFile(source, safeVarName(tag));
  if (!info) return source; // can't locate the object — leave the file untouched

  const indent = detectIndent(source);
  const insertion =
    missing.map((p) => `\n${printStubProperty(tag, p, indent)}`).join("\n") + "\n";

  return (
    source.slice(0, info.closingBracePos) +
    insertion +
    source.slice(info.closingBracePos)
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateHandlers({
  handlersDir,
  serverGenImport,
  routerStructure,
}: HandlersGeneratorInput): void {
  if (!existsSync(handlersDir)) {
    mkdirSync(handlersDir, { recursive: true });
  }

  for (const [group, nodes] of routerStructure) {
    const tag = toCamelCase(group);
    const procedures = nodes.map((n) => normalizeOperationName(n.operationName));
    const filePath = join(handlersDir, `${tag}.ts`);

    if (!existsSync(filePath)) {
      writeFileSync(filePath, stubFile(tag, procedures, serverGenImport));
      continue;
    }

    const source = readFileSync(filePath, "utf-8");
    const info = analyzeHandlerFile(source, safeVarName(tag));
    if (!info) continue; // malformed file — skip

    const missing = procedures.filter((p) => !info.existingNames.has(p));
    if (missing.length > 0) {
      writeFileSync(filePath, patchFile(source, tag, missing));
    }
  }
}
