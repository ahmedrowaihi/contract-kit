import type { GoDecl } from "../../go-dsl/decl/types.js";

export interface TypeCtx {
  emit: (d: GoDecl) => void;
  /** Used to synthesize names for inline objects/enums: `Owner_Path`. */
  ownerName: string;
  propPath: ReadonlyArray<string>;
}
