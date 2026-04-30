import type { IR } from "@hey-api/shared";
import type { SwStmt } from "../../sw-dsl/index.js";
import {
  swArg,
  swArrayLit,
  swAssign,
  swCall,
  swExprStmt,
  swIdent,
  swIfLet,
  swInterp,
  swLet,
  swMember,
  swStr,
  swString,
  swThrow,
  swTry,
  swVar,
} from "../../sw-dsl/index.js";
import {
  FORM_URLENCODED_MEDIA,
  JSON_MEDIA_RE,
  MULTIPART_FORM_MEDIA,
} from "../constants.js";
import { paramIdent } from "../identifiers.js";
import { isOpaqueJsonBody } from "../operation/body.js";

export interface BodyResult {
  stmts: ReadonlyArray<SwStmt>;
  /**
   * Set when the body emission used the `MultipartFormBody` runtime
   * helper, so the orchestrator emits the helper class.
   */
  needsMultipart: boolean;
  /**
   * Set when the body emission throws the
   * `URLSessionAPIError.unimplementedBody` sentinel — kept as a fallback
   * for media types we don't yet wire (e.g. exotic form variants).
   */
  needsErrorEnum: boolean;
  /** When true, the body emission terminates the function (e.g. throws). */
  terminates: boolean;
}

/**
 * Wire-encode the request body into `request.httpBody`, dispatching on
 * the body's media type:
 *
 *  - `application/json` (and `+json`) → `try encoder.encode(body)`.
 *  - `multipart/form-data` (object schema) → assemble a
 *    `MultipartFormBody`, append text/file fields per property,
 *    `request.httpBody = multipart.finalize()`.
 *  - `application/x-www-form-urlencoded` (object schema) → URL-encode
 *    the property pairs and set the body as percent-encoded `Data`.
 *  - octet-stream / image / etc. → `request.httpBody = body` (raw `Data`).
 */
export function buildBodyStmts(body: IR.BodyObject): BodyResult {
  const mt = (body.mediaType ?? "").toLowerCase();
  const schema = body.schema;
  const isObjectSchema = schema.type === "object" && Boolean(schema.properties);

  if (!mt || JSON_MEDIA_RE.test(mt)) {
    // `oneOf` (and similar) collapses to `Any` at the type layer, which
    // can't go through `JSONEncoder.encode`. The param became `Data` in
    // `operation/body.ts`; mirror that here by emitting the raw-bytes
    // wire path instead of `try encoder.encode(body)`.
    const stmts = isOpaqueJsonBody(schema)
      ? rawBinaryBody("application/json")
      : jsonBody();
    return {
      stmts,
      terminates: false,
      needsErrorEnum: false,
      needsMultipart: false,
    };
  }

  if (mt.startsWith(MULTIPART_FORM_MEDIA) && isObjectSchema) {
    return {
      stmts: multipartBody(schema),
      terminates: false,
      needsErrorEnum: false,
      needsMultipart: true,
    };
  }

  if (mt.startsWith(FORM_URLENCODED_MEDIA) && isObjectSchema) {
    return {
      stmts: formUrlEncodedBody(schema),
      terminates: false,
      needsErrorEnum: false,
      needsMultipart: false,
    };
  }

  return {
    stmts: rawBinaryBody(mt || "application/octet-stream"),
    terminates: false,
    needsErrorEnum: false,
    needsMultipart: false,
  };
}

function setContentType(value: string | SwStmt): SwStmt {
  if (typeof value !== "string") return value;
  return swExprStmt(
    swCall(swMember(swIdent("request"), "setValue"), [
      swArg(swStr(value)),
      swArg(swStr("Content-Type"), "forHTTPHeaderField"),
    ]),
  );
}

function jsonBody(): ReadonlyArray<SwStmt> {
  return [
    setContentType("application/json"),
    swAssign(
      swMember(swIdent("request"), "httpBody"),
      swTry(
        swCall(swMember(swMember(swIdent("client"), "encoder"), "encode"), [
          swArg(swIdent("body")),
        ]),
      ),
    ),
  ];
}

function rawBinaryBody(mt: string): ReadonlyArray<SwStmt> {
  return [
    setContentType(mt),
    swAssign(swMember(swIdent("request"), "httpBody"), swIdent("body")),
  ];
}

/**
 * For each property: a binary field (`type: string, format: binary`)
 * appends as a file part (`MultipartFormBody.append(blob, name:filename:)`);
 * everything else interpolates into a text part.
 *
 * Optional fields are wrapped in `if let`, since the impl-method param
 * is Optional too.
 */
function multipartBody(schema: IR.SchemaObject): ReadonlyArray<SwStmt> {
  const required = new Set(schema.required ?? []);
  const stmts: SwStmt[] = [
    swLet("multipart", swCall(swIdent("MultipartFormBody"), [])),
  ];
  for (const [propName, propSchema] of Object.entries(
    schema.properties ?? {},
  )) {
    const id = paramIdent(propName);
    const isBinary =
      propSchema.type === "string" && propSchema.format === "binary";
    const append: SwStmt = isBinary
      ? swExprStmt(
          swCall(swMember(swIdent("multipart"), "append"), [
            swArg(swIdent(id)),
            swArg(swStr(propName), "name"),
            swArg(swStr(propName), "filename"),
          ]),
        )
      : swExprStmt(
          swCall(swMember(swIdent("multipart"), "append"), [
            swArg(swInterp([swIdent(id)])),
            swArg(swStr(propName), "name"),
          ]),
        );
    stmts.push(
      required.has(propName) ? append : swIfLet(id, swIdent(id), [append]),
    );
  }
  stmts.push(
    swExprStmt(
      swCall(swMember(swIdent("request"), "setValue"), [
        swArg(swMember(swIdent("multipart"), "contentType")),
        swArg(swStr("Content-Type"), "forHTTPHeaderField"),
      ]),
    ),
  );
  stmts.push(
    swAssign(
      swMember(swIdent("request"), "httpBody"),
      swCall(swMember(swIdent("multipart"), "finalize"), []),
    ),
  );
  return stmts;
}

/**
 * Build an `application/x-www-form-urlencoded` body from an object
 * schema's properties — one `name=value` pair per property, joined with
 * `&`. Each value goes through `URLEncoding.formField(_:)` for proper
 * percent-encoding.
 *
 * For now this uses a small inline composition rather than emitting a
 * dedicated runtime helper — only one media type uses it and the shape
 * is straightforward.
 */
function formUrlEncodedBody(schema: IR.SchemaObject): ReadonlyArray<SwStmt> {
  const required = new Set(schema.required ?? []);
  const stmts: SwStmt[] = [swVar("formPairs", swArrayLit([], swString))];
  for (const propName of Object.keys(schema.properties ?? {})) {
    const id = paramIdent(propName);
    const append = swExprStmt(
      swCall(swMember(swIdent("formPairs"), "append"), [
        swArg(swInterp([propName, "=", swIdent(id)])),
      ]),
    );
    stmts.push(
      required.has(propName) ? append : swIfLet(id, swIdent(id), [append]),
    );
  }
  stmts.push(setContentType("application/x-www-form-urlencoded"));
  stmts.push(
    swAssign(
      swMember(swIdent("request"), "httpBody"),
      swCall(
        swMember(
          swCall(swMember(swIdent("formPairs"), "joined"), [
            swArg(swStr("&"), "separator"),
          ]),
          "data",
        ),
        [swArg({ kind: "dotCase", name: "utf8" }, "using")],
      ),
    ),
  );
  return stmts;
}

/** Backwards-compat sentinel — kept around but no longer used by the
 * built-in multipart/form paths now that they have real wire encoders. */
export function unimplementedBodyStmts(
  mediaType: string,
): ReadonlyArray<SwStmt> {
  return [
    swThrow(
      swCall(swMember(swIdent("URLSessionAPIError"), "unimplementedBody"), [
        swArg(swStr(mediaType), "mediaType"),
      ]),
    ),
  ];
}
