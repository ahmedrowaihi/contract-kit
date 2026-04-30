import type { SwDecl } from "../../sw-dsl/index.js";
import {
  swAssoc,
  swData,
  swEnum,
  swEnumCase,
  swInt,
  swRef,
} from "../../sw-dsl/index.js";

/**
 * The typed error every impl method throws on non-2xx responses.
 *
 *  - `clientError(statusCode:body:)`     — 4XX
 *  - `serverError(statusCode:body:)`     — 5XX
 *  - `unexpectedStatus(statusCode:body:)`— 1XX/3XX/anything outside 2-5
 *  - `decodingFailed(_:)`                — JSONDecoder threw on a 2XX body
 *  - `transport(_:)`                     — URLSession/network-layer failure
 *
 * Consumers `catch` and pattern-match. Bodies are surfaced as raw `Data`
 * so callers can decode error envelopes themselves with the codec they
 * prefer (we don't tie them to a specific server-side error schema).
 */
export function apiErrorEnum(): SwDecl {
  const errorRef = swRef("Error");
  return swEnum({
    name: "APIError",
    access: "public",
    conforms: ["Error"],
    runtime: true,
    cases: [
      swEnumCase("clientError", undefined, [
        swAssoc(swInt, "statusCode"),
        swAssoc(swData, "body"),
      ]),
      swEnumCase("serverError", undefined, [
        swAssoc(swInt, "statusCode"),
        swAssoc(swData, "body"),
      ]),
      swEnumCase("unexpectedStatus", undefined, [
        swAssoc(swInt, "statusCode"),
        swAssoc(swData, "body"),
      ]),
      swEnumCase("decodingFailed", undefined, [swAssoc(errorRef)]),
      swEnumCase("transport", undefined, [swAssoc(errorRef)]),
    ],
  });
}
