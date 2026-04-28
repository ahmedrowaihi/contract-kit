import {
  type Adapter,
  defineProxy,
  type OnMessage,
  type SendMessage,
} from "comctx";
import { useEffect, useState } from "react";
import { harToSerialized } from "./network";
import {
  type OriginStats,
  RECON_NAMESPACE,
  type ReconService,
} from "./recon-service";

class WorkerInjectAdapter implements Adapter {
  worker: Worker;
  constructor(url: URL) {
    this.worker = new Worker(url, { type: "module" });
  }
  sendMessage: SendMessage = (message) => this.worker.postMessage(message);
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data);
    this.worker.addEventListener("message", handler);
    return () => this.worker.removeEventListener("message", handler);
  };
}

const [, injectRecon] = defineProxy(() => ({}) as ReconService, {
  namespace: RECON_NAMESPACE,
});

const recon = injectRecon(
  new WorkerInjectAdapter(new URL("./recon-worker.ts", import.meta.url)),
);

let stats: OriginStats = { totalSamples: 0, origins: [] };
let capturing = true;
const listeners = new Set<() => void>();

void recon.subscribe((next) => {
  stats = next;
  for (const fn of listeners) fn();
});

export interface PanelState extends OriginStats {
  capturing: boolean;
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
  void recon.clear();
}

export function clearOrigin(origin: string) {
  void recon.clearOrigin(origin);
}

export function exportSpec(origin?: string): Promise<object> {
  return recon.exportSpec(origin);
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
    if (!capturing) return;
    if (SKIPPED_METHODS.has(entry.request.method.toUpperCase())) return;
    if (isStaticAsset(entry.request.url)) return;
    try {
      const payload = await harToSerialized(entry);
      void recon.observe(payload);
    } catch (e) {
      console.error("[glean] HAR serialize failed", e);
    }
  });
}
