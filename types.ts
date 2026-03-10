import type { DefinePlugin, IR, Plugin } from "@hey-api/shared";

export type TransformOperationNameFn = (
  operation: IR.OperationObject,
) => string;

export type ServerConfig = {
  /**
   * Generate server.gen.ts — the `os = implement(router)` helper used to
   * type-safely implement each procedure in your backend.
   * @default false
   */
  implementation?: boolean;
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
    name: "@ahmedrowaihi/openapi-ts-orpc";
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
     * Router grouping strategy.
     * - 'tags' (default): Group by OpenAPI tags
     * - 'paths': Group by REST path structure
     * - 'flat': No grouping, all procedures at root level
     * @default 'tags'
     */
    group?: "paths" | "flat" | "tags";
    /**
     * Contract input structure mode.
     * - 'compact' (default): Flat merged schema (path + body for mutations, path + query for reads)
     * - 'detailed': Explicit { path, query, headers, body } structure
     * @default 'compact'
     */
    mode?: "detailed" | "compact";
    /**
     * Custom function to transform operation names in the router.
     * @example (operation) => operation.id.replace(/Controller_/i, '')
     */
    transformOperationName?: TransformOperationNameFn;
  };

export type Config = Plugin.Hooks &
  Plugin.Exports & {
    name: "@ahmedrowaihi/openapi-ts-orpc";
    server: Required<ServerConfig>;
    client: Required<ClientConfig>;
    group: "paths" | "flat" | "tags";
    mode: "detailed" | "compact";
    transformOperationName?: TransformOperationNameFn;
  };

export type ORPCPlugin = DefinePlugin<UserConfig, Config>;

// Module augmentation to register the orpc plugin in the PluginConfigMap
declare module "@hey-api/openapi-ts" {
  export interface PluginConfigMap {
    "@ahmedrowaihi/openapi-ts-orpc": ORPCPlugin["Types"];
  }
}
