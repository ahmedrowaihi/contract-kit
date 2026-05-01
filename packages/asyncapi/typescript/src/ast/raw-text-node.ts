import type {
  AnalysisContext,
  Symbol as CoreSymbol,
  File,
  Node as ICoreNode,
  NodeScope,
  Ref,
} from "@hey-api/codegen-core";
import { nodeBrand, ref } from "@hey-api/codegen-core";

/** INode wrapper around pre-rendered text. Used for Modelina output and bundle copies. */
export class RawTextNode implements ICoreNode<string> {
  readonly "~brand" = nodeBrand;
  readonly language = "typescript";
  exported?: boolean;
  root: boolean;
  scope?: NodeScope;
  symbol?: CoreSymbol;
  file?: File;

  private _name: Ref<string>;
  private readonly _text: string;

  constructor(text: string, options: { name?: string } = {}) {
    this._text = text;
    this._name = ref(options.name ?? "raw");
    this.root = true;
  }

  get name(): ICoreNode["name"] {
    return {
      ...this._name,
      set: (value) => {
        this._name = ref(typeof value === "string" ? value : String(value));
      },
      toString: () => this._name["~ref"],
    } as ICoreNode["name"];
  }

  analyze(_: AnalysisContext): void {}

  clone(): this {
    const cloned = Object.create(Object.getPrototypeOf(this));
    Object.assign(cloned, this);
    return cloned;
  }

  toAst(): string {
    return this._text;
  }
}
