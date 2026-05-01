import { refToName } from "@hey-api/shared";

import { getSchemasObject, schemasPointerPrefix } from "./walk.js";

export interface PruneOptions {
  /**
   * When set, only schemas whose name is in this set are eligible for
   * deletion. Pass the union of names hoisted by earlier passes to
   * keep user-authored schemas untouched. Omit for a global sweep.
   */
  targets?: ReadonlySet<string>;
}

/**
 * Drop unreferenced `components.schemas` entries. Scoped to `targets`
 * when supplied; otherwise performs a global reachability sweep
 * (operations + non-schema components, then transitive closure).
 */
export function pruneUnusedSchemas(
  spec: unknown,
  opts: PruneOptions = {},
): void {
  if (opts.targets && opts.targets.size === 0) return;
  const schemas = getSchemasObject(spec);
  if (!schemas) return;
  const pointerPrefix = schemasPointerPrefix(spec);
  if (!pointerPrefix) return;

  const reachable = new Set<string>();

  if (opts.targets) {
    // Any reference anywhere — even from a dead authored schema — keeps
    // a hoisted target alive, otherwise the surviving authored schema
    // would carry a dangling `$ref`.
    collectRefs(
      spec,
      reachable,
      /* skipComponentsSchemas */ false,
      pointerPrefix,
    );
  } else {
    collectRefs(
      spec,
      reachable,
      /* skipComponentsSchemas */ true,
      pointerPrefix,
    );
    let frontier = new Set(reachable);
    while (frontier.size > 0) {
      const next = new Set<string>();
      for (const name of frontier) {
        const schema = schemas[name];
        if (!schema) continue;
        const refs = new Set<string>();
        collectRefs(
          schema,
          refs,
          /* skipComponentsSchemas */ false,
          pointerPrefix,
        );
        for (const ref of refs) {
          if (!reachable.has(ref)) {
            reachable.add(ref);
            next.add(ref);
          }
        }
      }
      frontier = next;
    }
  }

  for (const name of Object.keys(schemas)) {
    if (reachable.has(name)) continue;
    if (opts.targets && !opts.targets.has(name)) continue;
    delete schemas[name];
  }
}

function collectRefs(
  node: unknown,
  out: Set<string>,
  skipComponentsSchemas: boolean,
  pointerPrefix: string,
  inComponents = false,
): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) {
      collectRefs(
        item,
        out,
        skipComponentsSchemas,
        pointerPrefix,
        inComponents,
      );
    }
    return;
  }
  const value = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(value)) {
    if (k === "$ref" && typeof v === "string" && v.startsWith(pointerPrefix)) {
      out.add(refToName(v));
      continue;
    }
    if (skipComponentsSchemas && !inComponents && k === "components") {
      collectRefsInComponents(v, out, pointerPrefix);
      continue;
    }
    collectRefs(v, out, skipComponentsSchemas, pointerPrefix, inComponents);
  }
}

function collectRefsInComponents(
  node: unknown,
  out: Set<string>,
  pointerPrefix: string,
): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  for (const [k, v] of Object.entries(node)) {
    if (k === "schemas") continue;
    collectRefs(v, out, /* skip */ false, pointerPrefix, true);
  }
}
