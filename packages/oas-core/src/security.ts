/**
 * Per-operation security-scheme NAME extraction. hey-api's IR drops
 * scheme names from `op.security` (it inlines the resolved scheme
 * objects into a different shape), leaving downstream generators with
 * no way to wire `client.auth["<name>"]`. So we walk the raw bundled
 * spec instead and key results by `${path}|${method}` for fast
 * lookups during the IR pass.
 *
 * Map shape: `"/me|get" → ["bearerAuth", "apiKeyAuth"]`.
 *
 * An operation with `security: [{a: []}, {b: []}]` (logical OR — any
 * scheme satisfies the requirement) and an operation with
 * `security: [{a: [], b: []}]` (logical AND — both required) both
 * collapse to the same name set here. Generators currently apply
 * every scheme that has a matching `client.auth` entry; if we ever
 * need to honour OR/AND semantics, this map needs to grow shape.
 */
export function extractSecuritySchemeNames(
  spec: Record<string, unknown>,
): Map<string, ReadonlyArray<string>> {
  const map = new Map<string, ReadonlyArray<string>>();
  const paths = (spec.paths ?? {}) as Record<string, unknown>;
  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const [method, op] of Object.entries(
      pathItem as Record<string, unknown>,
    )) {
      if (!op || typeof op !== "object") continue;
      const security = (op as { security?: unknown }).security;
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

/** Key used in the security-scheme map for one (path, method) pair.
 *  The pipe is non-URL-safe so it can't collide with a path segment. */
export const securityKey = (path: string, method: string): string =>
  `${path}|${method}`;
