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

/** Extract `Route[]` from a parsed IR — for runtime-loaded specs without codegen. */
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
