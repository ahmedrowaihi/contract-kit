import type { SerializedObservation } from "./network";

export interface OriginStats {
  totalSamples: number;
  origins: Array<[string, number]>;
}

export interface ReconService {
  observe(payload: SerializedObservation): Promise<void>;
  exportSpec(origin?: string): Promise<object>;
  clear(): Promise<void>;
  clearOrigin(origin: string): Promise<void>;
  subscribe(cb: (stats: OriginStats) => void): Promise<() => void>;
}

export const RECON_NAMESPACE = "glean:recon";
