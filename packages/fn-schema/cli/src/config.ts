import type { ExtractOptions } from "@ahmedrowaihi/fn-schema-core";
import type { TypescriptExtractorOptions } from "@ahmedrowaihi/fn-schema-typescript";
import { loadConfig } from "c12";

export interface FnSchemaConfig
  extends Omit<ExtractOptions, "files" | "source" | "targets"> {
  files?: string | string[];
  out?: string;
  format?: "json" | "json-pretty" | "bundle" | "openapi";
  typescript?: TypescriptExtractorOptions;
}

export async function loadFnSchemaConfig(cwd: string): Promise<FnSchemaConfig> {
  const { config } = await loadConfig<FnSchemaConfig>({
    cwd,
    name: "fn-schema",
    defaults: {},
  });
  return config ?? {};
}
