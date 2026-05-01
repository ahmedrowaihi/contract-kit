import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import { assertSafeOutputDir } from "@ahmedrowaihi/codegen-core";
import type { AsyncAPIDocumentInterface } from "@asyncapi/parser";
import {
  defaultExtensions,
  defaultModuleEntryNames,
  defaultNameConflictResolvers,
  Project,
  simpleNameConflictResolver,
} from "@hey-api/codegen-core";

import { RawTextRenderer, TsStatementRenderer } from "./ast/ts-renderer.js";
import { type AnyRegisteredPlugin, type GeneratedFile } from "./plugin.js";
import { loadDocument } from "./runtime/load-document.js";
import { orderPlugins } from "./runtime/order-plugins.js";
import { createPluginInstance } from "./runtime/plugin-instance.js";

export interface GenerateOptions {
  input: string | AsyncAPIDocumentInterface;
  output: string;
  plugins: ReadonlyArray<AnyRegisteredPlugin>;
}

export interface GenerateResult {
  output: string;
  files: ReadonlyArray<GeneratedFile>;
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const document = await loadDocument(opts.input);
  const outputDir = resolve(opts.output);
  assertSafeOutputDir(outputDir);

  const project = new Project({
    root: outputDir,
    defaultFileName: "index",
    defaultNameConflictResolver: simpleNameConflictResolver,
    extensions: defaultExtensions,
    moduleEntryNames: defaultModuleEntryNames,
    nameConflictResolvers: defaultNameConflictResolvers,
    renderers: [new TsStatementRenderer(), new RawTextRenderer()],
  });

  const apiRegistry = new Map<string, unknown>();
  const filesEmitted: GeneratedFile[] = [];

  for (const reg of orderPlugins(opts.plugins)) {
    const def = reg.__definition;
    if (def.api !== undefined) apiRegistry.set(def.name, def.api);

    const config = def.resolveConfig
      ? def.resolveConfig(reg.__userConfig, { document })
      : { ...def.defaultConfig, ...(reg.__userConfig ?? {}) };

    const instance = createPluginInstance(def.name, config, def.api, {
      document,
      project,
      files: filesEmitted,
      apiRegistry,
    });

    if (def.hooks?.before) await def.hooks.before(instance);
    await def.handler(instance);
    if (def.hooks?.after) await def.hooks.after(instance);
  }

  project.plan();
  return writeRenderedFiles(project.render(), outputDir);
}

async function writeRenderedFiles(
  rendered: ReadonlyArray<{ path: string; content: string }>,
  outputDir: string,
): Promise<GenerateResult> {
  await mkdir(outputDir, { recursive: true });
  const written: GeneratedFile[] = [];
  for (const out of rendered) {
    if (!out.path) continue;
    const abs = isAbsolute(out.path) ? out.path : join(outputDir, out.path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, out.content, "utf8");
    written.push({ path: relative(outputDir, abs), content: out.content });
  }
  return { output: outputDir, files: written };
}
