export function pascal(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase());
}

export function camel(s: string): string {
  const p = pascal(s);
  return p.length > 0 ? p[0]!.toLowerCase() + p.slice(1) : p;
}

export function safeIdent(s: string): string {
  const p = pascal(s);
  return /^[0-9]/.test(p) ? `_${p}` : p;
}
