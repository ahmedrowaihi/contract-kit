import type {
  Casing,
  DefinePlugin,
  NameTransformer,
  Plugin,
} from "@hey-api/shared";

import type { IApi } from "./api";

export type UserConfig = Plugin.Hooks &
  Plugin.UserExports & {
    name: "@ahmedrowaihi/openapi-ts-typia";
    /**
     * Casing convention for generated names.
     *
     * @default 'camelCase'
     */
    case?: Casing;
    /**
     * Generate JSDoc comments on emitted validators from OpenAPI
     * summary/description.
     *
     * @default true
     */
    comments?: boolean;
    /**
     * Emit JSON Schema companions alongside the Standard Schema
     * validators. One `typia.json.schemas<[T1, T2, ...]>()` call per
     * output file shares the components pool across operations.
     *
     * Disable for pure-server setups that don't need OpenAPI spec
     * generation.
     *
     * @default true
     */
    jsonSchema?: boolean;
    /**
     * Configuration for per-operation request validators.
     *
     * Can be:
     * - `boolean`: Shorthand for `{ enabled: boolean }`
     * - `string` or `function`: Shorthand for `{ name: string | function }`
     * - `object`: Full configuration object
     *
     * @default true
     */
    requests?:
      | boolean
      | NameTransformer
      | {
          /**
           * Casing convention for generated names.
           *
           * @default 'camelCase'
           */
          case?: Casing;
          /**
           * Whether this feature is enabled.
           *
           * @default true
           */
          enabled?: boolean;
          /**
           * Naming pattern for the JSON Schema companion symbol.
           * Only used when `jsonSchema: true`.
           *
           * @default 't{{name}}DataJsonSchema'
           */
          jsonName?: NameTransformer;
          /**
           * Naming pattern for the validator symbol.
           *
           * @default 't{{name}}Data'
           */
          name?: NameTransformer;
        };
    /**
     * Configuration for per-operation response validators.
     *
     * @default true
     */
    responses?:
      | boolean
      | NameTransformer
      | {
          /**
           * Casing convention for generated names.
           *
           * @default 'camelCase'
           */
          case?: Casing;
          /**
           * Whether this feature is enabled.
           *
           * @default true
           */
          enabled?: boolean;
          /**
           * Naming pattern for the JSON Schema companion symbol.
           * Only used when `jsonSchema: true`.
           *
           * @default 't{{name}}ResponseJsonSchema'
           */
          jsonName?: NameTransformer;
          /**
           * Naming pattern for the validator symbol.
           *
           * @default 't{{name}}Response'
           */
          name?: NameTransformer;
        };
  };

export type Config = Plugin.Hooks &
  Plugin.Exports & {
    name: "@ahmedrowaihi/openapi-ts-typia";
    case: Casing;
    comments: boolean;
    jsonSchema: boolean;
    requests: {
      case: Casing;
      enabled: boolean;
      jsonName: NameTransformer;
      name: NameTransformer;
    };
    responses: {
      case: Casing;
      enabled: boolean;
      jsonName: NameTransformer;
      name: NameTransformer;
    };
  };

export type TypiaPlugin = DefinePlugin<UserConfig, Config, IApi>;

// Register plugin name in hey-api's PluginConfigMap.
declare module "@hey-api/openapi-ts" {
  export interface PluginConfigMap {
    "@ahmedrowaihi/openapi-ts-typia": TypiaPlugin["Types"];
  }
}
