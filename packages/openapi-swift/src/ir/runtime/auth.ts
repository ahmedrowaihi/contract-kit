import type { SwDecl, SwExpr, SwStmt } from "../../sw-dsl/index.js";
import {
  swArg,
  swAssoc,
  swCall,
  swCase,
  swEnum,
  swEnumCase,
  swEnumPattern,
  swExprStmt,
  swFun,
  swFunParam,
  swIdent,
  swIfLet,
  swInterp,
  swMember,
  swRef,
  swReturn,
  swStr,
  swString,
  swSwitch,
  swVar,
} from "../../sw-dsl/index.js";

/**
 * Emit the runtime `Auth` enum + its `apply(to:)` helper. Three cases
 * cover the OpenAPI security schemes consumers reach for in practice:
 *
 *  - `bearer(token:)` — `Authorization: Bearer <token>`.
 *  - `apiKey(name:value:)` — header named `<name>` with value `<value>`.
 *  - `basic(username:password:)` — `Authorization: Basic <base64>`.
 *
 * The generator does not generate per-method auth wiring. Consumers
 * compose `Auth` with the impl class's `requestDecorator` hook:
 *
 *   api.requestDecorator = { req in Auth.bearer(token: token).apply(to: req) }
 */
export function authDecls(): ReadonlyArray<SwDecl> {
  return [authEnum()];
}

function authEnum(): SwDecl {
  return swEnum({
    name: "Auth",
    access: "public",
    runtime: true,
    cases: [
      swEnumCase("bearer", undefined, [swAssoc(swString, "token")]),
      swEnumCase("apiKey", undefined, [
        swAssoc(swString, "name"),
        swAssoc(swString, "value"),
      ]),
      swEnumCase("basic", undefined, [
        swAssoc(swString, "username"),
        swAssoc(swString, "password"),
      ]),
    ],
    funs: [applyToFunction()],
  });
}

/**
 * `func apply(to request: URLRequest) -> URLRequest`
 * Mutates a copy of the request to attach the auth header(s) and
 * returns it.
 */
function applyToFunction() {
  return swFun({
    name: "apply",
    access: "public",
    params: [
      swFunParam({
        name: "request",
        label: "to",
        type: swRef("URLRequest"),
      }),
    ],
    returnType: swRef("URLRequest"),
    body: [
      swVar("request", swIdent("request")),
      swSwitch(swIdent("self"), [bearerCase(), apiKeyCase(), basicCase()]),
      swReturn(swIdent("request")),
    ],
  });
}

function bearerCase() {
  return swCase(
    [swEnumPattern("bearer", ["token"])],
    [
      setHeader(
        swInterp(["Bearer ", swIdent("token")]),
        swStr("Authorization"),
      ),
    ],
  );
}

function apiKeyCase() {
  return swCase(
    [swEnumPattern("apiKey", ["name", "value"])],
    [setHeader(swIdent("value"), swIdent("name"))],
  );
}

function basicCase() {
  return swCase(
    [swEnumPattern("basic", ["username", "password"])],
    [
      // `if let data = "<u>:<p>".data(using: .utf8) { ... }`
      swIfLet("data", dataFromCredentialsString(), [
        setHeader(
          swInterp([
            "Basic ",
            swCall(swMember(swIdent("data"), "base64EncodedString"), []),
          ]),
          swStr("Authorization"),
        ),
      ]),
    ],
  );
}

function dataFromCredentialsString(): SwExpr {
  // `"\(username):\(password)".data(using: .utf8)`
  const credentials = swInterp([swIdent("username"), ":", swIdent("password")]);
  return swCall(swMember(credentials, "data"), [
    swArg({ kind: "dotCase", name: "utf8" }, "using"),
  ]);
}

/** `request.setValue(<value>, forHTTPHeaderField: <field>)` */
function setHeader(value: SwExpr, field: SwExpr): SwStmt {
  return swExprStmt(
    swCall(swMember(swIdent("request"), "setValue"), [
      swArg(value),
      swArg(field, "forHTTPHeaderField"),
    ]),
  );
}
