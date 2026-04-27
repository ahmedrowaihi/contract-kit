import type { FakerPlugin } from "../types";

/**
 * Plugin instance type for Faker generators
 */
export type FakerPluginInstance = Parameters<
  FakerPlugin["Handler"]
>[0]["plugin"];

/**
 * Input for factories generator
 */
export interface GenerateFactoriesInput {
  plugin: FakerPluginInstance;
  outputFile: string;
}
