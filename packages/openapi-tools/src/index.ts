export {
  type DiffOptions,
  type DiffReport,
  diffSpecs,
  type EndpointDiff,
  type RequiredChange,
  type ShapeDiff,
  type TypeChange,
} from "./diff";
export { routesFromIR } from "./ir";
export {
  type ExtractParams,
  isInSpec,
  type MatchResult,
  match,
} from "./match";
export type { IR } from "./parse";
export { parseSpec } from "./parse";
export type { Route } from "./route";
export { createRouter, type Router } from "./router";
