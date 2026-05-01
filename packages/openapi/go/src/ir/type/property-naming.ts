import { exportedIdent } from "../identifiers.js";

export interface PropertyName {
  /** The original key as it appears in the OpenAPI schema / JSON wire form. */
  jsonKey: string;
  /** The Go struct field name — always exported (PascalCase, leading-uppercase). */
  goName: string;
}

/**
 * Translate an OpenAPI property name into a Go struct field name. Go
 * doesn't expose unexported fields to `encoding/json` by default, so
 * we always export. The wire format is preserved via the `json:"<key>"`
 * struct tag (rendered separately at field-emit time).
 *
 *   first_name → FirstName
 *   firstName  → FirstName
 *   id         → Id
 */
export function propertyName(jsonKey: string): PropertyName {
  return { jsonKey, goName: exportedIdent(jsonKey) };
}
