import { resolveSchemaOptions, resolveSignatureOptions } from "./defaults.js";
import { DiagnosticSink } from "./diagnostics.js";
import { applyFilter, resolveFilter } from "./filter.js";
import { resolveNaming } from "./naming.js";
import type {
  Diagnostic,
  DiscoverResult,
  ExtractHooks,
  ExtractOptions,
  Extractor,
  ExtractorInstance,
  ExtractResult,
  ExtractStats,
  FunctionInfo,
  JSONSchema,
  Project,
  ProjectOptions,
  ResolvedFilter,
  SchemaContext,
  SignatureEntry,
  SignaturePair,
} from "./types.js";

interface ExtractorEntry {
  extractor: Extractor;
  instance: ExtractorInstance;
}

export function createProject(opts: ProjectOptions): Project {
  if (opts.extractors.length === 0) {
    throw new Error(
      "createProject: at least one extractor is required (e.g. @ahmedrowaihi/fn-schema-typescript)",
    );
  }
  const cwd = opts.cwd ?? process.cwd();

  let entries: ExtractorEntry[] | null = null;
  const ensureInit = async (): Promise<ExtractorEntry[]> => {
    if (entries) return entries;
    entries = await Promise.all(
      opts.extractors.map(async (extractor) => ({
        extractor,
        instance: await extractor.init({
          cwd,
          tsConfigPath: opts.tsConfigPath,
        }),
      })),
    );
    return entries;
  };

  return {
    async extract(callOpts) {
      const merged = mergeOptions(opts, callOpts);
      const init = await ensureInit();
      return runExtract(init, merged, cwd);
    },
    async discover(callOpts) {
      const merged = mergeOptions(opts, callOpts);
      const init = await ensureInit();
      return runDiscover(init, merged);
    },
    refresh(paths) {
      if (!entries) return;
      const list = paths ?? [];
      for (const e of entries) e.instance.refresh(list);
    },
    dispose() {
      if (!entries) return;
      for (const e of entries) e.instance.dispose();
      entries = null;
    },
  };
}

function mergeOptions(
  project: ProjectOptions,
  call: Partial<ExtractOptions> | undefined,
): ExtractOptions {
  return {
    cwd: project.cwd,
    tsConfigPath: project.tsConfigPath,
    ...(call ?? {}),
  };
}

async function runExtract(
  entries: ExtractorEntry[],
  options: ExtractOptions,
  cwd: string,
): Promise<ExtractResult> {
  const start = Date.now();
  const sink = new DiagnosticSink(options.onDiagnostic, options.failFast);
  const filter = resolveFilter(
    options.include,
    options.exclude,
    options.filter,
  );
  const sigOpts = resolveSignatureOptions(options.signature);
  const schemaOpts = resolveSchemaOptions(options.schema);

  const { discovered: allDiscovered, filesScanned } = await runDiscoverPass(
    entries,
    options,
    sink,
    filter,
  );

  const signatures: SignatureEntry[] = [];
  const definitions: Record<string, JSONSchema> = {};
  const seenIds = new Set<string>();

  for (const { entry, fn } of allDiscovered) {
    try {
      const pair = await entry.instance.toSchemas(fn, {
        ...sigOpts,
        ...schemaOpts,
      });
      const finalised = applySchemaHooks(fn, pair, options.hooks);
      const id = uniqueId(
        resolveNaming(options.naming, fn, cwd),
        seenIds,
        sink,
        fn,
      );
      signatures.push({
        id,
        name: fn.name,
        file: fn.file,
        location: fn.location,
        kind: fn.kind,
        language: fn.language,
        jsDoc: fn.jsDoc,
        input: finalised.input,
        output: finalised.output,
        async: fn.async,
        generic: fn.generic,
        coverage: finalised.coverage,
      });
      if (finalised.definitions) {
        for (const [k, v] of Object.entries(finalised.definitions)) {
          const prior = definitions[k];
          if (prior && !shallowSchemaEqual(prior, v)) {
            sink.push({
              severity: "warning",
              code: "DUPLICATE_ID",
              message: `Definition "${k}" emitted with conflicting shapes from "${fn.name}"; later schema overwrites the earlier one (cross-file types with the same name should be renamed or aliased)`,
              file: fn.file,
              function: fn.name,
            });
          }
          definitions[k] = v;
        }
      }
      if (finalised.coverage) {
        emitCoverageDiagnostics(finalised.coverage, fn, sink);
      }
    } catch (err) {
      const skipped = err instanceof Error && err.name === "SignatureSkipped";
      sink.push({
        severity: skipped ? "warning" : "error",
        code: skipped ? "GENERIC_SKIPPED" : "EXTRACTOR_FAILURE",
        message: skipped
          ? errMessage(err)
          : `Failed to build schema for "${fn.name}": ${errMessage(err)}`,
        file: fn.file,
        location: fn.location,
        function: fn.name,
      });
    }
  }

  if (signatures.length === 0) {
    sink.push({
      severity: "info",
      code: "EMPTY_RESULT",
      message:
        "No signatures extracted. Check `files` glob, `include` filter, or `tsConfigPath`.",
    });
  }

  return {
    signatures,
    definitions,
    diagnostics: sink.all(),
    stats: {
      filesScanned,
      functionsFound: signatures.length,
      durationMs: Date.now() - start,
    },
  };
}

async function runDiscover(
  entries: ExtractorEntry[],
  options: ExtractOptions,
): Promise<DiscoverResult> {
  const start = Date.now();
  const sink = new DiagnosticSink(options.onDiagnostic, options.failFast);
  const filter = resolveFilter(
    options.include,
    options.exclude,
    options.filter,
  );
  const { discovered, filesScanned } = await runDiscoverPass(
    entries,
    options,
    sink,
    filter,
  );
  return {
    signatures: discovered.map((d) => d.fn),
    diagnostics: sink.all(),
    stats: {
      filesScanned,
      functionsFound: discovered.length,
      durationMs: Date.now() - start,
    },
  };
}

async function runDiscoverPass(
  entries: ExtractorEntry[],
  options: ExtractOptions,
  sink: DiagnosticSink,
  filter: ResolvedFilter,
): Promise<{
  discovered: { entry: ExtractorEntry; fn: FunctionInfo }[];
  filesScanned: number;
}> {
  const filesByExtractor = groupFiles(entries, options, sink);
  let filesScanned = 0;
  const discovered: { entry: ExtractorEntry; fn: FunctionInfo }[] = [];
  for (const [language, { files, entry }] of filesByExtractor) {
    if (files.length === 0) continue;
    filesScanned += files.length;
    try {
      const found = await entry.instance.discover(files, filter);
      for (const fn of found) {
        if (!applyFilter(fn, filter)) continue;
        const transformed = applyOnFunctionHook(fn, options.hooks);
        if (!transformed) continue;
        discovered.push({ entry, fn: transformed });
      }
    } catch (err) {
      sink.push({
        severity: "error",
        code: "EXTRACTOR_FAILURE",
        message: `Extractor "${language}" failed during discover: ${errMessage(err)}`,
      });
    }
  }
  return { discovered, filesScanned };
}

interface FileGroup {
  files: string[];
  entry: ExtractorEntry;
}

function groupFiles(
  entries: ExtractorEntry[],
  options: ExtractOptions,
  sink: DiagnosticSink,
): Map<string, FileGroup> {
  const result = new Map<string, FileGroup>();
  const collected = collectFilePaths(options, sink);

  for (const entry of entries) {
    result.set(entry.extractor.language, { files: [], entry });
  }

  for (const file of collected) {
    const ext = extOf(file);
    const match = entries.find((e) => e.extractor.extensions.includes(ext));
    if (!match) {
      sink.push({
        severity: "warning",
        code: "NO_EXTRACTOR",
        message: `No extractor registered for "${ext}" (file: ${file})`,
        file,
      });
      continue;
    }
    result.get(match.extractor.language)!.files.push(file);
  }
  return result;
}

function collectFilePaths(
  options: ExtractOptions,
  sink: DiagnosticSink,
): string[] {
  const acc: string[] = [];
  if (options.files) {
    const arr = Array.isArray(options.files) ? options.files : [options.files];
    for (const f of arr) {
      if (looksLikeGlob(f)) {
        sink.push({
          severity: "warning",
          code: "FILE_READ_ERROR",
          message: `Glob "${f}" passed to core; expand globs in the caller (CLI or app).`,
        });
        continue;
      }
      acc.push(f);
    }
  }
  if (options.source?.path) acc.push(options.source.path);
  return Array.from(new Set(acc));
}

function looksLikeGlob(p: string): boolean {
  return /[*?[\]{}]/.test(p);
}

function extOf(file: string): string {
  const i = file.lastIndexOf(".");
  return i === -1 ? "" : file.slice(i);
}

function applyOnFunctionHook(
  fn: FunctionInfo,
  hooks?: ExtractHooks,
): FunctionInfo | null {
  if (!hooks?.onFunction) return fn;
  const r = hooks.onFunction(fn);
  if (r === null) return null;
  return r ?? fn;
}

function applySchemaHooks(
  fn: FunctionInfo,
  pair: SignaturePair,
  hooks?: ExtractHooks,
): SignaturePair {
  if (!hooks?.onSchema) return pair;
  const onSchema = hooks.onSchema;
  const ctxBase: Omit<SchemaContext, "position"> = { function: fn };

  const transformInput = (
    s: JSONSchema | JSONSchema[],
  ): JSONSchema | JSONSchema[] => {
    if (Array.isArray(s)) {
      return s.map((schema, i) =>
        onSchema(schema, {
          ...ctxBase,
          position: "parameter",
          parameterIndex: i,
        }),
      );
    }
    return onSchema(s, { ...ctxBase, position: "input" });
  };

  return {
    input: transformInput(pair.input),
    output: onSchema(pair.output, { ...ctxBase, position: "output" }),
    definitions: pair.definitions,
  };
}

function uniqueId(
  desired: string,
  seen: Set<string>,
  sink: DiagnosticSink,
  fn: FunctionInfo,
): string {
  if (!seen.has(desired)) {
    seen.add(desired);
    return desired;
  }
  let n = 2;
  while (seen.has(`${desired}__${n}`)) n++;
  const suffixed = `${desired}__${n}`;
  seen.add(suffixed);
  sink.push({
    severity: "warning",
    code: "DUPLICATE_ID",
    message: `Naming collision on "${desired}"; renamed to "${suffixed}"`,
    file: fn.file,
    function: fn.name,
  });
  return suffixed;
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Equality via stable-key JSON — distinguishes a real shape conflict from two
 *  functions referencing the same shared type. */
function shallowSchemaEqual(a: JSONSchema, b: JSONSchema): boolean {
  return stableStringify(a) === stableStringify(b);
}

function emitCoverageDiagnostics(
  coverage: NonNullable<SignaturePair["coverage"]>,
  fn: FunctionInfo,
  sink: DiagnosticSink,
): void {
  for (const m of coverage.mapped) {
    sink.push({
      severity: "info",
      code: "TYPE_MAPPED",
      message: `"${m.name}" mapped to canonical JSON Schema`,
      file: fn.file,
      location: fn.location,
      function: fn.name,
    });
  }
  for (const l of coverage.lossy) {
    sink.push({
      severity: "warning",
      code: "LOSSY_MAPPING",
      message: `"${l.name}" mapped lossily — ${l.reason}`,
      file: fn.file,
      location: fn.location,
      function: fn.name,
    });
  }
  for (const n of coverage.notRepresentable) {
    sink.push({
      severity: "error",
      code: "NOT_REPRESENTABLE",
      message: `"${n.name}" has no JSON Schema representation`,
      file: fn.file,
      location: fn.location,
      function: fn.name,
    });
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value as object).sort();
  const body = keys
    .map(
      (k) =>
        `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`,
    )
    .join(",");
  return `{${body}}`;
}
