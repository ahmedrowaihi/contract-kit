import type { IR } from "@hey-api/shared";
import { type GoType, goAny, goPtr } from "../../go-dsl/index.js";
import type { TypeCtx } from "./context.js";
import { schemaToType } from "./index.js";
import { inlineObjectType } from "./object.js";

const isPointerable = (t: GoType): boolean =>
  t.kind !== "ptr" &&
  t.kind !== "slice" &&
  t.kind !== "map" &&
  t.kind !== "interface";

/**
 * IR represents 3.1 nullable types as a union schema with a `null`
 * branch (`{ items: [{type:'string'}, {type:'null'}], logicalOperator: 'or' }`).
 * `allOf` folds become `logicalOperator: 'and'`. We collapse single-branch
 * unions to the lone branch and unwrap nullable detection; unhandled
 * multi-branch unions fall back to `any`.
 */
export function unionToType(schema: IR.SchemaObject, ctx: TypeCtx): GoType {
  if (schema.logicalOperator === "and") {
    return schema.properties ? inlineObjectType(schema, ctx) : goAny;
  }
  const items = schema.items ?? [];
  const nonNull = items.filter((i) => i.type !== "null");
  const nullable = nonNull.length < items.length;
  if (nonNull.length === 1) {
    const inner = schemaToType(nonNull[0]!, ctx);
    return nullable && isPointerable(inner) ? goPtr(inner) : inner;
  }
  return goAny;
}
