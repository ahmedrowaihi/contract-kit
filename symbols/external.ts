import type { PluginInstance } from "@hey-api/shared";

import type { Config } from "../types";

/**
 * Register all external symbols from oRPC packages.
 * These symbols are imported from external packages and used throughout the plugin.
 */
export const registerExternalSymbols = (plugin: PluginInstance, config: Pick<Config, "validation">) => {
  // Core oRPC contract symbols
  plugin.symbol("oc", {
    external: "@orpc/contract",
    meta: { category: "external", resource: "@orpc/contract.oc" },
  });

  plugin.symbol("ContractRouterClient", {
    external: "@orpc/contract",
    meta: {
      category: "external",
      resource: "@orpc/contract.ContractRouterClient",
    },
  });

  plugin.symbol("createORPCClient", {
    external: "@orpc/client",
    meta: { category: "external", resource: "@orpc/client.createORPCClient" },
  });

  // RPCLink transports (native RPC protocol)
  plugin.symbol("RPCLink", {
    external: "@orpc/client/fetch",
    meta: { category: "external", resource: "@orpc/client/fetch.RPCLink" },
  });

  plugin.symbol("RPCLinkWebSocket", {
    external: "@orpc/client/websocket",
    meta: { category: "external", resource: "@orpc/client/websocket.RPCLink" },
  });

  plugin.symbol("RPCLinkMessagePort", {
    external: "@orpc/client/message-port",
    meta: {
      category: "external",
      resource: "@orpc/client/message-port.RPCLink",
    },
  });

  // OpenAPILink (REST protocol)
  plugin.symbol("OpenAPILink", {
    external: "@orpc/openapi-client/fetch",
    meta: {
      category: "external",
      resource: "@orpc/openapi-client/fetch.OpenAPILink",
    },
  });

  // TanStack Query integration
  plugin.symbol("createTanstackQueryUtils", {
    external: "@orpc/tanstack-query",
    meta: {
      category: "external",
      resource: "@orpc/tanstack-query.createTanstackQueryUtils",
    },
  });

  // Server implementation
  plugin.symbol("implement", {
    external: "@orpc/server",
    meta: { category: "external", resource: "@orpc/server.implement" },
  });

  if (config.validation === "typia") {
    plugin.symbol("createValidate", {
      external: "typia",
      meta: { category: "external", resource: "typia.createValidate" },
    });
  }
};
