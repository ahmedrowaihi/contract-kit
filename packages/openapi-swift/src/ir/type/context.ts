import type { SwDecl } from "../../sw-dsl/index.js";

export interface TypeCtx {
  emit: (d: SwDecl) => void;
  /** Used to synthesize names for inline objects/enums: `Owner_Path`. */
  ownerName: string;
  propPath: ReadonlyArray<string>;
}
