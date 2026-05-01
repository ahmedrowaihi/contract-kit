export type {
  Casing,
  NameTransformer,
  NamingConfig,
  NamingRule,
} from "@hey-api/shared";
export {
  applyNaming,
  resolveNaming,
  toCase,
} from "@hey-api/shared";

/**
 * Pick a name not already taken, suffixing `2`, `3`, … on collision.
 * Mirrors hey-api's private `getUniqueComponentName`.
 */
export function uniqueComponentName(
  base: string,
  components: Record<string, unknown>,
  taken?: ReadonlyArray<string> | ReadonlySet<string>,
): string {
  if (!isTaken(base, components, taken)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}${i}`;
    if (!isTaken(candidate, components, taken)) return candidate;
  }
}

function isTaken(
  name: string,
  components: Record<string, unknown>,
  taken: ReadonlyArray<string> | ReadonlySet<string> | undefined,
): boolean {
  if (name in components) return true;
  if (!taken) return false;
  if (Array.isArray(taken)) return taken.includes(name);
  return (taken as ReadonlySet<string>).has(name);
}
