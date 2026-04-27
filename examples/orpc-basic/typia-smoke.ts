import {
  tAddPetData,
  tAddPetDataJsonSchema,
  tAddPetResponse,
  tAddPetResponseError400,
  tCreateShapeData,
  tFindPetsByStatusData,
  tFindPetsByStatusResponse,
  tGetPetByIdData,
  tPlaceOrderData,
  tSubmitMeasurementData,
  tSubmitTagsData,
  tUpdateProfileData,
  tUploadFileData,
  tUploadPetDocumentData,
} from "./src/generated/@ahmedrowaihi/openapi-ts-typia.gen";

function assert(condition: boolean, label: string): void {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
  console.log(`PASS: ${label}`);
}

// ---------------------------------------------------------------------------
// Request input validation
// ---------------------------------------------------------------------------

const addPetValid = {
  body: { name: "Rex", photoUrls: ["https://example.com/rex.jpg"] },
  headers: undefined,
  params: undefined,
  query: undefined,
};
assert(tAddPetData(addPetValid).success, "addPet accepts valid input");

const addPetBad = {
  body: { photoUrls: ["https://example.com/rex.jpg"] },
  headers: undefined,
  params: undefined,
  query: undefined,
};
assert(
  !tAddPetData(addPetBad as unknown as Parameters<typeof tAddPetData>[0])
    .success,
  "addPet rejects input missing body.name",
);

// int64 resolver makes petId a plain number
assert(
  tGetPetByIdData({
    params: { petId: 42 },
    body: undefined,
    headers: undefined,
    query: undefined,
  }).success,
  "getPetById accepts numeric petId",
);
assert(
  !tGetPetByIdData({ params: { petId: "42" } } as unknown as Parameters<
    typeof tGetPetByIdData
  >[0]).success,
  "getPetById rejects string petId without upstream coercion",
);

// ---------------------------------------------------------------------------
// Enum validation
// ---------------------------------------------------------------------------

assert(
  tFindPetsByStatusData({
    query: { status: "available" },
    body: undefined,
    headers: undefined,
    params: undefined,
  }).success,
  "findPetsByStatus accepts valid enum value",
);
assert(
  !tFindPetsByStatusData({
    query: { status: "unknown" },
    body: undefined,
    headers: undefined,
    params: undefined,
  } as unknown as Parameters<typeof tFindPetsByStatusData>[0]).success,
  "findPetsByStatus rejects invalid enum value",
);

// ---------------------------------------------------------------------------
// Array validation (photoUrls: string[])
// ---------------------------------------------------------------------------

const responsePet = { name: "Rex", photoUrls: ["a", "b"] };
assert(
  tAddPetResponse(responsePet).success,
  "response validator accepts valid Pet",
);
assert(
  !tAddPetResponse({
    name: "Rex",
    photoUrls: "not-an-array",
  } as unknown as Parameters<typeof tAddPetResponse>[0]).success,
  "response validator rejects non-array photoUrls",
);

// findPetsByStatus returns Array<Pet>
assert(
  tFindPetsByStatusResponse([responsePet, { ...responsePet, name: "Rex2" }])
    .success,
  "findPetsByStatus response accepts array of valid Pets",
);
assert(
  !tFindPetsByStatusResponse([{ name: "Rex" } as unknown as typeof responsePet])
    .success,
  "findPetsByStatus response rejects array with invalid Pet (missing photoUrls)",
);

// ---------------------------------------------------------------------------
// Error response validation
// ---------------------------------------------------------------------------

// addPet 400 error shape from spec: just strings/primitives — petstore doesn't
// define a structured error body, so the validator effectively accepts any
// shape. Smoke: exercise the validator exists and runs without throwing.
const err400Result = tAddPetResponseError400(undefined);
assert(err400Result !== undefined, "addPet error-400 validator runs");

// ---------------------------------------------------------------------------
// File body (raw binary — uploadFile)
// ---------------------------------------------------------------------------

assert(
  tUploadFileData({
    body: new Blob(["hello"]),
    params: { petId: 1 },
    query: undefined,
    headers: undefined,
  }).success,
  "uploadFile accepts Blob body",
);
assert(
  !tUploadFileData({
    body: "not-a-blob" as unknown as Blob,
    params: { petId: 1 },
    query: undefined,
    headers: undefined,
  }).success,
  "uploadFile rejects string body (not Blob/File)",
);

// ---------------------------------------------------------------------------
// Multipart body (structured file + fields — uploadPetDocument)
// ---------------------------------------------------------------------------

assert(
  tUploadPetDocumentData({
    body: {
      file: new Blob(["doc"]),
      title: "manual",
      description: "owner's manual",
    },
    params: { petId: 1 },
    query: undefined,
    headers: undefined,
  }).success,
  "uploadPetDocument accepts multipart body with File + fields",
);
assert(
  !tUploadPetDocumentData({
    body: {
      file: "not-a-blob",
      title: "manual",
    } as unknown as { file: Blob },
    params: { petId: 1 },
    query: undefined,
    headers: undefined,
  }).success,
  "uploadPetDocument rejects non-Blob file in multipart body",
);

// ---------------------------------------------------------------------------
// Date-time format validation (Order.shipDate: string & Format<"date-time">)
// ---------------------------------------------------------------------------

assert(
  tPlaceOrderData({
    body: { shipDate: "2026-04-21T12:00:00Z" },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "placeOrder accepts ISO date-time string",
);
assert(
  !tPlaceOrderData({
    body: { shipDate: "not-a-date" },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "placeOrder rejects malformed date-time string",
);

// ---------------------------------------------------------------------------
// Array constraints (minItems / maxItems / uniqueItems + item minLength)
// ---------------------------------------------------------------------------

assert(
  tSubmitTagsData({
    body: { tags: ["a", "b"] },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "submitTags accepts a unique non-empty tag list",
);
assert(
  !tSubmitTagsData({
    body: { tags: [] },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "submitTags rejects empty tag list (minItems: 1)",
);
// NOTE: `uniqueItems: true` is not exercised — the field exists on
// IR.SchemaObject (it extends JSON Schema Draft 2020-12) but hey-api's
// parseSchemaMeta never assigns it from any OpenAPI version. Our
// transformer correctly emits no tag when the value is undefined.
// Upstream gap; file an issue on hey-api/openapi-ts.
assert(
  !tSubmitTagsData({
    body: { tags: ["a", "b", "c", "d", "e", "f"] },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "submitTags rejects tag list over maxItems",
);
assert(
  !tSubmitTagsData({
    body: { tags: [""] },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "submitTags rejects empty string item (minLength: 1)",
);

// ---------------------------------------------------------------------------
// Nullable types (nickname?: string | null)
// ---------------------------------------------------------------------------

assert(
  tUpdateProfileData({
    body: { name: "Ada", nickname: null },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "updateProfile accepts null nickname",
);
assert(
  tUpdateProfileData({
    body: { name: "Ada", nickname: "ada" },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "updateProfile accepts string nickname",
);
assert(
  !tUpdateProfileData({
    body: { name: 42 },
    headers: undefined,
    params: undefined,
    query: undefined,
  } as unknown as Parameters<typeof tUpdateProfileData>[0]).success,
  "updateProfile rejects non-string name",
);

// ---------------------------------------------------------------------------
// Discriminated union (Circle | Rect)
// ---------------------------------------------------------------------------

assert(
  tCreateShapeData({
    body: { kind: "circle", radius: 5 },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "createShape accepts a Circle",
);
assert(
  tCreateShapeData({
    body: { kind: "rect", width: 4, height: 3 },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "createShape accepts a Rect",
);
assert(
  !tCreateShapeData({
    body: { kind: "circle", radius: 0 },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "createShape rejects Circle with radius 0 (exclusiveMinimum)",
);
assert(
  !tCreateShapeData({
    body: { kind: "triangle" },
    headers: undefined,
    params: undefined,
    query: undefined,
  } as unknown as Parameters<typeof tCreateShapeData>[0]).success,
  "createShape rejects unknown discriminator value",
);
assert(
  !tCreateShapeData({
    body: { kind: "rect", width: 4 },
    headers: undefined,
    params: undefined,
    query: undefined,
  } as unknown as Parameters<typeof tCreateShapeData>[0]).success,
  "createShape rejects Rect missing required height",
);

// NOTE: `multipleOf` is not exercised — the field is absent from
// IR.SchemaObject in hey-api/openapi-ts, so the typia plugin never
// receives it from the parser. `submitMeasurement` still exists in
// the spec but its validator only enforces `minimum: 0` (which IS
// parsed). Upstream gap; file an issue on hey-api/openapi-ts.
assert(
  tSubmitMeasurementData({
    body: { value: 2.5 },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "submitMeasurement accepts 2.5 (minimum 0 enforced)",
);
assert(
  !tSubmitMeasurementData({
    body: { value: -1 },
    headers: undefined,
    params: undefined,
    query: undefined,
  }).success,
  "submitMeasurement rejects negative value (minimum 0)",
);

// ---------------------------------------------------------------------------
// JSON schema twins
// ---------------------------------------------------------------------------

assert(
  typeof tAddPetDataJsonSchema === "object" && tAddPetDataJsonSchema !== null,
  "tAddPetDataJsonSchema is a JSON schema object",
);

// ---------------------------------------------------------------------------
// Standard Schema v1 path
// ---------------------------------------------------------------------------

const ssResult = tAddPetData["~standard"].validate({ body: {} });
const ss = ssResult instanceof Promise ? null : ssResult;
assert(
  ss !== null && "issues" in ss,
  "Standard Schema validate returns issues for bad input",
);

console.log("\nAll typia runtime checks passed.");
