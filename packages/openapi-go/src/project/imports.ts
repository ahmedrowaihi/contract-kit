/**
 * Compute the import list for a single Go source file by walking the
 * already-printed body and matching against known identifiers. Same
 * print-then-scan approach as openapi-kotlin — precise without a full
 * type-tree walker.
 */
export function importsForSource(source: string): ReadonlyArray<string> {
  const set = new Set<string>();

  if (/\bcontext\.\b/.test(source)) set.add("context");
  if (/\bhttp\.\b/.test(source)) set.add("net/http");
  if (/\burl\.\b/.test(source)) set.add("net/url");
  if (/\bjson\.\b/.test(source)) set.add("encoding/json");
  if (/\bbytes\.\b/.test(source)) set.add("bytes");
  if (/\bio\.\b/.test(source)) set.add("io");
  if (/\berrors\.\b/.test(source)) set.add("errors");
  if (/\bfmt\.\b/.test(source)) set.add("fmt");
  if (/\bpath\.\b/.test(source)) set.add("path");
  if (/\btime\.\b/.test(source)) set.add("time");

  return [...set].sort();
}
