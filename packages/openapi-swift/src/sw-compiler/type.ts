import type { SwType } from "../sw-dsl/type/types.js";

export function printType(t: SwType): string {
  switch (t.kind) {
    case "primitive":
      return t.name;
    case "array":
      return `[${printType(t.element)}]`;
    case "dictionary":
      return `[${printType(t.key)}: ${printType(t.value)}]`;
    case "ref":
      return t.name;
    case "optional":
      return `${printType(t.inner)}?`;
  }
}
