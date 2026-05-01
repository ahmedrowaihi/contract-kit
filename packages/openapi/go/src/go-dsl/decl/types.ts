import type { GoConstBlock } from "./const.js";
import type { GoFunc } from "./func.js";
import type { GoInterface } from "./interface.js";
import type { GoStruct } from "./struct.js";
import type { GoTypeAlias } from "./typeAlias.js";

export type GoDecl =
  | GoStruct
  | GoInterface
  | GoFunc
  | GoTypeAlias
  | GoConstBlock;
