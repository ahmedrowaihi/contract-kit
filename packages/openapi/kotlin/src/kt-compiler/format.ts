import type { KtVisibility } from "../kt-dsl/visibility.js";

export const INDENT = "    ";

/**
 * Kotlin's default visibility is `public`, but `public` is a valid
 * keyword and emitting it explicitly keeps the generated source
 * unambiguous when reading. `internal` / `private` / `protected`
 * always need to be explicit.
 */
export const visibilityPrefix = (v: KtVisibility): string => `${v} `;

export const superTypeTail = (
  superTypes: ReadonlyArray<string>,
  /** Render the first super-type as a constructor invocation
   *  (`Super()`) — needed for sealed-class subclasses. */
  parenFirst = false,
): string => {
  if (superTypes.length === 0) return "";
  if (!parenFirst) return ` : ${superTypes.join(", ")}`;
  const [head, ...rest] = superTypes;
  return ` : ${head}()${rest.length > 0 ? `, ${rest.join(", ")}` : ""}`;
};

export const indented = (
  lines: ReadonlyArray<string>,
  indent: string,
): string => lines.map((l) => `${indent}${l}`).join("\n");

const KOTLIN_IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * True when `name` is a bare identifier safe to render after `$` in
 * a string template without `${...}` braces.
 */
export const isSimpleIdent = (name: string): boolean =>
  KOTLIN_IDENT_RE.test(name);
