import type { SwDecl } from "./decl/types.js";

export interface SwFile {
  kind: "file";
  imports: ReadonlyArray<string>;
  decls: ReadonlyArray<SwDecl>;
}

export function swFile(opts: {
  decls: ReadonlyArray<SwDecl>;
  imports?: ReadonlyArray<string>;
}): SwFile {
  return {
    kind: "file",
    imports: opts.imports ?? [],
    decls: opts.decls,
  };
}
