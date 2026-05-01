import type { IR } from "@hey-api/shared";
import { type KtFunParam, ktFunParam, ktNullable } from "../../kt-dsl/index.js";
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
 * Cookie params are skipped — OkHttp / kotlinx-serialization have no
 * idiomatic cookie-param mapping and they're rare enough not to warrant
 * codegen support.
 */
export function buildNonBodyParams(
  op: IR.OperationObject,
  ctx: TypeCtx,
): { params: KtFunParam[]; located: LocatedParam[] } {
  const located = collectLocatedParams(op).filter((l) => l.loc !== "cookie");
  located.sort((a, b) => Number(!a.param.required) - Number(!b.param.required));

  const params = located.map(({ param: p }) => {
    const t = schemaToType(p.schema, {
      ...ctx,
      propPath: ["param", p.name],
    });
    return ktFunParam({
      name: paramIdent(p.name),
      type: p.required ? t : ktNullable(t),
      default: p.required ? undefined : "null",
    });
  });

  return { params, located };
}
