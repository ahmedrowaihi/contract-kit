import { useEffect, useState } from "react";
import { harToSerialized } from "./network";

const worker = new Worker(new URL("./recon-worker.ts", import.meta.url), {
  type: "module",
});

let stats = { totalSamples: 0, origins: [] as Array<[string, number]> };
let capturing = true;
let entriesSeen = 0;
const listeners = new Set<() => void>();

worker.addEventListener("error", (e) => {
  console.error("[glean] worker error", e.message, e);
});
worker.addEventListener("messageerror", (e) => {
  console.error("[glean] worker messageerror", e);
});

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
  entriesSeen: number;
}

export function usePanelState(): PanelState {
  const [state, setState] = useState<PanelState>(() => ({
    ...stats,
    capturing,
    entriesSeen,
  }));
  useEffect(() => {
    const fn = () => setState({ ...stats, capturing, entriesSeen });
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

export function clearOrigin(origin: string) {
  worker.postMessage({ type: "clearOrigin", origin });
}

export function exportSpec(origin?: string): Promise<object> {
  const id = ++pendingId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker.postMessage({ type: "export", id, origin });
  });
}

let bound = false;

const STATIC_EXT =
  /\.(css|js|mjs|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|html?|pdf|mp4|webm|mp3|wav)(\?|$)/i;
const SKIPPED_METHODS = new Set(["OPTIONS", "HEAD", "TRACE", "CONNECT"]);

function isStaticAsset(url: string): boolean {
  try {
    return STATIC_EXT.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function bindNetworkCapture() {
  if (bound) return;
  bound = true;
  browser.devtools.network.onRequestFinished.addListener(async (entry) => {
    if (SKIPPED_METHODS.has(entry.request.method.toUpperCase())) return;
    if (isStaticAsset(entry.request.url)) return;
    entriesSeen++;
    for (const fn of listeners) fn();
    if (!capturing) return;
    try {
      const payload = await harToSerialized(entry);
      worker.postMessage({ type: "observe", payload });
    } catch (e) {
      console.error("[glean] HAR serialize failed", e);
    }
  });
}
