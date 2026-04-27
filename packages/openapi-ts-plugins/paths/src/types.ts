import type { Casing, DefinePlugin, NamingRule, Plugin } from "@hey-api/shared";

export type UserConfig = Plugin.Hooks &
  Plugin.UserExports & {
    name: "@ahmedrowaihi/paths";
    /** Filename (no extension). @default "paths" */
    output?: string;
    /** Route const naming: `applyNaming(operationId, casing) + suffix` (e.g. `getPetByIdRoute`). */
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
