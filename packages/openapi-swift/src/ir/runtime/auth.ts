import type { SwDecl, SwExpr, SwStmt } from "../../sw-dsl/index.js";
import {
  swArg,
  swArrayLit,
  swAssign,
  swAssoc,
  swCall,
  swCase,
  swDotCase,
  swEnum,
  swEnumCase,
  swEnumPattern,
  swExprStmt,
  swFun,
  swFunParam,
  swIdent,
  swIfLet,
  swInterp,
  swLet,
  swMember,
  swRef,
  swReturn,
  swStr,
  swString,
  swSwitch,
  swVar,
} from "../../sw-dsl/index.js";

/**
 * Emit the runtime `Auth` enum + its `apply(to:)` helper. Cases cover
 * the OpenAPI security schemes consumers reach for in practice:
 *
 *  - `bearer(token:)` — `Authorization: Bearer <token>`.
 *  - `apiKey(name:value:in:)` — header / query / cookie placement,
 *    matching the spec's `securitySchemes.<name>.in`.
 *  - `basic(username:password:)` — `Authorization: Basic <base64>`.
 *
 * Per-operation auth is auto-wired by the generator when an op has
 * `security` requirements; it walks the requirement names and applies
 * any matching scheme value the consumer has placed on
 * `APIClient.auth`. `Auth.apply(to:)` does the wire-level mutation.
 */
export function authDecls(): ReadonlyArray<SwDecl> {
  return [apiKeyLocationEnum(), authEnum()];
}

function apiKeyLocationEnum(): SwDecl {
  return swEnum({
    name: "APIKeyLocation",
    access: "public",
    runtime: true,
    cases: [swEnumCase("header"), swEnumCase("query"), swEnumCase("cookie")],
  });
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
        swAssoc(swRef("APIKeyLocation"), "in"),
      ]),
      swEnumCase("basic", undefined, [
        swAssoc(swString, "username"),
        swAssoc(swString, "password"),
      ]),
    ],
    funs: [applyToFunction()],
  });
}

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
    [swEnumPattern("apiKey", ["name", "value", "location"])],
    [
      swSwitch(swIdent("location"), [
        swCase(
          [swDotCase("header")],
          [setHeader(swIdent("value"), swIdent("name"))],
        ),
        swCase([swDotCase("query")], applyAPIKeyToQuery()),
        swCase([swDotCase("cookie")], applyAPIKeyToCookie()),
      ]),
    ],
  );
}

function applyAPIKeyToQuery(): ReadonlyArray<SwStmt> {
  return [
    swIfLet("url", swMember(swIdent("request"), "url"), [
      swIfLet(
        "components",
        swCall(swIdent("URLComponents"), [
          swArg(swIdent("url"), "url"),
          swArg(swIdent("false"), "resolvingAgainstBaseURL"),
        ]),
        [
          swVar("items", {
            kind: "binOp",
            op: "??",
            left: swMember(swIdent("components"), "queryItems"),
            right: swArrayLit([], swRef("URLQueryItem")),
          }),
          swExprStmt(
            swCall(swMember(swIdent("items"), "append"), [
              swArg(
                swCall(swIdent("URLQueryItem"), [
                  swArg(swIdent("name"), "name"),
                  swArg(swIdent("value"), "value"),
                ]),
              ),
            ]),
          ),
          swVar("mutable", swIdent("components")),
          swAssign(
            swMember(swIdent("mutable"), "queryItems"),
            swIdent("items"),
          ),
          swIfLet("rebuilt", swMember(swIdent("mutable"), "url"), [
            swAssign(swMember(swIdent("request"), "url"), swIdent("rebuilt")),
          ]),
        ],
      ),
    ]),
  ];
}

function applyAPIKeyToCookie(): ReadonlyArray<SwStmt> {
  return [
    swLet("cookie", swInterp([swIdent("name"), "=", swIdent("value")])),
    swIfLet(
      "existing",
      swCall(swMember(swIdent("request"), "value"), [
        swArg(swStr("Cookie"), "forHTTPHeaderField"),
      ]),
      [
        setHeader(
          swInterp([swIdent("existing"), "; ", swIdent("cookie")]),
          swStr("Cookie"),
        ),
      ],
      [setHeader(swIdent("cookie"), swStr("Cookie"))],
    ),
  ];
}

function basicCase() {
  return swCase(
    [swEnumPattern("basic", ["username", "password"])],
    [
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
  const credentials = swInterp([swIdent("username"), ":", swIdent("password")]);
  return swCall(swMember(credentials, "data"), [
    swArg({ kind: "dotCase", name: "utf8" }, "using"),
  ]);
}

function setHeader(value: SwExpr, field: SwExpr): SwStmt {
  return swExprStmt(
    swCall(swMember(swIdent("request"), "setValue"), [
      swArg(value),
      swArg(field, "forHTTPHeaderField"),
    ]),
  );
}
