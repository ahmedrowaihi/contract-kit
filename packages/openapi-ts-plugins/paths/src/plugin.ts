import { $ } from "@hey-api/openapi-ts";
import { applyNaming } from "@hey-api/shared";

import type { PathsPlugin } from "./types";

/** `/users/{id}/posts/{postId}` → `/users/:id/posts/:postId` */
function specToPattern(spec: string): string {
  return spec.replace(/\{([^}]+)\}/g, ":$1");
}

function sanitize(name: string): string {
  return name.replace(/[^\w]/g, "");
}

/**
 * Plugin handler — emits one runtime const per operation:
 *
 * ```ts
 * export const getPetByIdRoute = {
 *   spec: "/pet/{petId}",
 *   pattern: "/pet/:petId",
 *   method: "get",
 *   operationId: "getPetById",
 * } as const;
 * ```
 *
 * Naming follows hey-api convention: `applyNaming(operationId, casing)` plus
 * a configurable suffix (default `Route`). Per-operation exports keep the
 * output tree-shakable — users import only the routes they reference.
 *
 * No aggregate object is emitted; assemble routes you need at the call site:
 *
 * ```ts
 * import { getPetByIdRoute, getOrderByIdRoute } from "./paths.gen";
 * import { matchRequest } from "@ahmedrowaihi/openapi-tools/match";
 *
 * matchRequest([getPetByIdRoute, getOrderByIdRoute], request);
 * ```
 */
export const handler: PathsPlugin["Handler"] = ({ plugin }) => {
  const { casing, suffix } = plugin.config.naming;

  plugin.forEach("operation", ({ operation }) => {
    if (!operation.path || !operation.id) return;

    const baseName = sanitize(applyNaming(operation.id, { casing }));
    const symbolName = `${baseName}${suffix}`;
    const symbol = plugin.symbol(symbolName);

    let routeObj = $.object()
      .prop("spec", $.literal(operation.path))
      .prop("pattern", $.literal(specToPattern(operation.path)))
      .prop("method", $.literal(operation.method.toLowerCase()));
    if (operation.operationId) {
      routeObj = routeObj.prop("operationId", $.literal(operation.operationId));
    }

    plugin.node($.const(symbol).export().assign(routeObj.as("const")));
  });
};
