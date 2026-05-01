export {
  type GenerateOptions,
  type GenerateResult,
  generate,
} from "./orchestrator";
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
} from "./plugin";
export type {
  AmqplibPluginConfig,
  AmqplibResolvedConfig,
} from "./plugins/amqplib";
export { amqplib } from "./plugins/amqplib";
export type {
  DispatchPluginConfig,
  DispatchResolvedConfig,
} from "./plugins/dispatch";
export { dispatch } from "./plugins/dispatch";
export type {
  EventMapPluginConfig,
  EventMapResolvedConfig,
} from "./plugins/event-map";
export { eventMap } from "./plugins/event-map";
export type {
  EventsPluginConfig,
  EventsResolvedConfig,
} from "./plugins/events";
export { events } from "./plugins/events";
export type {
  IndexBarrelConfig,
  IndexBarrelResolvedConfig,
} from "./plugins/index-barrel";
export { indexBarrel } from "./plugins/index-barrel";
export type {
  TypescriptPluginConfig,
  TypescriptResolvedConfig,
} from "./plugins/typescript";
export { typescript } from "./plugins/typescript";
