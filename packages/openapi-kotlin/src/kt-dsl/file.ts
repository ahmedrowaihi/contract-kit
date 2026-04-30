import type { KtDecl } from "./decl/types.js";

export interface KtFile {
  kind: "file";
  /** The Kotlin package this file lives in (e.g. `"com.example.api"`). */
  pkg?: string;
  imports: ReadonlyArray<string>;
  decls: ReadonlyArray<KtDecl>;
}

export function ktFile(opts: {
  decls: ReadonlyArray<KtDecl>;
  pkg?: string;
  imports?: ReadonlyArray<string>;
}): KtFile {
  return {
    kind: "file",
    pkg: opts.pkg,
    imports: opts.imports ?? [],
    decls: opts.decls,
  };
}
