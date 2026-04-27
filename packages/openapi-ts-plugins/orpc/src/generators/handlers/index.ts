/**
 * Handler file scaffolding — generates handler files on disk.
 * Supports three modes: stub (NOT_IMPLEMENTED), faker (mock data), proxy (client forwarding).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { RouterNode } from "../../router-organizer";
import type { HandlerMode, ProxyHandlerConfig } from "../../types";
import { operationName } from "../../utils";
import type { FileGenContext } from "./ast";
import { analyzeHandlerFile, buildFile, patchFile, safeVarName } from "./ast";

// Re-export types that consumers need
export type { PropertyInfo, ResponseSchemaInfo } from "./ast";

export interface HandlersGeneratorInput {
  /** Absolute path to the handlers directory. */
  handlersDir: string;
  /** Relative import path from a handler file to server.gen.js. */
  serverGenImport: string;
  routerStructure: Map<string, RouterNode[]>;
  /** Override the implementer used in stubs (default: { name: 'os', from: serverGenImport }). */
  implementer?: { name: string; from: string };
  /** Handler body generation mode. @default 'stub' */
  mode?: HandlerMode;
  /** When true, existing handler files are completely rewritten. @default false */
  override?: boolean;
  /** Proxy-specific config. */
  proxyConfig?: ProxyHandlerConfig;
  /**
   * Faker mode: map of operationName → factory function name.
   * Provided by plugin.ts after calling generateFakerFactories().
   */
  fakerFactoryNames?: Map<string, string>;
  /**
   * Faker mode: base import path for faker.gen files.
   * e.g. "#/generated/@ahmedrowaihi/orpc" — tag is appended: `${base}/${tag}/faker.gen`
   */
  fakerGenImportBase?: string;
}

export function generateHandlers({
  handlersDir,
  serverGenImport,
  routerStructure,
  implementer,
  mode = "stub",
  override = false,
  proxyConfig,
  fakerFactoryNames,
  fakerGenImportBase,
}: HandlersGeneratorInput): void {
  if (!existsSync(handlersDir)) {
    mkdirSync(handlersDir, { recursive: true });
  }

  const impl = implementer ?? { name: "os", from: serverGenImport };
  const clientName = proxyConfig?.clientImport?.name ?? "client";

  for (const [group, nodes] of routerStructure) {
    const tag = operationName(group);
    const procedures = nodes.map((n) => operationName(n.operationName));
    const filePath = join(handlersDir, `${tag}.ts`);

    const fakerGenImport = fakerGenImportBase
      ? `${fakerGenImportBase}/${group}/faker.gen`
      : undefined;

    const ctx: FileGenContext = {
      tag,
      procedures,
      implementer: impl,
      mode,
      clientName,
      proxyConfig,
      fakerFactoryNames,
      fakerGenImport,
    };

    // Override mode: always rewrite the file from scratch
    if (override || !existsSync(filePath)) {
      writeFileSync(filePath, buildFile(ctx));
      continue;
    }

    // Patch mode (default): only append missing procedures
    const source = readFileSync(filePath, "utf-8");
    const info = analyzeHandlerFile(source, safeVarName(tag));
    if (!info) continue; // malformed file — skip

    const missing = procedures.filter((p) => !info.existingNames.has(p));
    if (missing.length > 0) {
      writeFileSync(filePath, patchFile(source, ctx, missing));
    }
  }
}
