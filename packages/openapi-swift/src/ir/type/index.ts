import type { IR } from "@hey-api/shared";
import type { SwType } from "../../sw-dsl/index.js";
import {
  swAny,
  swArray,
  swOptional,
  swRef,
  swVoid,
} from "../../sw-dsl/index.js";
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
 * Top-level dispatch from `IR.SchemaObject` to a `SwType`. Side-effects:
 * inline objects/enums get promoted to top-level decls via `ctx.emit`.
 */
export function schemaToType(schema: IR.SchemaObject, ctx: TypeCtx): SwType {
  if (schema.$ref) return swRef(refName(schema.$ref));

  // Untyped item-bearing schema → union (oneOf/anyOf, possibly nullable).
  if (schema.items && schema.items.length > 0 && !schema.type) {
    return unionToType(schema, ctx);
  }

  const primitive = typeForPrimitive(schema);
  if (primitive) return primitive;

  switch (schema.type) {
    case "array": {
      const elem = schema.items?.[0];
      return swArray(elem ? schemaToType(elem, ctx) : swAny);
    }
    case "tuple":
      return swArray(swAny);
    case "enum":
      return buildEnumFromIR(
        synthName(ctx.ownerName, ctx.propPath),
        schema,
        ctx.emit,
      );
    case "object":
      return inlineObjectType(schema, ctx);
    case "null":
      return swOptional(swAny);
    case "never":
    case "void":
    case "undefined":
      return swVoid;
    default:
      return swAny;
  }
}
