import type { JSONSchema7 } from "json-schema";

export type JSONSchema = JSONSchema7;

/* ─────────────────────────── Function IR ─────────────────────────── */

export type FunctionKind =
  | "function"
  | "arrow"
  | "method"
  | "constructor"
  | "expression";

export interface SourceLocation {
  line: number;
  column: number;
}

export interface ParameterInfo {
  name: string;
  index: number;
  optional: boolean;
  rest: boolean;
  /** Raw type text as written in source (best-effort, language-specific). */
  typeText?: string;
}

export interface JSDocInfo {
  description?: string;
  tags: Record<string, string | true>;
}

/**
 * Discovered function — language-agnostic IR. Produced by an `Extractor`,
 * consumed by both filters and schema generation.
 */
export interface FunctionInfo {
  /** Stable identifier within (file, language) scope; usually the source name. */
  name: string;
  file: string;
  location: SourceLocation;
  kind: FunctionKind;
  language: string;
  exported: boolean;
  async: boolean;
  generic: boolean;
  parameters: ParameterInfo[];
  jsDoc?: JSDocInfo;
  /** Class name when `kind === "method"`. */
  className?: string;
  /** Decorator names when `kind === "method"`. */
  decorators?: string[];
}

/* ──────────────────────── Extractor contract ─────────────────────── */

/** Per-extractor init payload. Extractors decide which fields they need. */
export interface ExtractorInitOptions {
  tsConfigPath?: string;
  cwd?: string;
}

export interface SignaturePair {
  input: JSONSchema | JSONSchema[];
  output: JSONSchema;
  definitions?: Record<string, JSONSchema>;
  coverage?: CoverageReport;
}

export interface CoverageReport {
  mapped: { name: string }[];
  lossy: { name: string; reason: string }[];
  notRepresentable: { name: string }[];
}

export interface Extractor {
  /** File extensions claimed by this extractor (e.g. [".ts", ".tsx"]). */
  readonly extensions: readonly string[];
  readonly language: string;
  init(opts: ExtractorInitOptions): Promise<ExtractorInstance>;
}

export interface ExtractorInstance {
  discover(
    files: readonly string[],
    filter: ResolvedFilter,
  ): Promise<FunctionInfo[]>;
  toSchemas(
    fn: FunctionInfo,
    opts: ResolvedSignatureOptions & ResolvedSchemaOptions,
  ): Promise<SignaturePair>;
  refresh(files: readonly string[]): void;
  dispose(): void;
}

/* ───────────────────────── Filter / naming ───────────────────────── */

export type NamePattern = string | RegExp;

export interface IncludeFilter {
  exported?: boolean;
  name?: NamePattern | NamePattern[];
  jsDocTag?: string | string[];
  kind?: FunctionKind[];
  decorator?: NamePattern;
}

export type ExcludeFilter = IncludeFilter;

export interface ResolvedFilter {
  exported: boolean;
  name: RegExp[] | null;
  jsDocTag: string[] | null;
  kind: FunctionKind[] | null;
  decorator: RegExp | null;
  exclude: {
    name: RegExp[] | null;
    jsDocTag: string[] | null;
    kind: FunctionKind[] | null;
    decorator: RegExp | null;
  };
  custom: ((fn: FunctionInfo) => boolean) | null;
}

export type NamingStrategy =
  | "function-name"
  | "file-function"
  | "jsdoc-tag"
  | ((fn: FunctionInfo) => string);

/* ─────────────────────── Signature / schema options ─────────────── */

export type ParametersStrategy = "array" | "first-only" | "object";

export type GenericsStrategy = "skip" | "erase" | "error";

export type OverloadStrategy = "all" | "first" | "last" | "merge";

export interface SignatureOptions {
  parameters?: ParametersStrategy;
  unwrapPromise?: boolean;
  generics?: GenericsStrategy;
  overloads?: OverloadStrategy;
  skipParameter?: (p: ParameterInfo) => boolean;
}

export interface ResolvedSignatureOptions {
  parameters: ParametersStrategy;
  unwrapPromise: boolean;
  generics: GenericsStrategy;
  overloads: OverloadStrategy;
  skipParameter: ((p: ParameterInfo) => boolean) | null;
}

export type SchemaDialect = "draft-07" | "draft-2020-12" | "openapi-3.1";

export type RefStrategy = "inline" | "definitions" | "external";

export interface SchemaOptions {
  dialect?: SchemaDialect;
  refStrategy?: RefStrategy;
  definitionsPath?: string;
  topRef?: boolean;
  additionalProperties?: boolean;
  encodeRefs?: boolean;
  expose?: "all" | "export" | "none";
  /**
   * Map TS type names to canonical JSON Schema. Merged on top of built-ins
   * (Date, URL, RegExp, File, Blob, Buffer, Uint8Array, ArrayBuffer, bigint).
   * User entries override built-ins.
   */
  typeMappers?: Record<string, JSONSchema>;
  /**
   * Attach the originating TS type name to mapped + named-type schemas via a
   * vendor-extension keyword. Pass `false` (default) for pure JSON Schema, or
   * a key name (typically `"x-fn-schema-ts"`) to opt in. Required for
   * canvas-style nominal-type matching across functions.
   */
  identity?: false | string;
  /**
   * Attach a transport hint (`"multipart"` / `"base64"` / `"json"`) to
   * binary-shaped schemas (File/Blob/Buffer/Uint8Array/ArrayBuffer) under a
   * vendor-extension keyword. Pass `false` (default) or a key name (typically
   * `"x-fn-schema-transport"`). Lets frontends pick the wire format.
   */
  transport?: false | string;
  /**
   * Attach the source-file location of every named type as a vendor-extension
   * keyword. `false` (default) or a key name (typically `"x-fn-schema-source"`).
   */
  sourceLocations?: false | string;
}

export interface ResolvedSchemaOptions {
  dialect: SchemaDialect;
  refStrategy: RefStrategy;
  definitionsPath: string;
  topRef: boolean;
  additionalProperties: boolean;
  encodeRefs: boolean;
  expose: "all" | "export" | "none";
  typeMappers: Record<string, JSONSchema>;
  identity: false | string;
  transport: false | string;
  sourceLocations: false | string;
}

/* ─────────────────────────────── Hooks ───────────────────────────── */

export interface SchemaContext {
  function: FunctionInfo;
  position: "input" | "output" | "parameter";
  parameterIndex?: number;
}

export interface ExtractHooks {
  onFunction?: (fn: FunctionInfo) => FunctionInfo | null | void;
  onSchema?: (schema: JSONSchema, ctx: SchemaContext) => JSONSchema;
}

/* ─────────────────────── Top-level extract API ───────────────────── */

export interface TargetRef {
  /** "src/api.ts#createUser" or "src/api.ts#User.create" */
  value: string;
}

export interface InMemorySource {
  code: string;
  path?: string;
}

export interface ExtractOptions {
  files?: string | string[];
  source?: InMemorySource;
  targets?: (string | TargetRef)[];

  cwd?: string;
  tsConfigPath?: string;

  include?: IncludeFilter;
  exclude?: ExcludeFilter;
  filter?: (fn: FunctionInfo) => boolean;

  signature?: SignatureOptions;
  schema?: SchemaOptions;
  naming?: NamingStrategy;

  hooks?: ExtractHooks;

  onDiagnostic?: (d: Diagnostic) => void;
  failFast?: boolean;
}

/* ──────────────────────── Result + diagnostics ───────────────────── */

export interface SignatureEntry {
  id: string;
  name: string;
  file: string;
  location: SourceLocation;
  kind: FunctionKind;
  language: string;
  jsDoc?: JSDocInfo;
  input: JSONSchema | JSONSchema[];
  output: JSONSchema;
  async: boolean;
  generic: boolean;
}

export interface ExtractStats {
  filesScanned: number;
  functionsFound: number;
  durationMs: number;
}

export interface ExtractResult {
  signatures: SignatureEntry[];
  definitions: Record<string, JSONSchema>;
  diagnostics: Diagnostic[];
  stats: ExtractStats;
}

export type DiagnosticSeverity = "error" | "warning" | "info";

export type DiagnosticCode =
  | "GENERIC_SKIPPED"
  | "OVERLOAD_PICKED"
  | "UNRESOLVED_TYPE"
  | "EMPTY_RESULT"
  | "EXTRACTOR_FAILURE"
  | "FILE_READ_ERROR"
  | "INVALID_TARGET"
  | "DUPLICATE_ID"
  | "NO_EXTRACTOR"
  | "TYPE_MAPPED"
  | "LOSSY_MAPPING"
  | "NOT_REPRESENTABLE";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: DiagnosticCode;
  message: string;
  file?: string;
  location?: SourceLocation;
  function?: string;
}

/* ────────────────────────── Project facade ───────────────────────── */

export interface ProjectOptions {
  extractors: Extractor[];
  cwd?: string;
  tsConfigPath?: string;
}

export interface Project {
  extract(options?: Partial<ExtractOptions>): Promise<ExtractResult>;
  refresh(paths?: string[]): void;
  dispose(): void;
}
