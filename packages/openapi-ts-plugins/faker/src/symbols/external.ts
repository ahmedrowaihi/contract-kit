import type { FakerPluginInstance } from "../generators/types";

/**
 * Register external symbols from faker library
 */
export const registerExternalSymbols = (plugin: FakerPluginInstance): void => {
  // Register faker as an external symbol that can be used with $()
  plugin.symbol("faker", {
    external: "@faker-js/faker",
    meta: { category: "external", resource: "@faker-js/faker.faker" },
  });
};
