// Re-exports from @ahmedrowaihi/codegen-core for back-compat. New
// code should import these directly from `@ahmedrowaihi/codegen-core`;
// these forwarders will be removed in a future major.
export {
  assertSafeOutputDir,
  camel,
  defaultProjectName,
  pascal,
  safeCaseName,
  safeIdent,
  synthName,
} from "@ahmedrowaihi/codegen-core";
export {
  FORM_URLENCODED_MEDIA,
  HTTP_METHOD_LITERAL,
  HTTP_METHODS,
  type HttpMethod,
  JSON_MEDIA_RE,
  MULTIPART_FORM_MEDIA,
} from "./constants.js";
export { isMeaningless, refName } from "./ref.js";
export { extractSecuritySchemeNames, securityKey } from "./security.js";
