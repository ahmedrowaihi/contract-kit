import type { IR } from "@hey-api/shared";
import type {
  SwCodingKeysEntry,
  SwStruct,
  SwType,
} from "../../sw-dsl/index.js";
import {
  swAny,
  swDict,
  swFunParam,
  swInit,
  swOptional,
  swProp,
  swRef,
  swString,
  swStruct,
} from "../../sw-dsl/index.js";
import { pascal, synthName } from "../identifiers.js";
import type { TypeCtx } from "./context.js";
import { schemaToType } from "./index.js";
import { propertyName } from "./property-naming.js";

/**
 * Build a `Codable` struct from an object-shaped IR schema. Each property
 * goes through `schemaToType` for its inner type; required vs optional is
 * driven by the schema's `required` array. JSON keys are translated to
 * lower-camelCase Swift identifiers; if any property is renamed a nested
 * `CodingKeys` enum is emitted to preserve the wire format.
 */
export function buildStruct(
  name: string,
  schema: IR.SchemaObject,
  ctx: { emit: TypeCtx["emit"] },
): SwStruct {
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(schema.properties ?? {}).map(
    ([jsonKey, propSchema]) => {
      const naming = propertyName(jsonKey);
      const t = schemaToType(propSchema, {
        emit: ctx.emit,
        ownerName: name,
        // Synth path uses pascal(jsonKey) so renaming the property doesn't
        // change the synthesized name of an inline-object type.
        propPath: [pascal(jsonKey)],
      });
      const optional = !required.has(jsonKey);
      const finalType = optional && t.kind !== "optional" ? swOptional(t) : t;
      return { naming, type: finalType, optional };
    },
  );

  const properties = entries.map(({ naming, type }) =>
    swProp({ name: naming.swiftName, type }),
  );

  const anyRenamed = entries.some(({ naming }) => naming.renamed);
  const codingKeys: ReadonlyArray<SwCodingKeysEntry> | undefined = anyRenamed
    ? entries.map(({ naming }) => ({
        swiftName: naming.swiftName,
        jsonKey: naming.jsonKey,
      }))
    : undefined;

  const initParams = entries.map(({ naming, type, optional }) =>
    swFunParam({
      name: naming.swiftName,
      type,
      default: optional ? "nil" : undefined,
    }),
  );

  return swStruct({
    name,
    properties,
    conforms: ["Codable"],
    codingKeys,
    inits: initParams.length > 0 ? [swInit({ params: initParams })] : [],
  });
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
  const hasNamedProperties = Object.keys(schema.properties ?? {}).length > 0;
  if (hasNamedProperties) {
    const name = synthName(ctx.ownerName, ctx.propPath);
    ctx.emit(buildStruct(name, schema, ctx));
    return swRef(name);
  }
  const ap = schema.additionalProperties;
  if (ap && typeof ap === "object") {
    return swDict(swString, schemaToType(ap, ctx));
  }
  return swDict(swString, swAny);
}
