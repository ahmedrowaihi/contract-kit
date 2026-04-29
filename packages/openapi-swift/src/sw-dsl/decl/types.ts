import type { SwClass } from "./class.js";
import type { SwEnum } from "./enum.js";
import type { SwProtocol } from "./protocol.js";
import type { SwStruct } from "./struct.js";
import type { SwTypeAlias } from "./typeAlias.js";

export type SwDecl = SwStruct | SwEnum | SwTypeAlias | SwProtocol | SwClass;
