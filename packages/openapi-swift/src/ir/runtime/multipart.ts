import type { SwDecl, SwExpr, SwStmt } from "../../sw-dsl/index.js";
import {
  swArg,
  swAssign,
  swCall,
  swClass,
  swData,
  swExprStmt,
  swFun,
  swFunParam,
  swIdent,
  swIfLet,
  swInit,
  swInterp,
  swMember,
  swProp,
  swRef,
  swReturn,
  swStr,
  swString,
} from "../../sw-dsl/index.js";

/** Real CR+LF bytes — the printer escapes them to `\r\n` in the Swift source. */
const CRLF = "\r\n";

/**
 * Runtime helper for assembling a `multipart/form-data` request body.
 *
 *  - One `append(_:name:)` overload for text fields.
 *  - One `append(_:name:filename:mimeType:)` overload for file fields.
 *  - `contentType` already includes the chosen boundary; impl methods
 *    feed it directly to `request.setValue(_:forHTTPHeaderField:)`.
 *  - `finalize()` writes the closing boundary and returns the assembled
 *    `Data` for `request.httpBody`.
 *
 * Modeled as a `final class` (reference type) so impl methods can call
 * `multipart.append(...)` without a `mutating var` dance.
 */
export function multipartFormBodyDecl(): SwDecl {
  return swClass({
    name: "MultipartFormBody",
    access: "public",
    modifiers: ["final"],
    runtime: true,
    properties: [
      swProp({ name: "boundary", type: swString, access: "public" }),
      swProp({ name: "contentType", type: swString, access: "public" }),
      swProp({
        name: "data",
        type: swData,
        access: "private",
        mutable: true,
      }),
    ],
    inits: [initMethod()],
    funs: [appendTextFn(), appendBlobFn(), finalizeFn()],
  });
}

function initMethod() {
  return swInit({
    params: [
      swFunParam({
        name: "boundary",
        type: swString,
        default: "UUID().uuidString",
      }),
    ],
    // The auto-emitted `self.boundary = boundary` from the params list
    // runs first; we add the derived stored properties below.
    body: [
      swAssign(
        swMember(swIdent("self"), "contentType"),
        swInterp(["multipart/form-data; boundary=", swIdent("boundary")]),
      ),
      swAssign(swMember(swIdent("self"), "data"), swCall(swIdent("Data"), [])),
    ],
  });
}

/** `func append(_ value: String, name: String)` */
function appendTextFn() {
  return swFun({
    name: "append",
    access: "public",
    params: [
      swFunParam({ name: "value", label: "_", type: swString }),
      swFunParam({ name: "name", type: swString }),
    ],
    returnType: swRef("Void"),
    body: [
      writeBoundary(),
      writeText(
        swInterp([
          'Content-Disposition: form-data; name="',
          swIdent("name"),
          `"${CRLF}${CRLF}`,
        ]),
      ),
      writeText(swIdent("value")),
      writeText(swStr(CRLF)),
    ],
  });
}

/**
 * `func append(_ blob: Data, name: String, filename: String, mimeType: String = "application/octet-stream")`
 */
function appendBlobFn() {
  return swFun({
    name: "append",
    access: "public",
    params: [
      swFunParam({ name: "blob", label: "_", type: swData }),
      swFunParam({ name: "name", type: swString }),
      swFunParam({ name: "filename", type: swString }),
      swFunParam({
        name: "mimeType",
        type: swString,
        default: '"application/octet-stream"',
      }),
    ],
    returnType: swRef("Void"),
    body: [
      writeBoundary(),
      writeText(
        swInterp([
          'Content-Disposition: form-data; name="',
          swIdent("name"),
          '"; filename="',
          swIdent("filename"),
          `"${CRLF}Content-Type: `,
          swIdent("mimeType"),
          `${CRLF}${CRLF}`,
        ]),
      ),
      swExprStmt(
        swCall(swMember(swIdent("data"), "append"), [swArg(swIdent("blob"))]),
      ),
      writeText(swStr(CRLF)),
    ],
  });
}

/** `func finalize() -> Data` — closes the multipart envelope and returns the body. */
function finalizeFn() {
  return swFun({
    name: "finalize",
    access: "public",
    params: [],
    returnType: swData,
    body: [
      writeText(swInterp([`--`, swIdent("boundary"), `--${CRLF}`])),
      swReturn(swIdent("data")),
    ],
  });
}

/** `data.append(<expr>.data(using: .utf8)!)` */
function writeText(value: SwExpr): SwStmt {
  // Use `if let` to avoid a force-unwrap in the rare case a string can't
  // be UTF-8 encoded — but since interpolation always yields valid UTF-8,
  // a direct force-unwrap is also safe. We pick `if let` for safety.
  return swIfLet(
    "encoded",
    swCall(swMember(value, "data"), [
      swArg({ kind: "dotCase", name: "utf8" }, "using"),
    ]),
    [
      swExprStmt(
        swCall(swMember(swIdent("data"), "append"), [
          swArg(swIdent("encoded")),
        ]),
      ),
    ],
  );
}

/** `data.append("--<boundary>\r\n".data(using: .utf8)!)` */
function writeBoundary(): SwStmt {
  return writeText(swInterp([`--`, swIdent("boundary"), CRLF]));
}
