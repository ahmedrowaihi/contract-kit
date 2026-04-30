import type { IR } from "@hey-api/shared";
import {
  type KtType,
  ktAnnotation,
  ktEnum,
  ktEnumEntry,
  ktInt,
  ktProp,
  ktRef,
  ktString,
  ktTypeAlias,
} from "../../kt-dsl/index.js";
import { enumEntryIdent } from "../identifiers.js";
import type { TypeCtx } from "./context.js";

/**
 * Convert an `IR.SchemaObject` whose `type === "enum"` into a Kotlin
 * type:
 *
 *  - All-string members → `@Serializable enum class Foo(val raw: String)`
 *    with one entry per value, each carrying `@SerialName("<raw>")` so
 *    kotlinx-serialization preserves the wire form.
 *  - All-integer members → degrade to `typealias Foo = Int`. kotlinx-
 *    serialization's enum support only round-trips string raw values
 *    via `@SerialName`; integer JSON values would need a custom
 *    `KSerializer`. The typealias preserves the underlying type and
 *    keeps the field shape compatible with the wire format; consumers
 *    lose the enum-value constraint at the type level but retain it at
 *    runtime through their own validation if needed.
 *
 * Mixed-type enums throw — pick one shape.
 */
export function buildEnumFromIR(
  name: string,
  schema: IR.SchemaObject,
  emit: TypeCtx["emit"],
): KtType {
  const rawValues = (schema.items ?? []).map((i) => i.const);
  const allStrings = rawValues.every((v) => typeof v === "string");
  const allIntegers = rawValues.every(
    (v) => typeof v === "number" && Number.isInteger(v),
  );
  if (!allStrings && !allIntegers) {
    throw new Error(
      `Enum ${name}: members must all be strings or all integers; got ${JSON.stringify(rawValues)}`,
    );
  }

  if (allIntegers) {
    emit(ktTypeAlias({ name, type: ktInt }));
    return ktRef(name);
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
