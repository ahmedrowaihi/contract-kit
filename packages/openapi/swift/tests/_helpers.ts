import { securityKey } from "@ahmedrowaihi/openapi-core";
import { parseSpec } from "@ahmedrowaihi/openapi-tools/parse";
import type { IR } from "@hey-api/shared";

type Fragment = {
  components?: Record<string, unknown>;
  paths?: Record<string, unknown>;
};

export function ir(
  fragment: Fragment,
  version: "3.0" | "3.1" = "3.1",
): IR.Model {
  return parseSpec({
    openapi: version === "3.0" ? "3.0.4" : "3.1.0",
    info: { title: "test", version: "0" },
    paths: {},
    ...fragment,
  });
}

/**
 * Extract per-op security-scheme names from a raw spec fragment, keyed
 * the same way `operationsToDecls` expects (`${path}|${method}`). The IR
 * drops scheme names from `op.security`, so tests building from a
 * fragment with security need to thread this through explicitly.
 */
export function securityNamesMap(
  fragment: Fragment,
): Map<string, ReadonlyArray<string>> {
  const map = new Map<string, ReadonlyArray<string>>();
  const paths = (fragment.paths ?? {}) as Record<string, unknown>;
  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const [method, op] of Object.entries(
      pathItem as Record<string, unknown>,
    )) {
      const security = (op as { security?: unknown })?.security;
      if (!Array.isArray(security)) continue;
      const names = new Set<string>();
      for (const requirement of security) {
        if (requirement && typeof requirement === "object") {
          for (const name of Object.keys(requirement)) names.add(name);
        }
      }
      if (names.size > 0) {
        map.set(securityKey(pathStr, method), [...names]);
      }
    }
  }
  return map;
}
