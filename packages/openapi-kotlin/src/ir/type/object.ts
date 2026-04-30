import { pascal, synthName } from "@ahmedrowaihi/oas-core";
import type { IR } from "@hey-api/shared";

import {
  type KtDataClass,
  type KtType,
  ktAnnotation,
  ktAny,
  ktDataClass,
  ktMap,
  ktNullable,
  ktProp,
  ktRef,
  ktString,
} from "../../kt-dsl/index.js";
import type { TypeCtx } from "./context.js";
import { schemaToType } from "./index.js";
import { propertyName } from "./property-naming.js";

/**
 * Build a `@Serializable` data class from an object-shaped IR schema.
 * Each property goes through `schemaToType`; required vs optional is
 * driven by the schema's `required` array. JSON keys are translated to
 * lower-camelCase Kotlin identifiers; if any property is renamed (or
 * collides with a Kotlin keyword), a `@SerialName(jsonKey)` annotation
 * preserves the wire format. Optional fields default to `null` so the
 * synthesized constructor lets callers omit them.
 */
export function buildStruct(
  name: string,
  schema: IR.SchemaObject,
  ctx: { emit: TypeCtx["emit"] },
): KtDataClass {
  const required = new Set(schema.required ?? []);
  const props = Object.entries(schema.properties ?? {}).map(
    ([jsonKey, propSchema]) => {
      const naming = propertyName(jsonKey);
      const t = schemaToType(propSchema, {
        emit: ctx.emit,
        ownerName: name,
        propPath: [pascal(jsonKey)],
      });
      const optional = !required.has(jsonKey);
      const finalType = optional && t.kind !== "nullable" ? ktNullable(t) : t;
      return ktProp({
        name: naming.kotlinName,
        type: finalType,
        inPrimary: true,
        default: optional ? "null" : undefined,
        annotations: naming.renamed
          ? [ktAnnotation("SerialName", JSON.stringify(naming.jsonKey))]
          : [],
      });
    },
  );

  return ktDataClass({
    name,
    annotations: [ktAnnotation("Serializable")],
    properties: props,
  });
}

/**
 * Resolve an inline object schema to a `KtType`. Schemas with explicit
 * properties are promoted to a synthetic top-level data class
 * (`Owner_PropertyName`); map-shaped objects (no properties, only
 * `additionalProperties`) become Kotlin `Map<String, V>`.
 */
export function inlineObjectType(
  schema: IR.SchemaObject,
  ctx: TypeCtx,
): KtType {
  const hasNamedProperties = Object.keys(schema.properties ?? {}).length > 0;
  if (hasNamedProperties) {
    const name = synthName(ctx.ownerName, ctx.propPath);
    ctx.emit(buildStruct(name, schema, ctx));
    return ktRef(name);
  }
  const ap = schema.additionalProperties;
  if (ap && typeof ap === "object") {
    return ktMap(ktString, schemaToType(ap, ctx));
  }
  return ktMap(ktString, ktAny);
}
