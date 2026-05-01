/**
 * Format detection for primitive values. Applied during single-sample
 * inference. Multiple samples that disagree on format → format is dropped
 * during merge (in `mergeSchema`).
 *
 * The patterns here intentionally err toward false-NEGATIVES — emitting an
 * unnecessary string is better than mislabeling a date as a UUID.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Restrictive email pattern — RFC 5322 is too permissive for inference.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ISO 8601 date-time. Accepts both `Z` and `±hh:mm` offsets, optional fractional seconds.
const DATE_TIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// ISO 8601 date only.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Absolute http(s) URL — covers the common case without trying to be RFC-correct.
const URI_RE = /^https?:\/\/[^\s]+$/i;

// IPv4 dotted quad with each octet 0-255.
const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

/** Detect a string format from a single value. Returns undefined if no match. */
export function detectStringFormat(value: string): string | undefined {
  if (value.length < 4 || value.length > 4096) return undefined;
  if (UUID_RE.test(value)) return "uuid";
  if (EMAIL_RE.test(value)) return "email";
  if (DATE_TIME_RE.test(value)) return "date-time";
  if (DATE_RE.test(value)) return "date";
  if (URI_RE.test(value)) return "uri";
  if (IPV4_RE.test(value)) return "ipv4";
  return undefined;
}

/**
 * Detect an integer format. Numbers in JSON have no native distinction
 * between int32/int64 — we use range as a heuristic.
 */
export function detectIntegerFormat(value: number): "int32" | "int64" {
  return value >= INT32_MIN && value <= INT32_MAX ? "int32" : "int64";
}
