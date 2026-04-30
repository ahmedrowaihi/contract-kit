import {
  FORM_URLENCODED_MEDIA,
  type HttpMethod,
  JSON_MEDIA_RE,
  MULTIPART_FORM_MEDIA,
} from "@ahmedrowaihi/oas-core";
import type { IR } from "@hey-api/shared";

import type { KtType } from "../../kt-dsl/index.js";
import {
  type KtExpr,
  type KtStmt,
  ktArg,
  ktCall,
  ktExprStmt,
  ktIdent,
  ktIf,
  ktInterp,
  ktMember,
  ktNe,
  ktNull,
  ktStr,
  ktVal,
} from "../../kt-dsl/index.js";
import { paramIdent } from "../identifiers.js";
import { isOpaqueJsonBody } from "../operation/body.js";
import { setMethodWithBody } from "./request.js";
import { serializerFor } from "./serializer.js";

export interface BodyResult {
  stmts: ReadonlyArray<KtStmt>;
  /** Set when the body builder uses `MultipartFormBody` so the
   *  orchestrator emits that runtime helper. */
  needsMultipart: boolean;
}

/**
 * Build the request body and re-set the HTTP method on `builder` to
 * carry it. Dispatches on media type:
 *
 *  - `application/json` (and `+json`) → `client.json.encodeToString(<ser>, body)`
 *    becomes a `RequestBody` via `.toRequestBody("application/json".toMediaType())`.
 *    For opaque bodies (oneOf/anyOf), the impl receives `body: ByteArray`
 *    and ships it raw.
 *  - `multipart/form-data` (object schema) → assemble a
 *    `MultipartFormBody`, append text/file fields per property, take
 *    `multipart.build()` as the RequestBody.
 *  - `application/x-www-form-urlencoded` (object schema) → build a
 *    `FormBody.Builder()`, `add(name, value)` per property, take
 *    `formBody.build()` as the RequestBody.
 *  - octet-stream / image / etc. → `body.toRequestBody("<mt>".toMediaType())`.
 *
 * Optional fields are wrapped in `if (<id> != null)`.
 */
export function buildBodyStmts(
  body: IR.BodyObject,
  method: HttpMethod,
  bodyType: KtType,
): BodyResult {
  const mt = (body.mediaType ?? "").toLowerCase();
  const schema = body.schema;
  const isObject = schema.type === "object" && Boolean(schema.properties);

  if (mt && JSON_MEDIA_RE.test(mt)) {
    if (isOpaqueJsonBody(schema)) {
      return {
        stmts: [emitMethodWithRawBody(method, "application/json")],
        needsMultipart: false,
      };
    }
    return { stmts: emitJsonBody(method, bodyType), needsMultipart: false };
  }

  if (mt.startsWith(MULTIPART_FORM_MEDIA) && isObject) {
    return { stmts: emitMultipartBody(schema, method), needsMultipart: true };
  }

  if (mt.startsWith(FORM_URLENCODED_MEDIA) && isObject) {
    return {
      stmts: emitFormUrlEncodedBody(schema, method),
      needsMultipart: false,
    };
  }

  return {
    stmts: [emitMethodWithRawBody(method, mt || "application/octet-stream")],
    needsMultipart: false,
  };
}

const TO_REQUEST_BODY = "toRequestBody";

function toMediaTypeCall(mt: string): KtExpr {
  return ktCall(ktMember(ktStr(mt), "toMediaType"), []);
}

function emitJsonBody(method: HttpMethod, bodyType: KtType): KtStmt[] {
  // val payload = client.json.encodeToString(<serializer>, body)
  // builder.method("POST", payload.toRequestBody("application/json".toMediaType()))
  return [
    ktVal(
      "payload",
      ktCall(ktMember(ktMember(ktIdent("client"), "json"), "encodeToString"), [
        ktArg(serializerFor(bodyType)),
        ktArg(ktIdent("body")),
      ]),
    ),
    setMethodWithBody(
      method,
      ktCall(ktMember(ktIdent("payload"), TO_REQUEST_BODY), [
        ktArg(toMediaTypeCall("application/json")),
      ]),
    ),
  ];
}

function emitMethodWithRawBody(method: HttpMethod, mt: string): KtStmt {
  return setMethodWithBody(
    method,
    ktCall(ktMember(ktIdent("body"), TO_REQUEST_BODY), [
      ktArg(toMediaTypeCall(mt)),
    ]),
  );
}

function emitMultipartBody(
  schema: IR.SchemaObject,
  method: HttpMethod,
): KtStmt[] {
  const required = new Set(schema.required ?? []);
  const stmts: KtStmt[] = [
    ktVal("multipart", ktCall(ktIdent("MultipartFormBody"), [])),
  ];
  for (const [propName, propSchema] of Object.entries(
    schema.properties ?? {},
  )) {
    const id = paramIdent(propName);
    const isBinary =
      propSchema.type === "string" && propSchema.format === "binary";
    const append: KtStmt = isBinary
      ? ktExprStmt(
          ktCall(ktMember(ktIdent("multipart"), "appendFile"), [
            ktArg(ktStr(propName)),
            ktArg(ktStr(propName)),
            ktArg(ktIdent(id)),
          ]),
        )
      : ktExprStmt(
          ktCall(ktMember(ktIdent("multipart"), "appendText"), [
            ktArg(ktStr(propName)),
            ktArg(ktInterp([ktIdent(id)])),
          ]),
        );
    stmts.push(
      required.has(propName)
        ? append
        : ktIf(ktNe(ktIdent(id), ktNull), [append]),
    );
  }
  stmts.push(
    setMethodWithBody(
      method,
      ktCall(ktMember(ktIdent("multipart"), "build"), []),
    ),
  );
  return stmts;
}

function emitFormUrlEncodedBody(
  schema: IR.SchemaObject,
  method: HttpMethod,
): KtStmt[] {
  const required = new Set(schema.required ?? []);
  const stmts: KtStmt[] = [
    ktVal("formBuilder", ktCall(ktIdent("FormBody.Builder"), [])),
  ];
  for (const propName of Object.keys(schema.properties ?? {})) {
    const id = paramIdent(propName);
    const append: KtStmt = ktExprStmt(
      ktCall(ktMember(ktIdent("formBuilder"), "add"), [
        ktArg(ktStr(propName)),
        ktArg(ktInterp([ktIdent(id)])),
      ]),
    );
    stmts.push(
      required.has(propName)
        ? append
        : ktIf(ktNe(ktIdent(id), ktNull), [append]),
    );
  }
  stmts.push(
    setMethodWithBody(
      method,
      ktCall(ktMember(ktIdent("formBuilder"), "build"), []),
    ),
  );
  return stmts;
}
