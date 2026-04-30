/**
 * PascalCase / camelCase / safe-identifier helpers for Go codegen.
 * Same shape as swift/kotlin (will likely be extracted to a shared
 * package once go ships), with Go-specific tweaks:
 *
 *  - Exported names start with an uppercase letter (Go's visibility
 *    rule). `exportedIdent` ensures that.
 *  - Reserved-word escaping uses underscore suffix (`type` →
 *    `type_`) since Go doesn't have backtick-escaping.
 *  - `synthName` keeps underscores so synthesized names stay
 *    distinguishable from regular PascalCase composites; matches
 *    swift/kotlin output.
 */
export function pascal(s: string): string {
  return s
    .replace(/^[^a-zA-Z0-9]+/, "")
    .replace(/[^a-zA-Z0-9]+$/, "")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase());
}

export function camel(s: string): string {
  const p = pascal(s);
  return p.length > 0 ? p[0]!.toLowerCase() + p.slice(1) : p;
}

/** Returns a PascalCase identifier safe for an exported name (starts with
 *  an uppercase letter, leading underscore prepended if it would start
 *  with a digit). */
export function exportedIdent(s: string): string {
  const p = pascal(s);
  return /^[0-9]/.test(p) ? `_${p}` : p;
}

/** Returns a Go-safe identifier — escapes reserved keywords with a
 *  trailing underscore (Go has no backtick form). */
export function paramIdent(name: string): string {
  const camelLike = camel(name);
  const safe = /^[0-9]/.test(camelLike) ? `_${camelLike}` : camelLike;
  return GO_RESERVED_KEYWORDS.has(safe) ? `${safe}_` : safe;
}

/**
 * Synthetic name for inline objects / enums promoted to top-level
 * decls. Go's convention is PascalCase with no underscores, so we
 * concatenate parts directly (`OwnerProperty`) — diverges from
 * swift/kotlin's `Owner_Property` to match `go vet` lints
 * (underscored type names trigger warnings).
 */
export function synthName(owner: string, path: ReadonlyArray<string>): string {
  return [owner, ...path.map(pascal)].join("");
}

/**
 * Constant-style identifier for a single `iota`-free typed enum
 * entry. Convention for OpenAPI string enums in Go is
 * `<TypeName><PascalCasedRaw>` — e.g. `Status` enum value
 * `"available"` → `StatusAvailable`. The caller passes the type name
 * separately; this helper just normalizes the raw value.
 */
export function enumEntrySuffix(rawValue: string): string {
  const cleaned = rawValue.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) =>
    c.toUpperCase(),
  );
  const cap = cleaned.replace(/^./, (c) => c.toUpperCase());
  return /^[0-9]/.test(cap) ? `_${cap}` : cap || "Empty";
}

/**
 * Go's reserved keywords. From the language spec — these can't be used
 * as identifiers at all, even with backticks (Go has no backtick-escape
 * form, unlike Swift / Kotlin). Collisions get a trailing underscore
 * appended.
 */
const GO_RESERVED_KEYWORDS: ReadonlySet<string> = new Set([
  "break",
  "case",
  "chan",
  "const",
  "continue",
  "default",
  "defer",
  "else",
  "fallthrough",
  "for",
  "func",
  "go",
  "goto",
  "if",
  "import",
  "interface",
  "map",
  "package",
  "range",
  "return",
  "select",
  "struct",
  "switch",
  "type",
  "var",
]);
