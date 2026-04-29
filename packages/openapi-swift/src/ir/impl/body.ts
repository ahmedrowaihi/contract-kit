import type { IR } from "@hey-api/shared";
import type { SwStmt } from "../../sw-dsl/index.js";
import {
  swArg,
  swAssign,
  swCall,
  swExprStmt,
  swIdent,
  swMember,
  swStr,
  swThrow,
  swTry,
} from "../../sw-dsl/index.js";
import {
  FORM_URLENCODED_MEDIA,
  JSON_MEDIA_RE,
  MULTIPART_FORM_MEDIA,
} from "../constants.js";

export interface BodyResult {
  stmts: ReadonlyArray<SwStmt>;
  /** When true, the last statement aborts (`throw`); the orchestrator
   * skips emitting send/decode after this. */
  terminates: boolean;
  /** When true, the spec uses a media type whose impl throws our
   * sentinel error; the orchestrator emits the support enum. */
  needsErrorEnum: boolean;
}

/**
 * Wire-encode the request body into `request.httpBody`, dispatching on
 * the body's media type:
 *  - JSON → encode `body` via `encoder` and set Content-Type.
 *  - octet-stream / image / etc. → set `request.httpBody = body` directly.
 *  - multipart / form-urlencoded → throw a sentinel; consumer overrides.
 */
export function buildBodyStmts(body: IR.BodyObject): BodyResult {
  const mt = (body.mediaType ?? "").toLowerCase();
  if (!mt || JSON_MEDIA_RE.test(mt))
    return { stmts: jsonBody(), terminates: false, needsErrorEnum: false };
  if (mt.startsWith(MULTIPART_FORM_MEDIA))
    return {
      stmts: unimplemented(MULTIPART_FORM_MEDIA),
      terminates: true,
      needsErrorEnum: true,
    };
  if (mt.startsWith(FORM_URLENCODED_MEDIA))
    return {
      stmts: unimplemented(FORM_URLENCODED_MEDIA),
      terminates: true,
      needsErrorEnum: true,
    };
  return {
    stmts: rawBinaryBody(mt || "application/octet-stream"),
    terminates: false,
    needsErrorEnum: false,
  };
}

function setContentType(value: string): SwStmt {
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
        swCall(swMember(swIdent("encoder"), "encode"), [
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

function unimplemented(mediaType: string): ReadonlyArray<SwStmt> {
  return [
    swThrow(
      swCall(swMember(swIdent("URLSessionAPIError"), "unimplementedBody"), [
        swArg(swStr(mediaType), "mediaType"),
      ]),
    ),
  ];
}
