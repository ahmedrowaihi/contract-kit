import { applyNaming, type NamingConfig } from "@hey-api/shared";

const DEFAULT_CONTRACT_NAMING: NamingConfig = { casing: "PascalCase" };
const DEFAULT_OPERATION_NAMING: NamingConfig = { casing: "camelCase" };

function sanitize(name: string): string {
  return name.replace(/[^\w]/g, "");
}

export function contractName(
  operationId: string,
  config?: NamingConfig,
): string {
  return sanitize(applyNaming(operationId, config ?? DEFAULT_CONTRACT_NAMING));
}

export function operationName(name: string, config?: NamingConfig): string {
  return sanitize(applyNaming(name, config ?? DEFAULT_OPERATION_NAMING));
}
