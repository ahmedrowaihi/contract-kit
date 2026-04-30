import type { IR } from "@hey-api/shared";
import {
  type KtType,
  ktAnnotation,
  ktEnum,
  ktEnumEntry,
  ktProp,
  ktRef,
  ktString,
} from "../../kt-dsl/index.js";
import { enumEntryIdent } from "../identifiers.js";
import type { TypeCtx } from "./context.js";

/**
 * Convert an `IR.SchemaObject` whose `type === "enum"` into a Kotlin
 * `enum class` with a `String` raw value. Each entry carries its raw
 * string in the primary constructor (`raw: String`) plus a
 * `@SerialName("…")` annotation so kotlinx-serialization round-trips
 * the wire form even when the entry name diverges from the raw value.
 */
export function buildEnumFromIR(
  name: string,
  schema: IR.SchemaObject,
  emit: TypeCtx["emit"],
): KtType {
  const rawValues = (schema.items ?? []).map((i) => i.const);
  for (const value of rawValues) {
    if (typeof value !== "string") {
      throw new Error(
        `Enum ${name}: only string-valued enum members are supported, got ${typeof value}: ${JSON.stringify(value)}`,
      );
    }
  }
  const collisions = new Map<string, string[]>();
  const entries = (rawValues as string[]).map((raw) => {
    const ident = enumEntryIdent(raw);
    const list = collisions.get(ident) ?? [];
    list.push(raw);
    collisions.set(ident, list);
    return ktEnumEntry(ident, JSON.stringify(raw), [
      ktAnnotation("SerialName", JSON.stringify(raw)),
    ]);
  });
  for (const [entryName, raws] of collisions) {
    if (raws.length > 1) {
      throw new Error(
        `Enum ${name}: entry name "${entryName}" collides for raw values [${raws.map((r) => `"${r}"`).join(", ")}]`,
      );
    }
  }
  emit(
    ktEnum({
      name,
      annotations: [ktAnnotation("Serializable")],
      properties: [ktProp({ name: "raw", type: ktString, inPrimary: true })],
      entries,
    }),
  );
  return ktRef(name);
}
