import { synthName } from "@ahmedrowaihi/codegen-core";
import { isMeaningless } from "@ahmedrowaihi/openapi-core";
import type { IR } from "@hey-api/shared";

import {
  type KtType,
  ktProp,
  ktRef,
  ktSealedClass,
  ktSealedSubclass,
  ktUnit,
} from "../../kt-dsl/index.js";
import type { TypeCtx } from "../type/index.js";
import { schemaToType } from "../type/index.js";
import type { ResponseCase } from "./signature.js";

export interface ResolvedReturn {
  type: KtType;
  /**
   * Per-status-code cases when the op has more than one 2xx response.
   * Empty for single-2xx ops — the impl decodes straight into `type`
   * (which is `Unit` or the schema type). Non-empty means `type` is a
   * `ktRef` to an emitted sealed-class hierarchy and the impl must
   * dispatch on `response.code` to pick the matching subclass.
   */
  cases: ReadonlyArray<ResponseCase>;
}

/**
 * Resolve the success-path return shape for an op.
 *
 *  - 0 successful responses                → `Unit`
 *  - 1 successful response, empty schema   → `Unit`
 *  - 1 successful response, schema         → schema type
 *  - 2+ successful responses               → emit `<Owner>_Response`
 *    sealed-class hierarchy, return a ref + the per-status case info
 */
export function returnTypeFor(
  op: IR.OperationObject,
  ctx: TypeCtx,
): ResolvedReturn {
  const success = Object.entries(op.responses ?? {})
    .filter(([k]) => /^2\d\d$/.test(k))
    .sort(([a], [b]) => a.localeCompare(b));

  if (success.length === 0) return { type: ktUnit, cases: [] };

  if (success.length === 1) {
    const [, resp] = success[0]!;
    if (!resp?.schema || isMeaningless(resp.schema)) {
      return { type: ktUnit, cases: [] };
    }
    return { type: schemaToType(resp.schema, ctx), cases: [] };
  }

  return emitMultiResponseSealed(success, ctx);
}

function emitMultiResponseSealed(
  responses: ReadonlyArray<readonly [string, IR.ResponseObject | undefined]>,
  ctx: TypeCtx,
): ResolvedReturn {
  const sealedName = synthName(ctx.ownerName, ["response"]);
  const cases: ResponseCase[] = responses.map(([code, resp]) => {
    const schema = resp?.schema;
    const isVoid = !schema || isMeaningless(schema);
    const caseName = `Status${code}`;
    if (isVoid) return { statusCode: code, caseName };
    const payloadType = schemaToType(schema, {
      ...ctx,
      propPath: ["response", code],
    });
    return { statusCode: code, caseName, payloadType };
  });
  ctx.emit(
    ktSealedClass({
      name: sealedName,
      subclasses: cases.map((c) =>
        c.payloadType
          ? ktSealedSubclass({
              variant: "class",
              name: c.caseName,
              properties: [
                ktProp({
                  name: "value",
                  type: c.payloadType,
                  inPrimary: true,
                }),
              ],
            })
          : ktSealedSubclass({ variant: "object", name: c.caseName }),
      ),
    }),
  );
  return { type: ktRef(sealedName), cases };
}
