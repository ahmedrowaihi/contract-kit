import type { AnyRegisteredPlugin } from "../plugin";

/**
 * Topological sort by `dependsOn`. Cycles throw. Missing dependencies
 * are skipped silently — the dependent plugin runs anyway and is
 * responsible for tolerating the absence.
 */
export function orderPlugins(
  plugins: ReadonlyArray<AnyRegisteredPlugin>,
): ReadonlyArray<AnyRegisteredPlugin> {
  const byName = new Map(plugins.map((p) => [p.name, p]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: AnyRegisteredPlugin[] = [];

  function visit(plugin: AnyRegisteredPlugin) {
    if (visited.has(plugin.name)) return;
    if (visiting.has(plugin.name)) {
      throw new Error(
        `asyncapi-typescript: plugin dependency cycle at "${plugin.name}"`,
      );
    }
    visiting.add(plugin.name);
    for (const depName of plugin.__definition.dependsOn ?? []) {
      const dep = byName.get(depName);
      if (dep) visit(dep);
    }
    visiting.delete(plugin.name);
    visited.add(plugin.name);
    result.push(plugin);
  }

  for (const plugin of plugins) visit(plugin);
  return result;
}
