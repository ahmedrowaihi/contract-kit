import { $ } from "@hey-api/openapi-ts";
import type { ServerGeneratorInput } from "./types";

/**
 * Generates server implementation skeleton.
 * Creates an implementer instance that backend developers can use to implement handlers.
 */
export const generateServer = ({
  plugin,
  routerSymbol,
  serverFile,
}: ServerGeneratorInput): void => {
  const implementSymbol = plugin.external("@orpc/server.implement");

  // Export server implementer: os = implement(router)
  const osSymbol = plugin.symbol("os", {
    getFilePath: () => serverFile,
    meta: {
      category: "server",
      resource: "implementer",
      tool: "orpc",
    },
  });

  const osStatement = $.const(osSymbol)
    .export()
    .assign($.call(implementSymbol, $(routerSymbol)));

  plugin.node(osStatement);
};
