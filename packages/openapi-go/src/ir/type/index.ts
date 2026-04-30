import type { IR } from "@hey-api/shared";
import {
  type GoType,
  goAny,
  goPtr,
  goRef,
  goSlice,
} from "../../go-dsl/index.js";
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
 * Top-level dispatch from `IR.SchemaObject` to a `GoType`. Side-effects:
 * inline objects/enums get promoted to top-level decls via `ctx.emit`.
 *
 * For Go specifically, `Unit` analog (no return) is handled at the
 * caller level (function results list is empty); this helper never
 * returns a `void`-like type.
 */
export function schemaToType(schema: IR.SchemaObject, ctx: TypeCtx): GoType {
  if (schema.$ref) return goRef(refName(schema.$ref));

  if (schema.items && schema.items.length > 0 && !schema.type) {
    return unionToType(schema, ctx);
  }

  const primitive = typeForPrimitive(schema);
  if (primitive) return primitive;

  switch (schema.type) {
    case "array": {
      const elem = schema.items?.[0];
      return goSlice(elem ? schemaToType(elem, ctx) : goAny);
    }
    case "tuple":
      return goSlice(goAny);
    case "enum":
      return buildEnumFromIR(
        synthName(ctx.ownerName, ctx.propPath),
        schema,
        ctx.emit,
      );
    case "object":
      return inlineObjectType(schema, ctx);
    case "null":
      return goPtr(goAny);
    case "never":
    case "void":
    case "undefined":
      // Unit analog — caller uses an empty results list. We return
      // `any` defensively in case this is reached via property dispatch.
      return goAny;
    default:
      return goAny;
  }
}
