import { useEffect, useState } from "react";
import { harToSerialized } from "./network";

const worker = new Worker(new URL("./recon-worker.ts", import.meta.url), {
  type: "module",
});

let stats = { totalSamples: 0, origins: [] as Array<[string, number]> };
let capturing = true;
const listeners = new Set<() => void>();

let pendingId = 0;
const pending = new Map<number, (spec: object) => void>();

worker.addEventListener("message", (e) => {
  const msg = e.data as
    | { type: "stats"; totalSamples: number; origins: Array<[string, number]> }
    | { type: "spec"; id: number; spec: object };

  if (msg.type === "stats") {
    stats = { totalSamples: msg.totalSamples, origins: msg.origins };
    for (const fn of listeners) fn();
  } else if (msg.type === "spec") {
    const fn = pending.get(msg.id);
    if (fn) {
      pending.delete(msg.id);
      fn(msg.spec);
    }
  }
});

export interface PanelState {
  totalSamples: number;
  capturing: boolean;
  origins: Array<[string, number]>;
}

export function usePanelState(): PanelState {
  const [state, setState] = useState<PanelState>(() => ({
    ...stats,
    capturing,
  }));
  useEffect(() => {
    const fn = () => setState({ ...stats, capturing });
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
}

export function setCapturing(next: boolean) {
  capturing = next;
  for (const fn of listeners) fn();
}

export function clear() {
  worker.postMessage({ type: "clear" });
}

export function exportSpec(origin?: string): Promise<object> {
  const id = ++pendingId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker.postMessage({ type: "export", id, origin });
  });
}

let bound = false;

export function bindNetworkCapture() {
  if (bound) return;
  bound = true;
  browser.devtools.network.onRequestFinished.addListener(async (entry) => {
    if (!capturing) return;
    try {
      const payload = await harToSerialized(entry);
      worker.postMessage({ type: "observe", payload });
    } catch {}
  });
}
