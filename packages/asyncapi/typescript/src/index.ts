export {
  type GenerateOptions,
  type GenerateResult,
  generate,
} from "./orchestrator.js";
export {
  type AnyRegisteredPlugin,
  definePluginConfig,
  type ForEachEvent,
  type ForEachKind,
  type GeneratedFile,
  iterateDocument,
  type PluginDefinition,
  type PluginHooks,
  type PluginInstance,
  type RegisteredPlugin,
} from "./plugin.js";
export type {
  AmqplibPluginConfig,
  AmqplibResolvedConfig,
} from "./plugins/amqplib/index.js";
export { amqplib } from "./plugins/amqplib/index.js";
export type {
  DispatchPluginConfig,
  DispatchResolvedConfig,
} from "./plugins/dispatch/index.js";
export { dispatch } from "./plugins/dispatch/index.js";
export type {
  EventMapPluginConfig,
  EventMapResolvedConfig,
} from "./plugins/event-map/index.js";
export { eventMap } from "./plugins/event-map/index.js";
export type {
  EventsPluginConfig,
  EventsResolvedConfig,
} from "./plugins/events/index.js";
export { events } from "./plugins/events/index.js";
export type {
  IndexBarrelConfig,
  IndexBarrelResolvedConfig,
} from "./plugins/index-barrel/index.js";
export { indexBarrel } from "./plugins/index-barrel/index.js";
export type {
  TypescriptPluginConfig,
  TypescriptResolvedConfig,
} from "./plugins/typescript/index.js";
export { typescript } from "./plugins/typescript/index.js";
