import { definePluginConfig } from "@hey-api/shared";

import { DEFAULT_FIELD_HINTS as _FIELD_HINTS, DEFAULT_FORMAT_MAPPING as _FORMAT_HINTS } from "./core/hints";
import { handler } from "./plugin";
import type { FakerPlugin, FieldNameHints, FormatMapping, UserConfig } from "./types";

export const DEFAULT_FIELD_HINTS = _FIELD_HINTS as FieldNameHints;
export const DEFAULT_FORMAT_MAPPING = _FORMAT_HINTS as FormatMapping;

export const resolveConfig = (
  userConfig: Partial<UserConfig>,
): FakerPlugin["Config"]["config"] => {
  return {
    output: userConfig.output ?? "factories.gen",
    fieldNameHints: {
      ...DEFAULT_FIELD_HINTS,
      ...userConfig.fieldNameHints,
    },
    formatMapping: {
      ...DEFAULT_FORMAT_MAPPING,
      ...userConfig.formatMapping,
    },
    customGenerators: userConfig.customGenerators ?? {},
    include: userConfig.include,
    exclude: userConfig.exclude,
    filter: userConfig.filter,
    generateBatchCreators: userConfig.generateBatchCreators ?? true,
    defaultBatchCount: userConfig.defaultBatchCount ?? 10,
    generateSeeder: userConfig.generateSeeder ?? false,
    respectConstraints: userConfig.respectConstraints ?? true,
    generateDocs: userConfig.generateDocs ?? true,
    includeInEntry: true,
  };
};

export const defaultConfig: FakerPlugin["Config"] = {
  config: {
    output: "factories.gen",
    fieldNameHints: DEFAULT_FIELD_HINTS,
    formatMapping: DEFAULT_FORMAT_MAPPING,
    customGenerators: {},
    generateBatchCreators: true,
    defaultBatchCount: 10,
    generateSeeder: false,
    respectConstraints: true,
    generateDocs: true,
    includeInEntry: true,
  },
  dependencies: ["@hey-api/typescript"],
  handler,
  name: "@ahmedrowaihi/openapi-ts-faker",
  tags: ["transformer"],
};

export const defineConfig = definePluginConfig(defaultConfig);
