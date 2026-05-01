import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { definePluginConfig } from "../../plugin.js";
import { readBundle } from "../../runtime/copy-bundle.js";

import { defaultConfig } from "./config.js";
import type { AmqplibPluginConfig, AmqplibResolvedConfig } from "./types.js";

const bundleDir = resolve(dirname(fileURLToPath(import.meta.url)), "bundle");

/** Emit `assertExchanges` / `bindAndConsume` / `publish` by copying `bundle/`. */
export const amqplib = definePluginConfig<
  "amqplib",
  AmqplibPluginConfig,
  AmqplibResolvedConfig,
  unknown
>({
  name: "amqplib",
  defaultConfig,
  dependsOn: ["events"],
  async handler(plugin) {
    for (const file of await readBundle(bundleDir)) {
      plugin.emit(file);
    }
  },
});
