import {
  type GoExpr,
  type GoStmt,
  goAssign,
  goCall,
  goIdent,
  goIf,
  goNe,
  goNil,
  goReturn,
} from "../../go-dsl/index.js";

/**
 * The kind of `APIError` to wrap a transient `err` in. Drives which
 * `APIErrorKind*` const the generated code references.
 */
export type ErrKind =
  | "transport" /* network / URL parse / I/O */
  | "encoding" /* json.Marshal / encoding fail */
  | "decoding" /* json.Unmarshal fail */;

/**
 * Build the per-call-site err-check stmt. Each impl method uses named
 * returns (`(result T, err error)`) so the err-check site can `return`
 * bare — no zero-value matching required.
 *
 *   func (a *Impl) GetPet(...) (result *Pet, err error) {
 *       u, err := url.Parse(baseURL)
 *       if err != nil {
 *           err = Wrap(APIErrorKindTransport, err)
 *           return
 *       }
 *       …
 *   }
 */
export type ErrCheckFn = (kind: ErrKind) => GoStmt;

export const errCheck: ErrCheckFn = (kind) =>
  goIf(goNe(goIdent("err"), goNil), [
    goAssign([goIdent("err")], [wrapErr(kind)]),
    goReturn([]),
  ]);

function wrapErr(kind: ErrKind): GoExpr {
  const kindConst = `APIErrorKind${capitalize(kind)}`;
  return goCall(goIdent("Wrap"), [
    { expr: goIdent(kindConst) },
    { expr: goIdent("err") },
  ]);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
