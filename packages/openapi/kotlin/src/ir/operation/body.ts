import {
  FORM_URLENCODED_MEDIA,
  JSON_MEDIA_RE,
  MULTIPART_FORM_MEDIA,
} from "@ahmedrowaihi/openapi-core";
import type { IR } from "@hey-api/shared";

import {
  type KtFunParam,
  ktByteArray,
  ktFunParam,
  ktNullable,
} from "../../kt-dsl/index.js";
import { paramIdent } from "../identifiers.js";
import type { TypeCtx } from "../type/index.js";
import { schemaToType } from "../type/index.js";

/**
 * Resolve an `IR.BodyObject` into the function parameters that show up
 * in both the interface signature and the impl method:
 *
 * - `application/json` (and `+json`) → single `body: T`. When the
 *   schema collapses to `Any` (e.g. a `oneOf` with no discriminated
 *   union codegen), the param falls back to `ByteArray` so the caller
 *   pre-encodes JSON — `Any` isn't `@Serializable`, so emitting it
 *   would produce code that fails to compile.
 * - `multipart/form-data` + object schema → one param per property; binary fields become `ByteArray`
 * - `application/x-www-form-urlencoded` + object schema → one param per property
 * - empty / octet-stream / image/* / unknown → `body: ByteArray` (caller pre-encodes)
 */
export function buildBodyParams(
  body: IR.BodyObject,
  ctx: TypeCtx,
): ReadonlyArray<KtFunParam> {
  const mt = (body.mediaType ?? "").toLowerCase();
  const schema = body.schema;
  const isObject = schema.type === "object" && Boolean(schema.properties);

  if (mt && JSON_MEDIA_RE.test(mt)) {
    if (isOpaqueJsonBody(schema)) {
      return [ktFunParam({ name: "body", type: ktByteArray })];
    }
    return [
      ktFunParam({
        name: "body",
        type: schemaToType(schema, { ...ctx, propPath: ["body"] }),
      }),
    ];
  }

  if (mt.startsWith(MULTIPART_FORM_MEDIA) && isObject) {
    return objectBodyToFlatParams(schema, ctx, /* binaryAsByteArray */ true);
  }
  if (mt.startsWith(FORM_URLENCODED_MEDIA) && isObject) {
    return objectBodyToFlatParams(schema, ctx, /* binaryAsByteArray */ false);
  }
  return [ktFunParam({ name: "body", type: ktByteArray })];
}

/**
 * True when the body schema would resolve to `Any` — currently
 * `oneOf`/`anyOf` with no shared type. We can't generate a working
 * `Json.encode` call against `Any`, so the call site swaps to raw
 * `ByteArray` and the wire encoder writes `request.body = body.toRequestBody(...)`
 * verbatim.
 */
export function isOpaqueJsonBody(schema: IR.SchemaObject): boolean {
  return !schema.type && Array.isArray(schema.items) && schema.items.length > 0;
}

function objectBodyToFlatParams(
  schema: IR.SchemaObject,
  ctx: TypeCtx,
  binaryAsByteArray: boolean,
): ReadonlyArray<KtFunParam> {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(
    ([propName, propSchema]) => {
      const isBinary =
        propSchema.type === "string" && propSchema.format === "binary";
      const t =
        binaryAsByteArray && isBinary
          ? ktByteArray
          : schemaToType(propSchema, { ...ctx, propPath: ["body", propName] });
      const isRequired = required.has(propName);
      return ktFunParam({
        name: paramIdent(propName),
        type: isRequired ? t : ktNullable(t),
        default: isRequired ? undefined : "null",
      });
    },
  );
}
