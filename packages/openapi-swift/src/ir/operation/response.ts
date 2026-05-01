import { synthName } from "@ahmedrowaihi/codegen-core";
import { isMeaningless } from "@ahmedrowaihi/oas-core";
import type { IR } from "@hey-api/shared";

import type { SwType } from "../../sw-dsl/index.js";
import {
  swAssoc,
  swEnum,
  swEnumCase,
  swRef,
  swVoid,
} from "../../sw-dsl/index.js";
import type { TypeCtx } from "../type/index.js";
import { schemaToType } from "../type/index.js";
import type { ResponseCase } from "./signature.js";

export interface ResolvedReturn {
  type: SwType;
  /**
   * Per-status-code cases when the op has more than one 2xx response.
   * Empty for single-2xx ops — the impl decodes straight into `type`
   * (which is `Void` or the schema type). Non-empty means `type` is a
   * `swRef` to an emitted sum-type enum and the impl must dispatch on
   * `httpResponse.statusCode` to pick the matching case.
   */
  cases: ReadonlyArray<ResponseCase>;
}

/**
 * Resolve the success-path return shape for an op.
 *
 *  - 0 successful responses                → `Void`
 *  - 1 successful response, empty schema   → `Void`
 *  - 1 successful response, schema         → schema type
 *  - 2+ successful responses               → emit `<Owner>_Response`
 *    sum-type enum, return a ref + the per-status case info
 */
export function returnTypeFor(
  op: IR.OperationObject,
  ctx: TypeCtx,
): ResolvedReturn {
  const success = Object.entries(op.responses ?? {})
    .filter(([k]) => /^2\d\d$/.test(k))
    .sort(([a], [b]) => a.localeCompare(b));

  if (success.length === 0) return { type: swVoid, cases: [] };

  if (success.length === 1) {
    const [, resp] = success[0]!;
    if (!resp?.schema || isMeaningless(resp.schema)) {
      return { type: swVoid, cases: [] };
    }
    return { type: schemaToType(resp.schema, ctx), cases: [] };
  }

  return emitMultiResponseEnum(success, ctx);
}

function emitMultiResponseEnum(
  responses: ReadonlyArray<readonly [string, IR.ResponseObject | undefined]>,
  ctx: TypeCtx,
): ResolvedReturn {
  const enumName = synthName(ctx.ownerName, ["response"]);
  const cases: ResponseCase[] = responses.map(([code, resp]) => {
    const schema = resp?.schema;
    const isVoid = !schema || isMeaningless(schema);
    const caseName = `status${code}`;
    if (isVoid) return { statusCode: code, caseName };
    const payloadType = schemaToType(schema, {
      ...ctx,
      propPath: ["response", code],
    });
    return { statusCode: code, caseName, payloadType };
  });
  ctx.emit(
    swEnum({
      name: enumName,
      access: "public",
      cases: cases.map((c) =>
        swEnumCase(
          c.caseName,
          undefined,
          c.payloadType ? [swAssoc(c.payloadType)] : undefined,
        ),
      ),
    }),
  );
  return { type: swRef(enumName), cases };
}
