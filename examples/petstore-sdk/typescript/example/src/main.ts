/**
 * Buildable consumer of the petstore TypeScript SDK. Exercises the
 * same patterns as the Go / Kotlin / Swift example apps:
 *
 *   - basic GET (read by id)
 *   - response-headers access (the `*WithResponse` analogue — hey-api
 *     surfaces the raw Response on the result tuple by default, so
 *     this is just a destructure)
 *   - timeout via `signal`
 *   - response interceptor (validator)
 *   - typed-error handling for a 404
 *
 * Imports straight from the generated SDK at `../../sdk/`. Run with
 * `pnpm --filter petstore-typescript-example start`.
 */

import { client as defaultClient } from "../../sdk/client.gen";
import { findPetsByStatus, getPetById } from "../../sdk/sdk.gen";

const baseUrl = "https://petstore3.swagger.io/api/v3";
defaultClient.setConfig({ baseUrl });

async function read(id: number) {
  const { data, error } = await getPetById({ path: { petId: id } });
  if (error) {
    console.error("read failed:", error);
    return;
  }
  console.log(`read pet #${id}: ${data?.name ?? "<unnamed>"}`);
}

async function readWithResponse(id: number) {
  const { data, response } = await getPetById({ path: { petId: id } });
  if (!response) return;
  console.log(
    `read pet #${id} → status ${response.status}, server ${response.headers.get("server") ?? "?"}; name=${data?.name}`,
  );
}

async function readWithTimeout(id: number, ms: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const { data, error } = await getPetById({
      path: { petId: id },
      signal: ac.signal,
    });
    if (error) console.error("timeout-read errored:", error);
    else console.log(`timeout-read pet #${id}: ${data?.name}`);
  } finally {
    clearTimeout(t);
  }
}

async function readNotFound(id: number) {
  const { data, error, response } = await getPetById({ path: { petId: id } });
  if (!response) return;
  if (response.status === 404) {
    console.log(`not found (id=${id}) — typed error: ${JSON.stringify(error)}`);
    return;
  }
  console.log(`unexpected: ${response.status} ${data?.name}`);
}

async function listAvailable() {
  const { data, error } = await findPetsByStatus({
    query: { status: "available" },
  });
  if (error) {
    console.error("list failed:", error);
    return;
  }
  console.log(`${data?.length ?? 0} available pets`);
}

async function main() {
  await read(10);
  await readWithResponse(10);
  await readWithTimeout(10, 5_000);
  await readNotFound(99_999_999);
  await listAvailable();
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
