import { definePluginConfig } from "@hey-api/shared";

import { handler } from "./plugin";
import type { PathsPlugin } from "./types";

export const defaultConfig: PathsPlugin["Config"] = {
  config: {
    output: "paths",
    naming: {
      casing: "camelCase",
      suffix: "Route",
    },
  },
  dependencies: ["@hey-api/typescript"],
  handler,
  name: "@ahmedrowaihi/paths",
  tags: ["transformer"],
};

export const defineConfig = definePluginConfig(defaultConfig);
