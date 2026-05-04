import path from "node:path";
import type { FunctionInfo, NamingStrategy } from "./types.js";

export function resolveNaming(
  strategy: NamingStrategy | undefined,
  fn: FunctionInfo,
  cwd: string,
): string {
  const s = strategy ?? "function-name";
  if (typeof s === "function") return s(fn);

  switch (s) {
    case "function-name":
      return qualifiedName(fn);
    case "file-function": {
      const rel = path.relative(cwd, fn.file).replace(/\\/g, "/");
      const base = rel
        .replace(/\.(m|c)?(ts|tsx|js|jsx)$/, "")
        .replace(/\//g, ".");
      return `${base}.${qualifiedName(fn)}`;
    }
    case "jsdoc-tag": {
      const tag = fn.jsDoc?.tags?.schema;
      if (typeof tag === "string" && tag.length > 0) return tag;
      return qualifiedName(fn);
    }
  }
}

function qualifiedName(fn: FunctionInfo): string {
  // `className` is set for class methods and object-literal members alike;
  // qualify whenever it's present so naming reflects the surface API.
  if (fn.className) return `${fn.className}.${fn.name}`;
  return fn.name;
}
