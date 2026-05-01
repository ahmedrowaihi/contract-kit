import type { SwClass, SwFun, SwInit, SwProp } from "../../sw-dsl/index.js";
import {
  swArg,
  swArray,
  swAsOpt,
  swAssign,
  swCall,
  swCase,
  swData,
  swDict,
  swDoCatch,
  swDotCase,
  swExprStmt,
  swForIn,
  swFun,
  swFunc,
  swFunParam,
  swGenericParam,
  swGuardLet,
  swIdent,
  swIfLet,
  swInit,
  swIntLit,
  swLet,
  swMember,
  swOptional,
  swProp,
  swRange,
  swRef,
  swReturn,
  swString,
  swSwitch,
  swThrow,
  swTry,
  swTryAwait,
  swTuple,
  swTupleBinding,
  swTupleType,
  swTypeRef,
  swVar,
  swVoid,
} from "../../sw-dsl/index.js";

const URL_REQUEST = swRef("URLRequest");
const INTERCEPTOR_FN = swFunc([URL_REQUEST], URL_REQUEST, ["async", "throws"]);
const INTERCEPTORS_TYPE = swRef("APIInterceptors");

/**
 * Bag of per-request mutation hooks. Mirrors hey-api's TS client where
 * `client.interceptors.request.use(fn)` registers an interceptor that
 * runs against every outgoing request. Multiple interceptors compose
 * — auth, logging, and tracing all coexist as separate entries
 * instead of being chained inside one closure.
 *
 * @example
 * ```swift
 * public final class APIInterceptors {
 *     public var request: [(URLRequest) async throws -> URLRequest] = []
 *     public init() {}
 * }
 * ```
 */
export function apiInterceptorsDecl(): SwClass {
  return {
    kind: "class",
    name: "APIInterceptors",
    access: "public",
    modifiers: ["final"],
    conforms: [],
    runtime: true,
    properties: [
      swProp({
        name: "request",
        type: swArray(INTERCEPTOR_FN),
        mutable: true,
        access: "public",
        default: "[]",
      }),
    ],
    inits: [swInit({ params: [] })],
    funs: [],
  };
}

/**
 * Runtime helper every per-tag impl class delegates to. Owns the
 * transport-level concerns — `URLSession`, codecs, the interceptor
 * pipeline — and provides one source of truth for status-code
 * dispatch and decoding.
 *
 * @example
 * ```swift
 * public final class APIClient {
 *     public let baseURL: URL
 *     public let session: URLSession
 *     public let decoder: JSONDecoder
 *     public let encoder: JSONEncoder
 *     public let interceptors: APIInterceptors
 *
 *     public init(baseURL: URL, session: URLSession = .shared, …) { … }
 *
 *     public func execute<T: Decodable>(_ request: URLRequest, as type: T.Type) async throws -> T { … }
 *     public func execute(_ request: URLRequest) async throws { … }
 * }
 * ```
 */
export interface ApiClientOptions {
  /**
   * When true, the client carries `var auth: [String: Auth]` keyed by
   * the spec's security-scheme names, and impl methods auto-apply any
   * scheme the consumer has configured. Set when the spec declares any
   * `securitySchemes`.
   */
  hasAuth?: boolean;
}

export function apiClientDecl(opts: ApiClientOptions = {}): SwClass {
  return {
    kind: "class",
    name: "APIClient",
    access: "public",
    modifiers: ["final"],
    conforms: [],
    runtime: true,
    properties: clientProps(opts),
    inits: [clientInit()],
    funs: [
      executeDecodable(),
      executeVoid(),
      executeDecodableWithResponse(),
      executeVoidWithResponse(),
      executeRawFn(),
      sendAndDispatchFn(),
    ],
  };
}

function clientProps(opts: ApiClientOptions): ReadonlyArray<SwProp> {
  const props: SwProp[] = [
    swProp({ name: "baseURL", type: swRef("URL"), access: "public" }),
    swProp({ name: "session", type: swRef("URLSession"), access: "public" }),
    swProp({ name: "decoder", type: swRef("JSONDecoder"), access: "public" }),
    swProp({ name: "encoder", type: swRef("JSONEncoder"), access: "public" }),
    swProp({
      name: "interceptors",
      type: INTERCEPTORS_TYPE,
      access: "public",
    }),
  ];
  if (opts.hasAuth) {
    props.push(
      swProp({
        name: "auth",
        type: swDict(swString, swRef("Auth")),
        mutable: true,
        access: "public",
        default: "[:]",
      }),
    );
  }
  return props;
}

function clientInit(): SwInit {
  return swInit({
    params: [
      swFunParam({ name: "baseURL", type: swRef("URL") }),
      swFunParam({
        name: "session",
        type: swRef("URLSession"),
        default: ".shared",
      }),
      swFunParam({
        name: "decoder",
        type: swRef("JSONDecoder"),
        default: "JSONDecoder()",
      }),
      swFunParam({
        name: "encoder",
        type: swRef("JSONEncoder"),
        default: "JSONEncoder()",
      }),
    ],
    body: [
      swAssign(
        swMember(swIdent("self"), "interceptors"),
        swCall(swIdent("APIInterceptors"), []),
      ),
    ],
  });
}

const VALIDATOR_FN = swFunc([swData, swRef("HTTPURLResponse")], swVoid, [
  "async",
  "throws",
]);
const TRANSFORMER_FN = swFunc([swData], swData, ["async", "throws"]);

function sendAndDispatchCall(): ReturnType<typeof swCall> {
  return swCall(swIdent("sendAndDispatch"), [
    swArg(swIdent("request")),
    swArg(swIdent("extraInterceptors"), "extraInterceptors"),
  ]);
}

/**
 * After `sendAndDispatch` returns the 2xx body + response, run the
 * caller's optional validator and transformer in order. Returns the
 * (possibly transformed) body bound to `body` for the caller to decode.
 */
function applyValidatorAndTransformerStmts(): ReadonlyArray<
  | ReturnType<typeof swLet>
  | ReturnType<typeof swIfLet>
  | ReturnType<typeof swVar>
  | ReturnType<typeof swAssign>
> {
  return [
    swIfLet("validator", swIdent("responseValidator"), [
      swExprStmt(
        swTryAwait(
          swCall(swIdent("validator"), [
            swArg(swIdent("data")),
            swArg(swIdent("httpResponse")),
          ]),
        ),
      ),
    ]),
    swVar("body", swIdent("data")),
    swIfLet("transformer", swIdent("responseTransformer"), [
      swAssign(
        swIdent("body"),
        swTryAwait(swCall(swIdent("transformer"), [swArg(swIdent("data"))])),
      ),
    ]),
  ];
}

function executeDecodable(): SwFun {
  const T = swRef("T");
  return swFun({
    name: "execute",
    access: "public",
    effects: ["async", "throws"],
    generics: [swGenericParam("T", ["Decodable"])],
    params: [
      swFunParam({ name: "request", label: "_", type: URL_REQUEST }),
      swFunParam({ name: "type", label: "as", type: swRef("T.Type") }),
      swFunParam({
        name: "extraInterceptors",
        type: swArray(INTERCEPTOR_FN),
        default: "[]",
      }),
      swFunParam({
        name: "responseValidator",
        type: swOptional(VALIDATOR_FN),
        default: "nil",
      }),
      swFunParam({
        name: "responseTransformer",
        type: swOptional(TRANSFORMER_FN),
        default: "nil",
      }),
    ],
    returnType: T,
    body: [
      swLet(
        swTupleBinding(["data", "httpResponse"]),
        swTryAwait(sendAndDispatchCall()),
      ),
      ...applyValidatorAndTransformerStmts(),
      swDoCatch(
        [
          swReturn(
            swTry(
              swCall(swMember(swIdent("decoder"), "decode"), [
                swArg(swTypeRef(T)),
                swArg(swIdent("body"), "from"),
              ]),
            ),
          ),
        ],
        [
          swThrow(
            swCall(swMember(swIdent("APIError"), "decodingFailed"), [
              swArg(swIdent("error")),
            ]),
          ),
        ],
      ),
    ],
  });
}

/**
 * `func executeWithResponse<T: Decodable>(_:as:…) async throws -> (T, HTTPURLResponse)`
 *
 * Same pipeline as `execute<T>` but bundles the decoded value with the
 * `HTTPURLResponse`. Callers reach for this when they need response
 * headers (pagination cursors, ETag, rate-limit, …).
 */
function executeDecodableWithResponse(): SwFun {
  const T = swRef("T");
  return swFun({
    name: "executeWithResponse",
    access: "public",
    effects: ["async", "throws"],
    generics: [swGenericParam("T", ["Decodable"])],
    params: [
      swFunParam({ name: "request", label: "_", type: URL_REQUEST }),
      swFunParam({ name: "type", label: "as", type: swRef("T.Type") }),
      swFunParam({
        name: "extraInterceptors",
        type: swArray(INTERCEPTOR_FN),
        default: "[]",
      }),
      swFunParam({
        name: "responseValidator",
        type: swOptional(VALIDATOR_FN),
        default: "nil",
      }),
      swFunParam({
        name: "responseTransformer",
        type: swOptional(TRANSFORMER_FN),
        default: "nil",
      }),
    ],
    returnType: swTupleType([T, swRef("HTTPURLResponse")]),
    body: [
      swLet(
        swTupleBinding(["data", "httpResponse"]),
        swTryAwait(sendAndDispatchCall()),
      ),
      ...applyValidatorAndTransformerStmts(),
      swDoCatch(
        [
          swLet(
            "value",
            swTry(
              swCall(swMember(swIdent("decoder"), "decode"), [
                swArg(swTypeRef(T)),
                swArg(swIdent("body"), "from"),
              ]),
            ),
          ),
          swReturn(swTuple([swIdent("value"), swIdent("httpResponse")])),
        ],
        [
          swThrow(
            swCall(swMember(swIdent("APIError"), "decodingFailed"), [
              swArg(swIdent("error")),
            ]),
          ),
        ],
      ),
    ],
  });
}

/**
 * `func executeWithResponse(_:…) async throws -> HTTPURLResponse`
 *
 * Void-returning variant — surfaces the response so callers can read
 * headers from a 204 / no-body endpoint.
 */
function executeVoidWithResponse(): SwFun {
  return swFun({
    name: "executeWithResponse",
    access: "public",
    effects: ["async", "throws"],
    params: [
      swFunParam({ name: "request", label: "_", type: URL_REQUEST }),
      swFunParam({
        name: "extraInterceptors",
        type: swArray(INTERCEPTOR_FN),
        default: "[]",
      }),
      swFunParam({
        name: "responseValidator",
        type: swOptional(VALIDATOR_FN),
        default: "nil",
      }),
    ],
    returnType: swRef("HTTPURLResponse"),
    body: [
      swLet(
        swTupleBinding(["data", "httpResponse"]),
        swTryAwait(sendAndDispatchCall()),
      ),
      swIfLet("validator", swIdent("responseValidator"), [
        swExprStmt(
          swTryAwait(
            swCall(swIdent("validator"), [
              swArg(swIdent("data")),
              swArg(swIdent("httpResponse")),
            ]),
          ),
        ),
      ]),
      swReturn(swIdent("httpResponse")),
    ],
  });
}

function executeVoid(): SwFun {
  return swFun({
    name: "execute",
    access: "public",
    effects: ["async", "throws"],
    params: [
      swFunParam({ name: "request", label: "_", type: URL_REQUEST }),
      swFunParam({
        name: "extraInterceptors",
        type: swArray(INTERCEPTOR_FN),
        default: "[]",
      }),
      swFunParam({
        name: "responseValidator",
        type: swOptional(VALIDATOR_FN),
        default: "nil",
      }),
    ],
    returnType: swRef("Void"),
    body: [
      swLet(
        swTupleBinding(["data", "httpResponse"]),
        swTryAwait(sendAndDispatchCall()),
      ),
      swIfLet("validator", swIdent("responseValidator"), [
        swExprStmt(
          swTryAwait(
            swCall(swIdent("validator"), [
              swArg(swIdent("data")),
              swArg(swIdent("httpResponse")),
            ]),
          ),
        ),
      ]),
    ],
  });
}

/**
 * Runs registered request interceptors in order, sends through
 * `URLSession`, then funnels non-2xx responses into typed `APIError`
 * cases. Returns the raw body `Data` on success so both `execute`
 * overloads can share the dispatch logic.
 *
 * @example
 * ```swift
 * private func sendAndDispatch(_ request: URLRequest) async throws -> Data {
 *     var req = request
 *     for interceptor in interceptors.request {
 *         req = try await interceptor(req)
 *     }
 *     let (data, response) = try await session.data(for: req)
 *     guard let httpResponse = response as? HTTPURLResponse else {
 *         throw APIError.transport(URLError(.badServerResponse))
 *     }
 *     switch httpResponse.statusCode {
 *     case 200..<300: return data
 *     case 400..<500: throw APIError.clientError(statusCode: httpResponse.statusCode, body: data)
 *     case 500..<600: throw APIError.serverError(statusCode: httpResponse.statusCode, body: data)
 *     default: throw APIError.unexpectedStatus(statusCode: httpResponse.statusCode, body: data)
 *     }
 * }
 * ```
 */
/**
 * `func executeRaw(_:…) async throws -> (Data, HTTPURLResponse)`
 *
 * Lowest-level execute — runs interceptors, sends, status-dispatches,
 * applies validator + transformer, then hands the (transformed) body
 * + response back to the caller without decoding. Generated impl
 * methods reach for this when the operation has multiple 2xx response
 * schemas: the impl needs the status code to pick which type to
 * decode into.
 */
function executeRawFn(): SwFun {
  return swFun({
    name: "executeRaw",
    access: "public",
    effects: ["async", "throws"],
    params: [
      swFunParam({ name: "request", label: "_", type: URL_REQUEST }),
      swFunParam({
        name: "extraInterceptors",
        type: swArray(INTERCEPTOR_FN),
        default: "[]",
      }),
      swFunParam({
        name: "responseValidator",
        type: swOptional(VALIDATOR_FN),
        default: "nil",
      }),
      swFunParam({
        name: "responseTransformer",
        type: swOptional(TRANSFORMER_FN),
        default: "nil",
      }),
    ],
    returnType: swTupleType([swData, swRef("HTTPURLResponse")]),
    body: [
      swLet(
        swTupleBinding(["data", "httpResponse"]),
        swTryAwait(sendAndDispatchCall()),
      ),
      ...applyValidatorAndTransformerStmts(),
      swReturn(swTuple([swIdent("body"), swIdent("httpResponse")])),
    ],
  });
}

function sendAndDispatchFn(): SwFun {
  const applyInterceptor = swAssign(
    swIdent("req"),
    swTryAwait(swCall(swIdent("interceptor"), [swArg(swIdent("req"))])),
  );
  return swFun({
    name: "sendAndDispatch",
    access: "private",
    effects: ["async", "throws"],
    params: [
      swFunParam({ name: "request", label: "_", type: URL_REQUEST }),
      swFunParam({
        name: "extraInterceptors",
        type: swArray(INTERCEPTOR_FN),
      }),
    ],
    returnType: swTupleType([swData, swRef("HTTPURLResponse")]),
    body: [
      swVar("req", swIdent("request")),
      // Client-level interceptors run first; per-call ones run after so
      // they see the request post auth/logging.
      swForIn("interceptor", swMember(swIdent("interceptors"), "request"), [
        applyInterceptor,
      ]),
      swForIn("interceptor", swIdent("extraInterceptors"), [applyInterceptor]),
      swLet(
        swTupleBinding(["data", "response"]),
        swTryAwait(
          swCall(swMember(swIdent("session"), "data"), [
            swArg(swIdent("req"), "for"),
          ]),
        ),
      ),
      swGuardLet(
        "httpResponse",
        swAsOpt(swIdent("response"), swRef("HTTPURLResponse")),
        [
          swThrow(
            swCall(swMember(swIdent("APIError"), "transport"), [
              swArg(
                swCall(swIdent("URLError"), [
                  swArg(swDotCase("badServerResponse")),
                ]),
              ),
            ]),
          ),
        ],
      ),
      swSwitch(
        swMember(swIdent("httpResponse"), "statusCode"),
        [
          swCase(
            [swRange(swIntLit(200), swIntLit(300))],
            [swReturn(swTuple([swIdent("data"), swIdent("httpResponse")]))],
          ),
          swCase(
            [swRange(swIntLit(400), swIntLit(500))],
            [throwApiError("clientError")],
          ),
          swCase(
            [swRange(swIntLit(500), swIntLit(600))],
            [throwApiError("serverError")],
          ),
        ],
        [throwApiError("unexpectedStatus")],
      ),
    ],
  });
}

function throwApiError(
  caseName: "clientError" | "serverError" | "unexpectedStatus",
) {
  return swThrow(
    swCall(swMember(swIdent("APIError"), caseName), [
      swArg(swMember(swIdent("httpResponse"), "statusCode"), "statusCode"),
      swArg(swIdent("data"), "body"),
    ]),
  );
}
