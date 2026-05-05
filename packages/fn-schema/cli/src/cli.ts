import { defineCommand, runMain } from "citty";
import { browseCommand } from "./commands/browse.js";
import { diffCommand } from "./commands/diff.js";
import { extractCommand } from "./commands/extract.js";
import { inspectCommand } from "./commands/inspect.js";
import { scanCommand } from "./commands/scan.js";

const main = defineCommand({
  meta: {
    name: "fn-schema",
    version: "0.2.0",
    description:
      "Extract JSON Schemas for function inputs and outputs from TypeScript source.",
  },
  subCommands: {
    extract: extractCommand,
    scan: scanCommand,
    inspect: inspectCommand,
    browse: browseCommand,
    diff: diffCommand,
  },
  // Bare `fn-schema 'src/**/*.ts' --bundle ...` falls through to extract.
  default: "extract",
});

export function run(): void {
  void runMain(main);
}
