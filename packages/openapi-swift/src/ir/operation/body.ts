import type { IR } from "@hey-api/shared";
import type { SwFunParam } from "../../sw-dsl/index.js";
import { swData, swFunParam, swOptional } from "../../sw-dsl/index.js";
import {
  FORM_URLENCODED_MEDIA,
  JSON_MEDIA_RE,
  MULTIPART_FORM_MEDIA,
} from "../constants.js";
import { paramIdent } from "../identifiers.js";
import type { TypeCtx } from "../type/index.js";
import { schemaToType } from "../type/index.js";

/**
 * Resolve an `IR.BodyObject` into the function parameters that show up
 * in both the protocol signature and the impl method:
 *
 * - `application/json` (and `+json`) → single `body: T`. When the
 *   schema collapses to `Any` (e.g. a `oneOf` with no discriminated
 *   union codegen), the param falls back to `Data` so the caller
 *   pre-encodes JSON — `Any` isn't `Encodable`, so emitting it would
 *   produce code that fails to compile.
 * - `multipart/form-data` + object schema → one param per property; binary fields become `Data`
 * - `application/x-www-form-urlencoded` + object schema → one param per property
 * - empty / octet-stream / image/* / unknown → `body: Data` (caller pre-encodes)
 */
export function buildBodyParams(
  body: IR.BodyObject,
  ctx: TypeCtx,
): ReadonlyArray<SwFunParam> {
  const mt = (body.mediaType ?? "").toLowerCase();
  const schema = body.schema;
  const isObject = schema.type === "object" && Boolean(schema.properties);

  if (mt && JSON_MEDIA_RE.test(mt)) {
    if (isOpaqueJsonBody(schema)) {
      return [swFunParam({ name: "body", type: swData })];
    }
    return [
      swFunParam({
        name: "body",
        type: schemaToType(schema, { ...ctx, propPath: ["body"] }),
      }),
    ];
  }

  if (mt.startsWith(MULTIPART_FORM_MEDIA) && isObject) {
    return objectBodyToFlatParams(schema, ctx, /* binaryAsData */ true);
  }
  if (mt.startsWith(FORM_URLENCODED_MEDIA) && isObject) {
    return objectBodyToFlatParams(schema, ctx, /* binaryAsData */ false);
  }
  return [swFunParam({ name: "body", type: swData })];
}

/**
 * True when the body schema would resolve to `Any` — currently
 * `oneOf`/`anyOf` with no shared type. We can't generate a working
 * `JSONEncoder.encode` call against `Any`, so the call site swaps to
 * raw `Data` and the wire encoder emits `request.httpBody = body`
 * verbatim.
 */
export function isOpaqueJsonBody(schema: IR.SchemaObject): boolean {
  return !schema.type && Array.isArray(schema.items) && schema.items.length > 0;
}

function objectBodyToFlatParams(
  schema: IR.SchemaObject,
  ctx: TypeCtx,
  binaryAsData: boolean,
): ReadonlyArray<SwFunParam> {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(
    ([propName, propSchema]) => {
      const isBinary =
        propSchema.type === "string" && propSchema.format === "binary";
      const t =
        binaryAsData && isBinary
          ? swData
          : schemaToType(propSchema, { ...ctx, propPath: ["body", propName] });
      const isRequired = required.has(propName);
      return swFunParam({
        name: paramIdent(propName),
        type: isRequired ? t : swOptional(t),
        default: isRequired ? undefined : "nil",
      });
    },
  );
}
