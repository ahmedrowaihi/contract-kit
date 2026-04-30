import type { IR } from "@hey-api/shared";
import type { SwType } from "../../sw-dsl/index.js";
import {
  swEnum,
  swEnumCase,
  swInt,
  swRef,
  swString,
} from "../../sw-dsl/index.js";
import { safeCaseName } from "../identifiers.js";
import type { TypeCtx } from "./context.js";

/**
 * Convert an `IR.SchemaObject` whose `type === "enum"` into a Swift
 * raw-typed enum with `Codable` conformance:
 *
 *  - All-string members → `enum Status: String, Codable { case … }`
 *  - All-integer members → `enum Rotate: Int, Codable { case _0 = 0; case _90 = 90 }`
 *
 * Mixed-type enums throw — Swift's raw-typed enum requires a single
 * raw type. The enum is emitted as a top-level decl; the returned
 * `SwType` is a ref to it.
 */
export function buildEnumFromIR(
  name: string,
  schema: IR.SchemaObject,
  emit: TypeCtx["emit"],
): SwType {
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

  const cases = allIntegers
    ? (rawValues as number[]).map((v) => swEnumCase(intCaseName(v), v))
    : (rawValues as string[]).map((v) => swEnumCase(safeCaseName(v), v));
  assertNoCollisions(name, cases);

  emit(
    swEnum({
      name,
      cases,
      rawType: allIntegers ? swInt : swString,
      conforms: ["Codable"],
    }),
  );
  return swRef(name);
}

function intCaseName(n: number): string {
  return n < 0 ? `_neg${Math.abs(n)}` : `_${n}`;
}

function assertNoCollisions(
  name: string,
  cases: ReadonlyArray<{ name: string; rawValue?: string | number }>,
): void {
  const collisions = new Map<string, Array<string | number>>();
  for (const c of cases) {
    const list = collisions.get(c.name) ?? [];
    list.push(c.rawValue ?? "");
    collisions.set(c.name, list);
  }
  for (const [caseName, raws] of collisions) {
    if (raws.length > 1) {
      throw new Error(
        `Enum ${name}: case name "${caseName}" collides for raw values [${raws
          .map((r) => (typeof r === "string" ? `"${r}"` : String(r)))
          .join(", ")}]`,
      );
    }
  }
}
