import type { SwDecl } from "../../sw-dsl/index.js";
import { swAssoc, swEnum, swEnumCase, swString } from "../../sw-dsl/index.js";

/**
 * Sentinel error thrown by impl methods that don't yet wire-encode their
 * body (exotic media types we haven't covered). Consumers either
 * subclass / override the impl, or pattern-match on this case.
 *
 * Kept as a separate enum from `APIError` so that "we don't know how to
 * encode this body" is structurally distinct from "the request failed".
 */
export function unimplementedBodyEnum(): SwDecl {
  return swEnum({
    name: "URLSessionAPIError",
    conforms: ["Error"],
    runtime: true,
    cases: [
      swEnumCase("unimplementedBody", undefined, [
        swAssoc(swString, "mediaType"),
      ]),
    ],
  });
}
