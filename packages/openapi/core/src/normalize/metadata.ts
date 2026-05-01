/**
 * Reconcile presentation metadata across hits in a hoist group so the
 * canonical body keeps the most informative authored context.
 *
 * Rules: longest non-empty `description` / `title` wins; first
 * non-undefined `example` / `examples` wins; any `deprecated: true`
 * propagates.
 */
export function preserveMetadata(
  hits: ReadonlyArray<{ schema: unknown }>,
  target: Record<string, unknown>,
): void {
  let bestDescription = stringField(target.description);
  let bestTitle = stringField(target.title);
  let example: unknown = target.example;
  let examples: unknown = target.examples;
  let deprecated = target.deprecated === true;

  for (const hit of hits) {
    if (!hit.schema || typeof hit.schema !== "object") continue;
    if (hit.schema === target) continue;
    const s = hit.schema as Record<string, unknown>;

    const desc = stringField(s.description);
    if (desc && desc.length > bestDescription.length) bestDescription = desc;

    const title = stringField(s.title);
    if (title && title.length > bestTitle.length) bestTitle = title;

    if (example === undefined && s.example !== undefined) example = s.example;
    if (examples === undefined && s.examples !== undefined) {
      examples = s.examples;
    }
    if (s.deprecated === true) deprecated = true;
  }

  if (bestDescription) target.description = bestDescription;
  if (bestTitle) target.title = bestTitle;
  if (example !== undefined) target.example = example;
  if (examples !== undefined) target.examples = examples;
  if (deprecated) target.deprecated = true;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}
