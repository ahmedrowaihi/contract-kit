import type { Faker } from "@faker-js/faker";
import type { DefinePlugin, IR, Plugin } from "@hey-api/shared";

/**
 * Extract all valid method paths from Faker type
 * This type is derived directly from Faker's type definitions
 * Examples: 'string.uuid', 'internet.email', 'person.firstName'
 */
type ExtractFakerPaths<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends object
      ? {
          [M in keyof T[K]]: M extends string
            ? T[K][M] extends (...args: never[]) => unknown
              ? `${K}.${M}`
              : never
            : never;
        }[keyof T[K]]
      : never
    : never;
}[keyof T];

/**
 * Valid Faker method paths extracted from Faker's actual type definition
 * Provides compile-time validation that methods exist in Faker
 */
export type FakerMethodPath = ExtractFakerPaths<Faker>;

/**
 * Mapping from field names to faker method paths
 * Keys are field names (lowercase, normalized) - not type-safe since they come from user's OpenAPI schema
 * Values are type-safe faker method paths
 * @example { email: 'internet.email', phone: 'phone.number' }
 */
export type FieldNameHints = Record<string, FakerMethodPath>;

/**
 * Mapping from OpenAPI formats to faker method paths
 * Keys are OpenAPI format strings - not type-safe since they're from OpenAPI spec
 * Values are type-safe faker method paths
 * @example { email: 'internet.email', uri: 'internet.url', uuid: 'string.uuid' }
 */
export type FormatMapping = Record<string, FakerMethodPath>;

/**
 * Custom generator functions for specific schema names
 * @example { UserId: (faker) => `user_${faker.string.alphanumeric(10)}` }
 */
export type CustomGenerators = Record<
  string,
  (faker: Faker) => string | number | boolean
>;

/**
 * Filter function to determine which schemas to include
 */
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
     * Field name hints for smarter faker method detection
     * Maps field names to faker method paths
     * @example
     * {
     *   email: 'internet.email',
     *   phone: 'phone.number',
     *   avatar: 'image.avatar'
     * }
     */
    fieldNameHints?: FieldNameHints;
    /**
     * Format to faker method mapping
     * @default
     * {
     *   email: 'internet.email',
     *   uri: 'internet.url',
     *   url: 'internet.url',
     *   uuid: 'string.uuid',
     *   'date-time': 'date.recent',
     *   date: 'date.past',
     *   time: 'date.recent',
     *   'ipv4': 'internet.ipv4',
     *   'ipv6': 'internet.ipv6',
     * }
     */
    formatMapping?: FormatMapping;
    /**
     * Custom generator functions for specific types/schemas
     * @example
     * {
     *   UserId: (faker) => `user_${faker.string.alphanumeric(10)}`,
     *   PostId: (faker) => `post_${faker.string.uuid()}`
     * }
     */
    customGenerators?: CustomGenerators;
    /**
     * Include only specific schemas (by name)
     * If provided, only these schemas will be generated
     * Mutually exclusive with 'exclude'
     */
    include?: readonly string[];
    /**
     * Exclude specific schemas (by name)
     * If provided, these schemas will be skipped
     * Mutually exclusive with 'include'
     */
    exclude?: readonly string[];
    /**
     * Custom filter function for schemas
     * Return true to include the schema, false to exclude
     */
    filter?: SchemaFilter;
    /**
     * Generate batch creator functions (e.g., createMockUsers)
     * @default true
     */
    generateBatchCreators?: boolean;
    /**
     * Default count for batch creators
     * @default 10
     */
    defaultBatchCount?: number;
    /**
     * Generate seeder utility function
     * @default false
     */
    generateSeeder?: boolean;
    /**
     * Respect schema constraints (min/max, minLength/maxLength, etc.)
     * @default true
     */
    respectConstraints?: boolean;
    /**
     * Generate JSDoc comments for factories
     * @default true
     */
    generateDocs?: boolean;
  };

export type Config = Plugin.Hooks &
  Plugin.Exports & {
    name: "@ahmedrowaihi/openapi-ts-faker";
    output: string;
    fieldNameHints: FieldNameHints;
    formatMapping: FormatMapping;
    customGenerators: CustomGenerators;
    include?: readonly string[];
    exclude?: readonly string[];
    filter?: SchemaFilter;
    generateBatchCreators: boolean;
    defaultBatchCount: number;
    generateSeeder: boolean;
    respectConstraints: boolean;
    generateDocs: boolean;
  };

export type FakerPlugin = DefinePlugin<UserConfig, Config>;

/**
 * Context for field analysis
 */
export interface FieldContext {
  fieldName: string;
  schema: IR.SchemaObject;
  propertyName?: string;
  parentSchema?: IR.SchemaObject;
}

/**
 * Result of faker method detection
 */
export interface FakerMethodResult {
  method: FakerMethodPath; // Type-safe faker method path
  args?: Record<string, unknown>; // Optional arguments
  fallback?: FakerMethodPath; // Fallback method if primary fails
}

// Module augmentation to register the faker plugin
declare module "@hey-api/openapi-ts" {
  export interface PluginConfigMap {
    "@ahmedrowaihi/openapi-ts-faker": FakerPlugin["Types"];
  }
}
