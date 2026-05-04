import type { Diagnostic } from "./types.js";

export function diag(d: Diagnostic): Diagnostic {
  return d;
}

export class DiagnosticSink {
  private readonly entries: Diagnostic[] = [];
  constructor(
    private readonly onEach?: (d: Diagnostic) => void,
    private readonly failFast = false,
  ) {}

  push(d: Diagnostic): void {
    this.entries.push(d);
    this.onEach?.(d);
    if (this.failFast && d.severity === "error") {
      throw new FailFastError(d);
    }
  }

  all(): Diagnostic[] {
    return this.entries;
  }
}

export class FailFastError extends Error {
  constructor(public readonly diagnostic: Diagnostic) {
    super(`[${diagnostic.code}] ${diagnostic.message}`);
    this.name = "FailFastError";
  }
}
