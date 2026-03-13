import { definePluginConfig } from "@hey-api/shared";

import { handler } from "./plugin";
import type { ORPCPlugin, UserConfig } from "./types";

function resolveHandlers(
  server: UserConfig["server"],
): false | { dir: string; importAlias?: string; implementer?: { name: string; from: string } } {
  const handlers = server?.handlers;
  const implementation = server?.implementation ?? false;
  if (handlers === false) return false;
  if (handlers === true || (handlers === undefined && implementation)) {
    return { dir: "src/handlers" };
  }
  if (typeof handlers === "object") {
    return {
      dir: handlers.dir ?? "src/handlers",
      importAlias: handlers.importAlias,
      implementer: handlers.implementer,
    };
  }
  return false;
}

export const resolveConfig = (
  userConfig: Partial<UserConfig>,
): ORPCPlugin["Config"]["config"] => {
  return {
    server: {
      implementation: userConfig.server?.implementation ?? false,
      handlers: resolveHandlers(userConfig.server),
    },
    client: {
      rpc: userConfig.client?.rpc ?? false,
      websocket: userConfig.client?.websocket ?? false,
      messageport: userConfig.client?.messageport ?? false,
      openapi: userConfig.client?.openapi ?? false,
      tanstack: userConfig.client?.tanstack ?? false,
    },
    group: userConfig.group ?? "tags",
    includeInEntry: true,
    mode: userConfig.mode ?? "compact",
    validation: userConfig.validation ?? "zod",
    transformOperationName: userConfig.transformOperationName,
  };
};

export const defaultConfig: ORPCPlugin["Config"] = {
  config: {
    server: { implementation: false, handlers: false },
    client: {
      rpc: false,
      websocket: false,
      messageport: false,
      openapi: false,
      tanstack: false,
    },
    group: "tags",
    includeInEntry: true,
    mode: "compact",
    validation: "zod",
  },
  dependencies: ["@hey-api/typescript", "zod"],
  handler,
  name: "@ahmedrowaihi/orpc",
  resolveConfig: (plugin) => {
    plugin.config.server ??= { implementation: false, handlers: false };
    plugin.config.server.handlers = resolveHandlers(plugin.config.server);
    if (plugin.config.validation === "typia") {
      plugin.dependencies?.delete("zod");
    }
  },
  tags: ["transformer"],
};

export const defineConfig = definePluginConfig(defaultConfig);
