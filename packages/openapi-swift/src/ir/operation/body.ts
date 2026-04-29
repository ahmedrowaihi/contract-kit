import type { IR } from "@hey-api/shared";

import { type SwFunParam, swFunParam } from "../../sw-dsl/fun.js";
import { swData, swOptional } from "../../sw-dsl/type/index.js";
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
 * - `application/json` (and `+json`) → single `body: T`
 * - `multipart/form-data` + object schema → one param per property; binary fields become `Data`
 * - `application/x-www-form-urlencoded` + object schema → one param per property
 * - anything else (octet-stream, image/*, ...) → `body: Data`
 */
export function buildBodyParams(
  body: IR.BodyObject,
  ctx: TypeCtx,
): ReadonlyArray<SwFunParam> {
  const mt = (body.mediaType ?? "").toLowerCase();
  const schema = body.schema;
  const isObject = schema.type === "object" && Boolean(schema.properties);

  if (!mt || JSON_MEDIA_RE.test(mt)) {
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
