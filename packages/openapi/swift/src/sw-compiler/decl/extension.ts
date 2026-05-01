import type { SwExtension } from "../../sw-dsl/decl/extension.js";
import { accessPrefix, INDENT } from "../format.js";
import { printFun } from "./fun.js";

export function printExtension(e: SwExtension): string {
  const head = `${accessPrefix(e.access)}extension ${e.on}`;
  if (e.funs.length === 0) return `${head} {}`;
  // Inner funs inherit the extension's access; emitting `public func`
  // inside `public extension` is a redundant-modifier warning in Swift.
  const body = e.funs
    .map((fn) => printFun(fn, INDENT, /* suppressAccess */ true))
    .join("\n\n");
  return `${head} {\n${body}\n}`;
}
