import type {
  Extractor,
  ExtractorInitOptions,
  ExtractorInstance,
  FunctionInfo,
  ResolvedFilter,
  ResolvedSchemaOptions,
  ResolvedSignatureOptions,
  SignaturePair,
} from "@ahmedrowaihi/fn-schema-core";
import { Project as TsMorphProject } from "ts-morph";
import { type DiscoveredFunction, discoverFunctions } from "./discover.js";
import { buildSchemas, SignatureSkipped, virtualDirFor } from "./schema.js";

const TS_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"] as const;

export interface TypescriptExtractorOptions {
  /** Path to tsconfig.json. Default: nearest tsconfig from cwd. */
  tsConfigPath?: string;
  /** Override compiler options (merged on top of tsconfig). */
  compilerOptions?: Record<string, unknown>;
}

export function typescript(
  options: TypescriptExtractorOptions = {},
): Extractor {
  return {
    extensions: TS_EXTENSIONS,
    language: "typescript",
    async init(initOpts: ExtractorInitOptions): Promise<ExtractorInstance> {
      const project = createTsMorphProject(options, initOpts);

      return {
        async discover(
          files: readonly string[],
          _filter: ResolvedFilter,
        ): Promise<FunctionInfo[]> {
          ensureFilesLoaded(project, files);
          return discoverFunctions(project, files, virtualDirFor);
        },
        async toSchemas(
          fn: FunctionInfo,
          opts: ResolvedSignatureOptions & ResolvedSchemaOptions,
        ): Promise<SignaturePair> {
          const discovered = fn as DiscoveredFunction;
          if (
            !discovered.sourceFilePath ||
            !discovered.resolvedParameters ||
            !discovered.returnAlias
          ) {
            throw new Error(
              "fn-schema-typescript: received a FunctionInfo not produced by this extractor",
            );
          }
          try {
            return buildSchemas(discovered, {
              project,
              signature: pickSignature(opts),
              schema: pickSchema(opts),
              typeMappers: opts.typeMappers,
            });
          } catch (err) {
            if (err instanceof SignatureSkipped) {
              const wrapped = new Error(err.message);
              wrapped.name = "SignatureSkipped";
              throw wrapped;
            }
            throw err;
          }
        },
        refresh(files: readonly string[]): void {
          for (const f of files) {
            const sf = project.getSourceFile(f);
            if (sf) sf.refreshFromFileSystemSync();
          }
        },
        dispose(): void {
          // ts-morph holds no external handles.
        },
      };
    },
  };
}

function createTsMorphProject(
  opts: TypescriptExtractorOptions,
  init: ExtractorInitOptions,
): TsMorphProject {
  const tsConfigFilePath = opts.tsConfigPath ?? init.tsConfigPath;
  return new TsMorphProject({
    tsConfigFilePath,
    skipAddingFilesFromTsConfig: tsConfigFilePath ? false : true,
    skipFileDependencyResolution: false,
    compilerOptions: opts.compilerOptions as never,
  });
}

function ensureFilesLoaded(
  project: TsMorphProject,
  files: readonly string[],
): void {
  for (const f of files) {
    if (!project.getSourceFile(f)) {
      project.addSourceFileAtPathIfExists(f);
    }
  }
}

function pickSignature(
  opts: ResolvedSignatureOptions & ResolvedSchemaOptions,
): ResolvedSignatureOptions {
  return {
    parameters: opts.parameters,
    unwrapPromise: opts.unwrapPromise,
    generics: opts.generics,
    overloads: opts.overloads,
    skipParameter: opts.skipParameter,
  };
}

function pickSchema(
  opts: ResolvedSignatureOptions & ResolvedSchemaOptions,
): ResolvedSchemaOptions {
  return {
    dialect: opts.dialect,
    refStrategy: opts.refStrategy,
    definitionsPath: opts.definitionsPath,
    topRef: opts.topRef,
    additionalProperties: opts.additionalProperties,
    encodeRefs: opts.encodeRefs,
    expose: opts.expose,
    typeMappers: opts.typeMappers,
  };
}
