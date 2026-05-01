# asyncapi-events-playground

Hand-written stand-in for what `asyncapi-typescript` would emit from `fixtures/user-events.yaml`.

The generator emits **building blocks only** — types, topology consts, an event map. **No runtime, no `Client`, no `publish` / `subscribe` functions.** The caller wires amqplib (or NestJS / Effect / anything) themselves.

## Layout

```
generated/         ← what the generator would emit (hand-written here)
  types.gen.ts     per-message TS interfaces (mirroring the spec's payload schemas)
  events.gen.ts    Events const — topology metadata only (exchange, routingKey, type, ...)
  event-map.ts     EventMap + isMessageOfType discriminator helper
  index.ts         barrel
src/
  producer.ts      caller-written; raw channel.publish using Events.X topology
  consumer.ts      caller-written; raw assertQueue + bindQueue + consume
docker-compose.yml RabbitMQ on :5672 + management UI on :15672
```

## Run

```sh
pnpm install
pnpm broker:up                  # starts RabbitMQ container

# terminal A
pnpm consumer

# terminal B
pnpm producer

pnpm broker:down
```

## Two payload styles in one spec

The fixture demonstrates the generator is **envelope-agnostic**:

- `userAccountCreated` payload = CloudEvents 1.0 envelope (`specversion / id / source / type / time / data`)
- `userAccountDeleted` payload = custom envelope (`eventId / type / timestamp / source / version / payload`)

Both ride through the same generator. Each message's TS interface mirrors its declared schema verbatim. The generator never imposes an envelope.

## What the generator does NOT do

- ❌ No `publish` / `subscribe` functions
- ❌ No `Client` class
- ❌ No connection / channel lifecycle
- ❌ No ack / nack policy
- ❌ No retry / DLQ / observability
- ❌ No opinion about which AMQP library, which framework, or which envelope

The caller composes those. Generator hands them: types, topology consts, an event map. That's the whole product.

## What the generator DOES emit (per spec)

- One TS interface per `components.message.*.payload` schema (and any `components.schemas` it references).
- One `Events` const entry per channel/operation, holding `{type, routingKey, exchange, exchangeType, contentType}`.
- An `EventMap` mapping the `type` literal to its message shape, plus an `isMessageOfType` discriminator.

If the playground feels right, that's the generator's target output.

## Optional plugins (later, opt-in)

The same way `@hey-api/openapi-ts` has plugin output (sdk, faker, typia, etc.), AsyncAPI codegen could ship optional emitters:

- `validator` — emit zod / typia / ajv validators per message
- `serde` — emit pure `serializeX(msg) → Buffer` and `parseX(buf) → msg` helpers
- `<framework>-adapter` — emit boilerplate for a specific framework (NestJS decorators, Effect schemas, etc.)

None of those are in the default emit. The default stays minimal.
