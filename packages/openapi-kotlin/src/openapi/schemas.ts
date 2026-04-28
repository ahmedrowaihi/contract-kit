import {
  ktAny,
  ktMap,
  ktRef,
  ktString,
  ktTypeAlias,
} from "../kt-dsl/builders.js";
import type { KtDecl } from "../kt-dsl/types.js";
import {
  buildDataClass,
  buildEnum,
  isRef,
  readType,
  refName,
  type SchemaOrRef,
  schemaToType,
} from "./types.js";

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
