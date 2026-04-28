import type { IR } from "@hey-api/shared";

import {
  ktAnnotation,
  ktAny,
  ktBoolean,
  ktDataClass,
  ktDouble,
  ktEnum,
  ktEnumVariant,
  ktFloat,
  ktInt,
  ktList,
  ktLong,
  ktMap,
  ktNullable,
  ktProp,
  ktRef,
  ktString,
  ktUnit,
} from "../kt-dsl/builders.js";
import type { KtDataClass, KtDecl, KtType } from "../kt-dsl/types.js";
import { safeIdent, synthName } from "./identifiers.js";
import { KX_SERIALIZATION } from "./retrofit.js";

const REF_SCHEMA_PREFIX = "#/components/schemas/";

export function refName(ref: string): string {
  return ref.startsWith(REF_SCHEMA_PREFIX)
    ? ref.slice(REF_SCHEMA_PREFIX.length)
    : ref;
}

/**
 * True for IR schemas that carry no usable shape — empty `{}`, `unknown`,
 * `void`, `never`. Used to bail out to `Unit` for content-less responses.
 */
export function isMeaningless(s: IR.SchemaObject): boolean {
  if (s.$ref || s.const !== undefined) return false;
  if (s.items && s.items.length > 0) return false;
  if (s.properties && Object.keys(s.properties).length > 0) return false;
  return (
    s.type === undefined ||
    s.type === "unknown" ||
    s.type === "void" ||
    s.type === "never"
  );
}

export interface TypeCtx {
  emit: (d: KtDecl) => void;
  /** Used to synthesize names for inline objects/enums: `Owner_Path`. */
  ownerName: string;
  propPath: ReadonlyArray<string>;
}

export function schemaToType(schema: IR.SchemaObject, ctx: TypeCtx): KtType {
  if (schema.$ref) return ktRef(refName(schema.$ref));

  // No `type` but `items` → union (oneOf/anyOf, possibly nullable variant).
  if (schema.items && schema.items.length > 0 && !schema.type) {
    return unionToType(schema, ctx);
  }

  switch (schema.type) {
    case "string":
      return ktString;
    case "integer":
      return schema.format === "int64" ? ktLong : ktInt;
    case "number":
      return schema.format === "float" ? ktFloat : ktDouble;
    case "boolean":
      return ktBoolean;
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

function unionToType(schema: IR.SchemaObject, ctx: TypeCtx): KtType {
  if (schema.logicalOperator === "and") {
    return schema.properties ? inlineObjectType(schema, ctx) : ktAny;
  }
  const items = schema.items ?? [];
  const nonNull = items.filter((i) => i.type !== "null");
  const nullable = nonNull.length < items.length;
  if (nonNull.length === 1) {
    const inner = schemaToType(nonNull[0]!, ctx);
    return nullable ? ktNullable(inner) : inner;
  }
  return nullable ? ktNullable(ktAny) : ktAny;
}

function inlineObjectType(schema: IR.SchemaObject, ctx: TypeCtx): KtType {
  if (schema.properties) {
    const name = synthName(ctx.ownerName, ctx.propPath);
    ctx.emit(buildDataClass(name, schema, ctx));
    return ktRef(name);
  }
  const ap = schema.additionalProperties;
  if (ap) {
    return ktMap(ktString, schemaToType(ap, ctx));
  }
  return ktMap(ktString, ktAny);
}

export function buildEnumFromIR(
  name: string,
  schema: IR.SchemaObject,
  emit: TypeCtx["emit"],
): KtType {
  const variants = (schema.items ?? [])
    .map((i) => i.const)
    .filter((v): v is string => typeof v === "string")
    .map((v) =>
      ktEnumVariant(safeIdent(v), [
        ktAnnotation("SerialName", {
          pkg: KX_SERIALIZATION,
          args: [JSON.stringify(v)],
        }),
      ]),
    );
  emit(
    ktEnum({
      name,
      variants,
      annotations: [ktAnnotation("Serializable", { pkg: KX_SERIALIZATION })],
    }),
  );
  return ktRef(name);
}

export function buildDataClass(
  name: string,
  schema: IR.SchemaObject,
  ctx: { emit: TypeCtx["emit"] },
): KtDataClass {
  const required = new Set(schema.required ?? []);
  const props = Object.entries(schema.properties ?? {}).map(
    ([propName, propSchema]) => {
      const t = schemaToType(propSchema, {
        emit: ctx.emit,
        ownerName: name,
        propPath: [propName],
      });
      const finalType = required.has(propName) ? t : ktNullable(t);
      return ktProp({ name: propName, type: finalType });
    },
  );
  return ktDataClass({
    name,
    annotations: [ktAnnotation("Serializable", { pkg: KX_SERIALIZATION })],
    properties: props,
  });
}
