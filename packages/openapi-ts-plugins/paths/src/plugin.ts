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
