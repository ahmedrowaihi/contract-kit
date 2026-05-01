import type { GoType } from "../type/types.js";

export interface GoField {
  name: string;
  type: GoType;
  /** Pre-rendered struct tag, including backticks (e.g. `` `json:"id"` ``).
   *  Caller-rendered so callers can compose multi-key tags freely. */
  tag?: string;
  /** Optional doc comment — emitted as `// <doc>` on the line above. */
  doc?: string;
}

export interface GoStruct {
  kind: "struct";
  name: string;
  fields: ReadonlyArray<GoField>;
  /** Optional doc emitted directly above the `type` line. */
  doc?: string;
  /** When true, this decl is a runtime-helper (used by the orchestrator
   *  to route into `runtime/`-style files). */
  runtime?: boolean;
}

/**
 * Struct field. `tag` is pre-rendered including the backticks so
 * callers can build complex multi-key tags (`` `json:"id" yaml:"id"` ``).
 *
 * @example
 * ```go
 * // goField("ID", goInt64, '`json:"id"`')
 * //   → ID int64 `json:"id"`
 * ```
 */
export const goField = (
  name: string,
  type: GoType,
  tag?: string,
  doc?: string,
): GoField => ({ name, type, tag, doc });

/**
 * Top-level struct decl.
 *
 * @example
 * ```go
 * // goStruct({ name: "Pet", fields: [goField("ID", goInt64, '`json:"id"`')] })
 * //   → type Pet struct {
 * //         ID int64 `json:"id"`
 * //     }
 * ```
 */
export function goStruct(opts: {
  name: string;
  fields: ReadonlyArray<GoField>;
  doc?: string;
  runtime?: boolean;
}): GoStruct {
  return {
    kind: "struct",
    name: opts.name,
    fields: opts.fields,
    doc: opts.doc,
    runtime: opts.runtime,
  };
}
