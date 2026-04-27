import type { RouterNode } from "../router-organizer";
import type { ClientType, ORPCPlugin } from "../types";

/**
 * Plugin instance type for ORPC generators
 */
type ORPCPluginInstance = Parameters<ORPCPlugin["Handler"]>[0]["plugin"];

/**
 * Common context passed to all generators
 */
export interface GeneratorContext {
  clientFile: string;
  contractFile: string;
  plugin: ORPCPluginInstance;
  routerFile: string;
  routerSymbol: ReturnType<ORPCPluginInstance["symbol"]>;
  tanstackFile: string;
}

/**
 * Input for contract generator
 */
export interface ContractGeneratorInput {
  contractFile: string;
  plugin: ORPCPluginInstance;
}

/**
 * Output from contract generator
 */
export interface ContractGeneratorOutput {
  routerStructure: Map<string, RouterNode[]>;
}

/**
 * Input for router generator
 */
export interface RouterGeneratorInput {
  plugin: ORPCPluginInstance;
  routerFile: string;
  routerStructure: Map<string, RouterNode[]>;
}

/**
 * Output from router generator
 */
export interface RouterGeneratorOutput {
  routerSymbol: ReturnType<ORPCPluginInstance["symbol"]>;
}

/**
 * Configuration for a single client type
 */
export interface ClientTypeConfig {
  /** TypeScript type name for config (e.g., 'RpcLinkClientConfig') */
  configTypeName: string;
  /** Client creation function name (e.g., 'createRpcLinkClient') */
  functionName: string;
  /** External package path (e.g., '@orpc/client/fetch.RPCLink') */
  linkSymbolResource: string;
  /** Whether the Link constructor requires router as first arg (OpenAPILink) */
  needsRouter?: boolean;
}

/**
 * Input for client generator
 */
export interface ClientGeneratorInput {
  clientTypes: ReadonlyArray<ClientType>;
  context: GeneratorContext;
}

/**
 * Input for server generator
 */
export interface ServerGeneratorInput {
  plugin: ORPCPluginInstance;
  routerSymbol: ReturnType<ORPCPluginInstance["symbol"]>;
  serverFile: string;
}
