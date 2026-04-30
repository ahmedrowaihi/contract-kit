import type { IR } from "@hey-api/shared";
import { swTypeAlias } from "../sw-dsl/decl/typeAlias.js";
import type { SwDecl } from "../sw-dsl/decl/types.js";
import { swAny, swDict, swRef, swString } from "../sw-dsl/type/index.js";
import { refName } from "./ref.js";
import { buildEnumFromIR, buildStruct, schemaToType } from "./type/index.js";

/**
 * Translate `IR.Model.components.schemas` into Swift decls. Object schemas
 * with properties become `Codable` structs; `enum` schemas become
 * `String`-raw `Codable` enums; primitives/arrays/unions become
 * typealiases. Inline nested objects/enums are promoted to top-level
 * synthetic decls (`Owner_PropertyName`).
 */
export function schemasToDecls(
  schemas: Record<string, IR.SchemaObject>,
): SwDecl[] {
  const decls: SwDecl[] = [];
  const emit = (d: SwDecl) => decls.push(d);

  for (const [name, schema] of Object.entries(schemas)) {
    if (schema.$ref) {
      decls.push(swTypeAlias({ name, type: swRef(refName(schema.$ref)) }));
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
          : swAny;
      decls.push(swTypeAlias({ name, type: swDict(swString, valueType) }));
      continue;
    }
    decls.push(
      swTypeAlias({
        name,
        type: schemaToType(schema, { emit, ownerName: name, propPath: [] }),
      }),
    );
  }

  return decls;
}
