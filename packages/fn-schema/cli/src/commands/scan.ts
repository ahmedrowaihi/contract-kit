import path from "node:path";
import { createProject } from "@ahmedrowaihi/fn-schema-core";
import { typescript } from "@ahmedrowaihi/fn-schema-typescript";
import { defineCommand } from "citty";
import consola from "consola";
import { loadFnSchemaConfig } from "../config.js";
import {
  baseExtractOpts,
  collectPatterns,
  makeListFiles,
  resolveCwd,
} from "./shared.js";

export const scanCommand = defineCommand({
  meta: {
    name: "scan",
    description:
      "List functions discoverable in source — no schemas generated. Read-only preview before committing to extract.",
  },
  args: {
    patterns: {
      type: "positional",
      required: false,
      description: "Glob pattern(s) for source files.",
    },
    cwd: { type: "string", description: "Working directory." },
    tsconfig: { type: "string", description: "Path to tsconfig.json." },
    "include-tag": {
      type: "string",
      description: "Only include functions with this JSDoc tag.",
    },
    "exclude-name": {
      type: "string",
      description: "Exclude functions whose name matches this regex.",
    },
    json: {
      type: "boolean",
      default: false,
      description: "Emit machine-readable JSON instead of a human table.",
    },
    quiet: {
      type: "boolean",
      default: false,
      description: "Suppress non-error logs.",
    },
  },
  async run({ args }) {
    const cwd = resolveCwd(args.cwd);
    const config = await loadFnSchemaConfig(cwd);
    if (args.quiet) consola.level = 1;

    const patternList = collectPatterns(args.patterns, config.files);
    if (patternList.length === 0) {
      consola.error(
        "No source patterns supplied. Pass globs as positional args or set `files` in fn-schema.config.{ts,js,json}.",
      );
      process.exitCode = 1;
      return;
    }

    const files = await makeListFiles(patternList, cwd)();
    if (files.length === 0) {
      consola.warn(`No files matched: ${patternList.join(", ")}`);
      return;
    }

    const project = createProject({
      cwd,
      tsConfigPath: args.tsconfig ?? config.tsConfigPath,
      extractors: [typescript(config.typescript)],
    });

    try {
      const result = await project.discover({
        ...baseExtractOpts(args, config, cwd),
        files,
      });

      if (args.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }

      renderTable(result.signatures, cwd);
      const errs = result.diagnostics.filter(
        (d) => d.severity === "error",
      ).length;
      const warns = result.diagnostics.filter(
        (d) => d.severity === "warning",
      ).length;
      consola.box(
        `${result.signatures.length} fn(s) across ${result.stats.filesScanned} file(s) in ${result.stats.durationMs}ms` +
          (errs + warns > 0 ? ` — ${errs} error(s), ${warns} warning(s)` : ""),
      );
    } finally {
      project.dispose();
    }
  },
});

function renderTable(
  signatures: Awaited<
    ReturnType<ReturnType<typeof createProject>["discover"]>
  >["signatures"],
  cwd: string,
): void {
  const byFile = new Map<string, typeof signatures>();
  for (const sig of signatures) {
    const list = byFile.get(sig.file) ?? [];
    list.push(sig);
    byFile.set(sig.file, list);
  }
  for (const [file, list] of byFile) {
    const rel = path.relative(cwd, file);
    process.stdout.write(`\n${rel}\n`);
    for (const sig of list) {
      const flags = [
        sig.exported ? "exported" : "",
        sig.async ? "async" : "",
        sig.generic ? "generic" : "",
        sig.kind !== "function" ? sig.kind : "",
        sig.className ? `class:${sig.className}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const tag = sig.jsDoc?.tags
        ? Object.entries(sig.jsDoc.tags)
            .map(([k, v]) => `@${k}${typeof v === "string" ? ` ${v}` : ""}`)
            .join(" ")
        : "";
      process.stdout.write(
        `  ${sig.name.padEnd(24)} ${`${sig.location.line}:${sig.location.column}`.padEnd(8)} ${flags}${
          tag ? `  ${tag}` : ""
        }\n`,
      );
    }
  }
}
