import type { KtType } from "../kt-dsl/type/types.js";

export function printType(t: KtType): string {
  switch (t.kind) {
    case "primitive":
      return t.name;
    case "list":
      return `List<${printType(t.element)}>`;
    case "map":
      return `Map<${printType(t.key)}, ${printType(t.value)}>`;
    case "ref": {
      const args =
        t.args && t.args.length > 0
          ? `<${t.args.map(printType).join(", ")}>`
          : "";
      return `${t.name}${args}`;
    }
    case "nullable":
      // Function-type `?` needs parens so the optional binds to the
      // whole function, not its return type.
      return t.inner.kind === "func"
        ? `(${printType(t.inner)})?`
        : `${printType(t.inner)}?`;
    case "func": {
      const params = `(${t.params.map(printType).join(", ")})`;
      const suspend = t.suspend ? "suspend " : "";
      return `${suspend}${params} -> ${printType(t.returnType)}`;
    }
  }
}
