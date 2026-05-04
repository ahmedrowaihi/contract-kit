/**
 * Coverage fixtures — exercise the well-known type mapper, branded-type
 * stripping, lossy diagnostics, and not-representable detection.
 */

export type UserId = string & { readonly __brand: "UserId" };

export interface DateInput {
  when: Date;
  until?: Date;
}

export function takeDate(input: DateInput): Date {
  return input.when;
}

export function takeUrl(u: URL): URL {
  return u;
}

export function takeRegExp(r: RegExp): RegExp {
  return r;
}

export function takeBuffer(b: Buffer): Uint8Array {
  return b;
}

export function takeFileLike(input: { name: string; data: Uint8Array }): {
  stored: ArrayBuffer;
} {
  return { stored: input.data.buffer as ArrayBuffer };
}

export function takeBigInt(n: bigint): bigint {
  return n;
}

export function takeBranded(id: UserId): UserId {
  return id;
}

/** Literal-type union — must NOT be rewritten to sentinels. */
export function takeLiteralUnion(kind: "Date" | "URL" | "RegExp"): "ok" {
  void kind;
  return "ok";
}
