import { posix as pathPosix } from "node:path";
import type { GoDecl } from "../go-dsl/decl/types.js";
import type { GoType } from "../go-dsl/type/types.js";

export interface PlacementOptions {
  /** Per-decl override; `undefined` falls back to the default
   *  filename derived from the decl's name. */
  fileLocation?: (decl: GoDecl) => { dir?: string; file?: string } | undefined;
}

export interface PlacedDecl {
  decl: GoDecl;
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
 * Default file routing — designed to match the shape that real-world
 * Go SDKs ship (stripe-go / openai-go / anthropic-sdk-go):
 *
 *  - All schema-derived data types (structs, enum type aliases, enum
 *    const blocks, multi-2xx response interfaces + concrete cases)
 *    consolidate into `models.go`.
 *  - Each tag's API surface (`<Tag>API` interface + `NetHTTP<Tag>API`
 *    struct + constructor + all methods + marker-method funcs) lands
 *    in a single `<tag>.go` file.
 *  - The IR `interfaceOnly: true` mode still works — interfaces drop
 *    into the same `<tag>.go` file with only the methods missing.
 *
 * Drops the file count from O(schemas + 2 × ops) to roughly
 * `1 + #tags + #runtime_files` (~30 files for a 600-schema spec).
 */
export function declFileName(decl: GoDecl): string {
  if (decl.kind === "func") {
    if (decl.receiver) {
      const tag = tagName(unwrapPtrName(decl.receiver.type));
      if (tag) return `${snakeCase(tag)}.go`;
    }
    // Receiver-less funcs (constructors, sealed-marker methods)
    // route by their first result type.
    const first = decl.results[0]?.type;
    if (first) {
      const recv = unwrapPtrName(first);
      const tag = tagName(recv);
      if (tag) return `${snakeCase(tag)}.go`;
      // Marker methods for sealed-style multi-2xx response cases —
      // their first result is a struct named `<Op>ResponseStatus<NNN>`
      // (or similar). Group those with the data types in models.go.
      return "models.go";
    }
    return "models.go";
  }
  if (decl.kind === "interface") {
    const tag = tagName(decl.name);
    if (tag) return `${snakeCase(tag)}.go`;
    // Sealed-style multi-2xx response interfaces (e.g. `GetPetResponse`)
    // — keep them with the data they carry.
    return "models.go";
  }
  if (decl.kind === "struct") {
    // The impl struct (`NetHTTP<Tag>API`) lives with its tag's interface;
    // everything else is a data type → models.go.
    const tag = tagName(decl.name);
    if (tag) return `${snakeCase(tag)}.go`;
    return "models.go";
  }
  // typeAlias / constBlock — schema-derived data, models.go.
  return "models.go";
}

/**
 * Strip the API/impl-class wrappers to recover the human-readable
 * tag name. Returns `undefined` when the input doesn't look like a
 * tag-bound API type — those flow into `models.go` instead.
 *
 *   "PetAPI"          → "Pet"
 *   "NetHTTPPetAPI"   → "Pet"
 *   "Pet"             → undefined  (raw data type)
 *   "GetPetResponse"  → undefined  (sealed-style response)
 */
function tagName(typeName: string): string | undefined {
  const stripped = typeName.replace(/^NetHTTP/, "").replace(/API$/, "");
  // Only treat as a tag-bound type when stripping actually removed
  // something — otherwise it's a plain data type.
  return stripped !== typeName ? stripped : undefined;
}

function unwrapPtrName(t: GoType): string {
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
