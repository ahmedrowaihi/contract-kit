import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  goField,
  goFile,
  goFuncDecl,
  goFuncParam,
  goFuncResult,
  goInt,
  goInt64,
  goInterface,
  goMethodSig,
  goPtr,
  goRef,
  goSlice,
  goString,
  goStruct,
  printFile,
} from "../src/index.ts";

describe("printer", () => {
  it("emits a struct with json struct tags", () => {
    const file = goFile({
      pkg: "petstore",
      decls: [
        goStruct({
          name: "Pet",
          fields: [
            goField("Id", goPtr(goInt64), '`json:"id,omitempty"`'),
            goField("Name", goString, '`json:"name"`'),
            goField("Tags", goSlice(goRef("Tag")), '`json:"tags,omitempty"`'),
          ],
        }),
      ],
    });
    const out = printFile(file);
    assert.match(out, /^package petstore\n/);
    assert.match(out, /type Pet struct \{/);
    assert.match(out, /\tId \*int64 `json:"id,omitempty"`/);
    assert.match(out, /\tName string `json:"name"`/);
    assert.match(out, /\tTags \[\]Tag `json:"tags,omitempty"`/);
  });

  it("emits an interface with method signatures", () => {
    const file = goFile({
      pkg: "petstore",
      imports: ["context"],
      decls: [
        goInterface({
          name: "PetAPI",
          methods: [
            goMethodSig(
              "GetPet",
              [
                { name: "ctx", type: goRef("context.Context") },
                { name: "id", type: goInt64 },
              ],
              [{ type: goPtr(goRef("Pet")) }, { type: goRef("error") }],
              "GET /pet/{id}",
            ),
          ],
        }),
      ],
    });
    const out = printFile(file);
    assert.match(out, /import "context"/);
    assert.match(
      out,
      /type PetAPI interface \{\n\t\/\/ GET \/pet\/\{id\}\n\tGetPet\(ctx context\.Context, id int64\) \(\*Pet, error\)\n\}/,
    );
  });

  it("emits a generic function", () => {
    const file = goFile({
      pkg: "petstore",
      decls: [
        goFuncDecl({
          name: "Execute",
          typeParams: [{ name: "T", constraint: "any" }],
          params: [goFuncParam("v", goRef("T"))],
          results: [goFuncResult(goRef("T")), goFuncResult(goRef("error"))],
          body: [],
        }),
      ],
    });
    assert.match(
      printFile(file),
      /func Execute\[T any\]\(v T\) \(T, error\) \{\}/,
    );
  });

  it("groups stdlib + third-party imports per gofmt", () => {
    const file = goFile({
      pkg: "x",
      imports: ["fmt", "github.com/example/foo", "net/http"],
      decls: [],
    });
    const out = printFile(file);
    assert.match(
      out,
      /import \(\n\t"fmt"\n\t"net\/http"\n\n\t"github\.com\/example\/foo"\n\)/,
    );
  });

  it("primitive return omits unnecessary parens; multi-result keeps them", () => {
    const single = goFile({
      pkg: "x",
      decls: [
        goFuncDecl({
          name: "F",
          results: [goFuncResult(goInt)],
          body: [],
        }),
      ],
    });
    assert.match(printFile(single), /func F\(\) int \{\}/);

    const multi = goFile({
      pkg: "x",
      decls: [
        goFuncDecl({
          name: "G",
          results: [goFuncResult(goInt), goFuncResult(goRef("error"))],
          body: [],
        }),
      ],
    });
    assert.match(printFile(multi), /func G\(\) \(int, error\) \{\}/);
  });
});
