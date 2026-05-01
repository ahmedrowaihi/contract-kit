import { randomUUID } from "node:crypto";

import { connect } from "amqplib";

import {
  assertExchanges,
  Events,
  publish,
  type UserAccountCreatedMessage,
  type UserAccountDeletedMessage,
} from "../generated/index.gen";

const URL = process.env.AMQP_URL ?? "amqp://guest:guest@localhost:5672";

async function main() {
  const conn = await connect(URL);
  const channel = await conn.createConfirmChannel();
  await assertExchanges(channel, Events);

  const created: UserAccountCreatedMessage = {
    specversion: "1.0",
    id: randomUUID(),
    source: "/identity-service/account",
    type: "user.account.created.v1",
    time: new Date().toISOString(),
    data: {
      userId: "usr_play_001",
      email: "play@example.com",
      createdAt: new Date().toISOString(),
    },
  };
  publish(channel, Events.userAccountCreated, created);
  console.log("→ published user.account.created.v1");

  const deleted: UserAccountDeletedMessage = {
    eventId: randomUUID(),
    type: "user.account.deleted.v1",
    timestamp: new Date().toISOString(),
    source: "identity-service",
    version: "v1",
    correlationId: "req_play_xyz",
    payload: {
      userId: "usr_play_001",
      archiveId: "arch_play_001",
      deletedAt: new Date().toISOString(),
    },
  };
  publish(channel, Events.userAccountDeleted, deleted);
  console.log("→ published user.account.deleted.v1");

  await channel.waitForConfirms();
  await channel.close();
  await conn.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
