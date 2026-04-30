import type { GoDecl } from "./decl/types.js";

export interface GoFile {
  kind: "file";
  /** Go package name — `package <pkg>` directive. Required. */
  pkg: string;
  /**
   * Imports as a flat list of import paths. The printer groups
   * stdlib (no `.` in domain) and third-party paths into separate
   * blocks per `gofmt` convention.
   */
  imports: ReadonlyArray<string>;
  /** Top-level decls. */
  decls: ReadonlyArray<GoDecl>;
}

export function goFile(opts: {
  pkg: string;
  decls: ReadonlyArray<GoDecl>;
  imports?: ReadonlyArray<string>;
}): GoFile {
  return {
    kind: "file",
    pkg: opts.pkg,
    imports: opts.imports ?? [],
    decls: opts.decls,
  };
}
