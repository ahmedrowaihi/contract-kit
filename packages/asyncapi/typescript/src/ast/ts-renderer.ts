import type { RenderContext, Renderer } from "@hey-api/codegen-core";
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

/** Renders files whose nodes are `TsStatementNode`s via TypeScript's printer. */
export class TsStatementRenderer implements Renderer {
  supports(ctx: RenderContext): boolean {
    if (ctx.file.language !== "typescript") return false;
    const nodes = Array.from(ctx.file.nodes);
    return nodes.length > 0 && nodes.every((n) => n instanceof TsStatementNode);
  }

  render(ctx: RenderContext): string {
    const statements: ts.Statement[] = [];
    for (const node of ctx.file.nodes) {
      if (node instanceof TsStatementNode) statements.push(node.toAst());
    }
    return printer.printList(
      ts.ListFormat.MultiLine,
      ts.factory.createNodeArray(statements),
      blank,
    );
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
