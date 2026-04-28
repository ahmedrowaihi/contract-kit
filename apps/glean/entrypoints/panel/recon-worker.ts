/// <reference lib="webworker" />
import { createRecon, type Recon } from "@ahmedrowaihi/openapi-recon";
import type { SerializedObservation } from "./network";

const recon: Recon = createRecon({ title: "Captured API" });

type IncomingMessage =
  | { type: "observe"; payload: SerializedObservation }
  | { type: "export"; id: number; origin?: string }
  | { type: "clear" };

type OutgoingMessage =
  | {
      type: "stats";
      totalSamples: number;
      origins: Array<[string, number]>;
    }
  | { type: "spec"; id: number; spec: object };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let pendingFlush = false;

function flushStats() {
  pendingFlush = false;
  const msg: OutgoingMessage = {
    type: "stats",
    totalSamples: recon.sampleCount(),
    origins: [...recon.originStats()],
  };
  ctx.postMessage(msg);
}

function scheduleFlush() {
  if (pendingFlush) return;
  pendingFlush = true;
  setTimeout(flushStats, 0);
}

ctx.addEventListener("message", async (e: MessageEvent<IncomingMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case "observe": {
      try {
        const { request, response } = rebuild(msg.payload);
        await recon.observe(request, response);
        scheduleFlush();
      } catch {}
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
      scheduleFlush();
      return;
    }
  }
});

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
