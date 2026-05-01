import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { definePluginConfig } from "../../plugin";
import { readBundle, stripTemplateMarker } from "../../runtime/copy-bundle";

import { defaultConfig } from "./config";
import type { DispatchPluginConfig, DispatchResolvedConfig } from "./types";

const bundleDir = resolve(dirname(fileURLToPath(import.meta.url)), "bundle");

/** Emit the Registry runtime + spec-bound `handlers()` factory by copying `bundle/`. */
export const dispatch = definePluginConfig<
  "dispatch",
  DispatchPluginConfig,
  DispatchResolvedConfig,
  unknown
>({
  name: "dispatch",
  defaultConfig,
  dependsOn: ["events", "event-map"],
  async handler(plugin) {
    for (const file of await readBundle(bundleDir)) {
      plugin.emit({
        path: stripTemplateMarker(file.path),
        content: file.content,
      });
    }
  },
});
