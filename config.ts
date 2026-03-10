import { definePluginConfig } from "@hey-api/shared";

import { handler } from "./plugin";
import type { ORPCPlugin, UserConfig } from "./types";

export const resolveConfig = (
  userConfig: Partial<UserConfig>,
): ORPCPlugin["Config"]["config"] => {
  return {
    server: {
      implementation: userConfig.server?.implementation ?? false,
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
    server: { implementation: false },
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
  name: "@ahmedrowaihi/openapi-ts-orpc",
  tags: ["transformer"],
};

export const defineConfig = definePluginConfig(defaultConfig);
