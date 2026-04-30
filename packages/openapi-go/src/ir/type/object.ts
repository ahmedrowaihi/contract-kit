import type { IR } from "@hey-api/shared";
import {
  type GoStruct,
  type GoType,
  goAny,
  goField,
  goMap,
  goPtr,
  goRef,
  goString,
  goStruct,
} from "../../go-dsl/index.js";

const isMapOrSlice = (t: GoType): boolean =>
  t.kind === "map" || t.kind === "slice";

import { pascal, synthName } from "../identifiers.js";
import type { TypeCtx } from "./context.js";
import { schemaToType } from "./index.js";
import { propertyName } from "./property-naming.js";

/**
 * Build a Go struct from an object-shaped IR schema.
 *
 *  - Required fields render as the bare type (`Name string`).
 *  - Optional fields render as a pointer to the type (`Email *string`)
 *    so JSON can distinguish absent (`nil`) from zero-valued. Omitted
 *    fields use the `omitempty` tag — the standard Go idiom.
 *  - JSON-key renaming is preserved via the `json:"<key>"` struct tag.
 */
export function buildStruct(
  name: string,
  schema: IR.SchemaObject,
  ctx: { emit: TypeCtx["emit"] },
): GoStruct {
  const required = new Set(schema.required ?? []);
  const fields = Object.entries(schema.properties ?? {}).map(
    ([jsonKey, propSchema]) => {
      const naming = propertyName(jsonKey);
      const t = schemaToType(propSchema, {
        emit: ctx.emit,
        ownerName: name,
        propPath: [pascal(jsonKey)],
      });
      const optional = !required.has(jsonKey);
      // Slices and maps are nilable in Go and serialize naturally with
      // `omitempty`; only wrap value-types in `*T` for optional fields.
      const finalType =
        optional && t.kind !== "ptr" && !isMapOrSlice(t) ? goPtr(t) : t;
      const tag = optional
        ? `\`json:"${naming.jsonKey},omitempty"\``
        : `\`json:"${naming.jsonKey}"\``;
      return goField(naming.goName, finalType, tag);
    },
  );
  return goStruct({ name, fields });
}

/**
 * Resolve an inline object schema to a `GoType`. Schemas with explicit
 * properties are promoted to a synthetic top-level struct
 * (`Owner_PropertyName`); map-shaped objects (no properties, only
 * `additionalProperties`) become Go `map[string]V`.
 */
export function inlineObjectType(
  schema: IR.SchemaObject,
  ctx: TypeCtx,
): GoType {
  const hasNamedProperties = Object.keys(schema.properties ?? {}).length > 0;
  if (hasNamedProperties) {
    const name = synthName(ctx.ownerName, ctx.propPath);
    ctx.emit(buildStruct(name, schema, ctx));
    return goRef(name);
  }
  const ap = schema.additionalProperties;
  if (ap && typeof ap === "object") {
    return goMap(goString, schemaToType(ap, ctx));
  }
  return goMap(goString, goAny);
}
