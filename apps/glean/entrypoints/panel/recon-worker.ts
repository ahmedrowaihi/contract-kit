/// <reference lib="webworker" />
/// <reference types="chrome" />
import { createRecon, type Recon } from "@ahmedrowaihi/openapi-recon";
import type { SerializedObservation } from "./network";

const STORAGE_KEY = "glean:samples:v1";
const FLUSH_DELAY_MS = 2000;

const recon: Recon = createRecon({ title: "Captured API" });
let samples: SerializedObservation[] = [];
let ready = false;
const queued: SerializedObservation[] = [];

type IncomingMessage =
  | { type: "observe"; payload: SerializedObservation }
  | { type: "export"; id: number; origin?: string }
  | { type: "clear" }
  | { type: "clearOrigin"; origin: string };

type OutgoingMessage =
  | { type: "stats"; totalSamples: number; origins: Array<[string, number]> }
  | { type: "spec"; id: number; spec: object };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let statsPending = false;
function scheduleStatsFlush() {
  if (statsPending) return;
  statsPending = true;
  setTimeout(() => {
    statsPending = false;
    const msg: OutgoingMessage = {
      type: "stats",
      totalSamples: recon.sampleCount(),
      origins: [...recon.originStats()],
    };
    ctx.postMessage(msg);
  }, 0);
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (persistTimer != null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    chrome.storage.local.set({ [STORAGE_KEY]: samples });
  }, FLUSH_DELAY_MS);
}

async function ingest(payload: SerializedObservation) {
  try {
    const { request, response } = rebuild(payload);
    await recon.observe(request, response);
    samples.push(payload);
    schedulePersist();
    scheduleStatsFlush();
  } catch {}
}

async function rehydrate() {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const prior = stored[STORAGE_KEY] as SerializedObservation[] | undefined;
    if (prior?.length) {
      for (const p of prior) {
        try {
          const { request, response } = rebuild(p);
          await recon.observe(request, response);
          samples.push(p);
        } catch {}
      }
      scheduleStatsFlush();
    }
  } catch {}
  ready = true;
  while (queued.length) {
    const p = queued.shift();
    if (p) await ingest(p);
  }
}

ctx.addEventListener("message", async (e: MessageEvent<IncomingMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case "observe": {
      if (!ready) {
        queued.push(msg.payload);
        return;
      }
      await ingest(msg.payload);
      return;
    }
    case "export": {
      const spec = recon.toOpenAPI(
        msg.origin ? { origin: msg.origin } : undefined,
      );
      const out: OutgoingMessage = { type: "spec", id: msg.id, spec };
      ctx.postMessage(out);
      return;
    }
    case "clear": {
      recon.clear();
      samples = [];
      if (persistTimer != null) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      chrome.storage.local.remove(STORAGE_KEY);
      scheduleStatsFlush();
      return;
    }
    case "clearOrigin": {
      recon.clearOrigin(msg.origin);
      samples = samples.filter((s) => {
        try {
          return new URL(s.request.url).origin !== msg.origin;
        } catch {
          return true;
        }
      });
      schedulePersist();
      scheduleStatsFlush();
      return;
    }
  }
});

rehydrate();

function rebuild(p: SerializedObservation) {
  const request = new Request(p.request.url, {
    method: p.request.method,
    headers: toHeaders(p.request.headers),
    body: p.request.body,
  });
  const response = new Response(p.response.body, {
    status: p.response.status,
    headers: toHeaders(p.response.headers),
  });
  return { request, response };
}

function toHeaders(pairs: Array<[string, string]>): Headers {
  const h = new Headers();
  for (const [name, value] of pairs) {
    try {
      h.append(name, value);
    } catch {}
  }
  return h;
}
