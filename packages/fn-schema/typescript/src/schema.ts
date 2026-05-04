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
import { type AliasImport, renderImports } from "./aliases.js";
import type {
  DiscoveredFunction,
  OverloadSignature,
  ResolvedParameter,
} from "./discover.js";

export const VIRTUAL_DIR = "__fn_schema_virtual__";
const INPUT_PREFIX = "__In_";
const OUTPUT_NAME = "__Out__";

interface BuildContext {
  project: TsMorphProject;
  signature: ResolvedSignatureOptions;
  schema: ResolvedSchemaOptions;
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
  // Apply skipParameter per-overload — preserves correctness when arities differ.
  const filteredOverloads: OverloadSignature[] = overloads.map((o) => ({
    parameters: skip ? o.parameters.filter((p) => !skip(p)) : o.parameters,
    returnAlias: o.returnAlias,
  }));

  const maxArity = filteredOverloads.reduce(
    (max, o) => Math.max(max, o.parameters.length),
    0,
  );

  const virtualPath = virtualFileFor(fn);
  const source = renderVirtualSource(
    filteredOverloads,
    maxArity,
    ctx.signature,
  );
  ctx.project.createSourceFile(virtualPath, source, { overwrite: true });

  const config = buildGeneratorConfig(virtualPath, ctx.schema);
  // ts-morph bundles its own `typescript` — runtime objects are correct shape
  // but module identities differ. Cast.
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

  // The "primary" signature for arity / param-name / optional metadata when
  // the schema strategy needs it (object form). Last signature is the impl.
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

  return { input, output, definitions };
}

/* ──────────────────────────── overload pick ────────────────────────── */

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

/* ─────────────────────────── virtual source ────────────────────────── */

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
): string {
  const allImports: AliasImport[] = overloads.flatMap((o) => [
    ...o.parameters.flatMap((p) => p.alias.imports),
    ...o.returnAlias.imports,
  ]);
  const importBlock = renderImports(allImports);

  const lines: string[] = [];
  if (importBlock) lines.push(importBlock);

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
  signature: ResolvedSignatureOptions,
): string {
  if (!p) return "undefined";
  const base = p.alias.text;
  // Optional params should always allow undefined so a union with another
  // overload that simply lacks the slot stays compatible.
  if (p.optional && !signature.unwrapPromise) return `(${base}) | undefined`;
  if (p.optional) return `(${base}) | undefined`;
  return `(${base})`;
}

function union(parts: string[]): string {
  const unique = Array.from(new Set(parts));
  if (unique.length === 1) return unique[0]!;
  return unique.join(" | ");
}

/* ──────────────────────────── tjsg config ──────────────────────────── */

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
    // JSON Schema definitions can be `true` / `false` — coerce to object form.
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
