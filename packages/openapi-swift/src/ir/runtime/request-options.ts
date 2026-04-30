import type { SwDecl, SwFunParam, SwProp, SwType } from "../../sw-dsl/index.js";
import {
  swArray,
  swData,
  swDict,
  swFunc,
  swFunParam,
  swInit,
  swOptional,
  swProp,
  swRef,
  swString,
  swStruct,
  swVoid,
} from "../../sw-dsl/index.js";

const URL_REQUEST = swRef("URLRequest");
const HTTP_URL_RESPONSE = swRef("HTTPURLResponse");
const INTERCEPTOR_FN = swFunc([URL_REQUEST], URL_REQUEST, ["async", "throws"]);
const VALIDATOR_FN = swFunc([swData, HTTP_URL_RESPONSE], swVoid, [
  "async",
  "throws",
]);
const TRANSFORMER_FN = swFunc([swData], swData, ["async", "throws"]);

/**
 * Per-call options bag — every generated method takes a
 * `RequestOptions` last param. Mirrors hey-api's TS SDK options shape.
 *
 * The struct exposes a manual `public init(...)` with all-defaulted
 * args. We need this because Swift's *synthesized* memberwise init for
 * a public struct is internal-only; consumers from another module
 * couldn't call `RequestOptions()` without it.
 *
 * @example
 * ```swift
 * public struct RequestOptions {
 *     public var client: APIClient? = nil
 *     public var baseURL: URL? = nil
 *     public var timeout: TimeInterval? = nil
 *     public var headers: [String: String] = [:]
 *     public var requestInterceptors: [(URLRequest) async throws -> URLRequest] = []
 *     public var responseValidator: ((Data, HTTPURLResponse) async throws -> Void)? = nil
 *     public var responseTransformer: ((Data) async throws -> Data)? = nil
 *
 *     public init(client: APIClient? = nil, …) { … }
 * }
 * ```
 */
export function requestOptionsDecl(): SwDecl {
  const fields: ReadonlyArray<{ name: string; type: SwType; default: string }> =
    [
      { name: "client", type: swOptional(swRef("APIClient")), default: "nil" },
      { name: "baseURL", type: swOptional(swRef("URL")), default: "nil" },
      {
        name: "timeout",
        type: swOptional(swRef("TimeInterval")),
        default: "nil",
      },
      { name: "headers", type: swDict(swString, swString), default: "[:]" },
      {
        name: "requestInterceptors",
        type: swArray(INTERCEPTOR_FN),
        default: "[]",
      },
      {
        name: "responseValidator",
        type: swOptional(VALIDATOR_FN),
        default: "nil",
      },
      {
        name: "responseTransformer",
        type: swOptional(TRANSFORMER_FN),
        default: "nil",
      },
    ];
  const properties: SwProp[] = fields.map((f) =>
    swProp({
      name: f.name,
      type: f.type,
      mutable: true,
      access: "public",
      default: f.default,
    }),
  );
  const initParams: SwFunParam[] = fields.map((f) =>
    swFunParam({ name: f.name, type: f.type, default: f.default }),
  );
  return {
    ...swStruct({
      name: "RequestOptions",
      access: "public",
      properties,
      inits: [swInit({ params: initParams })],
    }),
    runtime: true,
  };
}
