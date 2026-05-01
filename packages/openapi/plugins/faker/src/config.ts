import { definePluginConfig } from "@hey-api/shared";

import { DEFAULT_FORMAT_MAPPING } from "./core/hints";
import { handler } from "./plugin";
import type { FakerPlugin, FieldNameHints } from "./types";

export { DEFAULT_FORMAT_MAPPING };

const normalizeHintKey = (key: string): string =>
  key.toLowerCase().replace(/[_-]/g, "");

const normalizeFieldNameHints = (hints?: FieldNameHints): FieldNameHints => {
  if (!hints) return {};
  const out: FieldNameHints = {};
  for (const [key, value] of Object.entries(hints)) {
    out[normalizeHintKey(key)] = value;
  }
  return out;
};

export const defaultConfig: FakerPlugin["Config"] = {
  config: {
    output: "factories.gen",
    fieldNameHints: {},
    formatMapping: DEFAULT_FORMAT_MAPPING,
    generateBatchCreators: true,
    defaultBatchCount: 10,
    respectConstraints: true,
    includeInEntry: true,
  },
  dependencies: ["@hey-api/typescript"],
  handler,
  name: "@ahmedrowaihi/openapi-ts-faker",
  resolveConfig: (plugin) => {
    plugin.config.fieldNameHints = normalizeFieldNameHints(
      plugin.config.fieldNameHints,
    );
    plugin.config.formatMapping = {
      ...DEFAULT_FORMAT_MAPPING,
      ...plugin.config.formatMapping,
    };
  },
  tags: ["transformer"],
};

export const defineConfig = definePluginConfig(defaultConfig);
