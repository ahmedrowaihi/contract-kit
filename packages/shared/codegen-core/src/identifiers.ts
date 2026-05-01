/**
 * Identifier transforms shared by every native-SDK generator. All
 * functions here are pure string ↔ string — they do *not* know about
 * any target language's reserved-word set or visibility rules. Each
 * generator layers its own `paramIdent` / `exportedIdent` /
 * `enumEntryIdent` on top, calling these as primitives.
 *
 * The pascal regex deliberately strips both leading and trailing
 * non-alphanumeric runs so identifiers like `timeframe[]` (PHP-style
 * array param names from real-world specs) become `Timeframe`, not
 * `TimeframeNullNull` or similar. Wire-level names are unaffected —
 * generators preserve the original param.name when emitting the URL.
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

/** PascalCase, prepended with `_` if it would otherwise start with a
 *  digit. Used wherever a type-name slot can't begin with a number. */
export function safeIdent(s: string): string {
  const p = pascal(s);
  return /^[0-9]/.test(p) ? `_${p}` : p;
}

/** camelCase, prepended with `_` if it would otherwise start with a
 *  digit. Used for enum case names where the source is numeric. */
export function safeCaseName(s: string): string {
  const c = camel(s);
  return /^[0-9]/.test(c) ? `_${c}` : c;
}

/**
 * Build a synthetic top-level type name for an inline schema, owned
 * by some declared type. The owner part stays as-is so collisions
 * across owners are impossible (`User_Address` vs `Order_Address`).
 * Path segments get pascal'd individually so `["properties","streetName"]`
 * collapses to `User_Properties_StreetName` rather than running the
 * pascal regex over the joined string.
 */
export function synthName(owner: string, path: ReadonlyArray<string>): string {
  return [owner, ...path.map(pascal)].join("_");
}
