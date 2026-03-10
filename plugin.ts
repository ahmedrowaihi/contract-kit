import { dirname, join, relative } from "node:path";

import {
  generateClients,
  generateContracts,
  generateHandlers,
  generateRouter,
  generateServer,
  generateTanstack,
} from "./generators";
import { registerExternalSymbols } from "./symbols/external";
import type { ClientType, ORPCPlugin } from "./types";

/**
 * Main oRPC plugin handler.
 * Orchestrates the generation pipeline.
 */
export const handler: ORPCPlugin["Handler"] = ({ plugin }) => {
  // ============================================================================
  // External Symbols Registration
  // ============================================================================

  registerExternalSymbols(plugin);

  // ============================================================================
  // File Paths Configuration
  // ============================================================================

  const contractFile = `${plugin.name}/contract.gen`;
  const routerFile = `${plugin.name}/router.gen`;
  const clientFile = `${plugin.name}/client.gen`;
  const serverFile = `${plugin.name}/server.gen`;
  const tanstackFile = `${plugin.name}/tanstack.gen`;

  // ============================================================================
  // Contract Generation
  // ============================================================================

  const { routerStructure } = generateContracts({
    contractFile,
    plugin,
  });

  // ============================================================================
  // Router Generation
  // ============================================================================

  if (routerStructure.size > 0) {
    const { routerSymbol } = generateRouter({
      plugin,
      routerFile,
      routerStructure,
    });

    // ==========================================================================
    // Server Generation
    // ==========================================================================

    if (plugin.config.server.implementation) {
      generateServer({
        plugin,
        routerSymbol,
        serverFile,
      });
    }

    // ==========================================================================
    // Handler Scaffolding
    // ==========================================================================

    const handlersConfig = plugin.config.server.handlers;
    if (handlersConfig) {
      // Absolute path to the output directory (e.g. /project/src/generated)
      const outputDir: string = plugin.context.config.output.path;
      // Absolute path to the handlers directory (e.g. /project/src/handlers)
      const handlersDir = join(process.cwd(), handlersConfig.dir);
      const serverGenAbsolute = join(outputDir, plugin.name, "server.gen");
      const { importAlias } = handlersConfig;
      const serverGenImport = importAlias
        // e.g. "#/generated/@ahmedrowaihi/openapi-ts-orpc/server.gen"
        ? `${importAlias}${relative(dirname(outputDir), serverGenAbsolute).replace(/\\/g, "/")}`
        // e.g. "../generated/@ahmedrowaihi/openapi-ts-orpc/server.gen"
        : relative(handlersDir, serverGenAbsolute).replace(/\\/g, "/");

      generateHandlers({
        handlersDir,
        serverGenImport,
        routerStructure,
      });
    }

    // ==========================================================================
    // Client Generation
    // ==========================================================================

    const { tanstack, ...transports } = plugin.config.client;
    const clientTypes = (
      Object.entries(transports) as [string, boolean][]
    )
      .filter(([, enabled]) => enabled)
      .map(([type]) => type as ClientType);

    if (clientTypes.length > 0) {
      const context = {
        clientFile,
        contractFile,
        plugin,
        routerFile,
        routerSymbol,
        tanstackFile,
      };

      generateClients({ clientTypes, context });

      if (tanstack) {
        generateTanstack(context);
      }
    }
  }
};
