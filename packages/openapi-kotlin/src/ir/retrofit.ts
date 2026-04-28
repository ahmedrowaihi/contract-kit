export const RETROFIT_HTTP = "retrofit2.http";
export const OKHTTP3 = "okhttp3";
export const KX_SERIALIZATION = "kotlinx.serialization";

export const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "head",
  "options",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export const RETROFIT_METHOD_ANNOTATION: Record<HttpMethod, string> = {
  get: "GET",
  post: "POST",
  put: "PUT",
  delete: "DELETE",
  patch: "PATCH",
  head: "HEAD",
  options: "OPTIONS",
};

export const JSON_MEDIA_RE = /^application\/(json|.*\+json)/i;
export const FORM_URLENCODED_MEDIA = "application/x-www-form-urlencoded";
export const MULTIPART_FORM_MEDIA = "multipart/form-data";
