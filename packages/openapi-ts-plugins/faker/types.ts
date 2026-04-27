import type { DefinePlugin, IR, Plugin } from "@hey-api/shared";

import type { FieldNameHints, FormatMapping } from "./core/types";

export type { FakerMethodPath, FieldNameHints, FormatMapping } from "./core/types";

export type SchemaFilter = (schema: IR.SchemaObject) => boolean;

export type UserConfig = Plugin.Hooks &
  Plugin.UserExports & {
    name: "@ahmedrowaihi/openapi-ts-faker";
    /**
     * Output file name for generated factories
     * @default 'factories.gen'
     */
    output?: string;
    /**
     * Field name hints. Keys are field names (any case, with or without
     * separators — `email`, `Email`, `user_email` all normalize the same way).
     * Values must be valid faker method paths.
     * @example { email: "internet.email", phone: "phone.number" }
     */
    fieldNameHints?: FieldNameHints;
    /**
     * OpenAPI format → faker method mapping. Merged with defaults.
     */
    formatMapping?: FormatMapping;
    /** Include only these schemas (by name). Mutually exclusive with `exclude`. */
    include?: readonly string[];
    /** Exclude these schemas (by name). Mutually exclusive with `include`. */
    exclude?: readonly string[];
    /** Custom filter function for schemas. */
    filter?: SchemaFilter;
    /**
     * Generate batch creator functions (e.g. `createMockUsers(count)`).
     * @default true
     */
    generateBatchCreators?: boolean;
    /**
     * Default count for batch creators when caller omits the argument.
     * @default 10
     */
    defaultBatchCount?: number;
    /**
     * Honor `minimum`/`maximum` and `minLength`/`maxLength` from the spec.
     * Numeric methods receive `{ min, max }`; constrained strings switch to
     * `string.alpha` with `{ length }`.
     * @default true
     */
    respectConstraints?: boolean;
  };

export type Config = Plugin.Hooks &
  Plugin.Exports & {
    name: "@ahmedrowaihi/openapi-ts-faker";
    output: string;
    fieldNameHints: FieldNameHints;
    formatMapping: FormatMapping;
    include?: readonly string[];
    exclude?: readonly string[];
    filter?: SchemaFilter;
    generateBatchCreators: boolean;
    defaultBatchCount: number;
    respectConstraints: boolean;
  };

export type FakerPlugin = DefinePlugin<UserConfig, Config>;

declare module "@hey-api/openapi-ts" {
  export interface PluginConfigMap {
    "@ahmedrowaihi/openapi-ts-faker": FakerPlugin["Types"];
  }
}
