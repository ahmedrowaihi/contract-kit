import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  amqplib,
  dispatch,
  eventMap,
  events,
  generate,
  indexBarrel,
  typescript,
} from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, "../../../../fixtures/user-events.yaml");

describe("full pipeline (all plugins enabled)", () => {
  let outDir: string;

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), "asyncapi-ts-full-"));
    await generate({
      input: FIXTURE,
      output: outDir,
      plugins: [
        typescript(),
        events(),
        eventMap(),
        dispatch(),
        amqplib(),
        indexBarrel(),
      ],
    });
  });

  afterAll(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it("emits exactly the expected file set", async () => {
    const filenames = await listFiles(outDir);
    expect(filenames.sort()).toEqual([
      "amqp.gen.ts",
      "dispatch.gen.ts",
      "event-map.gen.ts",
      "events.gen.ts",
      "handlers.gen.ts",
      "index.gen.ts",
      "types.gen.ts",
    ]);
  });

  it("types.gen.ts names message-level interfaces from the spec id", async () => {
    const types = await readGen(outDir, "types.gen.ts");
    expect(types).toContain("export interface UserAccountCreatedMessage");
    expect(types).toContain("export interface UserAccountDeletedMessage");
    expect(types).toContain("export interface UserAccountCreatedData");
    expect(types).toContain("export interface UserAccountDeletedData");
    expect(types).not.toContain("AnonymousSchema");
  });

  it("events.gen.ts emits Events const with topology + EventName", async () => {
    const evts = await readGen(outDir, "events.gen.ts");
    expect(evts).toContain("userAccountCreated:");
    expect(evts).toContain('"user.account.created.v1"');
    expect(evts).toContain('"user.events"');
    expect(evts).toContain('"topic"');
    expect(evts).toContain('"application/cloudevents+json"');
    expect(evts).toContain("export const Events");
    expect(evts).toContain("as const;");
    expect(evts).toContain("export type EventName = keyof typeof Events");
  });

  it("event-map.gen.ts maps event-type literals to message interfaces", async () => {
    const map = await readGen(outDir, "event-map.gen.ts");
    expect(map).toContain("import type {");
    expect(map).toContain("UserAccountCreatedMessage");
    expect(map).toContain("UserAccountDeletedMessage");
    expect(map).toContain('from "./types.gen"');
    expect(map).toContain(
      '"user.account.created.v1": UserAccountCreatedMessage',
    );
    expect(map).toContain(
      '"user.account.deleted.v1": UserAccountDeletedMessage',
    );
    expect(map).toContain("export interface EventMap");
    expect(map).toContain("export type AnyMessage = EventMap[keyof EventMap]");
    expect(map).toContain("export function isMessageOfType");
    expect(map).toMatch(/msg is EventMap\[K\]/);
  });

  it("dispatch.gen.ts is the bundled Registry runtime", async () => {
    const d = await readGen(outDir, "dispatch.gen.ts");
    expect(d).toContain("export class Registry");
    expect(d).toContain("export function createRegistry");
    expect(d).toContain("matchRoutingKey");
  });

  it("handlers.gen.ts wires the Registry to this spec's EventMap", async () => {
    const h = await readGen(outDir, "handlers.gen.ts");
    expect(h).toContain("createRegistry<EventMap>(Events");
  });

  it("amqp.gen.ts ships the bundled assertExchanges/bindAndConsume/publish", async () => {
    const a = await readGen(outDir, "amqp.gen.ts");
    expect(a).toContain("export async function assertExchanges");
    expect(a).toContain("export async function bindAndConsume");
    expect(a).toContain("export function publish");
  });

  it("index.gen.ts re-exports every plugin's surface", async () => {
    const idx = await readGen(outDir, "index.gen.ts");
    expect(idx).toContain('from "./amqp.gen"');
    expect(idx).toContain('from "./dispatch.gen"');
    expect(idx).toContain('from "./event-map.gen"');
    expect(idx).toContain('from "./events.gen"');
    expect(idx).toContain('from "./handlers.gen"');
    expect(idx).toContain('from "./types.gen"');
  });
});

describe("plugin selection (subset)", () => {
  it("emits only types + events + barrel when those are the picked plugins", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "asyncapi-ts-subset-"));
    try {
      await generate({
        input: FIXTURE,
        output: outDir,
        plugins: [typescript(), events(), indexBarrel()],
      });
      const filenames = await listFiles(outDir);
      expect(filenames.sort()).toEqual([
        "events.gen.ts",
        "index.gen.ts",
        "types.gen.ts",
      ]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

describe("plugin dependency ordering", () => {
  it("topologically sorts so dispatch runs after events + event-map", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "asyncapi-ts-order-"));
    try {
      // Pass dispatch BEFORE its dependencies — orchestrator must reorder.
      await generate({
        input: FIXTURE,
        output: outDir,
        plugins: [
          dispatch(),
          typescript(),
          events(),
          eventMap(),
          amqplib(),
          indexBarrel(),
        ],
      });
      const filenames = await listFiles(outDir);
      // dispatch + handlers must both exist; index barrel must reference them.
      expect(filenames).toContain("dispatch.gen.ts");
      expect(filenames).toContain("handlers.gen.ts");
      const idx = await readGen(outDir, "index.gen.ts");
      expect(idx).toContain('from "./dispatch.gen"');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("rejects plugin dependency cycles", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "asyncapi-ts-cycle-"));
    try {
      const a = {
        __definition: {
          name: "a",
          defaultConfig: {},
          dependsOn: ["b"],
          handler() {},
        },
        __userConfig: undefined,
        name: "a",
      };
      const b = {
        __definition: {
          name: "b",
          defaultConfig: {},
          dependsOn: ["a"],
          handler() {},
        },
        __userConfig: undefined,
        name: "b",
      };
      await expect(
        generate({
          input: FIXTURE,
          output: outDir,
          // biome-ignore lint/suspicious/noExplicitAny: hand-built test plugins
          plugins: [a as any, b as any],
        }),
      ).rejects.toThrow(/cycle/);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

async function readGen(outDir: string, filename: string): Promise<string> {
  return readFile(join(outDir, filename), "utf8");
}

async function listFiles(outDir: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  return readdir(outDir);
}
