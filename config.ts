import { definePluginConfig } from "@hey-api/shared";

import { handler } from "./plugin";
import type { ORPCPlugin, UserConfig } from "./types";

function resolveHandlers(
  server: UserConfig["server"],
): false | { dir: string; importAlias?: string } {
  const handlers = server?.handlers;
  const implementation = server?.implementation ?? false;
  if (handlers === false) return false;
  if (handlers === true || (handlers === undefined && implementation)) {
    return { dir: "src/handlers" };
  }
  if (typeof handlers === "object") {
    return { dir: handlers.dir ?? "src/handlers", importAlias: handlers.importAlias };
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
  },
  dependencies: ["@hey-api/typescript", "zod"],
  handler,
  name: "@ahmedrowaihi/orpc",
  resolveConfig: (plugin) => {
    plugin.config.server ??= { implementation: false, handlers: false };
    plugin.config.server.handlers = resolveHandlers(plugin.config.server);
  },
  tags: ["transformer"],
};

export const defineConfig = definePluginConfig(defaultConfig);
