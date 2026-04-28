/** Header names always stripped from samples — auth/secrets that would leak into emitted spec. */
export const DEFAULT_REDACTED_HEADERS: ReadonlyArray<string> = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-csrf-token",
  "proxy-authorization",
];

/**
 * Lower-case a header map and drop any keys in the redaction list.
 * Returns a new object — input is not mutated.
 */
export function sanitizeHeaders(
  headers: Record<string, string>,
  redact: ReadonlyArray<string> = DEFAULT_REDACTED_HEADERS,
): Record<string, string> {
  const lower = new Set(redact.map((h) => h.toLowerCase()));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase();
    if (lower.has(key)) continue;
    out[key] = v;
  }
  return out;
}
