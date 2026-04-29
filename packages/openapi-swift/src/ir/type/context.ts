import type { SwDecl } from "../../sw-dsl/decl/types.js";

export interface TypeCtx {
  emit: (d: SwDecl) => void;
  /** Used to synthesize names for inline objects/enums: `Owner_Path`. */
  ownerName: string;
  propPath: ReadonlyArray<string>;
}
