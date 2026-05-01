import { basename, parse as parsePath } from "node:path";

/**
 * Refuse to wipe the current working directory or a filesystem root.
 * `clean: true` runs `rm -rf` on the resolved output directory at the
 * start of `generate()`, which would destroy the user's repo if they
 * pointed `output` at `.` or `/`. Cheap guardrail with no false
 * positives — generators always want output under a dedicated subdir.
 */
export function assertSafeOutputDir(out: string): void {
  if (out === process.cwd() || out === parsePath(out).root) {
    throw new Error(
      `Refusing to clean output directory: ${out} (would wipe cwd or filesystem root). Use a dedicated subdirectory.`,
    );
  }
}

/**
 * Derive a project name from the output directory's basename, with
 * non-alphanumerics collapsed to dashes. Used as the fallback for
 * Gradle's `rootProject.name` / SwiftPM `Package(name:)` /
 * `module name` defaults. Empty result (e.g. output is `/`) falls
 * back to the literal `"generated-sdk"` so the build files always
 * have a valid name slot.
 */
export function defaultProjectName(outputDir: string): string {
  const base = basename(outputDir).replace(/[^A-Za-z0-9-]+/g, "-");
  return base || "generated-sdk";
}
