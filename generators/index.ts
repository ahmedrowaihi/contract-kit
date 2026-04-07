/**
 * oRPC Generator Modules
 *
 * Each generator handles a specific responsibility in the code generation pipeline.
 */

export { generateClients } from "./client";
export { generateContracts } from "./contract";
export { generateFakerFactories } from "./faker";
export { generateHandlers, type HandlersGeneratorInput } from "./handlers";
export { generateRouter } from "./router";
export { generateServer } from "./server";
export { generateTanstack } from "./tanstack";
export type {
  ClientGeneratorInput,
  ClientTypeConfig,
  ContractGeneratorInput,
  ContractGeneratorOutput,
  GeneratorContext,
  RouterGeneratorInput,
  RouterGeneratorOutput,
  ServerGeneratorInput,
} from "./types";
