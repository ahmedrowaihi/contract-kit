import path from "node:path";
import type {
  JSONSchema,
  OverloadStrategy,
  ResolvedSchemaOptions,
  ResolvedSignatureOptions,
  SignaturePair,
} from "@ahmedrowaihi/fn-schema-core";
import {
  type CompletedConfig,
  createFormatter,
  createParser,
  DEFAULT_CONFIG,
  type Schema,
  SchemaGenerator,
} from "ts-json-schema-generator";
import type { Project as TsMorphProject } from "ts-morph";
import type { Program } from "typescript";
import { type AliasImport, type AliasNote, renderImports } from "./aliases.js";
import type {
  DiscoveredFunction,
  OverloadSignature,
  ResolvedParameter,
} from "./discover.js";
import {
  detectSentinel,
  renderSentinelDeclaration,
  WELL_KNOWN_SCHEMAS,
} from "./well-known.js";

export const VIRTUAL_DIR = "__fn_schema_virtual__";
const INPUT_PREFIX = "__In_";
const OUTPUT_NAME = "__Out__";

interface BuildContext {
  project: TsMorphProject;
  signature: ResolvedSignatureOptions;
  schema: ResolvedSchemaOptions;
  typeMappers?: Record<string, JSONSchema>;
}

export class SignatureSkipped extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignatureSkipped";
  }
}

export function virtualDirFor(sourceFile: string): string {
  return path.join(path.dirname(sourceFile), VIRTUAL_DIR);
}

export function buildSchemas(
  fn: DiscoveredFunction,
  ctx: BuildContext,
): SignaturePair {
  if (fn.generic && ctx.signature.generics === "skip") {
    throw new SignatureSkipped(
      `Generic function "${fn.name}" skipped (set signature.generics to "erase" to coerce type parameters to unknown)`,
    );
  }
  if (fn.generic && ctx.signature.generics === "error") {
    throw new Error(`Generic function "${fn.name}" not supported`);
  }

  const overloads = pickOverloads(fn.overloads, ctx.signature.overloads);
  const skip = ctx.signature.skipParameter;
  const filteredOverloads: OverloadSignature[] = overloads.map((o) => ({
    parameters: skip ? o.parameters.filter((p) => !skip(p)) : o.parameters,
    returnAlias: o.returnAlias,
  }));

  const allNotes: AliasNote[] = filteredOverloads.flatMap((o) => [
    ...o.parameters.flatMap((p) => p.alias.notes),
    ...o.returnAlias.notes,
  ]);
  const wellKnownNames = uniqueNames(allNotes, "well-known");
  const inferredDefaults: Record<string, JSONSchema> = {};
  for (const n of allNotes) {
    if (n.kind === "well-known" && n.defaultSchema) {
      inferredDefaults[n.name] = n.defaultSchema;
    }
  }
  const mappers: Record<string, JSONSchema> = {
    ...inferredDefaults,
    ...WELL_KNOWN_SCHEMAS,
    ...(ctx.typeMappers ?? {}),
  };

  const maxArity = filteredOverloads.reduce(
    (max, o) => Math.max(max, o.parameters.length),
    0,
  );

  const virtualPath = virtualFileFor(fn);
  const source = renderVirtualSource(
    filteredOverloads,
    maxArity,
    ctx.signature,
    wellKnownNames,
  );
  ctx.project.createSourceFile(virtualPath, source, { overwrite: true });

  const config = buildGeneratorConfig(virtualPath, ctx.schema);
  /** ts-morph bundles its own `typescript`; runtime shape matches but module identities differ. */
  const program = ctx.project.getProgram().compilerObject as unknown as Program;
  const parser = createParser(program, config);
  const formatter = createFormatter(config);
  const generator = new SchemaGenerator(program, parser, formatter, config);

  const definitions: Record<string, JSONSchema> = {};
  const inputSchemas: JSONSchema[] = [];
  for (let i = 0; i < maxArity; i++) {
    const raw = generator.createSchema(`${INPUT_PREFIX}${i}`);
    mergeDefinitions(definitions, raw.definitions);
    inputSchemas.push(stripWrapper(raw));
  }
  const rawOutput = generator.createSchema(OUTPUT_NAME);
  mergeDefinitions(definitions, rawOutput.definitions);
  const output = stripWrapper(rawOutput);

  for (let i = 0; i < inputSchemas.length; i++) {
    inputSchemas[i] = applyTypeMappers(inputSchemas[i]!, mappers) as JSONSchema;
  }
  const mappedOutput = applyTypeMappers(output, mappers) as JSONSchema;
  for (const k of Object.keys(definitions)) {
    definitions[k] = applyTypeMappers(definitions[k]!, mappers) as JSONSchema;
  }

  const primary = filteredOverloads[filteredOverloads.length - 1]!;

  const input: JSONSchema | JSONSchema[] = (() => {
    switch (ctx.signature.parameters) {
      case "first-only":
        return inputSchemas[0] ?? ({ type: "null" } as JSONSchema);
      case "object":
        return objectFromParams(primary.parameters, inputSchemas);
      case "array":
      default:
        return inputSchemas;
    }
  })();

  return {
    input,
    output: mappedOutput,
    definitions,
    coverage: {
      mapped: uniqueNames(allNotes, "well-known").map((name) => ({ name })),
      lossy: allNotes
        .filter(
          (n): n is Extract<AliasNote, { kind: "lossy" }> => n.kind === "lossy",
        )
        .map((n) => ({ name: n.name, reason: n.reason })),
      notRepresentable: uniqueNames(allNotes, "not-representable").map(
        (name) => ({ name }),
      ),
    },
  };
}

function uniqueNames(notes: AliasNote[], kind: AliasNote["kind"]): string[] {
  const seen = new Set<string>();
  for (const n of notes) if (n.kind === kind) seen.add(n.name);
  return [...seen];
}

function applyTypeMappers(
  schema: unknown,
  mappers: Record<string, JSONSchema>,
): unknown {
  if (Array.isArray(schema)) {
    return schema.map((s) => applyTypeMappers(s, mappers));
  }
  if (!schema || typeof schema !== "object") return schema;
  const sentinel = detectSentinel(schema);
  if (sentinel && mappers[sentinel]) {
    return { ...mappers[sentinel] };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    out[k] = applyTypeMappers(v, mappers);
  }
  return out;
}

function pickOverloads(
  overloads: OverloadSignature[],
  strategy: OverloadStrategy,
): OverloadSignature[] {
  if (overloads.length === 0) return overloads;
  switch (strategy) {
    case "first":
      return [overloads[0]!];
    case "last":
      return [overloads[overloads.length - 1]!];
    case "all":
    case "merge":
      return overloads;
  }
}

function virtualFileFor(fn: DiscoveredFunction): string {
  const dir = virtualDirFor(fn.sourceFilePath);
  const baseName = path.basename(
    fn.sourceFilePath,
    path.extname(fn.sourceFilePath),
  );
  const member =
    fn.kind === "method" && fn.className
      ? `${fn.className}_${fn.name}`
      : fn.name;
  return path.join(dir, `${baseName}_${member}.virtual.ts`);
}

function renderVirtualSource(
  overloads: OverloadSignature[],
  maxArity: number,
  signature: ResolvedSignatureOptions,
  wellKnownNames: string[],
): string {
  const allImports: AliasImport[] = overloads.flatMap((o) => [
    ...o.parameters.flatMap((p) => p.alias.imports),
    ...o.returnAlias.imports,
  ]);
  const importBlock = renderImports(allImports);

  const lines: string[] = [];
  if (importBlock) lines.push(importBlock);
  for (const name of wellKnownNames) {
    lines.push(renderSentinelDeclaration(name));
  }

  for (let i = 0; i < maxArity; i++) {
    const variants = overloads.map((o) =>
      paramExpr(o.parameters[i], signature),
    );
    lines.push(`export type ${INPUT_PREFIX}${i} = ${union(variants)};`);
  }

  const outVariants = overloads.map((o) =>
    signature.unwrapPromise
      ? `Awaited<${o.returnAlias.text}>`
      : o.returnAlias.text,
  );
  lines.push(`export type ${OUTPUT_NAME} = ${union(outVariants)};`);
  return `${lines.join("\n")}\n`;
}

function paramExpr(
  p: ResolvedParameter | undefined,
  _signature: ResolvedSignatureOptions,
): string {
  if (!p) return "undefined";
  const base = p.alias.text;
  if (p.optional) return `(${base}) | undefined`;
  return `(${base})`;
}

function union(parts: string[]): string {
  const unique = Array.from(new Set(parts));
  if (unique.length === 1) return unique[0]!;
  return unique.join(" | ");
}

function buildGeneratorConfig(
  virtualPath: string,
  schema: ResolvedSchemaOptions,
): CompletedConfig {
  return {
    ...DEFAULT_CONFIG,
    path: virtualPath,
    type: "*",
    expose: schema.expose,
    topRef: schema.topRef,
    additionalProperties: schema.additionalProperties,
    encodeRefs: schema.encodeRefs,
    schemaId: "",
    jsDoc: "extended",
    sortProps: true,
    strictTuples: false,
    skipTypeCheck: true,
  } satisfies CompletedConfig;
}

function stripWrapper(schema: Schema): JSONSchema {
  const { definitions: _d, $schema: _s, ...rest } = schema;
  return rest as JSONSchema;
}

function mergeDefinitions(
  target: Record<string, JSONSchema>,
  source: Schema["definitions"],
): void {
  if (!source) return;
  for (const [k, v] of Object.entries(source)) {
    // JSON Schema allows `true`/`false` as a definition shorthand.
    if (typeof v === "boolean") {
      target[k] = v ? {} : ({ not: {} } as JSONSchema);
    } else {
      target[k] = v as JSONSchema;
    }
  }
}

function objectFromParams(
  params: ResolvedParameter[],
  schemas: JSONSchema[],
): JSONSchema {
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];
  for (let idx = 0; idx < params.length; idx++) {
    const entry = params[idx];
    if (!entry) continue;
    const schema = schemas[idx];
    if (!schema) continue;
    properties[entry.name] = schema;
    if (!entry.optional) required.push(entry.name);
  }
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}
