/**
 * Integration test: generate the full SDK, then run a real producer +
 * consumer against a RabbitMQ container via the generated code. Proves
 * the generator's output works end-to-end with a real broker.
 *
 * Skips automatically when the host doesn't have a Docker daemon
 * reachable (set `INTEGRATION_TEST=true` to opt in).
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  RabbitMQContainer,
  type StartedRabbitMQContainer,
} from "@testcontainers/rabbitmq";
import { type Channel, type ChannelModel, connect } from "amqplib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  amqplib as amqplibPlugin,
  dispatch,
  eventMap,
  events,
  generate,
  indexBarrel,
  typescript,
} from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, "../../../../fixtures/user-events.yaml");

const SHOULD_RUN =
  process.env.INTEGRATION_TEST === "true" || process.env.CI === "true";

describe.runIf(SHOULD_RUN)("end-to-end with real RabbitMQ", () => {
  let outDir: string;
  let container: StartedRabbitMQContainer;
  let conn: ChannelModel;
  let channel: Channel;

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), "asyncapi-ts-e2e-"));
    await generate({
      input: FIXTURE,
      output: outDir,
      plugins: [
        typescript(),
        events(),
        eventMap(),
        dispatch(),
        amqplibPlugin(),
        indexBarrel(),
      ],
    });

    container = await new RabbitMQContainer("rabbitmq:3.13").start();
    conn = await connect(container.getAmqpUrl());
    channel = await conn.createChannel();
  }, 90_000);

  afterAll(async () => {
    await channel?.close().catch(() => {});
    await conn?.close().catch(() => {});
    await container?.stop();
    await rm(outDir, { recursive: true, force: true });
  });

  it("publishes typed messages and dispatches them to the matching handler", async () => {
    // Dynamically import the generated barrel — this is exactly what
    // a consumer would do.
    const generated = await import(join(outDir, "index.gen.ts"));

    await generated.assertExchanges(channel, generated.Events);

    const received: { type: string; data: unknown }[] = [];

    const my = generated
      .handlers()
      .on(
        "user.account.created.v1",
        async (msg: { id: string; data: { userId: string } }) => {
          received.push({ type: "user.account.created.v1", data: msg.data });
        },
      )
      .on(
        "user.account.deleted.v1",
        async (msg: { eventId: string; payload: { userId: string } }) => {
          received.push({
            type: "user.account.deleted.v1",
            data: msg.payload,
          });
        },
      );

    await generated.bindAndConsume(channel, "e2e.user-events", my, {
      durable: false,
      autoDelete: true,
    });

    generated.publish(channel, generated.Events.userAccountCreated, {
      specversion: "1.0",
      id: "01-test",
      source: "/test",
      type: "user.account.created.v1",
      time: new Date().toISOString(),
      data: {
        userId: "usr_e2e",
        email: "e2e@example.com",
        createdAt: new Date().toISOString(),
      },
    });

    generated.publish(channel, generated.Events.userAccountDeleted, {
      eventId: "01-test-d",
      type: "user.account.deleted.v1",
      timestamp: new Date().toISOString(),
      source: "test",
      version: "v1",
      payload: {
        userId: "usr_e2e",
        deletedAt: new Date().toISOString(),
      },
    });

    await waitFor(() => received.length >= 2, 5_000);

    expect(received).toHaveLength(2);
    expect(received).toContainEqual({
      type: "user.account.created.v1",
      data: expect.objectContaining({ userId: "usr_e2e" }),
    });
    expect(received).toContainEqual({
      type: "user.account.deleted.v1",
      data: expect.objectContaining({ userId: "usr_e2e" }),
    });
  }, 30_000);
});

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor: timed out after ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}
