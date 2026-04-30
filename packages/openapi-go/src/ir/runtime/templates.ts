/**
 * Runtime helper sources. These files ship verbatim into every
 * generated SDK — no spec-driven content beyond the package name.
 * Encoding them as fixed Go strings (rather than DSL-built) keeps
 * the codegen surface small: the DSL only has to model what the
 * per-operation impl actually uses.
 *
 * Convention: `__PACKAGE__` is replaced by the consumer-chosen
 * package name during `buildRuntimeFiles(...)`.
 */

export interface RuntimeOpts {
  /** Emit `Auth` interface + concrete impls and `auth: map[string]Auth`
   *  on `APIClient`. Set when the spec declares any `securitySchemes`. */
  hasAuth: boolean;
  /** Emit the multipart helper file. Set when at least one op has
   *  a `multipart/form-data` body. */
  hasMultipart: boolean;
}

export interface RuntimeFile {
  name: string;
  content: string;
}

const API_ERROR_GO = `package __PACKAGE__

import "fmt"

// APIErrorKind classifies the failure mode an APIError represents.
type APIErrorKind int

const (
\tAPIErrorKindClient APIErrorKind = iota
\tAPIErrorKindServer
\tAPIErrorKindUnexpected
\tAPIErrorKindEncoding
\tAPIErrorKindDecoding
\tAPIErrorKindTransport
)

func (k APIErrorKind) String() string {
\tswitch k {
\tcase APIErrorKindClient:
\t\treturn "client_error"
\tcase APIErrorKindServer:
\t\treturn "server_error"
\tcase APIErrorKindUnexpected:
\t\treturn "unexpected_status"
\tcase APIErrorKindEncoding:
\t\treturn "encoding"
\tcase APIErrorKindDecoding:
\t\treturn "decoding"
\tcase APIErrorKindTransport:
\t\treturn "transport"
\tdefault:
\t\treturn fmt.Sprintf("unknown(%d)", int(k))
\t}
}

// APIError is the typed error every generated method returns.
//
//   - Kind tags the failure mode (client / server / unexpected status,
//     decoding, transport).
//   - StatusCode + Body are populated for non-2xx HTTP responses.
//   - Cause wraps an underlying error (network, json, etc.); use
//     errors.Is / errors.As to inspect.
type APIError struct {
\tKind       APIErrorKind
\tStatusCode int    // populated for ClientError / ServerError / Unexpected
\tBody       []byte // raw response body for HTTP errors
\tCause      error  // underlying error for transport / encoding / decoding
}

func (e *APIError) Error() string {
\tif e.StatusCode != 0 {
\t\treturn fmt.Sprintf("%s: status %d", e.Kind, e.StatusCode)
\t}
\tif e.Cause != nil {
\t\treturn fmt.Sprintf("%s: %v", e.Kind, e.Cause)
\t}
\treturn e.Kind.String()
}

func (e *APIError) Unwrap() error { return e.Cause }

// Wrap is a convenience constructor for transient (non-HTTP) failures.
func Wrap(kind APIErrorKind, cause error) *APIError {
\treturn &APIError{Kind: kind, Cause: cause}
}

// HTTPError builds an APIError for a non-2xx response. The kind is
// derived from the status range — 4xx → Client, 5xx → Server,
// otherwise Unexpected.
func HTTPError(statusCode int, body []byte) *APIError {
\tvar kind APIErrorKind
\tswitch {
\tcase statusCode >= 400 && statusCode < 500:
\t\tkind = APIErrorKindClient
\tcase statusCode >= 500 && statusCode < 600:
\t\tkind = APIErrorKindServer
\tdefault:
\t\tkind = APIErrorKindUnexpected
\t}
\treturn &APIError{Kind: kind, StatusCode: statusCode, Body: body}
}

// Unexpected — sugar for APIError on an unrecognized status code.
func Unexpected(statusCode int, body []byte) *APIError {
\treturn &APIError{Kind: APIErrorKindUnexpected, StatusCode: statusCode, Body: body}
}
`;

const REQUEST_OPTIONS_GO = `package __PACKAGE__

import (
\t"context"
\t"net/http"
\t"time"
)

// RequestOptions is the per-call options bag every generated method
// takes as its trailing argument. Mirrors hey-api's TS SDK options
// shape.
//
//   - Client overrides the impl's bound *APIClient for one call.
//   - BaseURL overrides client.BaseURL for one call.
//   - Timeout, when non-zero, derives a context with that deadline
//     from the call's ctx. Use ctx.WithDeadline yourself for finer
//     control; this is the convenience knob.
//   - Headers are extra/override headers, applied last (so callers
//     can override Content-Type / auth headers if they want).
//   - RequestInterceptors run after client-level ones.
//   - ResponseValidator runs after a 2xx response; returning an error
//     converts the call into a failure.
//   - ResponseTransformer rewrites the response body before decoding.
type RequestOptions struct {
\tClient               *APIClient
\tBaseURL              string
\tTimeout              time.Duration
\tHeaders              map[string]string
\tRequestInterceptors  []func(*http.Request) (*http.Request, error)
\tResponseValidator    func(body []byte, resp *http.Response) error
\tResponseTransformer  func(body []byte) ([]byte, error)
}

// applyTimeout returns a context derived from ctx with opts.Timeout
// as a deadline. Returns ctx unchanged when Timeout is zero.
func (opts RequestOptions) applyTimeout(ctx context.Context) (context.Context, context.CancelFunc) {
\tif opts.Timeout <= 0 {
\t\treturn ctx, func() {}
\t}
\treturn context.WithTimeout(ctx, opts.Timeout)
}
`;

const QUERY_STYLE_GO = `package __PACKAGE__

// QueryStyle controls how array-valued query parameters are
// serialized when explode is false. Matches the OpenAPI 3 \`style\`
// field. The default is QueryStyleForm with explode=true.
type QueryStyle int

const (
\tQueryStyleForm QueryStyle = iota
\tQueryStyleSpaceDelimited
\tQueryStylePipeDelimited
)
`;

const URL_ENCODING_GO = `package __PACKAGE__

import (
\t"fmt"
\t"net/url"
\t"reflect"
\t"strings"
)

// URLEncoding helpers used by generated impl methods to add OpenAPI-
// shaped query parameters onto a url.Values without each call site
// having to know the style/explode rules.
var URLEncoding = urlEncoding{}

type urlEncoding struct{}

// AddScalar appends a single key/value pair, skipping nil pointers
// and empty optional values.
func (urlEncoding) AddScalar(q url.Values, name string, value any) {
\tif value == nil {
\t\treturn
\t}
\tv := reflect.ValueOf(value)
\tif v.Kind() == reflect.Ptr {
\t\tif v.IsNil() {
\t\t\treturn
\t\t}
\t\tv = v.Elem()
\t}
\tq.Set(name, fmt.Sprint(v.Interface()))
}

// AddArray appends an array-valued query parameter following the
// OpenAPI \`style\` + \`explode\` rules. explode=true emits one
// \`?name=v\` per element; explode=false joins per the style separator.
func (urlEncoding) AddArray(q url.Values, name string, values any, style QueryStyle, explode bool) {
\tv := reflect.ValueOf(values)
\tif v.Kind() == reflect.Ptr {
\t\tif v.IsNil() {
\t\t\treturn
\t\t}
\t\tv = v.Elem()
\t}
\tif v.Kind() != reflect.Slice && v.Kind() != reflect.Array {
\t\treturn
\t}
\tif v.Len() == 0 {
\t\treturn
\t}
\tif explode {
\t\tfor i := 0; i < v.Len(); i++ {
\t\t\tq.Add(name, fmt.Sprint(v.Index(i).Interface()))
\t\t}
\t\treturn
\t}
\tsep := ","
\tswitch style {
\tcase QueryStyleSpaceDelimited:
\t\tsep = " "
\tcase QueryStylePipeDelimited:
\t\tsep = "|"
\t}
\tparts := make([]string, v.Len())
\tfor i := 0; i < v.Len(); i++ {
\t\tparts[i] = fmt.Sprint(v.Index(i).Interface())
\t}
\tq.Set(name, strings.Join(parts, sep))
}
`;

const MULTIPART_GO = `package __PACKAGE__

import (
\t"bytes"
\t"mime/multipart"
\t"net/textproto"
)

// MultipartFormBody assembles a multipart/form-data request body.
// Mirrors the runtime helper Swift / Kotlin generators ship; thin
// wrapper over the stdlib mime/multipart writer, kept around so the
// generated impl reads symmetric across languages.
type MultipartFormBody struct {
\tbuf    *bytes.Buffer
\twriter *multipart.Writer
}

// NewMultipartFormBody constructs an empty multipart body.
func NewMultipartFormBody() *MultipartFormBody {
\tbuf := &bytes.Buffer{}
\treturn &MultipartFormBody{buf: buf, writer: multipart.NewWriter(buf)}
}

// AppendText writes a text form field.
func (m *MultipartFormBody) AppendText(name, value string) error {
\treturn m.writer.WriteField(name, value)
}

// AppendFile writes a binary form field. mimeType is set to
// application/octet-stream when empty.
func (m *MultipartFormBody) AppendFile(name, filename string, content []byte) error {
\th := make(textproto.MIMEHeader)
\th.Set("Content-Disposition",
\t\t"form-data; name=\\""+name+"\\"; filename=\\""+filename+"\\"")
\th.Set("Content-Type", "application/octet-stream")
\tw, err := m.writer.CreatePart(h)
\tif err != nil {
\t\treturn err
\t}
\t_, err = w.Write(content)
\treturn err
}

// ContentType returns the multipart/form-data Content-Type header
// including the boundary string.
func (m *MultipartFormBody) ContentType() string { return m.writer.FormDataContentType() }

// Bytes finalizes the multipart body and returns the assembled bytes.
// Subsequent AppendText / AppendFile calls have undefined behavior.
func (m *MultipartFormBody) Bytes() []byte {
\t_ = m.writer.Close()
\treturn m.buf.Bytes()
}
`;

const API_KEY_LOCATION_GO = `package __PACKAGE__

// APIKeyLocation matches the OpenAPI securitySchemes.<name>.in field.
type APIKeyLocation int

const (
\tAPIKeyHeader APIKeyLocation = iota
\tAPIKeyQuery
\tAPIKeyCookie
)
`;

const AUTH_GO = `package __PACKAGE__

import (
\t"encoding/base64"
\t"fmt"
\t"net/http"
\t"net/url"
)

// Auth is the interface implemented by Bearer / APIKey / Basic. Per-
// operation auto-wiring (when the spec declares securitySchemes) walks
// the configured client.Auth map and calls Apply on the matching scheme.
//
// Apply mutates the request in-place for header / cookie auth and
// returns the (possibly rewritten) URL for query auth. Generated impl
// code re-attaches the URL via req.URL = u after the loop.
type Auth interface {
\tApply(req *http.Request, u *url.URL) *url.URL
}

// BearerAuth — Authorization: Bearer <token>.
type BearerAuth struct{ Token string }

func (a BearerAuth) Apply(req *http.Request, u *url.URL) *url.URL {
\treq.Header.Set("Authorization", "Bearer "+a.Token)
\treturn u
}

// APIKeyAuth — header / query / cookie placement of <name>=<value>.
type APIKeyAuth struct {
\tName     string
\tValue    string
\tLocation APIKeyLocation
}

func (a APIKeyAuth) Apply(req *http.Request, u *url.URL) *url.URL {
\tswitch a.Location {
\tcase APIKeyHeader:
\t\treq.Header.Set(a.Name, a.Value)
\t\treturn u
\tcase APIKeyQuery:
\t\tq := u.Query()
\t\tq.Set(a.Name, a.Value)
\t\tu2 := *u
\t\tu2.RawQuery = q.Encode()
\t\treturn &u2
\tcase APIKeyCookie:
\t\texisting := req.Header.Get("Cookie")
\t\tcookie := fmt.Sprintf("%s=%s", a.Name, a.Value)
\t\tif existing != "" {
\t\t\tcookie = existing + "; " + cookie
\t\t}
\t\treq.Header.Set("Cookie", cookie)
\t\treturn u
\t}
\treturn u
}

// BasicAuth — Authorization: Basic base64(user:pass).
type BasicAuth struct{ Username, Password string }

func (a BasicAuth) Apply(req *http.Request, u *url.URL) *url.URL {
\tcreds := base64.StdEncoding.EncodeToString([]byte(a.Username + ":" + a.Password))
\treq.Header.Set("Authorization", "Basic "+creds)
\treturn u
}
`;

const API_CLIENT_BASE_GO = `package __PACKAGE__

import (
\t"encoding/json"
\t"io"
\t"net/http"
)

// APIClient is the runtime helper every per-tag impl struct delegates
// to. Owns the transport-level concerns — http.Client, the
// interceptor pipeline — and provides one source of truth for status-
// code dispatch and decoding.
type APIClient struct {
\tBaseURL      string
\tHTTPClient   *http.Client
\tInterceptors []func(*http.Request) (*http.Request, error)__AUTH_FIELD__
}

// NewAPIClient returns a client with the default http.Client and an
// empty interceptors / auth slice / map. Callers may set fields
// directly afterward to customize.
func NewAPIClient(baseURL string) *APIClient {
\treturn &APIClient{
\t\tBaseURL:    baseURL,
\t\tHTTPClient: http.DefaultClient,__AUTH_INIT__
\t}
}

// Execute sends the request, runs the validator/transformer pipeline,
// and JSON-decodes a 2xx body into a value of T. Caller picks T —
// for object schemas pass *Pet, for collections pass []Pet or
// map[string]int. Returns *APIError for non-2xx / transport /
// encoding / decoding failures.
func Execute[T any](client *APIClient, req *http.Request, opts RequestOptions) (T, error) {
\tvar zero T
\tbody, _, err := sendAndDispatch(client, req, opts)
\tif err != nil {
\t\treturn zero, err
\t}
\tvar value T
\tif err := json.Unmarshal(body, &value); err != nil {
\t\treturn zero, Wrap(APIErrorKindDecoding, err)
\t}
\treturn value, nil
}

// ExecuteWithResponse is Execute + the raw *http.Response.
func ExecuteWithResponse[T any](client *APIClient, req *http.Request, opts RequestOptions) (T, *http.Response, error) {
\tvar zero T
\tbody, resp, err := sendAndDispatch(client, req, opts)
\tif err != nil {
\t\treturn zero, nil, err
\t}
\tvar value T
\tif err := json.Unmarshal(body, &value); err != nil {
\t\treturn zero, nil, Wrap(APIErrorKindDecoding, err)
\t}
\treturn value, resp, nil
}

// ExecuteUnit sends the request and discards the body — for ops with
// no successful return type.
func ExecuteUnit(client *APIClient, req *http.Request, opts RequestOptions) error {
\t_, _, err := sendAndDispatch(client, req, opts)
\treturn err
}

// ExecuteUnitWithResponse is ExecuteUnit + the raw *http.Response.
func ExecuteUnitWithResponse(client *APIClient, req *http.Request, opts RequestOptions) (*http.Response, error) {
\t_, resp, err := sendAndDispatch(client, req, opts)
\treturn resp, err
}

// ExecuteRaw is the lowest-level execute — runs interceptors, sends,
// status-dispatches, applies validator + transformer, hands the
// (transformed) body + response back without decoding. Generated
// methods reach for this when the operation has multiple 2xx response
// schemas: the impl needs the status code to pick which type to decode.
func ExecuteRaw(client *APIClient, req *http.Request, opts RequestOptions) ([]byte, *http.Response, error) {
\treturn sendAndDispatch(client, req, opts)
}

func sendAndDispatch(client *APIClient, req *http.Request, opts RequestOptions) ([]byte, *http.Response, error) {
\tctx, cancel := opts.applyTimeout(req.Context())
\tdefer cancel()
\treq = req.WithContext(ctx)

\tfor _, interceptor := range client.Interceptors {
\t\tnext, err := interceptor(req)
\t\tif err != nil {
\t\t\treturn nil, nil, Wrap(APIErrorKindTransport, err)
\t\t}
\t\treq = next
\t}
\tfor _, interceptor := range opts.RequestInterceptors {
\t\tnext, err := interceptor(req)
\t\tif err != nil {
\t\t\treturn nil, nil, Wrap(APIErrorKindTransport, err)
\t\t}
\t\treq = next
\t}

\tresp, err := client.HTTPClient.Do(req)
\tif err != nil {
\t\treturn nil, nil, Wrap(APIErrorKindTransport, err)
\t}
\tdefer resp.Body.Close()

\tbody, err := io.ReadAll(resp.Body)
\tif err != nil {
\t\treturn nil, resp, Wrap(APIErrorKindTransport, err)
\t}

\tif resp.StatusCode < 200 || resp.StatusCode >= 300 {
\t\treturn nil, resp, HTTPError(resp.StatusCode, body)
\t}

\tif opts.ResponseValidator != nil {
\t\tif err := opts.ResponseValidator(body, resp); err != nil {
\t\t\treturn nil, resp, err
\t\t}
\t}
\tif opts.ResponseTransformer != nil {
\t\ttransformed, err := opts.ResponseTransformer(body)
\t\tif err != nil {
\t\t\treturn nil, resp, err
\t\t}
\t\tbody = transformed
\t}

\treturn body, resp, nil
}

`;

export function apiClientGo(opts: RuntimeOpts): string {
  const authField = opts.hasAuth ? "\n\tAuth         map[string]Auth" : "";
  const authInit = opts.hasAuth ? "\n\t\tAuth:       map[string]Auth{}," : "";
  return API_CLIENT_BASE_GO.replace("__AUTH_FIELD__", authField).replace(
    "__AUTH_INIT__",
    authInit,
  );
}

/** Ordered runtime files. The orchestrator places them in the SDK package. */
export function buildRuntimeFiles(
  opts: RuntimeOpts,
  pkg: string,
): RuntimeFile[] {
  const subst = (s: string) => s.replace(/__PACKAGE__/g, pkg);
  const files: RuntimeFile[] = [
    { name: "api_client.go", content: subst(apiClientGo(opts)) },
    { name: "api_error.go", content: subst(API_ERROR_GO) },
    { name: "request_options.go", content: subst(REQUEST_OPTIONS_GO) },
    { name: "query_style.go", content: subst(QUERY_STYLE_GO) },
    { name: "url_encoding.go", content: subst(URL_ENCODING_GO) },
  ];
  if (opts.hasAuth) {
    files.push({ name: "auth.go", content: subst(AUTH_GO) });
    files.push({
      name: "api_key_location.go",
      content: subst(API_KEY_LOCATION_GO),
    });
  }
  if (opts.hasMultipart) {
    files.push({
      name: "multipart_form_body.go",
      content: subst(MULTIPART_GO),
    });
  }
  return files;
}
