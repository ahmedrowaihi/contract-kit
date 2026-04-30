import type { IR } from "@hey-api/shared";
import type { SwType } from "../../sw-dsl/index.js";
import { swEnum, swEnumCase, swRef, swString } from "../../sw-dsl/index.js";
import { safeCaseName } from "../identifiers.js";
import type { TypeCtx } from "./context.js";

/**
 * Convert an `IR.SchemaObject` whose `type === "enum"` into a Swift
 * `enum class` with a `String` raw type and `Codable` conformance.
 * The enum is emitted as a top-level decl; the returned `SwType` is a
 * ref to it.
 */
export function buildEnumFromIR(
  name: string,
  schema: IR.SchemaObject,
  emit: TypeCtx["emit"],
): SwType {
  const rawValues = (schema.items ?? []).map((i) => i.const);
  for (const value of rawValues) {
    if (typeof value !== "string") {
      throw new Error(
        `Enum ${name}: only string-valued enum members are supported, got ${typeof value}: ${JSON.stringify(value)}`,
      );
    }
  }
  const cases = (rawValues as string[]).map((v) =>
    swEnumCase(safeCaseName(v), v),
  );
  const collisions = new Map<string, string[]>();
  for (const c of cases) {
    const list = collisions.get(c.name) ?? [];
    list.push(c.rawValue ?? "");
    collisions.set(c.name, list);
  }
  for (const [caseName, raws] of collisions) {
    if (raws.length > 1) {
      throw new Error(
        `Enum ${name}: case name "${caseName}" collides for raw values [${raws.map((r) => `"${r}"`).join(", ")}]`,
      );
    }
  }
  emit(
    swEnum({
      name,
      cases,
      rawType: swString,
      conforms: ["Codable"],
    }),
  );
  return swRef(name);
}
