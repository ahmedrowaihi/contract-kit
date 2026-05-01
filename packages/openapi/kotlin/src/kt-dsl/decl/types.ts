import type { KtClass } from "./class.js";
import type { KtDataClass } from "./dataClass.js";
import type { KtEnum } from "./enum.js";
import type { KtInterface } from "./interface.js";
import type { KtObject } from "./object.js";
import type { KtSealedClass } from "./sealedClass.js";
import type { KtTopLevelFun } from "./topLevel.js";
import type { KtTypeAlias } from "./typeAlias.js";

export type KtDecl =
  | KtDataClass
  | KtClass
  | KtSealedClass
  | KtObject
  | KtInterface
  | KtEnum
  | KtTypeAlias
  | KtTopLevelFun;
