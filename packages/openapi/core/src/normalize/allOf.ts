import { walkSchemas } from "./walk.js";

/** Collapse `{ allOf: [X] }` (single-element) into the parent. */
export function collapseSingleAllOf(spec: unknown): void {
  walkSchemas(spec, ({ node }) => {
    if (!node || typeof node !== "object") return;
    const value = node as Record<string, unknown>;
    const allOf = value.allOf;
    if (!Array.isArray(allOf) || allOf.length !== 1) return;

    const sole = allOf[0];
    if (!sole || typeof sole !== "object") return;
    if (hasMeaningfulSiblings(value)) return;

    delete value.allOf;
    Object.assign(value, sole);
  });
}

function hasMeaningfulSiblings(value: Record<string, unknown>): boolean {
  for (const key of Object.keys(value)) {
    if (key === "allOf") continue;
    if (PRESENTATIONAL.has(key)) continue;
    if (key.startsWith("x-")) continue;
    return true;
  }
  return false;
}

const PRESENTATIONAL: ReadonlySet<string> = new Set([
  "description",
  "title",
  "deprecated",
  "example",
  "examples",
  "externalDocs",
  "readOnly",
  "writeOnly",
]);
