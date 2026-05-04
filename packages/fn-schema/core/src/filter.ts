import type {
  ExcludeFilter,
  FunctionInfo,
  IncludeFilter,
  NamePattern,
  ResolvedFilter,
} from "./types.js";

export function resolveFilter(
  include?: IncludeFilter,
  exclude?: ExcludeFilter,
  custom?: (fn: FunctionInfo) => boolean,
): ResolvedFilter {
  return {
    exported: include?.exported ?? true,
    name: toRegexList(include?.name),
    jsDocTag: toStringList(include?.jsDocTag),
    kind: include?.kind ?? null,
    decorator: toRegex(include?.decorator),
    exclude: {
      name: toRegexList(exclude?.name),
      jsDocTag: toStringList(exclude?.jsDocTag),
      kind: exclude?.kind ?? null,
      decorator: toRegex(exclude?.decorator),
    },
    custom: custom ?? null,
  };
}

export function applyFilter(fn: FunctionInfo, filter: ResolvedFilter): boolean {
  if (filter.exported && !fn.exported) return false;

  if (filter.kind && !filter.kind.includes(fn.kind)) return false;
  if (filter.name && !filter.name.some((r) => r.test(fn.name))) return false;
  if (filter.jsDocTag && !filter.jsDocTag.some((t) => fn.jsDoc?.tags?.[t]))
    return false;
  if (
    filter.decorator &&
    !fn.decorators?.some((d) => filter.decorator!.test(d))
  )
    return false;

  const ex = filter.exclude;
  if (ex.kind && ex.kind.includes(fn.kind)) return false;
  if (ex.name && ex.name.some((r) => r.test(fn.name))) return false;
  if (ex.jsDocTag && ex.jsDocTag.some((t) => fn.jsDoc?.tags?.[t])) return false;
  if (ex.decorator && fn.decorators?.some((d) => ex.decorator!.test(d)))
    return false;

  if (filter.custom && !filter.custom(fn)) return false;

  return true;
}

function toRegexList(input?: NamePattern | NamePattern[]): RegExp[] | null {
  if (input == null) return null;
  const arr = Array.isArray(input) ? input : [input];
  return arr.map(toRegexStrict);
}

function toRegex(input?: NamePattern): RegExp | null {
  if (input == null) return null;
  return toRegexStrict(input);
}

function toRegexStrict(p: NamePattern): RegExp {
  if (p instanceof RegExp) return p;
  // Treat plain strings as literal substrings — simpler than glob, predictable.
  return new RegExp(escapeRegExp(p));
}

function toStringList(input?: string | string[]): string[] | null {
  if (input == null) return null;
  return Array.isArray(input) ? input : [input];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
