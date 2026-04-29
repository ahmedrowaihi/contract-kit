import type { IR } from "@hey-api/shared";

import type { SwFunParam } from "../../sw-dsl/fun.js";
import type { SwType } from "../../sw-dsl/type/index.js";
import { HTTP_METHOD_LITERAL, type HttpMethod } from "../constants.js";
import { camel, pascal } from "../identifiers.js";
import type { TypeCtx } from "../type/index.js";
import { buildBodyParams } from "./body.js";
import { buildNonBodyParams, type LocatedParam } from "./params.js";
import { returnTypeFor } from "./response.js";

export interface OperationSignature {
  /** Final Swift function name (camelCased). */
  name: string;
  /** Capitalized form used as the synth-name owner for inline schemas. */
  ownerName: string;
  /** All params in declaration order: non-body first (required→optional), body last. */
  params: ReadonlyArray<SwFunParam>;
  returnType: SwType;
  /** Doc comment text (no `///` prefix; the printer adds those). */
  doc: string;
  /** Path/query/header parameters in their final order. Used by the impl walker. */
  locatedParams: ReadonlyArray<LocatedParam>;
  /** Original IR — kept so the impl walker can read media type, etc. */
  op: IR.OperationObject;
  method: HttpMethod;
  pathStr: string;
}

/**
 * One source of truth for `params + returnType + doc` so the protocol
 * declaration and the impl class share the same signature shape.
 */
export function operationSignature(
  op: IR.OperationObject,
  method: HttpMethod,
  pathStr: string,
  emit: TypeCtx["emit"],
): OperationSignature {
  const name = pickFnName(op, method, pathStr);
  const ownerName = pascal(name);
  const ctx: TypeCtx = { emit, ownerName, propPath: [] };

  const { params: nonBody, located } = buildNonBodyParams(op, ctx);
  const bodyParams = op.body ? buildBodyParams(op.body, ctx) : [];
  const params = [...nonBody, ...bodyParams];
  const returnType = returnTypeFor(op, { ...ctx, propPath: ["response"] });

  return {
    name: camel(name),
    ownerName,
    params,
    returnType,
    doc: `${HTTP_METHOD_LITERAL[method]} ${pathStr}`,
    locatedParams: located,
    op,
    method,
    pathStr,
  };
}

function pickFnName(
  op: IR.OperationObject,
  method: HttpMethod,
  path: string,
): string {
  if (op.operationId) return op.operationId;
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((s) => s.replace(/[{}]/g, ""));
  return [method, ...segments].join("_") || method;
}
