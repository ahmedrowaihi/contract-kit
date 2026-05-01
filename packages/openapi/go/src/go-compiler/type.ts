import type { GoType } from "../go-dsl/type/types.js";

export function printType(t: GoType): string {
  switch (t.kind) {
    case "primitive":
      return t.name;
    case "slice":
      return `[]${printType(t.element)}`;
    case "map":
      return `map[${printType(t.key)}]${printType(t.value)}`;
    case "ptr":
      return `*${printType(t.inner)}`;
    case "ref": {
      const args =
        t.typeParams && t.typeParams.length > 0
          ? `[${t.typeParams.map(printType).join(", ")}]`
          : "";
      return `${t.name}${args}`;
    }
    case "func": {
      const params = t.params
        .map((p) =>
          p.name === undefined
            ? printType(p.type)
            : `${p.name} ${printType(p.type)}`,
        )
        .join(", ");
      const results =
        t.results.length === 0
          ? ""
          : t.results.length === 1
            ? ` ${printType(t.results[0]!)}`
            : ` (${t.results.map(printType).join(", ")})`;
      return `func(${params})${results}`;
    }
    case "interface": {
      if (t.methods.length === 0) return "interface{}";
      const inner = t.methods
        .map((m) => `${m.name}${printType(m.signature).slice("func".length)}`)
        .join("; ");
      return `interface{ ${inner} }`;
    }
  }
}
