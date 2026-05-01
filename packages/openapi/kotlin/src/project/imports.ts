import type { KtDecl } from "../kt-dsl/index.js";

/**
 * Compute the import list for a single Kotlin file by walking the
 * already-printed source and matching against known identifiers.
 * Coarse-import-everything caused unused imports per file; the
 * print-then-scan pattern is precise without needing a full type-tree
 * walker.
 *
 * Identifiers that share names across packages (e.g. `Response` exists
 * in both `okhttp3` and a hypothetical user model) are disambiguated
 * by file kind: API-layer files always pull `okhttp3.Response`, model
 * files never do.
 */
export function importsForSource(
  source: string,
  ctx: { isApiSurface: boolean; rootPkg: string; subPkg: string },
): ReadonlyArray<string> {
  const set = new Set<string>();

  // kotlinx-serialization annotations.
  if (/@Serializable\b/.test(source)) {
    set.add("kotlinx.serialization.Serializable");
  }
  if (/@SerialName\b/.test(source)) {
    set.add("kotlinx.serialization.SerialName");
  }

  // kotlinx-datetime model fields.
  if (/\bInstant\b/.test(source)) set.add("kotlinx.datetime.Instant");
  if (/\bLocalDate\b/.test(source)) set.add("kotlinx.datetime.LocalDate");

  // kotlinx-serialization builtins (only when actually mentioned).
  if (/\bListSerializer\(/.test(source)) {
    set.add("kotlinx.serialization.builtins.ListSerializer");
  }
  if (/\bMapSerializer\(/.test(source)) {
    set.add("kotlinx.serialization.builtins.MapSerializer");
  }
  if (/\bByteArraySerializer\(\)/.test(source)) {
    set.add("kotlinx.serialization.builtins.ByteArraySerializer");
  }
  if (/\.nullable\b/.test(source)) {
    set.add("kotlinx.serialization.builtins.nullable");
  }
  if (/\bserializer\(\)/.test(source) && ctx.isApiSurface) {
    // Built-in `String.serializer()`, `Int.serializer()`, etc. live
    // under kotlinx.serialization.builtins. Only the API surface uses
    // them — model files use the auto-generated companion form.
    set.add("kotlinx.serialization.builtins.serializer");
  }
  if (/\bJsonElement\b/.test(source)) {
    set.add("kotlinx.serialization.json.JsonElement");
  }

  // OkHttp types — only API-surface files reference them.
  if (ctx.isApiSurface) {
    if (/\bHttpUrl\b/.test(source)) set.add("okhttp3.HttpUrl");
    if (/\bRequest\b/.test(source)) set.add("okhttp3.Request");
    if (/\bResponse\b/.test(source)) set.add("okhttp3.Response");
    if (/\bFormBody\b/.test(source)) set.add("okhttp3.FormBody");
    if (/\.toMediaType\(\)/.test(source)) {
      set.add("okhttp3.MediaType.Companion.toMediaType");
    }
    if (/\.toRequestBody\(/.test(source)) {
      set.add("okhttp3.RequestBody.Companion.toRequestBody");
    }

    // Cross-package model refs. The API surface lives in `<root>.api`
    // and references model types from `<root>.models`. Wildcard-import
    // when the file mentions any PascalCased identifier that isn't a
    // built-in (cheap heuristic; the alternative is walking every type
    // ref through the decl tree).
    if (
      ctx.subPkg === `${ctx.rootPkg}.api` &&
      /\b[A-Z][A-Za-z0-9_]*\b/.test(source) &&
      hasLikelyModelRef(source)
    ) {
      set.add(`${ctx.rootPkg}.models.*`);
    }
  }

  // Drop self-package imports — Kotlin allows them but they're noise.
  return [...set].filter((i) => !i.startsWith(`${ctx.subPkg}.`)).sort();
}

/**
 * Identifiers that ship in `kotlin.*` / `okhttp3.*` / kotlinx — and so
 * do NOT trigger a `<root>.models.*` import. Used to keep the wildcard
 * model import out of files that never actually reference user types.
 */
const NON_MODEL_TYPES = new Set([
  // Kotlin stdlib
  "Any",
  "Unit",
  "Nothing",
  "String",
  "Int",
  "Long",
  "Short",
  "Byte",
  "Double",
  "Float",
  "Boolean",
  "ByteArray",
  "List",
  "Map",
  "Pair",
  "Triple",
  "Throwable",
  "Exception",
  "RuntimeException",
  "Result",
  "Charsets",
  "Base64",
  "TimeUnit",
  // kotlinx
  "Instant",
  "LocalDate",
  "JsonElement",
  "Json",
  "Dispatchers",
  "Serializable",
  "SerialName",
  "ListSerializer",
  "MapSerializer",
  "ByteArraySerializer",
  // OkHttp
  "HttpUrl",
  "Request",
  "Response",
  "OkHttpClient",
  "FormBody",
  "MultipartBody",
  "RequestBody",
  "MediaType",
  // Runtime helpers (same package)
  "APIClient",
  "APIError",
  "APIInterceptors",
  "Auth",
  "APIKeyLocation",
  "MultipartFormBody",
  "QueryStyle",
  "RequestOptions",
  "URLEncoding",
]);

function hasLikelyModelRef(source: string): boolean {
  const matches = source.matchAll(/\b([A-Z][A-Za-z0-9_]*)\b/g);
  for (const m of matches) {
    if (!NON_MODEL_TYPES.has(m[1]!)) return true;
  }
  return false;
}

/** API-surface predicate, exposed for the build orchestrator. */
export function isApiSurface(decl: KtDecl): boolean {
  if (decl.kind === "interface") return true;
  if (decl.kind === "class") return true;
  if (decl.kind === "topLevelFun") return true;
  return Boolean(
    (decl.kind === "enum" ||
      decl.kind === "sealedClass" ||
      decl.kind === "dataClass" ||
      decl.kind === "object") &&
      decl.runtime,
  );
}
