import type { AsyncAPIDocumentInterface } from "@asyncapi/parser";
import type { Project } from "@hey-api/codegen-core";
import type ts from "typescript";
import { RawTextNode } from "../ast/raw-text-node.js";
import { TsStatementNode } from "../ast/ts-node.js";
import {
  type ForEachEvent,
  type ForEachKind,
  type GeneratedFile,
  iterateDocument,
  type PluginInstance,
} from "../plugin.js";

interface BuildOptions {
  document: AsyncAPIDocumentInterface;
  project: Project;
  files: GeneratedFile[];
  apiRegistry: Map<string, unknown>;
  headers: Map<string, string>;
}

/**
 * Build a `PluginInstance` for one plugin run. `emit` registers a file
 * with raw text; `emitTs` registers a file with `ts.Statement`s the
 * `TsStatementRenderer` prints at `project.render()` time.
 */
export function createPluginInstance(
  pluginName: string,
  pluginConfig: unknown,
  pluginApi: unknown,
  options: BuildOptions,
): PluginInstance {
  const { document, project, files, apiRegistry, headers } = options;

  return {
    name: pluginName,
    config: pluginConfig,
    api: pluginApi,
    document,
    files,
    emit(file) {
      files.push(file);
      const projectFile = project.files.register({
        logicalFilePath: stripTsExtension(file.path),
        language: "typescript",
      });
      projectFile.addNode(new RawTextNode(file.content, { name: "content" }));
    },
    emitTs(path, statements, opts = {}) {
      // `plugin.files` exposes paths (index-barrel reads them); content
      // is rendered later by TsStatementRenderer.
      files.push({ path, content: "" });
      const projectFile = project.files.register({
        logicalFilePath: stripTsExtension(path),
        language: "typescript",
      });
      for (const group of opts.imports ?? []) {
        const sourceFile = project.files.get({
          logicalFilePath: group.from,
          language: "typescript",
        });
        if (!sourceFile) {
          throw new Error(
            `${pluginName}: emitTs(${path}) imports from "${group.from}", but no file with that logical path is registered yet. Add a dependsOn on the plugin that emits it.`,
          );
        }
        projectFile.addImport({
          from: sourceFile,
          kind: "named",
          isTypeOnly: group.isType ?? false,
          imports: group.names.map((n) => ({
            sourceName: n.name,
            localName: n.name,
            isTypeOnly: n.isType ?? false,
          })),
        });
      }
      if (opts.header) {
        headers.set(stripTsExtension(path), opts.header);
      }
      for (const [i, stmt] of statements.entries()) {
        projectFile.addNode(
          new TsStatementNode(stmt as ts.Statement, {
            name: `${pluginName}-${i}`,
          }),
        );
      }
    },
    getApi<T>(name: string): T | undefined {
      return apiRegistry.get(name) as T | undefined;
    },
    forEach(...kinds: ForEachKind[]): IterableIterator<ForEachEvent> {
      return iterateDocument(document, kinds);
    },
  };
}

function stripTsExtension(filePath: string): string {
  return filePath.replace(/\.tsx?$/, "");
}
