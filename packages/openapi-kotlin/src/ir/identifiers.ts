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

export function safeIdent(s: string): string {
  const p = pascal(s);
  return /^[0-9]/.test(p) ? `_${p}` : p;
}

export function safeCaseName(s: string): string {
  const c = camel(s);
  return /^[0-9]/.test(c) ? `_${c}` : c;
}

export function synthName(owner: string, path: ReadonlyArray<string>): string {
  return [owner, ...path.map(pascal)].join("_");
}

/**
 * Translate an arbitrary string to a Kotlin identifier safe to use as
 * a parameter / property name. Reserved keywords are escaped with
 * backticks (`Kotlin's` syntax for arbitrary identifiers).
 */
export function paramIdent(name: string): string {
  const camelLike = name.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) =>
    c.toUpperCase(),
  );
  const safe = /^[0-9]/.test(camelLike) ? `_${camelLike}` : camelLike;
  return KOTLIN_RESERVED_KEYWORDS.has(safe) ? `\`${safe}\`` : safe;
}

/**
 * Constant-style identifier for enum entries — `SCREAMING_SNAKE_CASE`.
 * Kotlin convention for `enum class` entry names. Falls back to a
 * leading underscore if the result starts with a digit.
 */
export function enumEntryIdent(s: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9]+/g, "_");
  // Split on case boundaries so "firstName" -> ["first", "Name"] -> FIRST_NAME.
  const parts = cleaned
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .split(/_+/)
    .filter(Boolean);
  const upper = parts.join("_").toUpperCase();
  return /^[0-9]/.test(upper) ? `_${upper}` : upper || "EMPTY";
}

/**
 * Kotlin's hard keywords (the ones that can't be used as identifiers
 * unbacktick-escaped). Picked from the Kotlin reference's "Keywords
 * and operators" section. Soft keywords (`override`, `data`, `inline`,
 * `suspend`, etc.) are valid identifiers and don't need escaping.
 */
const KOTLIN_RESERVED_KEYWORDS: ReadonlySet<string> = new Set([
  "as",
  "break",
  "class",
  "continue",
  "do",
  "else",
  "false",
  "for",
  "fun",
  "if",
  "in",
  "interface",
  "is",
  "null",
  "object",
  "package",
  "return",
  "super",
  "this",
  "throw",
  "true",
  "try",
  "typealias",
  "typeof",
  "val",
  "var",
  "when",
  "while",
]);
