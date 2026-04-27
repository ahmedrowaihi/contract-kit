import type { IR } from "@hey-api/shared";

import type { Route } from "./route";

const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

/** `/users/{id}/posts/{postId}` → `/users/:id/posts/:postId` */
function specToPattern(spec: string): string {
  return spec.replace(/\{([^}]+)\}/g, ":$1");
}

/**
 * Extract a `Route[]` from a parsed OpenAPI IR. Use this on the backend when
 * the spec is loaded dynamically (from disk, a registry, a fetch, etc.) and
 * the codegen-emitted `ROUTES` array isn't available.
 *
 * @example
 * ```ts
 * import { parseSpec } from "@ahmedrowaihi/openapi-tools/parse";
 * import { routesFromIR } from "@ahmedrowaihi/openapi-tools/ir";
 * import { matchRequest } from "@ahmedrowaihi/openapi-tools/match";
 *
 * const routes = routesFromIR(parseSpec(spec));
 * const result = matchRequest(routes, request);
 * ```
 */
export function routesFromIR(ir: IR.Model): Route[] {
  const out: Route[] = [];
  const paths =
    (ir as { paths?: Record<string, Record<string, unknown>> }).paths ?? {};
  for (const [spec, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as { operationId?: string } | undefined;
      if (!op) continue;
      out.push({
        spec,
        pattern: specToPattern(spec),
        method,
        operationId: op.operationId,
      });
    }
  }
  return out;
}
