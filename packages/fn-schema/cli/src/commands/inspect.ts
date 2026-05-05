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

export const inspectCommand = defineCommand({
  meta: {
    name: "inspect",
    description:
      "Print the resolved input + output JSON Schema for a single function.",
  },
  args: {
    name: {
      type: "positional",
      required: true,
      description: "Function name to inspect.",
    },
    patterns: {
      type: "positional",
      required: false,
      description: "Glob pattern(s) for source files.",
    },
    cwd: { type: "string", description: "Working directory." },
    tsconfig: { type: "string", description: "Path to tsconfig.json." },
    params: {
      type: "string",
      description: "How to render parameters: array | first-only | object.",
    },
    "unwrap-promise": {
      type: "boolean",
      description: "Unwrap Promise<T> in return types (default: true).",
    },
    identity: {
      type: "string",
      description:
        'Attach originating TS type name under this keyword (e.g. "x-fn-schema-ts").',
    },
    transport: {
      type: "string",
      description:
        "Attach a transport hint (multipart/base64) for binary types.",
    },
    json: {
      type: "boolean",
      default: false,
      description: "Emit machine-readable JSON.",
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
        "No source patterns supplied. Pass globs as the second positional arg or set `files` in fn-schema.config.{ts,js,json}.",
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
      const result = await project.extract({
        ...baseExtractOpts(args, config, cwd),
        files,
        include: { name: args.name as string },
        signature: {
          ...(config.signature ?? {}),
          parameters:
            (args.params as "array" | "first-only" | "object" | undefined) ??
            config.signature?.parameters,
          unwrapPromise:
            args["unwrap-promise"] ?? config.signature?.unwrapPromise,
        },
        schema: {
          ...(config.schema ?? {}),
          identity:
            typeof args.identity === "string"
              ? args.identity
              : config.schema?.identity,
          transport:
            typeof args.transport === "string"
              ? args.transport
              : config.schema?.transport,
        },
      });

      const matches = result.signatures.filter((s) => s.name === args.name);
      if (matches.length === 0) {
        consola.error(
          `Function "${args.name}" not found in ${files.length} file(s).`,
        );
        process.exitCode = 1;
        return;
      }
      if (matches.length > 1) {
        consola.error(
          `Function "${args.name}" matched ${matches.length} signatures. Narrow the patterns and try again:`,
        );
        for (const m of matches) {
          consola.error(
            `  ${path.relative(cwd, m.file)}:${m.location.line}:${m.location.column}`,
          );
        }
        process.exitCode = 1;
        return;
      }
      const sig = matches[0];

      if (args.json) {
        process.stdout.write(
          `${JSON.stringify(
            {
              signature: sig,
              definitions: result.definitions,
              diagnostics: result.diagnostics,
            },
            null,
            2,
          )}\n`,
        );
        return;
      }

      renderInspect(sig, result, cwd);
    } finally {
      project.dispose();
    }
  },
});

type ExtractResultLike = Awaited<
  ReturnType<ReturnType<typeof createProject>["extract"]>
>;
type SigEntry = ExtractResultLike["signatures"][number];

function renderInspect(
  sig: SigEntry,
  result: ExtractResultLike,
  cwd: string,
): void {
  const rel = path.relative(cwd, sig.file);
  process.stdout.write(
    `\n${sig.id}  ${rel}:${sig.location.line}:${sig.location.column}\n`,
  );
  if (sig.jsDoc?.description) {
    process.stdout.write(`  ${sig.jsDoc.description}\n`);
  }
  process.stdout.write("\n  input:\n");
  process.stdout.write(indent(JSON.stringify(sig.input, null, 2), 4));

  process.stdout.write("\n\n  output:\n");
  process.stdout.write(indent(JSON.stringify(sig.output, null, 2), 4));

  if (Object.keys(result.definitions).length > 0) {
    process.stdout.write("\n\n  definitions:\n");
    process.stdout.write(
      indent(JSON.stringify(result.definitions, null, 2), 4),
    );
  }

  const fnDiags = result.diagnostics.filter((d) => d.function === sig.name);
  if (fnDiags.length > 0) {
    process.stdout.write("\n\n  diagnostics:\n");
    for (const d of fnDiags) {
      process.stdout.write(`    ${d.severity}  ${d.code}  ${d.message}\n`);
    }
  }
  process.stdout.write("\n");
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}
