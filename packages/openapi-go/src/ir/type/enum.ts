import type { IR } from "@hey-api/shared";
import {
  type GoType,
  goConstBlock,
  goConstEntry,
  goRef,
  goStr,
  goString,
  goTypeAlias,
} from "../../go-dsl/index.js";
import { enumEntrySuffix } from "../identifiers.js";
import type { TypeCtx } from "./context.js";

/**
 * Convert an `IR.SchemaObject` whose `type === "enum"` into the Go
 * idiom for string enums:
 *
 *   type Status string
 *   const (
 *       StatusAvailable Status = "available"
 *       StatusPending   Status = "pending"
 *   )
 *
 * Two decls are emitted (one type alias, one const block); the
 * caller's TypeCtx receives both via `emit`. The returned type is
 * the named-type ref so callers reference it as `Status`, not `string`.
 */
export function buildEnumFromIR(
  name: string,
  schema: IR.SchemaObject,
  emit: TypeCtx["emit"],
): GoType {
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
    const entryName = `${name}${enumEntrySuffix(raw)}`;
    const list = collisions.get(entryName) ?? [];
    list.push(raw);
    collisions.set(entryName, list);
    return goConstEntry(entryName, goStr(raw));
  });
  for (const [entryName, raws] of collisions) {
    if (raws.length > 1) {
      throw new Error(
        `Enum ${name}: entry name "${entryName}" collides for raw values [${raws.map((r) => `"${r}"`).join(", ")}]`,
      );
    }
  }
  emit(goTypeAlias({ name, type: goString }));
  emit(goConstBlock({ type: goRef(name), entries, name }));
  return goRef(name);
}
