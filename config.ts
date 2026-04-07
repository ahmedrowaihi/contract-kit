import { definePluginConfig, resolveNaming } from "@hey-api/shared";

import { handler } from "./plugin";
import type { ORPCPlugin, UserConfig } from "./types";

function resolveHandlers(server: UserConfig["server"]):
  | false
  | {
      dir: string;
      importAlias?: string;
      implementer?: { name: string; from: string };
      mode: import("./types").HandlerMode;
      override: boolean;
      faker?: import("./types").FakerHandlerConfig;
      proxy?: import("./types").ProxyHandlerConfig;
    } {
  const handlers = server?.handlers;
  const implementation = server?.implementation ?? false;
  if (handlers === false) return false;
  if (handlers === true || (handlers === undefined && implementation)) {
    return { dir: "src/handlers", mode: "stub", override: false };
  }
  if (typeof handlers === "object") {
    return {
      dir: handlers.dir ?? "src/handlers",
      importAlias: handlers.importAlias,
      implementer: handlers.implementer,
      mode: handlers.mode ?? "stub",
      override: handlers.override ?? false,
      faker: handlers.faker,
      proxy: handlers.proxy,
    };
  }
  return false;
}

function resolveValidator(validator: UserConfig["validator"]): {
  input: string | false;
  output: string | false;
} {
  if (validator === false) return { input: false, output: false };
  if (typeof validator === "string")
    return { input: validator, output: validator };
  if (typeof validator === "object") {
    return {
      input: validator.input ?? "zod",
      output: validator.output ?? "zod",
    };
  }
  return { input: "zod", output: "zod" };
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
    comments: userConfig.comments ?? true,
    group: userConfig.group ?? "tags",
    includeInEntry: true,
    mode: userConfig.mode ?? "compact",
    naming: {
      contract: resolveNaming(userConfig.naming?.contract) ?? {
        casing: "PascalCase",
      },
      operation: resolveNaming(userConfig.naming?.operation) ?? {
        casing: "camelCase",
      },
    },
    validator: resolveValidator(userConfig.validator),
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
    comments: true,
    group: "tags",
    includeInEntry: true,
    mode: "compact",
    naming: {
      contract: { casing: "PascalCase" },
      operation: { casing: "camelCase" },
    },
    validator: { input: "zod", output: "zod" },
  },
  dependencies: ["@hey-api/typescript"],
  handler,
  name: "@ahmedrowaihi/orpc",
  resolveConfig: (plugin) => {
    plugin.config.server ??= { implementation: false, handlers: false };
    plugin.config.server.handlers = resolveHandlers(plugin.config.server);

    const validator = plugin.config.validator as {
      input: string | false;
      output: string | false;
    };
    if (validator.input && validator.input !== "typia") {
      plugin.dependencies?.add(validator.input);
    }
    if (
      validator.output &&
      validator.output !== "typia" &&
      validator.output !== validator.input
    ) {
      plugin.dependencies?.add(validator.output);
    }
  },
  tags: ["transformer"],
};

export const defineConfig = definePluginConfig(defaultConfig);
