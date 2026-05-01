import type { RenameMap } from "./types.js";

export function rewriteRefs<T>(node: T, renames: RenameMap): T {
  if (node === null || typeof node !== "object") return node;
  if (Array.isArray(node)) {
    return node.map((v) => rewriteRefs(v, renames)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === "$ref" && typeof v === "string") {
      out[k] = rewriteRef(v, renames);
    } else {
      out[k] = rewriteRefs(v, renames);
    }
  }
  return out as unknown as T;
}

const REF_PREFIX = "#/components/";

function rewriteRef(ref: string, renames: RenameMap): string {
  if (!ref.startsWith(REF_PREFIX)) return ref;
  const tail = ref.slice(REF_PREFIX.length);
  const slash = tail.indexOf("/");
  if (slash === -1) return ref;
  const section = tail.slice(0, slash);
  const rest = tail.slice(slash + 1);
  const nameEnd = rest.indexOf("/");
  const name = nameEnd === -1 ? rest : rest.slice(0, nameEnd);
  const remainder = nameEnd === -1 ? "" : rest.slice(nameEnd);
  const next = renames[section]?.[name];
  return next ? `${REF_PREFIX}${section}/${next}${remainder}` : ref;
}
