import { refName } from "@ahmedrowaihi/openapi-core";
import type { IR } from "@hey-api/shared";

import {
  type GoDecl,
  goAny,
  goMap,
  goRef,
  goString,
  goTypeAlias,
} from "../go-dsl/index.js";
import { buildEnumFromIR, buildStruct, schemaToType } from "./type/index.js";

/**
 * Translate `IR.Model.components.schemas` into Go decls. Object schemas
 * with properties become structs; `enum` schemas become a typed
 * `string` alias plus a `const ( ... )` block. Primitives / arrays /
 * unions become typealiases. Inline nested objects/enums get promoted
 * to top-level synthetic decls (`Owner_PropertyName`).
 */
export function schemasToDecls(
  schemas: Record<string, IR.SchemaObject>,
): GoDecl[] {
  const decls: GoDecl[] = [];
  const emit = (d: GoDecl) => decls.push(d);

  for (const [name, schema] of Object.entries(schemas)) {
    if (schema.$ref) {
      decls.push(
        goTypeAlias({ name, type: goRef(refName(schema.$ref)), alias: true }),
      );
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
          : goAny;
      decls.push(goTypeAlias({ name, type: goMap(goString, valueType) }));
      continue;
    }
    decls.push(
      goTypeAlias({
        name,
        type: schemaToType(schema, { emit, ownerName: name, propPath: [] }),
      }),
    );
  }

  return decls;
}
