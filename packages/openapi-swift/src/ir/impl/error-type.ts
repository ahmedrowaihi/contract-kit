import {
  type SwDecl,
  swAssoc,
  swEnum,
  swEnumCase,
} from "../../sw-dsl/index.js";
import { swString } from "../../sw-dsl/type/index.js";

/**
 * Sentinel error thrown by impl methods that don't yet wire-encode their
 * body (multipart, form-urlencoded). Consumers either subclass / override
 * the impl, or pattern-match on this case.
 */
export function urlSessionAPIErrorEnum(): SwDecl {
  return swEnum({
    name: "URLSessionAPIError",
    conforms: ["Error"],
    cases: [
      swEnumCase("unimplementedBody", undefined, [
        swAssoc(swString, "mediaType"),
      ]),
    ],
  });
}
