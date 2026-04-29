import type { IR } from "@hey-api/shared";

import { type SwType, swAny, swOptional } from "../../sw-dsl/type/index.js";
import type { TypeCtx } from "./context.js";
import { schemaToType } from "./index.js";
import { inlineObjectType } from "./object.js";

/**
 * IR represents 3.1 nullable types as a union schema with a `null`
 * branch (`{ items: [{type:'string'}, {type:'null'}], logicalOperator: 'or' }`).
 * `allOf` folds become `logicalOperator: 'and'`. We collapse single-branch
 * unions to the lone branch and unwrap nullable detection; unhandled
 * multi-branch unions fall back to `Any` for now.
 */
export function unionToType(schema: IR.SchemaObject, ctx: TypeCtx): SwType {
  if (schema.logicalOperator === "and") {
    return schema.properties ? inlineObjectType(schema, ctx) : swAny;
  }
  const items = schema.items ?? [];
  const nonNull = items.filter((i) => i.type !== "null");
  const nullable = nonNull.length < items.length;
  if (nonNull.length === 1) {
    const inner = schemaToType(nonNull[0]!, ctx);
    return nullable ? swOptional(inner) : inner;
  }
  return nullable ? swOptional(swAny) : swAny;
}
