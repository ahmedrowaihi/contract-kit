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
  const cases = (schema.items ?? [])
    .map((i) => i.const)
    .filter((v): v is string => typeof v === "string")
    .map((v) => swEnumCase(safeCaseName(v), v));
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
