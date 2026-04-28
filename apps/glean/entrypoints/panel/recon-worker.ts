/// <reference lib="webworker" />
/// <reference types="chrome" />
import { createRecon, type Recon } from "@ahmedrowaihi/openapi-recon";
import {
  type Adapter,
  defineProxy,
  type OnMessage,
  type SendMessage,
} from "comctx";
import type { SerializedObservation } from "./network";
import {
  type OriginStats,
  RECON_NAMESPACE,
  type ReconService,
} from "./recon-service";

const STORAGE_KEY = "glean:samples:v1";
const PERSIST_DEBOUNCE_MS = 2000;
const STATS_DEBOUNCE_MS = 0;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

class WorkerProvideAdapter implements Adapter {
  sendMessage: SendMessage = (message) => {
    ctx.postMessage(message);
  };
  onMessage: OnMessage = (callback) => {
    const handler = (event: MessageEvent) => callback(event.data);
    ctx.addEventListener("message", handler);
    return () => ctx.removeEventListener("message", handler);
  };
}

class ReconImpl implements ReconService {
  private recon: Recon = createRecon({ title: "Captured API" });
  private samples: SerializedObservation[] = [];
  private subscribers = new Set<(s: OriginStats) => void>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private statsTimer: ReturnType<typeof setTimeout> | null = null;
  private ready = false;
  private queued: SerializedObservation[] = [];

  constructor() {
    this.rehydrate();
  }

  async observe(payload: SerializedObservation): Promise<void> {
    if (!this.ready) {
      this.queued.push(payload);
      return;
    }
    await this.ingest(payload);
  }

  async exportSpec(origin?: string): Promise<object> {
    return this.recon.toOpenAPI(origin ? { origin } : undefined);
  }

  async clear(): Promise<void> {
    this.recon.clear();
    this.samples = [];
    if (this.persistTimer != null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    chrome.storage.local.remove(STORAGE_KEY);
    this.scheduleStatsFlush();
  }

  async clearOrigin(origin: string): Promise<void> {
    this.recon.clearOrigin(origin);
    this.samples = this.samples.filter((s) => {
      try {
        return new URL(s.request.url).origin !== origin;
      } catch {
        return true;
      }
    });
    this.schedulePersist();
    this.scheduleStatsFlush();
  }

  async subscribe(cb: (stats: OriginStats) => void): Promise<() => void> {
    this.subscribers.add(cb);
    cb(this.snapshot());
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private snapshot(): OriginStats {
    return {
      totalSamples: this.recon.sampleCount(),
      origins: [...this.recon.originStats()],
    };
  }

  private async ingest(payload: SerializedObservation): Promise<void> {
    try {
      const { request, response } = rebuild(payload);
      await this.recon.observe(request, response);
      this.samples.push(payload);
      this.schedulePersist();
      this.scheduleStatsFlush();
    } catch {}
  }

  private async rehydrate(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      const prior = stored[STORAGE_KEY] as SerializedObservation[] | undefined;
      if (prior?.length) {
        for (const p of prior) {
          try {
            const { request, response } = rebuild(p);
            await this.recon.observe(request, response);
            this.samples.push(p);
          } catch {}
        }
        this.scheduleStatsFlush();
      }
    } catch {}
    this.ready = true;
    while (this.queued.length) {
      const p = this.queued.shift();
      if (p) await this.ingest(p);
    }
  }

  private scheduleStatsFlush() {
    if (this.statsTimer != null) return;
    this.statsTimer = setTimeout(() => {
      this.statsTimer = null;
      const stats = this.snapshot();
      for (const cb of this.subscribers) cb(stats);
    }, STATS_DEBOUNCE_MS);
  }

  private schedulePersist() {
    if (this.persistTimer != null) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      chrome.storage.local.set({ [STORAGE_KEY]: this.samples });
    }, PERSIST_DEBOUNCE_MS);
  }
}

const [provideRecon] = defineProxy(() => new ReconImpl(), {
  namespace: RECON_NAMESPACE,
});

provideRecon(new WorkerProvideAdapter());

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
