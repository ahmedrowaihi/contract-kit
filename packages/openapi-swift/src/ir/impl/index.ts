import type {
  SwClass,
  SwClassModifier,
  SwExpr,
  SwFun,
  SwStmt,
} from "../../sw-dsl/index.js";
import {
  swArg,
  swArrayLit,
  swAssign,
  swCall,
  swClass,
  swExprStmt,
  swForIn,
  swFun,
  swFunParam,
  swIdent,
  swIfLet,
  swInit,
  swLet,
  swMember,
  swProp,
  swRef,
  swStr,
  swSubscript,
} from "../../sw-dsl/index.js";
import type { OperationSignature } from "../operation/signature.js";
import { buildBodyStmts } from "./body.js";
import { buildSendAndDecodeStmts } from "./decode.js";
import { buildHeaderStmts } from "./headers.js";
import { buildRequestStmts } from "./request.js";
import { buildUrlStmts } from "./url.js";

interface BuiltMethod {
  fun: SwFun;
  needsErrorEnum: boolean;
  needsMultipart: boolean;
}

/**
 * Compose statement-level builders into the full body of a single impl
 * method. Order:
 *  1. Resolve per-call overrides — `client = options.client ?? self.client`
 *     and `baseURL = options.baseURL ?? client.baseURL`. Subsequent
 *     statements reference the locals; `self.client` only shows up here.
 *  2. URL + URLComponents/queryItems
 *  3. URLRequest construction + httpMethod
 *  4. Header `setValue` calls (operation-defined headers)
 *  5. Body wire encoding (JSON / multipart / form / binary)
 *  6. Apply `options.headers` overrides (last write wins so callers can
 *     override Content-Type if they really want)
 *  7. Delegate to `client.execute(...)` with `extraInterceptors:
 *     options.requestInterceptors`
 *
 * Step 7 (and the per-call header step) are skipped when the body
 * builder terminates (`throw`) to avoid emitting unreachable code.
 */
function buildImplFun(sig: OperationSignature): BuiltMethod {
  const stmts: SwStmt[] = [];
  stmts.push(...resolveOverrideStmts());
  stmts.push(...buildUrlStmts(sig.pathStr, sig.locatedParams));
  stmts.push(...buildRequestStmts(sig.method));
  stmts.push(applyOptionsTimeoutStmt());
  stmts.push(...buildHeaderStmts(sig.locatedParams));

  let needsErrorEnum = false;
  let needsMultipart = false;
  let terminated = false;
  if (sig.op.body) {
    const result = buildBodyStmts(sig.op.body);
    stmts.push(...result.stmts);
    needsErrorEnum = result.needsErrorEnum;
    needsMultipart = result.needsMultipart;
    terminated = result.terminates;
  }
  if (!terminated) {
    if (sig.securitySchemeNames.length > 0) {
      stmts.push(...applyAuthStmts(sig.securitySchemeNames));
    }
    stmts.push(applyOptionsHeadersStmt());
    stmts.push(...buildSendAndDecodeStmts(sig));
  }

  const fun = swFun({
    name: sig.name,
    params: sig.params,
    returnType: sig.returnType,
    effects: ["async", "throws"],
    doc: sig.doc,
    body: stmts,
  });
  return { fun, needsErrorEnum, needsMultipart };
}

/** `let client = options.client ?? self.client`; same shape for `baseURL`. */
function resolveOverrideStmts(): ReadonlyArray<SwStmt> {
  return [
    swLet(
      "client",
      coalesce(
        swMember(swIdent("options"), "client"),
        swMember(swIdent("self"), "client"),
      ),
    ),
    swLet(
      "baseURL",
      coalesce(
        swMember(swIdent("options"), "baseURL"),
        swMember(swIdent("client"), "baseURL"),
      ),
    ),
  ];
}

/**
 * `if let timeout = options.timeout { request.timeoutInterval = timeout }`
 * — per-call override of `URLRequest.timeoutInterval`, set right after
 * the request is built so subsequent steps see the final value.
 */
function applyOptionsTimeoutStmt(): SwStmt {
  return swIfLet("timeout", swMember(swIdent("options"), "timeout"), [
    swAssign(
      swMember(swIdent("request"), "timeoutInterval"),
      swIdent("timeout"),
    ),
  ]);
}

/**
 * `for header in options.headers { request.setValue(header.value, forHTTPHeaderField: header.key) }`
 * — per-call header overrides, applied last so they can replace any
 * Content-Type / auth header the impl already set.
 */
function applyOptionsHeadersStmt(): SwStmt {
  return swForIn("header", swMember(swIdent("options"), "headers"), [
    swExprStmt(
      swCall(swMember(swIdent("request"), "setValue"), [
        swArg(swMember(swIdent("header"), "value")),
        swArg(swMember(swIdent("header"), "key"), "forHTTPHeaderField"),
      ]),
    ),
  ]);
}

function coalesce(lhs: SwExpr, rhs: SwExpr): SwExpr {
  return { kind: "binOp", op: "??", left: lhs, right: rhs };
}

/**
 * Walk the spec-defined security-scheme names for this op; if the
 * consumer has any of them configured on `client.auth`, apply it to
 * the in-flight request.
 *
 * @example
 * ```swift
 * for schemeName in ["petstore_auth", "api_key"] {
 *     if let auth = client.auth[schemeName] {
 *         request = auth.apply(to: request)
 *     }
 * }
 * ```
 */
function applyAuthStmts(
  schemeNames: ReadonlyArray<string>,
): ReadonlyArray<SwStmt> {
  return [
    swForIn("schemeName", swArrayLit(schemeNames.map((n) => swStr(n))), [
      swIfLet(
        "auth",
        swSubscript(swMember(swIdent("client"), "auth"), swIdent("schemeName")),
        [
          swAssign(
            swIdent("request"),
            swCall(swMember(swIdent("auth"), "apply"), [
              swArg(swIdent("request"), "to"),
            ]),
          ),
        ],
      ),
    ]),
  ];
}

export interface ClientClassResult {
  /** The impl class itself. */
  class: SwClass;
  /** True when at least one method emitted the unimplemented-body throw,
   * so the orchestrator should also emit `URLSessionAPIError`. */
  needsErrorEnum: boolean;
  /** True when at least one method uses the `MultipartFormBody` helper,
   * so the orchestrator should emit it. */
  needsMultipart: boolean;
}

export interface ClientClassOptions {
  /** When true, the class is `open` (subclassable) instead of `final`. Default: `false`. */
  open?: boolean;
}

/**
 * Convert a list of `OperationSignature`s for a tag into a class that
 * conforms to the matching protocol and contains a working URLSession-
 * based impl for each operation. The class holds a single `client:
 * APIClient` and delegates send/dispatch/decode to it.
 */
export function buildClientClass(
  className: string,
  protocolName: string,
  signatures: ReadonlyArray<OperationSignature>,
  opts: ClientClassOptions = {},
): ClientClassResult {
  const built = signatures.map(buildImplFun);
  const modifiers: ReadonlyArray<SwClassModifier> = opts.open
    ? ["open"]
    : ["final"];
  const cls = swClass({
    name: className,
    conforms: [protocolName],
    modifiers,
    properties: [
      swProp({ name: "client", type: swRef("APIClient"), access: "internal" }),
    ],
    inits: [
      swInit({
        params: [swFunParam({ name: "client", type: swRef("APIClient") })],
      }),
    ],
    funs: built.map((b) => b.fun),
  });
  return {
    class: cls,
    needsErrorEnum: built.some((b) => b.needsErrorEnum),
    needsMultipart: built.some((b) => b.needsMultipart),
  };
}
