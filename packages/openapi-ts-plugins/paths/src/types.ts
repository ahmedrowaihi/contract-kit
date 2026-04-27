import type { Casing, DefinePlugin, NamingRule, Plugin } from "@hey-api/shared";

export type UserConfig = Plugin.Hooks &
  Plugin.UserExports & {
    name: "@ahmedrowaihi/paths";
    /**
     * Filename (without extension) for the emitted module.
     * @default "paths"
     */
    output?: string;
    /**
     * Naming rules for the emitted route consts. Names are derived from each
     * operation's id with the configured casing, then concatenated with the
     * configured suffix (e.g. `getPetById` + `Route` → `getPetByIdRoute`).
     */
    naming?: {
      /** @default 'camelCase' */
      casing?: NamingRule | Casing;
      /** @default 'Route' */
      suffix?: string;
    };
  };

export type Config = Plugin.Hooks &
  Plugin.Exports & {
    name: "@ahmedrowaihi/paths";
    output: string;
    naming: {
      casing: Casing;
      suffix: string;
    };
  };

export type PathsPlugin = DefinePlugin<UserConfig, Config>;

declare module "@hey-api/openapi-ts" {
  export interface PluginConfigMap {
    "@ahmedrowaihi/paths": PathsPlugin["Types"];
  }
}
