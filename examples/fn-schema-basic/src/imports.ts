/**
 * Sample types in a separate file — used by `advanced.ts` to exercise
 * named, default, and namespace import handling in the virtual-file synth.
 */

export interface Tag {
  id: string;
  label: string;
}

export interface Audit {
  createdBy: string;
  createdAt: string;
}

export default interface Telemetry {
  source: string;
  correlationId: string;
}
