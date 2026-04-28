import type { Document, MergeSource, PathItem, PathPolicy } from "./types.js";

const DEFAULTS: Required<PathPolicy> = {
  onConflict: "error",
  prefix: (label) => `/${label}`,
};

/**
 * Reduce `sources` into a single `paths` object. Returns the merged paths plus
 * a per-source path-prefix map (only populated when `prefix` is in effect).
 */
export function mergePaths(
  sources: MergeSource[],
  policy: PathPolicy = {},
): {
  paths: Document["paths"];
  pathPrefixes: Record<string, string>;
} {
  const cfg = { ...DEFAULTS, ...policy };
  const out: Record<string, PathItem> = {};
  const pathPrefixes: Record<string, string> = {};

  for (const { label, spec } of sources) {
    const sourcePaths = spec.paths ?? {};
    const prefix = cfg.onConflict === "prefix" ? cfg.prefix(label) : "";
    if (prefix) pathPrefixes[label] = prefix;

    for (const [path, item] of Object.entries(sourcePaths)) {
      if (!item) continue;
      const fullPath = `${prefix}${path}`;

      if (!(fullPath in out)) {
        out[fullPath] = item as PathItem;
        continue;
      }

      switch (cfg.onConflict) {
        case "error":
          throw new MergeConflictError(
            `path collision at "${fullPath}" (source: ${label})`,
          );
        case "first-wins":
          continue;
        case "last-wins":
          out[fullPath] = item as PathItem;
          continue;
        case "prefix":
          // Even prefixed paths can collide if two sources share `label` —
          // treat as a configuration mistake.
          throw new MergeConflictError(
            `path collision after prefixing at "${fullPath}" — duplicate label "${label}"?`,
          );
      }
    }
  }

  return { paths: out as Document["paths"], pathPrefixes };
}

export class MergeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MergeConflictError";
  }
}
