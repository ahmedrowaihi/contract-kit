// Tiny shim: import the asyncapi-typescript generator from the runner-temp
// install location and call its `generate()` with the configured plugin set.
// ESM, dependency-free.

import { resolve } from "node:path";

const { WORKDIR, SPEC, OUTPUT, PLUGINS } = process.env;

if (!WORKDIR || !SPEC || !OUTPUT) {
  throw new Error("regen.mjs: missing required env (WORKDIR / SPEC / OUTPUT)");
}

const entry = resolve(
  WORKDIR,
  "node_modules",
  "@ahmedrowaihi/asyncapi-typescript",
  "dist",
  "index.js",
);

const generator = await import(entry);

const enabled = (
  PLUGINS ?? "typescript,events,event-map,dispatch,amqplib,index"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const factories = {
  typescript: generator.typescript,
  events: generator.events,
  "event-map": generator.eventMap,
  dispatch: generator.dispatch,
  amqplib: generator.amqplib,
  index: generator.indexBarrel,
};

const plugins = enabled.map((name) => {
  const factory = factories[name];
  if (!factory) {
    throw new Error(
      `regen.mjs: unknown plugin "${name}". Known: ${Object.keys(factories).join(", ")}`,
    );
  }
  return factory();
});

const isUrl = /^https?:\/\//i.test(SPEC);

const result = await generator.generate({
  input: isUrl ? SPEC : resolve(process.cwd(), SPEC),
  output: resolve(process.cwd(), OUTPUT),
  plugins,
});

console.log(`wrote ${result.files.length} file(s) → ${result.output}`);
