import type { OpenAPIV3_1 } from "@hey-api/spec-types";

export type Document = OpenAPIV3_1.Document;
export type PathItem = OpenAPIV3_1.PathItemObject;
export type Components = NonNullable<Document["components"]>;

export interface MergeSource {
  /** Stable identifier used for namespacing/prefixing on conflict. */
  label: string;
  spec: Document;
}

export interface PathPolicy {
  /** Default: `error`. `prefix` rewrites every path with `prefix(label)`. */
  onConflict?: "error" | "first-wins" | "last-wins" | "prefix";
  /** Default: `(label) => "/" + label`. Only used when `onConflict === "prefix"`. */
  prefix?: (label: string) => string;
}

export interface ComponentPolicy {
  /**
   * Default: `namespace`. `namespace` always renames *every* component name
   * with `namespace(label, name)`. `error` throws on collision.
   */
  onConflict?: "error" | "namespace" | "first-wins" | "last-wins";
  /** Default: `(label, name) => label + "_" + name`. */
  namespace?: (label: string, name: string) => string;
}

export interface TagPolicy {
  /** Default: `union`. `namespace` prefixes each tag with the source label. */
  strategy?: "union" | "namespace";
  /** Default: `(label, tag) => label + ":" + tag`. */
  namespace?: (label: string, tag: string) => string;
}

export interface ServerPolicy {
  /** Default: `union`. */
  strategy?: "union" | "first" | "last";
}

export interface OperationIdPolicy {
  /** Default: `namespace`. */
  onConflict?: "error" | "namespace" | "first-wins" | "last-wins";
  /** Default: `(label, id) => label + "_" + id`. */
  namespace?: (label: string, operationId: string) => string;
}

export interface MergeOptions {
  paths?: PathPolicy;
  components?: ComponentPolicy;
  tags?: TagPolicy;
  servers?: ServerPolicy;
  operationIds?: OperationIdPolicy;
  /** Override `info` on the output. Defaults to the first source's `info`. */
  info?: Partial<OpenAPIV3_1.InfoObject>;
}

/**
 * Per-component-section rename map: `{ schemas: { Pet: "apiA_Pet" }, ... }`.
 * Used to rewrite `$ref` strings consistently after a rename.
 */
export type RenameMap = Record<string, Record<string, string>>;
