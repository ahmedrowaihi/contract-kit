import type { OpenAPIV3_1 } from "@hey-api/spec-types";

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
} from "../kt-dsl/builders.js";
import type { KtDataClass, KtDecl, KtType } from "../kt-dsl/types.js";
import { pascal, safeIdent } from "../utils/idents.js";

export type Schema = OpenAPIV3_1.SchemaObject;
export type Ref = OpenAPIV3_1.ReferenceObject;
export type SchemaOrRef = Schema | Ref;

const REF_SCHEMA_PREFIX = "#/components/schemas/";

export function isRef(s: SchemaOrRef): s is Ref {
  return s !== null && typeof s === "object" && "$ref" in s;
}

export function refName(s: Ref): string {
  return s.$ref.startsWith(REF_SCHEMA_PREFIX)
    ? s.$ref.slice(REF_SCHEMA_PREFIX.length)
    : s.$ref;
}

export interface TypeInfo {
  primary?: string;
  nullable: boolean;
}

export function readType(s: Schema): TypeInfo {
  const t = s.type as unknown;
  if (Array.isArray(t)) {
    return {
      nullable: t.includes("null"),
      primary: t.find((x) => x !== "null"),
    };
  }
  return {
    primary: typeof t === "string" ? t : undefined,
    // 3.0 holdover; 3.1 prefers `type: [..., "null"]`
    nullable: Boolean((s as { nullable?: boolean }).nullable),
  };
}

export interface TypeCtx {
  emit: (d: KtDecl) => void;
  /** Used to synthesize names for inline objects/enums: `Owner_Path`. */
  ownerName: string;
  propPath: string[];
}

export function synthName(owner: string, path: string[]): string {
  return [owner, ...path.map(pascal)].join("_");
}

const KX_SERIALIZATION = "kotlinx.serialization";

export function buildEnum(
  name: string,
  values: readonly unknown[],
  emit: TypeCtx["emit"],
): KtType {
  const variants = values
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

export function schemaToType(schema: SchemaOrRef, ctx: TypeCtx): KtType {
  if (isRef(schema)) return ktRef(refName(schema));

  const { primary, nullable } = readType(schema);
  let base: KtType;

  if (
    Array.isArray(schema.enum) &&
    (primary === "string" || primary === undefined)
  ) {
    base = buildEnum(
      synthName(ctx.ownerName, ctx.propPath),
      schema.enum,
      ctx.emit,
    );
  } else if (primary === "string") {
    base = ktString;
  } else if (primary === "integer") {
    base = schema.format === "int64" ? ktLong : ktInt;
  } else if (primary === "number") {
    base = schema.format === "float" ? ktFloat : ktDouble;
  } else if (primary === "boolean") {
    base = ktBoolean;
  } else if (primary === "array") {
    const items = (schema as { items?: SchemaOrRef }).items;
    base = ktList(items ? schemaToType(items, ctx) : ktAny);
  } else if (
    primary === "object" ||
    schema.properties ||
    "additionalProperties" in schema
  ) {
    base = inlineObjectType(schema, ctx);
  } else {
    base = ktAny;
  }

  return nullable ? ktNullable(base) : base;
}

function inlineObjectType(schema: Schema, ctx: TypeCtx): KtType {
  if (schema.properties) {
    const name = synthName(ctx.ownerName, ctx.propPath);
    ctx.emit(buildDataClass(name, schema, ctx));
    return ktRef(name);
  }
  const ap = schema.additionalProperties;
  if (ap && typeof ap === "object") {
    return ktMap(ktString, schemaToType(ap, ctx));
  }
  return ktMap(ktString, ktAny);
}

export function buildDataClass(
  name: string,
  schema: Schema,
  ctx: { emit: TypeCtx["emit"] },
): KtDataClass {
  const required = new Set(schema.required ?? []);
  const properties = schema.properties ?? {};
  const props = Object.entries(properties).map(([propName, propSchema]) => {
    const t = schemaToType(propSchema as SchemaOrRef, {
      emit: ctx.emit,
      ownerName: name,
      propPath: [propName],
    });
    const finalType = required.has(propName) ? t : ktNullable(t);
    return ktProp({ name: propName, type: finalType });
  });
  return ktDataClass({
    name,
    annotations: [ktAnnotation("Serializable", { pkg: KX_SERIALIZATION })],
    properties: props,
  });
}
