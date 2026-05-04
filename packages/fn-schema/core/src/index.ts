export { resolveSchemaOptions, resolveSignatureOptions } from "./defaults.js";
export { DiagnosticSink, FailFastError } from "./diagnostics.js";
export * as emit from "./emit/index.js";
export { applyFilter, resolveFilter } from "./filter.js";
export { resolveNaming } from "./naming.js";
export { createProject } from "./project.js";
export { type ParsedTarget, parseTarget } from "./targets.js";
export type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
  ExcludeFilter,
  ExtractHooks,
  ExtractOptions,
  Extractor,
  ExtractorInitOptions,
  ExtractorInstance,
  ExtractResult,
  ExtractStats,
  FunctionInfo,
  FunctionKind,
  GenericsStrategy,
  IncludeFilter,
  InMemorySource,
  JSDocInfo,
  JSONSchema,
  NamePattern,
  NamingStrategy,
  OverloadStrategy,
  ParameterInfo,
  ParametersStrategy,
  Project,
  ProjectOptions,
  RefStrategy,
  ResolvedFilter,
  ResolvedSchemaOptions,
  ResolvedSignatureOptions,
  SchemaContext,
  SchemaDialect,
  SchemaOptions,
  SignatureEntry,
  SignatureOptions,
  SignaturePair,
  SourceLocation,
  TargetRef,
} from "./types.js";
