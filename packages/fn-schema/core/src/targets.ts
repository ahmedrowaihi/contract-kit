import type { TargetRef } from "./types.js";

export interface ParsedTarget {
  file: string;
  functionName: string;
  className?: string;
}

/**
 * Parse "src/api.ts#createUser" or "src/api.ts#User.create".
 * Returns null on malformed input — caller emits an INVALID_TARGET diagnostic.
 */
export function parseTarget(input: string | TargetRef): ParsedTarget | null {
  const raw = typeof input === "string" ? input : input.value;
  const hash = raw.lastIndexOf("#");
  if (hash <= 0 || hash === raw.length - 1) return null;
  const file = raw.slice(0, hash);
  const member = raw.slice(hash + 1);
  const dot = member.indexOf(".");
  if (dot === -1) return { file, functionName: member };
  if (dot === 0 || dot === member.length - 1) return null;
  return {
    file,
    className: member.slice(0, dot),
    functionName: member.slice(dot + 1),
  };
}
