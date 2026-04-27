import type { Symbol as CodegenSymbol } from "@hey-api/codegen-core";
import { $ } from "@hey-api/openapi-ts";
import type { IR, NamingConfig } from "@hey-api/shared";
import { OperationPath } from "@hey-api/shared";

import { operationName } from "./utils";

const pathStrategy = OperationPath.fromPath();
const operationIdStrategy = OperationPath.fromOperationId();

export type RouterNode = {
  contractName: string;
  contractSymbol: CodegenSymbol;
  operation: IR.OperationObject;
  operationName: string;
};

export type GroupMode = "tags" | "paths" | "flat" | "operationId";

export function getGroupKey(
  operation: IR.OperationObject,
  mode: GroupMode,
): string {
  if (mode === "paths") {
    const segments = pathStrategy(operation).filter((s) => !s.startsWith("{"));
    return segments.slice(0, -1).join(".") || "root";
  }

  if (mode === "operationId") {
    const segments = operationIdStrategy(operation);
    return segments.length > 1 ? segments.slice(0, -1).join(".") : "default";
  }

  if (mode === "flat") {
    return "flat";
  }

  return operation.tags?.[0] || "default";
}

export function buildRouterObject(
  routerStructure: Map<string, RouterNode[]>,
  groupMode: GroupMode,
  namingConfig: NamingConfig,
): ReturnType<(typeof $)["object"]> {
  let routerObj = $.object().pretty();

  if (groupMode === "flat") {
    const nodes = routerStructure.get("flat") || [];
    for (const node of nodes) {
      const key = operationName(node.operationName, namingConfig);
      routerObj = routerObj.prop(key, node.contractSymbol);
    }
  } else {
    for (const [namespace, nodes] of routerStructure.entries()) {
      let namespaceObj = $.object().pretty();

      for (const node of nodes) {
        const key = operationName(node.operationName, namingConfig);
        namespaceObj = namespaceObj.prop(key, node.contractSymbol);
      }

      const namespaceKey = operationName(
        namespace.replace(/\./g, "_"),
        namingConfig,
      );
      routerObj = routerObj.prop(namespaceKey, namespaceObj);
    }
  }

  return routerObj;
}
