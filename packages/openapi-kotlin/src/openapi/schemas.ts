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
  ktTypeAlias,
} from "../kt-dsl/builders.js";
import type { KtDataClass, KtDecl, KtType } from "../kt-dsl/types.js";

type Schema = OpenAPIV3_1.SchemaObject;
type Ref = OpenAPIV3_1.ReferenceObject;
type SchemaOrRef = Schema | Ref;

const REF_SCHEMA_PREFIX = "#/components/schemas/";

function isRef(s: SchemaOrRef): s is Ref {
  return s !== null && typeof s === "object" && "$ref" in s;
}

function refName(s: Ref): string {
  return s.$ref.startsWith(REF_SCHEMA_PREFIX)
    ? s.$ref.slice(REF_SCHEMA_PREFIX.length)
    : s.$ref;
}

interface TypeInfo {
  primary?: string;
  nullable: boolean;
}

function readType(s: Schema): TypeInfo {
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

interface EmitCtx {
  emit: (d: KtDecl) => void;
}

interface InlineCtx extends EmitCtx {
  ownerName: string;
  propPath: string[];
}

function pascal(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase());
}

function synthName(owner: string, path: string[]): string {
  return [owner, ...path.map(pascal)].join("_");
}

function variantIdent(s: string): string {
  const p = pascal(s);
  return /^[0-9]/.test(p) ? `_${p}` : p;
}

function buildEnum(
  name: string,
  values: readonly unknown[],
  emit: EmitCtx["emit"],
): KtType {
  const variants = values
    .filter((v): v is string => typeof v === "string")
    .map((v) =>
      ktEnumVariant(variantIdent(v), [
        ktAnnotation("SerialName", { args: [JSON.stringify(v)] }),
      ]),
    );
  emit(
    ktEnum({
      name,
      variants,
      annotations: [ktAnnotation("Serializable")],
    }),
  );
  return ktRef(name);
}

function schemaToType(schema: SchemaOrRef, ctx: InlineCtx): KtType {
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

function inlineObjectType(schema: Schema, ctx: InlineCtx): KtType {
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

function buildDataClass(
  name: string,
  schema: Schema,
  ctx: EmitCtx,
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
    annotations: [ktAnnotation("Serializable")],
    properties: props,
  });
}

/**
 * Translate an OpenAPI components.schemas record into a flat list of Kotlin
 * declarations. Top-level object schemas become data classes; string enums
 * become enum classes; primitives and arrays become typealiases. Inline
 * nested objects and inline enums are promoted to top-level decls with a
 * synthesized name (`Owner_Path` / `Owner_PropertyName`).
 */
export function schemasToDecls(schemas: Record<string, SchemaOrRef>): KtDecl[] {
  const decls: KtDecl[] = [];
  const emit = (d: KtDecl) => decls.push(d);

  for (const [name, schema] of Object.entries(schemas)) {
    if (isRef(schema)) {
      decls.push(ktTypeAlias(name, ktRef(refName(schema))));
      continue;
    }

    const { primary } = readType(schema);

    if (
      Array.isArray(schema.enum) &&
      (primary === "string" || primary === undefined)
    ) {
      buildEnum(name, schema.enum, emit);
      continue;
    }

    if (schema.properties) {
      decls.push(buildDataClass(name, schema, { emit }));
      continue;
    }

    if (primary === "object") {
      const ap = schema.additionalProperties;
      if (ap === false) {
        decls.push(buildDataClass(name, schema, { emit }));
        continue;
      }
      const valueType =
        ap && typeof ap === "object"
          ? schemaToType(ap, { emit, ownerName: name, propPath: [] })
          : ktAny;
      decls.push(ktTypeAlias(name, ktMap(ktString, valueType)));
      continue;
    }

    decls.push(
      ktTypeAlias(
        name,
        schemaToType(schema, { emit, ownerName: name, propPath: [] }),
      ),
    );
  }

  return decls;
}
