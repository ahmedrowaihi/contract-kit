/**
 * HTTP-method tuple iterated by every operation walker. Ordered to
 * match the OpenAPI spec's canonical ordering so generated output is
 * deterministic across runs and across generators.
 */
export const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "head",
  "options",
  "trace",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

/**
 * Wire-format method literal expected by HTTP clients (`GET` not `get`).
 */
export const HTTP_METHOD_LITERAL: Record<HttpMethod, string> = {
  get: "GET",
  post: "POST",
  put: "PUT",
  delete: "DELETE",
  patch: "PATCH",
  head: "HEAD",
  options: "OPTIONS",
  trace: "TRACE",
};

/**
 * Match `application/json` and any RFC 6839 structured-syntax suffix
 * variant (e.g. `application/vnd.api+json`). Tolerant of trailing
 * `;charset=...` parameters.
 */
export const JSON_MEDIA_RE = /^application\/(?:json|[\w.+-]+\+json)(?:\s*;|$)/i;

export const FORM_URLENCODED_MEDIA = "application/x-www-form-urlencoded";
export const MULTIPART_FORM_MEDIA = "multipart/form-data";
