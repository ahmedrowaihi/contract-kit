import type { IR } from "@hey-api/shared";
import {
  type KtDecl,
  ktAny,
  ktMap,
  ktRef,
  ktString,
  ktTypeAlias,
} from "../kt-dsl/index.js";
import { refName } from "./ref.js";
import { buildEnumFromIR, buildStruct, schemaToType } from "./type/index.js";

/**
 * Translate `IR.Model.components.schemas` into Kotlin decls. Object schemas
 * with properties become `@Serializable` data classes; `enum` schemas
 * become `String`-raw `@Serializable` enums; primitives/arrays/unions
 * become typealiases. Inline nested objects/enums are promoted to
 * top-level synthetic decls (`Owner_PropertyName`).
 */
export function schemasToDecls(
  schemas: Record<string, IR.SchemaObject>,
): KtDecl[] {
  const decls: KtDecl[] = [];
  const emit = (d: KtDecl) => decls.push(d);

  for (const [name, schema] of Object.entries(schemas)) {
    if (schema.$ref) {
      decls.push(ktTypeAlias({ name, type: ktRef(refName(schema.$ref)) }));
      continue;
    }
    if (schema.type === "enum") {
      buildEnumFromIR(name, schema, emit);
      continue;
    }
    if (schema.type === "object" && schema.properties) {
      decls.push(buildStruct(name, schema, { emit }));
      continue;
    }
    if (schema.type === "object") {
      const ap = schema.additionalProperties;
      const sealed =
        ap === false ||
        (typeof ap === "object" &&
          (ap.type === "void" ||
            ap.type === "never" ||
            ap.type === "undefined"));
      if (sealed) {
        decls.push(buildStruct(name, schema, { emit }));
        continue;
      }
      const valueType =
        ap && typeof ap === "object"
          ? schemaToType(ap, { emit, ownerName: name, propPath: [] })
          : ktAny;
      decls.push(ktTypeAlias({ name, type: ktMap(ktString, valueType) }));
      continue;
    }
    decls.push(
      ktTypeAlias({
        name,
        type: schemaToType(schema, { emit, ownerName: name, propPath: [] }),
      }),
    );
  }

  return decls;
}
