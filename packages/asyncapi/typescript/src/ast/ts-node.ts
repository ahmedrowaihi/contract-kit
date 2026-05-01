import type {
  AnalysisContext,
  Symbol as CoreSymbol,
  File,
  Node as ICoreNode,
  NodeScope,
  Ref,
} from "@hey-api/codegen-core";
import { nodeBrand, ref } from "@hey-api/codegen-core";
import type ts from "typescript";

/** INode wrapper around a `ts.Statement`. Mirrors hey-api's `TsDsl` base. */
export class TsStatementNode implements ICoreNode<ts.Statement> {
  readonly "~brand" = nodeBrand;
  readonly language = "typescript";
  exported?: boolean;
  root: boolean;
  scope?: NodeScope;
  symbol?: CoreSymbol;
  file?: File;

  private _name: Ref<string>;
  private readonly _statement: ts.Statement;

  constructor(
    statement: ts.Statement,
    options: {
      name: string;
      exported?: boolean;
      root?: boolean;
      scope?: NodeScope;
    } = {
      name: "anon",
    },
  ) {
    this._statement = statement;
    this._name = ref(options.name);
    this.exported = options.exported;
    this.root = options.root ?? true;
    this.scope = options.scope ?? "value";
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

  toAst(): ts.Statement {
    return this._statement;
  }
}
