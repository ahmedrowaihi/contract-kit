import type { IR } from "@hey-api/shared";
import {
  type KtType,
  ktAny,
  ktList,
  ktNullable,
  ktRef,
  ktUnit,
} from "../../kt-dsl/index.js";
import { synthName } from "../identifiers.js";
import { refName } from "../ref.js";
import type { TypeCtx } from "./context.js";
import { buildEnumFromIR } from "./enum.js";
import { inlineObjectType } from "./object.js";
import { typeForPrimitive } from "./primitive.js";
import { unionToType } from "./union.js";

export type { TypeCtx } from "./context.js";
export { buildEnumFromIR } from "./enum.js";
export { buildStruct } from "./object.js";

/**
 * Top-level dispatch from `IR.SchemaObject` to a `KtType`. Side-effects:
 * inline objects/enums get promoted to top-level decls via `ctx.emit`.
 */
export function schemaToType(schema: IR.SchemaObject, ctx: TypeCtx): KtType {
  if (schema.$ref) return ktRef(refName(schema.$ref));

  // Untyped item-bearing schema → union (oneOf/anyOf, possibly nullable).
  if (schema.items && schema.items.length > 0 && !schema.type) {
    return unionToType(schema, ctx);
  }

  const primitive = typeForPrimitive(schema);
  if (primitive) return primitive;

  switch (schema.type) {
    case "array": {
      const elem = schema.items?.[0];
      return ktList(elem ? schemaToType(elem, ctx) : ktAny);
    }
    case "tuple":
      return ktList(ktAny);
    case "enum":
      return buildEnumFromIR(
        synthName(ctx.ownerName, ctx.propPath),
        schema,
        ctx.emit,
      );
    case "object":
      return inlineObjectType(schema, ctx);
    case "null":
      return ktNullable(ktAny);
    case "never":
    case "void":
    case "undefined":
      return ktUnit;
    default:
      return ktAny;
  }
}
