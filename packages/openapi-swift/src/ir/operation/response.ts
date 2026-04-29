import type { IR } from "@hey-api/shared";

import { type SwType, swVoid } from "../../sw-dsl/type/index.js";
import { isMeaningless } from "../ref.js";
import type { TypeCtx } from "../type/index.js";
import { schemaToType } from "../type/index.js";

/**
 * The success-path return type for an operation. Picks the first 2xx
 * status and decodes its `application/json` schema; empty schemas (204
 * or `{}`) collapse to `Void`.
 */
export function returnTypeFor(op: IR.OperationObject, ctx: TypeCtx): SwType {
  const responses = op.responses ?? {};
  const successCode = Object.keys(responses).find((k) => /^2\d\d$/.test(k));
  if (!successCode) return swVoid;
  const resp = responses[successCode];
  if (!resp?.schema || isMeaningless(resp.schema)) return swVoid;
  return schemaToType(resp.schema, ctx);
}
