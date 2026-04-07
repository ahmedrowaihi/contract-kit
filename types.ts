import type {
  DefinePlugin,
  NamingConfig,
  NamingRule,
  Plugin,
} from "@hey-api/shared";

/**
 * Handler generation mode.
 * - 'stub': Throws `ORPCError('NOT_IMPLEMENTED')` (default).
 * - 'faker': Returns faker-generated mock data matching the response schema.
 * - 'proxy': Forwards the request through the generated OpenAPI client.
 */
export type HandlerMode = "stub" | "faker" | "proxy";

/**
 * Faker-specific handler options (only apply when `mode: 'faker'`).
 */
export type FakerHandlerConfig = {
  /**
   * Respect schema constraints (min/max, minLength/maxLength) when generating values.
   * @default true
   */
  respectConstraints?: boolean;
};

/**
 * Proxy-specific handler options (only apply when `mode: 'proxy'`).
 */
export type ProxyHandlerConfig = {
  /**
   * Override the client import used in proxy handlers.
   * By default, a client instance is generated from the OpenAPI client.
   * @example { name: 'apiClient', from: '#/lib/client' }
   */
  clientImport?: {
    /** The exported name to use (e.g. `'apiClient'`). */
    name: string;
    /** The module to import it from (e.g. `'#/lib/client'`). */
    from: string;
  };
};

export type ServerConfig = {
  /**
   * Generate server.gen.ts — the `os = implement(router)` helper used to
   * type-safely implement each procedure in your backend.
   * @default false
   */
  implementation?: boolean;
  /**
   * Scaffold handler files under `handlersDir`.
   * - New files are created with `throw new ORPCError('NOT_IMPLEMENTED')` stubs.
   * - Existing files are patched: only procedures absent from the file are appended.
   * Files are never wiped; set to `false` to disable entirely.
   * @default true when `implementation` is true
   */
  handlers?:
    | boolean
    | {
        /**
         * Directory to write handler files into.
         * Resolved relative to `process.cwd()`.
         * @default 'src/handlers'
         */
        dir?: string;
        /**
         * Path alias prefix used when importing `server.gen` inside handler files.
         * When set (e.g. `'#/'`), the import becomes `#/generated/.../server.gen`.
         * When omitted, a relative path is used instead.
         * @example '#/'
         */
        importAlias?: string;
        /**
         * Override the implementer used in generated handler stubs.
         * By default stubs import `os` from the generated `server.gen` file.
         * Use this to import a wrapper like `publicOs` from your own `procedures` module instead.
         * @example { name: 'publicOs', from: '#/procedures' }
         */
        implementer?: {
          /** The exported name to use (e.g. `'publicOs'`). */
          name: string;
          /** The module to import it from (e.g. `'#/procedures'`). */
          from: string;
        };
        /**
         * Handler body generation mode.
         * - 'stub': Throws `ORPCError('NOT_IMPLEMENTED')` (default).
         * - 'faker': Returns faker-generated mock data matching the response schema.
         * - 'proxy': Forwards the request through the generated OpenAPI client.
         * @default 'stub'
         */
        mode?: HandlerMode;
        /**
         * When `true`, existing handler files are completely rewritten on every
         * codegen run instead of only patching in missing procedures.
         * Useful when switching modes (e.g. from stub to proxy) on an existing codebase.
         * @default false
         */
        override?: boolean;
        /**
         * Faker-specific options. Only used when `mode: 'faker'`.
         */
        faker?: FakerHandlerConfig;
        /**
         * Proxy-specific options. Only used when `mode: 'proxy'`.
         */
        proxy?: ProxyHandlerConfig;
      };
};

export type ClientConfig = {
  /**
   * Generate an HTTP client using the native oRPC RPC protocol.
   * @default false
   */
  rpc?: boolean;
  /**
   * Generate a WebSocket client using the native oRPC RPC protocol.
   * @default false
   */
  websocket?: boolean;
  /**
   * Generate a MessagePort client (Web Workers, iframes).
   * @default false
   */
  messageport?: boolean;
  /**
   * Generate an OpenAPI-compatible REST client.
   * Use this when the server exposes standard REST endpoints.
   * @default false
   */
  openapi?: boolean;
  /**
   * Generate TanStack Query utilities (useQuery, useMutation, etc.).
   * Wraps any of the above clients.
   * @default false
   */
  tanstack?: boolean;
};

export type ClientType = keyof ClientConfig;

export type UserConfig = Plugin.Hooks &
  Plugin.UserExports & {
    name: "@ahmedrowaihi/orpc";
    /**
     * Server-side generation options.
     * Controls what backend files are produced.
     * Contracts and router are always generated regardless of this setting.
     * @example { implementation: true }
     */
    server?: ServerConfig;
    /**
     * Client-side generation options.
     * Each key enables a specific client transport or utility.
     * @example { rpc: true, tanstack: true }
     * @example { openapi: true }
     */
    client?: ClientConfig;
    /**
     * Generate JSDoc comments on contract constants from OpenAPI summary/description.
     * @default true
     */
    comments?: boolean;
    /**
     * Router grouping strategy.
     * - 'tags' (default): Group by OpenAPI tags
     * - 'paths': Group by REST path structure
     * - 'flat': No grouping, all procedures at root level
     * @default 'tags'
     */
    group?: "tags" | "paths" | "flat" | "operationId";
    /**
     * Contract input structure mode.
     * - 'compact' (default): Flat merged schema (path + body for mutations, path + query for reads)
     * - 'detailed': Explicit { path, query, headers, body } structure
     * @default 'compact'
     */
    mode?: "detailed" | "compact";
    /**
     * Validator configuration for contract input/output schemas.
     * Accepts a plugin name or an object with separate input/output validators.
     * Set to `false` to disable validation.
     * @default "zod"
     * @example "zod"
     * @example { input: "zod", output: false }
     * @example { input: "typia", output: "typia" }
     */
    validator?:
      | string
      | false
      | {
          input?: string | false;
          output?: string | false;
        };
    /**
     * Naming rules for generated code.
     * Each key accepts a casing string (e.g. 'camelCase') or a full NamingConfig.
     */
    naming?: {
      /** Naming for contract constants (e.g. "GetUserContract"). @default { casing: 'PascalCase' } */
      contract?: NamingRule;
      /** Naming for router/procedure keys (e.g. "getUser"). @default { casing: 'camelCase' } */
      operation?: NamingRule;
    };
  };

export type Config = Plugin.Hooks &
  Plugin.Exports & {
    name: "@ahmedrowaihi/orpc";
    server: Required<Omit<ServerConfig, "handlers">> & {
      handlers:
        | false
        | {
            dir: string;
            importAlias?: string;
            implementer?: { name: string; from: string };
            mode: HandlerMode;
            override: boolean;
            faker?: FakerHandlerConfig;
            proxy?: ProxyHandlerConfig;
          };
    };
    client: Required<ClientConfig>;
    comments: boolean;
    group: "tags" | "paths" | "flat" | "operationId";
    mode: "detailed" | "compact";
    naming: {
      contract: NamingConfig;
      operation: NamingConfig;
    };
    validator: {
      input: string | false;
      output: string | false;
    };
  };

export type ORPCPlugin = DefinePlugin<UserConfig, Config>;

// Module augmentation to register the orpc plugin in the PluginConfigMap
declare module "@hey-api/openapi-ts" {
  export interface PluginConfigMap {
    "@ahmedrowaihi/orpc": ORPCPlugin["Types"];
  }
}
