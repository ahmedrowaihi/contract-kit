import {
  createProject,
  type ExtractOptions,
  type ExtractResult,
} from "@ahmedrowaihi/fn-schema-core";
import { type TypescriptExtractorOptions, typescript } from "./extractor.js";

export { emit } from "@ahmedrowaihi/fn-schema-core";
export { type TypescriptExtractorOptions, typescript } from "./extractor.js";

/**
 * Convenience one-shot — pre-wires the TypeScript extractor. Equivalent to
 * `createProject({ extractors: [typescript(opts)] }).extract(opts)`.
 */
export async function extract(
  options: ExtractOptions & {
    typescript?: TypescriptExtractorOptions;
  } = {},
): Promise<ExtractResult> {
  const { typescript: tsOpts, ...rest } = options;
  const project = createProject({
    cwd: rest.cwd,
    tsConfigPath: rest.tsConfigPath,
    extractors: [typescript(tsOpts)],
  });
  try {
    return await project.extract(rest);
  } finally {
    project.dispose();
  }
}
