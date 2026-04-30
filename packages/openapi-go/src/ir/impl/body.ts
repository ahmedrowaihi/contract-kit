import type { IR } from "@hey-api/shared";
import {
  type GoStmt,
  goAssign,
  goCall,
  goExprStmt,
  goIdent,
  goIf,
  goIntLit,
  goNe,
  goNil,
  goSelector,
  goShort,
  goStr,
} from "../../go-dsl/index.js";
import {
  FORM_URLENCODED_MEDIA,
  JSON_MEDIA_RE,
  MULTIPART_FORM_MEDIA,
} from "../constants.js";
import { paramIdent } from "../identifiers.js";
import { isOpaqueJsonBody } from "../operation/body.js";
import type { ErrCheckFn } from "./errors.js";

export interface BodyResult {
  stmts: ReadonlyArray<GoStmt>;
  /** True when the body builder produced multipart code; the
   *  orchestrator uses this to decide whether to ship the runtime
   *  helper. */
  needsMultipart: boolean;
}

/**
 * Build the request body and re-set `req.Body` / `req.ContentLength`
 * / `Content-Type` in place. Dispatches on media type:
 *
 *  - `application/json` (and `+json`) → `payload, err := json.Marshal(body)`,
 *    set body to `bytes.NewReader(payload)`. For opaque bodies
 *    (`oneOf`/`anyOf`), the impl receives `body []byte` and ships it raw.
 *  - `multipart/form-data` (object schema) → assemble a
 *    `MultipartFormBody`, append text/file fields per property,
 *    take `multipart.Bytes()` as the body.
 *  - `application/x-www-form-urlencoded` (object schema) → build a
 *    `url.Values{}`, set keys per property, encode as the body.
 *  - octet-stream / image / unknown → set body to `bytes.NewReader(body)`.
 *
 * Optional pointer-typed fields are wrapped in `if <id> != nil` and
 * dereferenced inside the guard.
 */
export function buildBodyStmts(
  body: IR.BodyObject,
  errCheck: ErrCheckFn,
): BodyResult {
  const mt = (body.mediaType ?? "").toLowerCase();
  const schema = body.schema;
  const isObject = schema.type === "object" && Boolean(schema.properties);

  if (mt && JSON_MEDIA_RE.test(mt)) {
    if (isOpaqueJsonBody(schema)) {
      return { stmts: rawBytesBody("application/json"), needsMultipart: false };
    }
    return { stmts: jsonBody(errCheck), needsMultipart: false };
  }

  if (mt.startsWith(MULTIPART_FORM_MEDIA) && isObject) {
    return { stmts: multipartBody(schema), needsMultipart: true };
  }
  if (mt.startsWith(FORM_URLENCODED_MEDIA) && isObject) {
    return { stmts: formUrlEncodedBody(schema), needsMultipart: false };
  }

  return {
    stmts: rawBytesBody(mt || "application/octet-stream"),
    needsMultipart: false,
  };
}

function setBodyAndContentType(payloadIdent: string, mt: string): GoStmt[] {
  return [
    goAssign(
      [goSelector(goIdent("req"), "Body")],
      [
        goCall(goSelector(goIdent("io"), "NopCloser"), [
          {
            expr: goCall(goSelector(goIdent("bytes"), "NewReader"), [
              { expr: goIdent(payloadIdent) },
            ]),
          },
        ]),
      ],
    ),
    goAssign(
      [goSelector(goIdent("req"), "ContentLength")],
      [
        goCall(goIdent("int64"), [
          { expr: goCall(goIdent("len"), [{ expr: goIdent(payloadIdent) }]) },
        ]),
      ],
    ),
    goExprStmt(
      goCall(goSelector(goSelector(goIdent("req"), "Header"), "Set"), [
        { expr: goStr("Content-Type") },
        { expr: goStr(mt) },
      ]),
    ),
  ];
}

function jsonBody(errCheck: ErrCheckFn): GoStmt[] {
  return [
    goShort(
      ["payload", "err"],
      [
        goCall(goSelector(goIdent("json"), "Marshal"), [
          { expr: goIdent("body") },
        ]),
      ],
    ),
    errCheck("encoding"),
    ...setBodyAndContentType("payload", "application/json"),
  ];
}

function rawBytesBody(mt: string): GoStmt[] {
  return setBodyAndContentType("body", mt);
}

function multipartBody(schema: IR.SchemaObject): GoStmt[] {
  const required = new Set(schema.required ?? []);
  const stmts: GoStmt[] = [
    goShort(["multipart"], [goCall(goIdent("NewMultipartFormBody"), [])]),
  ];
  for (const [propName, propSchema] of Object.entries(
    schema.properties ?? {},
  )) {
    const id = paramIdent(propName);
    const isBinary =
      propSchema.type === "string" && propSchema.format === "binary";
    const isReq = required.has(propName);
    const ref = isReq
      ? goIdent(id)
      : ({ kind: "unary", op: "*", operand: goIdent(id) } as const);
    const append: GoStmt = isBinary
      ? goExprStmt(
          goCall(goSelector(goIdent("multipart"), "AppendFile"), [
            { expr: goStr(propName) },
            { expr: goStr(propName) },
            { expr: ref },
          ]),
        )
      : goExprStmt(
          goCall(goSelector(goIdent("multipart"), "AppendText"), [
            { expr: goStr(propName) },
            {
              expr: goCall(goSelector(goIdent("fmt"), "Sprint"), [
                { expr: ref },
              ]),
            },
          ]),
        );
    stmts.push(isReq ? append : goIf(goNe(goIdent(id), goNil), [append]));
  }
  stmts.push(
    goShort(
      ["payload"],
      [goCall(goSelector(goIdent("multipart"), "Bytes"), [])],
    ),
    goExprStmt(
      goCall(goSelector(goSelector(goIdent("req"), "Header"), "Set"), [
        { expr: goStr("Content-Type") },
        { expr: goCall(goSelector(goIdent("multipart"), "ContentType"), []) },
      ]),
    ),
    goAssign(
      [goSelector(goIdent("req"), "Body")],
      [
        goCall(goSelector(goIdent("io"), "NopCloser"), [
          {
            expr: goCall(goSelector(goIdent("bytes"), "NewReader"), [
              { expr: goIdent("payload") },
            ]),
          },
        ]),
      ],
    ),
    goAssign(
      [goSelector(goIdent("req"), "ContentLength")],
      [
        goCall(goIdent("int64"), [
          { expr: goCall(goIdent("len"), [{ expr: goIdent("payload") }]) },
        ]),
      ],
    ),
  );
  return stmts;
}

function formUrlEncodedBody(schema: IR.SchemaObject): GoStmt[] {
  const required = new Set(schema.required ?? []);
  const stmts: GoStmt[] = [
    goShort(["form"], [goCall(goIdent("url.Values"), [])]),
  ];
  for (const propName of Object.keys(schema.properties ?? {})) {
    const id = paramIdent(propName);
    const isReq = required.has(propName);
    const ref = isReq
      ? goIdent(id)
      : ({ kind: "unary", op: "*", operand: goIdent(id) } as const);
    const set = goExprStmt(
      goCall(goSelector(goIdent("form"), "Set"), [
        { expr: goStr(propName) },
        {
          expr: goCall(goSelector(goIdent("fmt"), "Sprint"), [{ expr: ref }]),
        },
      ]),
    );
    stmts.push(isReq ? set : goIf(goNe(goIdent(id), goNil), [set]));
  }
  stmts.push(
    goShort(
      ["payload"],
      [
        goCall(
          goSelector(goCall(goSelector(goIdent("form"), "Encode"), []), ""),
          [],
        ),
      ],
    ),
  );
  // The form.Encode() returns a string; wrap as []byte.
  stmts[stmts.length - 1] = goShort(
    ["payload"],
    [
      goCall(goIdent("[]byte"), [
        { expr: goCall(goSelector(goIdent("form"), "Encode"), []) },
      ]),
    ],
  );
  stmts.push(
    ...setBodyAndContentType("payload", "application/x-www-form-urlencoded"),
  );
  return stmts;
}

void goIntLit;
