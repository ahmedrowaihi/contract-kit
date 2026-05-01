import {
  FORM_URLENCODED_MEDIA,
  JSON_MEDIA_RE,
  MULTIPART_FORM_MEDIA,
} from "@ahmedrowaihi/openapi-core";
import type { IR } from "@hey-api/shared";

import {
  type GoFuncParam,
  goByte,
  goFuncParam,
  goPtr,
  goSlice,
} from "../../go-dsl/index.js";
import { paramIdent } from "../identifiers.js";
import type { TypeCtx } from "../type/index.js";
import { schemaToType } from "../type/index.js";

const goBytes = () => goSlice(goByte);

/**
 * Resolve an `IR.BodyObject` into the function parameters for the
 * generated Go method. Always positional (Go has no named args).
 *
 * - `application/json` (and `+json`) → single `body *T` (pointer for
 *   nullability symmetry with optional struct fields). When the schema
 *   collapses to opaque (`oneOf`/`anyOf` with no shared shape), the
 *   param falls back to `[]byte` so the caller pre-encodes JSON.
 * - `multipart/form-data` (object schema) → one param per property;
 *   binary fields become `[]byte`.
 * - `application/x-www-form-urlencoded` (object schema) → one param
 *   per property.
 * - empty / octet-stream / image / unknown → `body []byte` (caller
 *   pre-encodes).
 */
export function buildBodyParams(
  body: IR.BodyObject,
  ctx: TypeCtx,
): ReadonlyArray<GoFuncParam> {
  const mt = (body.mediaType ?? "").toLowerCase();
  const schema = body.schema;
  const isObject = schema.type === "object" && Boolean(schema.properties);

  if (mt && JSON_MEDIA_RE.test(mt)) {
    if (isOpaqueJsonBody(schema)) {
      return [goFuncParam("body", goBytes())];
    }
    const t = schemaToType(schema, { ...ctx, propPath: ["body"] });
    // JSON body params are always pointer types — the standard Go
    // shape for "may be nil / required to construct on the heap".
    const finalType = t.kind === "ptr" ? t : goPtr(t);
    return [goFuncParam("body", finalType)];
  }

  if (mt.startsWith(MULTIPART_FORM_MEDIA) && isObject) {
    return objectBodyToFlatParams(schema, ctx, /* binaryAsBytes */ true);
  }
  if (mt.startsWith(FORM_URLENCODED_MEDIA) && isObject) {
    return objectBodyToFlatParams(schema, ctx, /* binaryAsBytes */ false);
  }
  return [goFuncParam("body", goBytes())];
}

/**
 * True when the body schema would resolve to `any` — currently
 * `oneOf`/`anyOf` with no shared type. Caller swaps to raw `[]byte`
 * since `any` doesn't round-trip through `encoding/json`'s
 * `Marshal(nil)` cleanly.
 */
export function isOpaqueJsonBody(schema: IR.SchemaObject): boolean {
  return !schema.type && Array.isArray(schema.items) && schema.items.length > 0;
}

const isPointerable = (t: import("../../go-dsl/index.js").GoType): boolean =>
  t.kind !== "ptr" &&
  t.kind !== "slice" &&
  t.kind !== "map" &&
  t.kind !== "interface";

function objectBodyToFlatParams(
  schema: IR.SchemaObject,
  ctx: TypeCtx,
  binaryAsBytes: boolean,
): ReadonlyArray<GoFuncParam> {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(
    ([propName, propSchema]) => {
      const isBinary =
        propSchema.type === "string" && propSchema.format === "binary";
      const t =
        binaryAsBytes && isBinary
          ? goBytes()
          : schemaToType(propSchema, { ...ctx, propPath: ["body", propName] });
      const isRequired = required.has(propName);
      const finalType = isRequired || !isPointerable(t) ? t : goPtr(t);
      return goFuncParam(paramIdent(propName), finalType);
    },
  );
}
