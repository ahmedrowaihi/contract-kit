import path from "node:path";
import {
  createProject,
  type ExtractOptions,
  type ExtractResult,
  type Project,
} from "@ahmedrowaihi/fn-schema-core";
import { typescript } from "@ahmedrowaihi/fn-schema-typescript";
import chokidar from "chokidar";
import fg from "fast-glob";
import { createUnplugin, type UnpluginInstance } from "unplugin";

export interface FnSchemaPluginOptions
  extends Omit<ExtractOptions, "files" | "source" | "targets"> {
  /** Glob pattern(s) for source files. Required. */
  files: string | string[];
  /** Working directory for glob resolution + ts-morph project. Default: process.cwd(). */
  cwd?: string;
  /** Virtual module specifier consumers import. Default: `virtual:fn-schema/bundle`. */
  virtualModuleId?: string;
}

const DEFAULT_VIRTUAL_ID = "virtual:fn-schema/bundle";

interface BundleShape {
  $schema: string;
  signatures: Record<string, { input: unknown; output: unknown }>;
  definitions: Record<string, unknown>;
}

function buildBundle(result: ExtractResult): BundleShape {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    definitions: result.definitions,
    signatures: Object.fromEntries(
      result.signatures.map((s) => [
        s.id,
        { input: s.input, output: s.output },
      ]),
    ),
  };
}

export const fnSchema: UnpluginInstance<FnSchemaPluginOptions, false> =
  createUnplugin<FnSchemaPluginOptions>((options) => {
    const cwd = path.resolve(options.cwd ?? process.cwd());
    const virtualId = options.virtualModuleId ?? DEFAULT_VIRTUAL_ID;
    const resolvedId = `\0${virtualId}`;
    const patterns = Array.isArray(options.files)
      ? options.files
      : [options.files];

    let project: Project | null = null;
    let cachedSource: string | null = null;
    let watcher: ReturnType<typeof chokidar.watch> | null = null;

    const ensureProject = (): Project => {
      if (project) return project;
      project = createProject({
        cwd,
        tsConfigPath: options.tsConfigPath,
        extractors: [typescript()],
      });
      return project;
    };

    const generate = async (): Promise<string> => {
      const files = await fg(patterns, {
        cwd,
        absolute: true,
        onlyFiles: true,
        ignore: [
          "**/node_modules/**",
          "**/dist/**",
          "**/__fn_schema_virtual__/**",
        ],
      });
      const result = await ensureProject().extract({ ...options, files });
      const bundle = buildBundle(result);
      return `export default ${JSON.stringify(bundle)};`;
    };

    return {
      name: "@ahmedrowaihi/fn-schema-unplugin",
      enforce: "pre",
      resolveId(id) {
        if (id === virtualId) return resolvedId;
        return null;
      },
      async load(id) {
        if (id !== resolvedId) return null;
        cachedSource ??= await generate();
        return cachedSource;
      },
      async buildEnd() {
        if (!watcher) {
          project?.dispose();
          project = null;
        }
      },
      vite: {
        async configureServer(server) {
          watcher = chokidar.watch(patterns, {
            cwd,
            ignoreInitial: true,
            ignored: [
              "**/node_modules/**",
              "**/dist/**",
              "**/__fn_schema_virtual__/**",
            ],
          });
          const reload = async (relPath: string) => {
            const abs = path.resolve(cwd, relPath);
            project?.refresh([abs]);
            cachedSource = null;
            const mod = server.moduleGraph.getModuleById(resolvedId);
            if (mod) {
              server.moduleGraph.invalidateModule(mod);
              server.ws.send({ type: "full-reload" });
            }
          };
          watcher.on("change", reload);
          watcher.on("add", reload);
          watcher.on("unlink", reload);
          server.httpServer?.once("close", () => {
            void watcher?.close();
            watcher = null;
            project?.dispose();
            project = null;
          });
        },
      },
    };
  });

export default fnSchema;
