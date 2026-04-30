import type { IR } from "@hey-api/shared";
import type { SwFunParam } from "../../sw-dsl/index.js";
import { swFunParam, swOptional } from "../../sw-dsl/index.js";
import { paramIdent } from "../identifiers.js";
import type { TypeCtx } from "../type/index.js";
import { schemaToType } from "../type/index.js";

export type ParamLocation = "path" | "query" | "header" | "cookie";
export const PARAM_LOCATIONS: ReadonlyArray<ParamLocation> = [
  "path",
  "query",
  "header",
  "cookie",
];

export interface LocatedParam {
  param: IR.ParameterObject;
  loc: ParamLocation;
}

export function collectLocatedParams(op: IR.OperationObject): LocatedParam[] {
  const out: LocatedParam[] = [];
  for (const loc of PARAM_LOCATIONS) {
    const bucket = op.parameters?.[loc];
    if (!bucket) continue;
    for (const param of Object.values(bucket)) out.push({ param, loc });
  }
  return out;
}

/**
 * Produce the function parameters for path/query/header parameters in
 * required-first order (so trailing optional defaults stay tail-only).
 * Cookie params are skipped — Swift / URLSession has no analog and they
 * are rare enough not to warrant codegen support.
 */
export function buildNonBodyParams(
  op: IR.OperationObject,
  ctx: TypeCtx,
): { params: SwFunParam[]; located: LocatedParam[] } {
  const located = collectLocatedParams(op).filter((l) => l.loc !== "cookie");
  located.sort((a, b) => Number(!a.param.required) - Number(!b.param.required));

  const params = located.map(({ param: p }) => {
    const t = schemaToType(p.schema, {
      ...ctx,
      propPath: ["param", p.name],
    });
    return swFunParam({
      name: paramIdent(p.name),
      type: p.required ? t : swOptional(t),
      default: p.required ? undefined : "nil",
    });
  });

  return { params, located };
}
