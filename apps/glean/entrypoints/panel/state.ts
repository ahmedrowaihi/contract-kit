import { createRecon, type Recon } from "@ahmedrowaihi/openapi-recon";
import { useEffect, useState } from "react";
import { harToObservation } from "./network";

const recon: Recon = createRecon({ title: "Captured API" });
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export interface PanelState {
  totalSamples: number;
  capturing: boolean;
  /** Sorted [origin, sampleCount] pairs. */
  origins: Array<[string, number]>;
}

let capturing = true;

function snapshot(): PanelState {
  return {
    totalSamples: recon.sampleCount(),
    capturing,
    origins: [...recon.originStats()],
  };
}

/** React hook: subscribe to capture state. Re-renders on every observation. */
export function usePanelState(): PanelState {
  const [state, setState] = useState<PanelState>(snapshot);
  useEffect(() => {
    const fn = () => setState(snapshot());
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
}

export function setCapturing(next: boolean) {
  capturing = next;
  notify();
}

export function clear() {
  recon.clear();
  notify();
}

/** Build the OpenAPI doc — for one origin if given, otherwise all. */
export function exportSpec(origin?: string) {
  return recon.toOpenAPI(origin ? { origin } : undefined);
}

let bound = false;

/**
 * Wire the panel to `chrome.devtools.network`. Idempotent — safe to call
 * from a `useEffect` that may run twice in React StrictMode.
 */
export function bindNetworkCapture() {
  if (bound) return;
  bound = true;
  browser.devtools.network.onRequestFinished.addListener(async (entry) => {
    if (!capturing) return;
    try {
      const { request, response } = await harToObservation(entry);
      await recon.observe(request, response);
      notify();
    } catch {
      // Skip entries we can't decode (binary, opaque, redirected, etc.)
    }
  });
}
