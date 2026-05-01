import { generateFactories } from "./generators";
import { registerExternalSymbols } from "./symbols/external";
import type { FakerPlugin } from "./types";

/**
 * Main faker plugin handler.
 * Generates faker factory functions from OpenAPI schemas.
 */
export const handler: FakerPlugin["Handler"] = ({ plugin }) => {
  // ============================================================================
  // External Symbols Registration
  // ============================================================================

  registerExternalSymbols(plugin);

  // ============================================================================
  // File Paths Configuration
  // ============================================================================

  const outputFile = `${plugin.name}/${plugin.config.output}`;

  // ============================================================================
  // Factory Generation
  // ============================================================================

  generateFactories({
    plugin,
    outputFile,
  });
};
