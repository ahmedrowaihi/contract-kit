import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createProject, emit } from "@ahmedrowaihi/fn-schema-core";
import { typescript } from "@ahmedrowaihi/fn-schema-typescript";
import {
  cancel,
  intro,
  isCancel,
  multiselect,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import { defineCommand } from "citty";
import consola from "consola";
import { loadFnSchemaConfig } from "../config.js";
import {
  baseExtractOpts,
  collectPatterns,
  makeListFiles,
  resolveCwd,
} from "./shared.js";

type Action = "print" | "bundle" | "files" | "openapi";

export const browseCommand = defineCommand({
  meta: {
    name: "browse",
    description:
      "Interactive picker — discover, multi-select, then extract or print the chosen functions.",
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
    pretty: {
      type: "boolean",
      default: true,
      description: "Pretty-print JSON output.",
    },
  },
  async run({ args }) {
    const cwd = resolveCwd(args.cwd);
    const config = await loadFnSchemaConfig(cwd);

    const patternList = collectPatterns(args.patterns, config.files);
    if (patternList.length === 0) {
      consola.error(
        "No source patterns supplied. Pass globs as a positional arg or set `files` in fn-schema.config.{ts,js,json}.",
      );
      process.exitCode = 1;
      return;
    }

    const files = await makeListFiles(patternList, cwd)();
    if (files.length === 0) {
      consola.warn(`No files matched: ${patternList.join(", ")}`);
      return;
    }

    intro("fn-schema browse");

    const project = createProject({
      cwd,
      tsConfigPath: args.tsconfig ?? config.tsConfigPath,
      extractors: [typescript(config.typescript)],
    });

    try {
      const s = spinner();
      s.start(`Discovering across ${files.length} file(s)`);
      const discovery = await project.discover({
        ...baseExtractOpts(args, config, cwd),
        files,
      });
      s.stop(`Found ${discovery.signatures.length} function(s)`);

      if (discovery.signatures.length === 0) {
        outro("Nothing to pick.");
        return;
      }

      const picked = await multiselect<number>({
        message: "Select functions",
        options: discovery.signatures.map((fn, i) => ({
          value: i,
          label: fn.name,
          hint: `${path.relative(cwd, fn.file)}:${fn.location.line}`,
        })),
        required: true,
      });
      if (isCancel(picked)) return cancel("Cancelled.");

      const chosenIndexes = new Set(picked);
      const chosenSigs = discovery.signatures.filter((_, i) =>
        chosenIndexes.has(i),
      );
      const chosenFiles = Array.from(new Set(chosenSigs.map((fn) => fn.file)));
      const chosenNamePatterns = Array.from(
        new Set(
          chosenSigs.map((fn) => new RegExp(`^${escapeRegExp(fn.name)}$`)),
        ),
      );

      const action = await select<Action>({
        message: "What now?",
        options: [
          { value: "print", label: "Print schemas to stdout" },
          { value: "bundle", label: "Write JSON bundle" },
          { value: "files", label: "Write per-signature JSON files" },
          { value: "openapi", label: "Write OpenAPI 3.1 components doc" },
        ],
      });
      if (isCancel(action)) return cancel("Cancelled.");

      const target = await maybeAskPath(action);
      if (target === null) return;

      const e = spinner();
      e.start("Extracting selected functions");
      const result = await project.extract({
        ...baseExtractOpts(args, config, cwd),
        files: chosenFiles,
        signature: config.signature,
        schema: config.schema,
        naming: config.naming,
        include: {
          ...baseExtractOpts(args, config, cwd).include,
          name: chosenNamePatterns,
        },
      });
      e.stop(`Extracted ${result.signatures.length} signature(s)`);

      await runAction(action, target, result, cwd, args.pretty);
      outro("Done.");
    } finally {
      project.dispose();
    }
  },
});

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function maybeAskPath(action: Action): Promise<string | null> {
  if (action === "print") return "";
  const placeholder =
    action === "bundle"
      ? "generated/schemas.json"
      : action === "files"
        ? "generated"
        : "generated/openapi.json";
  const value = await text({
    message: action === "files" ? "Output directory" : "Output path",
    placeholder,
    defaultValue: placeholder,
  });
  if (isCancel(value)) {
    cancel("Cancelled.");
    return null;
  }
  return value;
}

async function runAction(
  action: Action,
  target: string,
  result: Awaited<ReturnType<ReturnType<typeof createProject>["extract"]>>,
  cwd: string,
  pretty: boolean,
): Promise<void> {
  if (action === "print") {
    for (const sig of result.signatures) {
      note(
        JSON.stringify({ input: sig.input, output: sig.output }, null, 2),
        `${sig.id}  ${path.relative(cwd, sig.file)}:${sig.location.line}`,
      );
    }
    return;
  }

  if (action === "bundle") {
    const abs = path.resolve(cwd, target);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, emit.toBundle(result, { pretty }));
    consola.success(`Wrote bundle to ${path.relative(cwd, abs)}`);
    return;
  }

  if (action === "files") {
    const written = await emit.toFiles(result, {
      dir: path.resolve(cwd, target),
      format: pretty ? "json-pretty" : "json",
    });
    consola.success(
      `Wrote ${written.length} file(s) to ${path.relative(cwd, path.resolve(cwd, target))}`,
    );
    return;
  }

  if (action === "openapi") {
    const abs = path.resolve(cwd, target);
    await mkdir(path.dirname(abs), { recursive: true });
    const doc = emit.toOpenAPI(result, { title: "fn-schema" });
    await writeFile(abs, JSON.stringify(doc, null, pretty ? 2 : 0));
    consola.success(`Wrote OpenAPI document to ${path.relative(cwd, abs)}`);
  }
}
