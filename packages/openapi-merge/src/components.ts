import { MergeConflictError } from "./paths.js";
import { rewriteRefs } from "./refs.js";
import type {
  ComponentPolicy,
  Components,
  MergeSource,
  RenameMap,
} from "./types.js";

const DEFAULTS: Required<ComponentPolicy> = {
  onConflict: "namespace",
  namespace: (label, name) => `${label}_${name}`,
};

const COMPONENT_SECTIONS = [
  "schemas",
  "responses",
  "parameters",
  "examples",
  "requestBodies",
  "headers",
  "securitySchemes",
  "links",
  "callbacks",
  "pathItems",
] as const;

/**
 * Reduce per-source `components` into a single `components` object. Renames
 * conflicting entries according to the policy and returns a per-source
 * rename map so callers can rewrite `$ref`s in the source's paths.
 */
export function mergeComponents(
  sources: MergeSource[],
  policy: ComponentPolicy = {},
): {
  components: Components;
  renames: Record<string, RenameMap>;
} {
  const cfg = { ...DEFAULTS, ...policy };
  const out: Components = {};
  const renames: Record<string, RenameMap> = {};
  const claimed: Record<string, Set<string>> = {};

  for (const section of COMPONENT_SECTIONS) {
    claimed[section] = new Set();
  }

  for (const { label, spec } of sources) {
    const renameMap: RenameMap = {};
    renames[label] = renameMap;
    const components = spec.components ?? {};

    for (const section of COMPONENT_SECTIONS) {
      const entries = (components as Record<string, unknown>)[section];
      if (!entries || typeof entries !== "object") continue;

      const seen = claimed[section];
      const sectionOut =
        (out[section] as Record<string, unknown> | undefined) ?? {};

      for (const [name, value] of Object.entries(entries)) {
        const wantRename = cfg.onConflict === "namespace" || seen.has(name);
        const finalName = wantRename ? cfg.namespace(label, name) : name;

        if (finalName !== name) {
          renameMap[section] ??= {};
          renameMap[section][name] = finalName;
        }

        if (sectionOut[finalName] !== undefined) {
          switch (cfg.onConflict) {
            case "error":
              throw new MergeConflictError(
                `components.${section}.${name} collides across sources (source: ${label})`,
              );
            case "first-wins":
              continue;
            case "last-wins":
              sectionOut[finalName] = value;
              continue;
            case "namespace":
              // Same source providing two equally-namespaced entries is bizarre
              // — fall through to last-wins so we don't crash on retries.
              sectionOut[finalName] = value;
              continue;
          }
        } else {
          sectionOut[finalName] = value;
        }
        seen.add(finalName);
      }

      if (Object.keys(sectionOut).length > 0) {
        (out as Record<string, unknown>)[section] = sectionOut;
      }
    }
  }

  // Rewrite refs in the components themselves so cross-section refs stay valid.
  for (const section of COMPONENT_SECTIONS) {
    const sectionOut = (out as Record<string, unknown>)[section];
    if (!sectionOut) continue;
    (out as Record<string, unknown>)[section] = rewriteRefs(
      sectionOut,
      flattenRenames(renames),
    );
  }

  return { components: out, renames };
}

/**
 * Flatten per-source rename maps into a single `RenameMap` for `rewriteRefs`.
 * If two sources rename the same `(section, name)` pair to different values,
 * the last wins — but in practice that only happens when both sources had a
 * collision, in which case the namespaced names already differ.
 */
export function flattenRenames(
  perSource: Record<string, RenameMap>,
): RenameMap {
  const out: RenameMap = {};
  for (const map of Object.values(perSource)) {
    for (const [section, names] of Object.entries(map)) {
      out[section] ??= {};
      Object.assign(out[section], names);
    }
  }
  return out;
}
