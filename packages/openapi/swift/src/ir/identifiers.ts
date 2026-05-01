/**
 * Swift-specific identifier transforms. Generic case helpers
 * (`pascal`, `camel`, `safeIdent`, `safeCaseName`, `synthName`) live
 * in `@ahmedrowaihi/openapi-core`. The export here covers what's unique
 * to Swift: backtick-escaping for the reserved-keyword set.
 */

export function paramIdent(name: string): string {
  const camelLike = name.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) =>
    c.toUpperCase(),
  );
  const safe = /^[0-9]/.test(camelLike) ? `_${camelLike}` : camelLike;
  return SWIFT_RESERVED_KEYWORDS.has(safe) ? `\`${safe}\`` : safe;
}

/**
 * Swift reserved keywords from the Language Guide's Lexical Structure
 * (declaration / statement / expression-and-type / pattern / context-
 * sensitive). Used by `paramIdent` to escape collisions in backticks.
 */
const SWIFT_RESERVED_KEYWORDS: ReadonlySet<string> = new Set([
  // declaration
  "associatedtype",
  "class",
  "deinit",
  "enum",
  "extension",
  "fileprivate",
  "func",
  "import",
  "init",
  "inout",
  "internal",
  "let",
  "open",
  "operator",
  "precedencegroup",
  "private",
  "protocol",
  "public",
  "rethrows",
  "static",
  "struct",
  "subscript",
  "typealias",
  "var",
  // statement
  "break",
  "case",
  "catch",
  "continue",
  "default",
  "defer",
  "do",
  "else",
  "fallthrough",
  "for",
  "guard",
  "if",
  "in",
  "repeat",
  "return",
  "switch",
  "throw",
  "where",
  "while",
  // expression / type
  "Any",
  "as",
  "await",
  "false",
  "is",
  "nil",
  "self",
  "Self",
  "super",
  "throws",
  "true",
  "try",
  // pattern
  "_",
  // context-sensitive
  "associativity",
  "convenience",
  "didSet",
  "dynamic",
  "final",
  "get",
  "indirect",
  "infix",
  "lazy",
  "left",
  "mutating",
  "none",
  "nonmutating",
  "optional",
  "override",
  "postfix",
  "precedence",
  "prefix",
  "Protocol",
  "required",
  "right",
  "set",
  "some",
  "Type",
  "unowned",
  "weak",
  "willSet",
]);
