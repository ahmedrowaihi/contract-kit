/**
 * Runtime-helper decls. Each exported function returns a complete
 * top-level `SwDecl` that ships into the user's generated output
 * verbatim. None of them are spec-driven — same Swift every time.
 *
 * Per-method statement builders live in `../impl/`.
 */
export { apiClientDecl, apiInterceptorsDecl } from "./api-client.js";
export { apiErrorEnum } from "./api-error.js";
export { authDecls } from "./auth.js";
export { multipartFormBodyDecl } from "./multipart.js";
export { requestOptionsDecl } from "./request-options.js";
export { unimplementedBodyEnum } from "./unimplemented-body.js";
export { urlEncodingDecls } from "./url-encoding.js";
