import { posix as pathPosix } from "node:path";
import type { GoDecl } from "../go-dsl/decl/types.js";

export interface PlacementOptions {
  /** Per-decl override; `undefined` falls back to the default
   *  filename derived from the decl's name. */
  fileLocation?: (decl: GoDecl) => { dir?: string; file?: string } | undefined;
}

export interface PlacedDecl {
  decl: GoDecl;
  /** Output dir relative to the SDK root, using `/` separators.
   *  Default `"."` — Go consumers typically vendor the SDK as a
   *  single flat package directory, so we don't sub-package by
   *  default. */
  dir: string;
  fileName: string;
}

export function placeDecl(decl: GoDecl, opts: PlacementOptions): PlacedDecl {
  const override = opts.fileLocation?.(decl);
  if (override?.dir) safeRelativeDir(override.dir);
  return {
    decl,
    dir: override?.dir ?? ".",
    fileName: override?.file ?? declFileName(decl),
  };
}

function safeRelativeDir(dir: string): string {
  const normalized = pathPosix.normalize(dir || ".");
  if (
    pathPosix.isAbsolute(normalized) ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`fileLocation: invalid output directory: ${dir}`);
  }
  return normalized;
}

/**
 * Default file name for a decl. Go convention: one type per file for
 * data types, one file per receiver for impl methods.
 *
 *  - Methods (receiver-bearing func decls) → `<receiver>.go`. All
 *    methods on a given impl type collapse into one file.
 *  - Constructors / receiver-less marker-method funcs route to the
 *    file matching their first results / first receiver-related type
 *    when possible; otherwise to their own name.
 *  - `constBlock` decls get the schema's name when emitted from the
 *    enum builder (orchestrator threads `name` through); the
 *    matching `type Name string` alias targets the same filename so
 *    the two collapse into one file.
 */
export function declFileName(decl: GoDecl): string {
  if (decl.kind === "func") {
    if (decl.receiver) {
      return `${snakeCase(unwrapPtrName(decl.receiver.type))}.go`;
    }
    // Receiver-less func: when the first result is `*<Receiver>`,
    // route it to the receiver's file (typical for `NewFoo()`
    // constructors and marker-method bodies).
    const first = decl.results[0]?.type;
    if (first) {
      return `${snakeCase(unwrapPtrName(first))}.go`;
    }
  }
  if (decl.kind === "constBlock") {
    return `${snakeCase(decl.name ?? "consts")}.go`;
  }
  return `${snakeCase(decl.name)}.go`;
}

function unwrapPtrName(t: import("../go-dsl/type/types.js").GoType): string {
  if (t.kind === "ptr") return unwrapPtrName(t.inner);
  if (t.kind === "ref") return t.name;
  return "decl";
}

/**
 * Convert PascalCase / camelCase to snake_case, handling acronyms
 * properly: `NetHTTPPetAPI` → `net_http_pet_api` (not
 * `net_httppet_api`).
 */
function snakeCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/__+/g, "_")
    .toLowerCase();
}
