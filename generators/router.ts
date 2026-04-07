import { $ } from "@hey-api/openapi-ts";
import { buildRouterObject } from "../router-organizer";
import type { RouterGeneratorInput, RouterGeneratorOutput } from "./types";

/**
 * Generates the oRPC router from the contract structure.
 * Creates a router symbol and exports the router object.
 */
export const generateRouter = ({
  plugin,
  routerFile,
  routerStructure,
}: RouterGeneratorInput): RouterGeneratorOutput => {
  const routerSymbol = plugin.symbol("router", {
    getFilePath: () => routerFile,
    meta: {
      category: "router",
      resource: "router",
      tool: "orpc",
    },
  });

  const routerObj = buildRouterObject(
    routerStructure,
    plugin.config.group,
    plugin.config.naming.operation,
  );

  const routerStatement = $.const(routerSymbol).export().assign(routerObj);
  plugin.node(routerStatement);

  return { routerSymbol };
};
