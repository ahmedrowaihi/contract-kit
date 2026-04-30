export function pascal(s: string): string {
  return s
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
