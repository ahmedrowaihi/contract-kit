import type { IR } from "@hey-api/shared";

import {
  ktAnnotation,
  ktFunParam,
  ktNullable,
  ktRef,
} from "../kt-dsl/builders.js";
import type { KtAnnotation, KtFunParam, KtType } from "../kt-dsl/types.js";
import { paramIdent } from "./identifiers.js";
import {
  FORM_URLENCODED_MEDIA,
  JSON_MEDIA_RE,
  MULTIPART_FORM_MEDIA,
  OKHTTP3,
  RETROFIT_HTTP,
} from "./retrofit.js";
import { schemaToType, type TypeCtx } from "./schema-to-type.js";

export interface BodyResult {
  /** Function-level annotations to add (e.g. `@Multipart`, `@FormUrlEncoded`). */
  fnAnnotations: KtAnnotation[];
  /** Function parameters representing the body. */
  params: KtFunParam[];
}

/**
 * Resolve an `IR.BodyObject` to function-level annotations + parameters
 * matching the right Retrofit pattern for its media type:
 *
 * - `application/json` (and `+json` variants) → `@Body body: T`
 * - `multipart/form-data` + object schema → `@Multipart` + one `@Part` per property
 * - `application/x-www-form-urlencoded` + object → `@FormUrlEncoded` + one `@Field` per property
 * - anything else (octet-stream, image/*, ...) → `@Body body: RequestBody`
 */
export function bodyToParams(body: IR.BodyObject, ctx: TypeCtx): BodyResult {
  const mt = (body.mediaType ?? "").toLowerCase();
  const schema = body.schema;

  if (!mt || JSON_MEDIA_RE.test(mt)) {
    return jsonBody(schema, ctx);
  }

  const isObject = schema.type === "object" && Boolean(schema.properties);

  if (mt.startsWith(MULTIPART_FORM_MEDIA) && isObject) {
    return multipartBody(schema, ctx);
  }

  if (mt.startsWith(FORM_URLENCODED_MEDIA) && isObject) {
    return formUrlEncodedBody(schema, ctx);
  }

  return rawBinaryBody();
}

function jsonBody(schema: IR.SchemaObject, ctx: TypeCtx): BodyResult {
  const t = schemaToType(schema, { ...ctx, propPath: ["body"] });
  return {
    fnAnnotations: [],
    params: [
      ktFunParam({
        name: "body",
        type: t,
        annotations: [ktAnnotation("Body", { pkg: RETROFIT_HTTP })],
      }),
    ],
  };
}

function multipartBody(schema: IR.SchemaObject, ctx: TypeCtx): BodyResult {
  const required = new Set(schema.required ?? []);
  const params: KtFunParam[] = [];

  for (const [propName, propSchema] of Object.entries(
    schema.properties ?? {},
  )) {
    const isBinary =
      propSchema.type === "string" && propSchema.format === "binary";
    const partType: KtType = isBinary
      ? ktRef("MultipartBody.Part", OKHTTP3)
      : schemaToType(propSchema, { ...ctx, propPath: ["body", propName] });
    const isRequired = required.has(propName);
    params.push(
      ktFunParam({
        name: paramIdent(propName),
        type: isRequired ? partType : ktNullable(partType),
        annotations: [
          ktAnnotation("Part", {
            pkg: RETROFIT_HTTP,
            args: [JSON.stringify(propName)],
          }),
        ],
        default: isRequired ? undefined : "null",
      }),
    );
  }

  return {
    fnAnnotations: [ktAnnotation("Multipart", { pkg: RETROFIT_HTTP })],
    params,
  };
}

function formUrlEncodedBody(schema: IR.SchemaObject, ctx: TypeCtx): BodyResult {
  const required = new Set(schema.required ?? []);
  const params: KtFunParam[] = [];

  for (const [propName, propSchema] of Object.entries(
    schema.properties ?? {},
  )) {
    const fieldType = schemaToType(propSchema, {
      ...ctx,
      propPath: ["body", propName],
    });
    const isRequired = required.has(propName);
    params.push(
      ktFunParam({
        name: paramIdent(propName),
        type: isRequired ? fieldType : ktNullable(fieldType),
        annotations: [
          ktAnnotation("Field", {
            pkg: RETROFIT_HTTP,
            args: [JSON.stringify(propName)],
          }),
        ],
        default: isRequired ? undefined : "null",
      }),
    );
  }

  return {
    fnAnnotations: [ktAnnotation("FormUrlEncoded", { pkg: RETROFIT_HTTP })],
    params,
  };
}

function rawBinaryBody(): BodyResult {
  return {
    fnAnnotations: [],
    params: [
      ktFunParam({
        name: "body",
        type: ktRef("RequestBody", OKHTTP3),
        annotations: [ktAnnotation("Body", { pkg: RETROFIT_HTTP })],
      }),
    ],
  };
}
