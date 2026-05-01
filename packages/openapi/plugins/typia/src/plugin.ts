import type { TypiaPlugin } from "./types";
import { handlerV1 } from "./v1/plugin";

export const handler: TypiaPlugin["Handler"] = (args) => handlerV1(args);
