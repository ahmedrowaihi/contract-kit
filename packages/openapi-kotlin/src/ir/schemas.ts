import type { IR } from "@hey-api/shared";

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
  buildEnumFromIR,
  refName,
  schemaToType,
} from "./schema-to-type.js";

/**
 * Translate `IR.Model.components.schemas` into Kotlin decls. Object
 * schemas with properties become data classes; `enum` schemas become
 * `enum class`es; arrays/unions/primitives become typealiases. Inline
 * objects and inline enums are promoted to top-level decls with a
 * synthesized `Owner_PropertyName` identifier.
 */
export function schemasToDecls(
  schemas: Record<string, IR.SchemaObject>,
): KtDecl[] {
  const decls: KtDecl[] = [];
  const emit = (d: KtDecl) => decls.push(d);

  for (const [name, schema] of Object.entries(schemas)) {
    if (schema.$ref) {
      decls.push(ktTypeAlias(name, ktRef(refName(schema.$ref))));
      continue;
    }
    if (schema.type === "enum") {
      buildEnumFromIR(name, schema, emit);
      continue;
    }
    if (schema.type === "object" && schema.properties) {
      decls.push(buildDataClass(name, schema, { emit }));
      continue;
    }
    if (schema.type === "object") {
      const ap = schema.additionalProperties;
      // IR can normalize `additionalProperties: false` to a void schema.
      const sealed =
        ap === false ||
        (typeof ap === "object" &&
          (ap.type === "void" ||
            ap.type === "never" ||
            ap.type === "undefined"));
      if (sealed) {
        decls.push(buildDataClass(name, schema, { emit }));
        continue;
      }
      const valueType = ap
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
