import type { IR } from "@hey-api/shared";
import {
  type GoType,
  goConstBlock,
  goConstEntry,
  goInt,
  goIntLit,
  goRef,
  goStr,
  goString,
  goTypeAlias,
} from "../../go-dsl/index.js";
import { enumEntrySuffix } from "../identifiers.js";
import type { TypeCtx } from "./context.js";

/**
 * Convert an `IR.SchemaObject` whose `type === "enum"` into the Go
 * idiom for typed-constant enums:
 *
 *   type Status string             // (or `int` for integer enums)
 *   const (
 *       StatusAvailable Status = "available"
 *       StatusPending   Status = "pending"
 *   )
 *
 * Two decls are emitted (one type alias, one const block); the
 * caller's TypeCtx receives both via `emit`. The returned type is
 * the named-type ref so callers reference it as `Status`, not the
 * underlying primitive.
 *
 * Supports string and integer enum values. Mixed-type enums fall
 * back to a `string` type alias and stringify the values.
 */
export function buildEnumFromIR(
  name: string,
  schema: IR.SchemaObject,
  emit: TypeCtx["emit"],
): GoType {
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

  if (allIntegers) return emitIntegerEnum(name, rawValues as number[], emit);
  return emitStringEnum(name, rawValues as string[], emit);
}

function emitStringEnum(
  name: string,
  rawValues: ReadonlyArray<string>,
  emit: TypeCtx["emit"],
): GoType {
  const collisions = new Map<string, string[]>();
  const entries = rawValues.map((raw) => {
    const entryName = `${name}${enumEntrySuffix(raw)}`;
    const list = collisions.get(entryName) ?? [];
    list.push(raw);
    collisions.set(entryName, list);
    return goConstEntry(entryName, goStr(raw));
  });
  assertNoCollisions(name, collisions, (r) => `"${r}"`);
  emit(goTypeAlias({ name, type: goString }));
  emit(goConstBlock({ type: goRef(name), entries, name }));
  return goRef(name);
}

function emitIntegerEnum(
  name: string,
  rawValues: ReadonlyArray<number>,
  emit: TypeCtx["emit"],
): GoType {
  const collisions = new Map<string, number[]>();
  const entries = rawValues.map((raw) => {
    const entryName = `${name}${integerEntrySuffix(raw)}`;
    const list = collisions.get(entryName) ?? [];
    list.push(raw);
    collisions.set(entryName, list);
    return goConstEntry(entryName, goIntLit(raw));
  });
  assertNoCollisions(name, collisions, (r) => String(r));
  emit(goTypeAlias({ name, type: goInt }));
  emit(goConstBlock({ type: goRef(name), entries, name }));
  return goRef(name);
}

function integerEntrySuffix(n: number): string {
  return n < 0 ? `Neg${Math.abs(n)}` : String(n);
}

function assertNoCollisions<T>(
  name: string,
  collisions: ReadonlyMap<string, ReadonlyArray<T>>,
  show: (raw: T) => string,
): void {
  for (const [entryName, raws] of collisions) {
    if (raws.length > 1) {
      throw new Error(
        `Enum ${name}: entry name "${entryName}" collides for raw values [${raws
          .map(show)
          .join(", ")}]`,
      );
    }
  }
}
