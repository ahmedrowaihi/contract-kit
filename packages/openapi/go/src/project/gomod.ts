import type { BuiltFile } from "./build.js";

export interface GomodOptions {
  /** Module path — the `module` directive in `go.mod`. Required. */
  module: string;
  /** Minimum Go version. Default `"1.22"`. */
  goVersion?: string;
}

/**
 * Emit a minimal `go.mod` for standalone-module mode. The generated
 * SDK has no third-party deps (stdlib only), so no `require` block.
 *
 * @example
 * ```go
 * module github.com/example/petstore-sdk
 *
 * go 1.22
 * ```
 */
export function gomodFile(opts: GomodOptions): BuiltFile {
  const goVersion = opts.goVersion ?? "1.22";
  return {
    path: "go.mod",
    content: `module ${opts.module}\n\ngo ${goVersion}\n`,
  };
}
