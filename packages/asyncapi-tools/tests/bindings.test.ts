import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSpecOrThrow } from "@ahmedrowaihi/aas-core";
import { describe, expect, it } from "vitest";

import { getAmqpChannelBinding, getAmqpExchange } from "../src/bindings.ts";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, "../../../fixtures/user-events.yaml");

describe("getAmqpChannelBinding", () => {
  it("extracts the typed AMQP binding from user-events fixture", async () => {
    const document = await parseSpecOrThrow({ kind: "file", path: FIXTURE });
    const channel = document.channels().get("userAccountCreated");
    expect(channel).toBeDefined();
    if (!channel) return;

    const binding = getAmqpChannelBinding(channel);
    expect(binding).toBeDefined();
    if (!binding) return;

    expect(binding.is).toBe("routingKey");
    if (binding.is !== "routingKey") return;
    expect(binding.exchange.name).toBe("user.events");
    expect(binding.exchange.type).toBe("topic");
    expect(binding.exchange.durable).toBe(true);
    expect(binding.bindingVersion).toBe("0.3.0");
  });

  it("getAmqpExchange convenience returns the exchange directly", async () => {
    const document = await parseSpecOrThrow({ kind: "file", path: FIXTURE });
    const channel = document.channels().get("userAccountDeleted");
    if (!channel) throw new Error("missing channel");

    const exchange = getAmqpExchange(channel);
    expect(exchange?.name).toBe("user.events");
    expect(exchange?.type).toBe("topic");
  });

  it("returns undefined for a channel with no AMQP binding", async () => {
    const document = await parseSpecOrThrow({
      kind: "string",
      spec: `asyncapi: 3.0.0
info: { title: x, version: 1.0.0 }
channels:
  bare:
    address: bare.channel
operations:
  send:
    action: send
    channel: { $ref: '#/channels/bare' }`,
    });
    const channel = document.channels().get("bare");
    if (!channel) throw new Error("missing channel");
    expect(getAmqpChannelBinding(channel)).toBeUndefined();
  });
});
