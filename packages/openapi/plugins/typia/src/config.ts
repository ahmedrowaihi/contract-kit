import { definePluginConfig, mappers } from "@hey-api/shared";

import { Api } from "./api";
import { handler } from "./plugin";
import type { TypiaPlugin } from "./types";

export const defaultConfig: TypiaPlugin["Config"] = {
  api: new Api(),
  config: {
    case: "camelCase",
    comments: true,
    includeInEntry: false,
    jsonSchema: true,
    requests: {
      case: "camelCase",
      enabled: true,
      jsonName: "t{{name}}DataJsonSchema",
      name: "t{{name}}Data",
    },
    responses: {
      case: "camelCase",
      enabled: true,
      jsonName: "t{{name}}ResponseJsonSchema",
      name: "t{{name}}Response",
    },
  },
  dependencies: ["@hey-api/transformers", "@hey-api/typescript"],
  handler,
  name: "@ahmedrowaihi/openapi-ts-typia",
  resolveConfig: (plugin, context) => {
    plugin.config.requests = context.valueToObject({
      defaultValue: {
        case: plugin.config.case ?? "camelCase",
        enabled: true,
        jsonName: "t{{name}}DataJsonSchema",
        name: "t{{name}}Data",
      },
      mappers,
      value: plugin.config.requests,
    });

    plugin.config.responses = context.valueToObject({
      defaultValue: {
        case: plugin.config.case ?? "camelCase",
        enabled: true,
        jsonName: "t{{name}}ResponseJsonSchema",
        name: "t{{name}}Response",
      },
      mappers,
      value: plugin.config.responses,
    });
  },
  tags: ["validator"],
};

/**
 * Type helper for Typia plugin, returns {@link Plugin.Config} object
 */
export const defineConfig = definePluginConfig(defaultConfig);
