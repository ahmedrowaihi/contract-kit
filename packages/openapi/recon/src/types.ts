import type { JSONSchemaDraft2020_12 } from "@hey-api/spec-types";

/** A JSON Schema 2020-12 document — alias for the namespace's `Document` type. */
export type Schema = JSONSchemaDraft2020_12.Document;

/** Lowercase HTTP method. */
export type HttpMethod =
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "patch"
  | "trace";

/** A single captured request/response pair, normalized for inference. */
export interface Sample {
  method: HttpMethod;
  /** Origin (scheme + host + port). e.g. `https://api.example.com` */
  origin: string;
  /** URL pathname only. e.g. `/pets/42` */
  pathname: string;
  /** Query parameters as a flat string→string map. Multi-value keys collapse to last. */
  query: Record<string, string>;
  /** Request headers, lower-cased keys. Sanitized before storage. */
  requestHeaders: Record<string, string>;
  /** Parsed JSON body of the request, or null. */
  requestBody: unknown;
  /** Detected auth scheme id from request headers, if any. */
  authSchemeId: string | null;
  /** Response status code. */
  status: number;
  /** Response headers, lower-cased keys. */
  responseHeaders: Record<string, string>;
  /** Parsed JSON body of the response, or null. */
  responseBody: unknown;
}

/** Inferred operation: aggregates samples for one (origin, templated path, method). */
export interface OperationObservation {
  /** Original concrete pathnames seen (for path templating). */
  rawPathnames: Set<string>;
  /** Templated path with `{param}` placeholders; null until templating runs. */
  templatedPath: string | null;
  /** Inferred path-parameter names → primitive type. */
  pathParams: Record<string, "string" | "integer">;
  /** Aggregate JSON Schema for the request body (across all observed JSON requests). */
  requestBodySchema: Schema | null;
  /** Per-status-code aggregate response schema. */
  responseSchemas: Map<number, Schema>;
  /** Query-parameter names → primitive type. */
  queryParams: Record<string, "string" | "integer" | "boolean">;
  /** Number of samples folded into this observation. */
  sampleCount: number;
  /** Auth scheme ids observed across samples (e.g. `bearerAuth`). */
  authSchemes: Set<string>;
}

/** Configuration for `createRecon`. */
export interface ReconConfig {
  /** Header names to redact entirely (lower-case). Defaults include common auth headers. */
  redactHeaders?: ReadonlyArray<string>;
  /** When true, attempt path templating; when false, every distinct path is its own operation. */
  pathTemplating?: boolean;
  /** OpenAPI document title to emit. @default "Reverse-engineered API" */
  title?: string;
  /** OpenAPI document version to emit. @default "0.0.0" */
  version?: string;
}
