import { posix } from "node:path";

import type {
  File as CodegenFile,
  ImportModule,
  RenderContext,
  Renderer,
} from "@hey-api/codegen-core";
import ts from "typescript";

import { RawTextNode } from "./raw-text-node.js";
import { TsStatementNode } from "./ts-node.js";

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const blank = ts.createSourceFile(
  "_.ts",
  "",
  ts.ScriptTarget.ESNext,
  false,
  ts.ScriptKind.TS,
);
const f = ts.factory;

/**
 * Renders TS files: optional header (passed in by the orchestrator,
 * keyed on logical path) prints first, then imports declared via
 * codegen-core's File graph (`file.imports`), then body statements
 * (`TsStatementNode`s). Plugins emit cross-file imports through
 * `plugin.emitTs({ imports })`, never inline
 * `ts.factory.createImportDeclaration`.
 */
export class TsStatementRenderer implements Renderer {
  constructor(private readonly headers: Map<string, string>) {}

  supports(ctx: RenderContext): boolean {
    if (ctx.file.language !== "typescript") return false;
    const nodes = Array.from(ctx.file.nodes);
    return nodes.length > 0 && nodes.every((n) => n instanceof TsStatementNode);
  }

  render(ctx: RenderContext): string {
    const importStatements: ts.Statement[] = [];
    for (const group of ctx.file.imports) {
      const decl = importDeclarationFor(group, ctx.file);
      if (decl) importStatements.push(decl);
    }
    const bodyStatements: ts.Statement[] = [];
    for (const node of ctx.file.nodes) {
      if (node instanceof TsStatementNode) bodyStatements.push(node.toAst());
    }
    const printed = printer.printList(
      ts.ListFormat.MultiLine,
      f.createNodeArray([...importStatements, ...bodyStatements]),
      blank,
    );
    const header = this.headers.get(ctx.file.logicalFilePath);
    if (!header) return printed;
    const headerText = header.endsWith("\n") ? header : `${header}\n`;
    return headerText + printed;
  }
}

/** Renders files whose nodes are `RawTextNode`s by concatenating their text. */
export class RawTextRenderer implements Renderer {
  supports(ctx: RenderContext): boolean {
    const nodes = Array.from(ctx.file.nodes);
    return nodes.length > 0 && nodes.every((n) => n instanceof RawTextNode);
  }

  render(ctx: RenderContext): string {
    const parts: string[] = [];
    for (const node of ctx.file.nodes) {
      if (node instanceof RawTextNode) parts.push(node.toAst());
    }
    return parts.join("");
  }
}

function importDeclarationFor(
  group: ImportModule,
  importer: CodegenFile,
): ts.ImportDeclaration | undefined {
  if (group.kind !== "named") return undefined;
  const modulePath = relativeModulePath(
    importer.logicalFilePath,
    group.from.logicalFilePath,
  );
  return f.createImportDeclaration(
    undefined,
    f.createImportClause(
      group.isTypeOnly ? ts.SyntaxKind.TypeKeyword : undefined,
      undefined,
      f.createNamedImports(
        group.imports.map((m) =>
          f.createImportSpecifier(
            m.isTypeOnly,
            undefined,
            f.createIdentifier(m.localName ?? m.sourceName),
          ),
        ),
      ),
    ),
    f.createStringLiteral(modulePath),
  );
}

/**
 * Compute a TS-style relative module specifier between two logical (no-extension)
 * file paths. Always emits POSIX separators and a leading `./` for sibling files
 * so the output works the same on Windows hosts and resolves correctly under
 * `moduleResolution: bundler` / `nodenext`.
 */
function relativeModulePath(fromLogical: string, toLogical: string): string {
  const fromDir = posix.dirname(fromLogical);
  const rel = posix.relative(fromDir, toLogical);
  return rel.startsWith(".") ? rel : `./${rel}`;
}
