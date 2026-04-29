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
      // Function-type `?` needs parens so the optional binds to the
      // whole function and not its return type.
      return t.inner.kind === "func"
        ? `(${printType(t.inner)})?`
        : `${printType(t.inner)}?`;
    case "func": {
      const params = `(${t.params.map(printType).join(", ")})`;
      const effects = t.effects.length > 0 ? ` ${t.effects.join(" ")}` : "";
      return `${params}${effects} -> ${printType(t.returnType)}`;
    }
  }
}
