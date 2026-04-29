import type { IR } from "@hey-api/shared";

import { type SwStruct, swProp, swStruct } from "../../sw-dsl/decl/struct.js";
import {
  type SwType,
  swAny,
  swDict,
  swOptional,
  swRef,
  swString,
} from "../../sw-dsl/type/index.js";
import { synthName } from "../identifiers.js";
import type { TypeCtx } from "./context.js";
import { schemaToType } from "./index.js";

/**
 * Build a `Codable` struct from an object-shaped IR schema. Each property
 * goes through `schemaToType` for its inner type; required vs optional is
 * driven by the schema's `required` array.
 */
export function buildStruct(
  name: string,
  schema: IR.SchemaObject,
  ctx: { emit: TypeCtx["emit"] },
): SwStruct {
  const required = new Set(schema.required ?? []);
  const properties = Object.entries(schema.properties ?? {}).map(
    ([propName, propSchema]) => {
      const t = schemaToType(propSchema, {
        emit: ctx.emit,
        ownerName: name,
        propPath: [propName],
      });
      const finalType = required.has(propName) ? t : swOptional(t);
      return swProp({ name: propName, type: finalType });
    },
  );
  return swStruct({ name, properties, conforms: ["Codable"] });
}

/**
 * Resolve an inline object schema to a `SwType`. Schemas with explicit
 * properties are promoted to a synthetic top-level struct
 * (`Owner_PropertyName`); map-shaped objects (no properties, only
 * `additionalProperties`) become Swift dictionaries.
 */
export function inlineObjectType(
  schema: IR.SchemaObject,
  ctx: TypeCtx,
): SwType {
  if (schema.properties) {
    const name = synthName(ctx.ownerName, ctx.propPath);
    ctx.emit(buildStruct(name, schema, ctx));
    return swRef(name);
  }
  const ap = schema.additionalProperties;
  if (ap) {
    return swDict(swString, schemaToType(ap, ctx));
  }
  return swDict(swString, swAny);
}
