import { connect } from "amqplib";

import {
  assertExchanges,
  bindAndConsume,
  Events,
  handlers,
} from "../generated/index.gen";

const URL = process.env.AMQP_URL ?? "amqp://guest:guest@localhost:5672";

async function main() {
  const conn = await connect(URL);
  const channel = await conn.createChannel();
  await assertExchanges(channel, Events);

  const my = handlers()
    .on("user.account.created.v1", async (msg, raw) => {
      console.log("← user.account.created.v1");
      console.log("    id:        ", msg.id);
      console.log("    source:    ", msg.source);
      console.log("    data.email:", msg.data.email);
      channel.ack(raw);
    })
    .on("user.account.deleted.v1", async (msg, raw) => {
      console.log("← user.account.deleted.v1");
      console.log("    eventId:        ", msg.eventId);
      console.log("    payload.userId: ", msg.payload.userId);
      console.log("    payload.archive:", msg.payload.archiveId);
      channel.ack(raw);
    });

  await channel.prefetch(10);
  await bindAndConsume(channel, "playground.user-events", my);

  console.log("consumer ready — waiting for events. Ctrl+C to exit.");

  let shuttingDown = false;
  process.on("SIGINT", async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\nshutting down…");
    await channel.close();
    await conn.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
