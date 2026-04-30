package petstore

import (
	"encoding/json"
	"io"
	"net/http"
)

// APIClient is the runtime helper every per-tag impl struct delegates
// to. Owns the transport-level concerns — http.Client, the
// interceptor pipeline — and provides one source of truth for status-
// code dispatch and decoding.
type APIClient struct {
	BaseURL      string
	HTTPClient   *http.Client
	Interceptors []func(*http.Request) (*http.Request, error)
	Auth         map[string]Auth
}

// NewAPIClient returns a client with the default http.Client and an
// empty interceptors / auth slice / map. Callers may set fields
// directly afterward to customize.
func NewAPIClient(baseURL string) *APIClient {
	return &APIClient{
		BaseURL:    baseURL,
		HTTPClient: http.DefaultClient,
		Auth:       map[string]Auth{},
	}
}

// Execute sends the request, runs the validator/transformer pipeline,
// and JSON-decodes a 2xx body into a value of T. Caller picks T —
// for object schemas pass *Pet, for collections pass []Pet or
// map[string]int. Returns *APIError for non-2xx / transport /
// encoding / decoding failures.
func Execute[T any](client *APIClient, req *http.Request, opts RequestOptions) (T, error) {
	var zero T
	body, _, err := sendAndDispatch(client, req, opts)
	if err != nil {
		return zero, err
	}
	var value T
	if err := json.Unmarshal(body, &value); err != nil {
		return zero, Wrap(APIErrorKindDecoding, err)
	}
	return value, nil
}

// ExecuteWithResponse is Execute + the raw *http.Response.
func ExecuteWithResponse[T any](client *APIClient, req *http.Request, opts RequestOptions) (T, *http.Response, error) {
	var zero T
	body, resp, err := sendAndDispatch(client, req, opts)
	if err != nil {
		return zero, nil, err
	}
	var value T
	if err := json.Unmarshal(body, &value); err != nil {
		return zero, nil, Wrap(APIErrorKindDecoding, err)
	}
	return value, resp, nil
}

// ExecuteUnit sends the request and discards the body — for ops with
// no successful return type.
func ExecuteUnit(client *APIClient, req *http.Request, opts RequestOptions) error {
	_, _, err := sendAndDispatch(client, req, opts)
	return err
}

// ExecuteUnitWithResponse is ExecuteUnit + the raw *http.Response.
func ExecuteUnitWithResponse(client *APIClient, req *http.Request, opts RequestOptions) (*http.Response, error) {
	_, resp, err := sendAndDispatch(client, req, opts)
	return resp, err
}

// ExecuteRaw is the lowest-level execute — runs interceptors, sends,
// status-dispatches, applies validator + transformer, hands the
// (transformed) body + response back without decoding. Generated
// methods reach for this when the operation has multiple 2xx response
// schemas: the impl needs the status code to pick which type to decode.
func ExecuteRaw(client *APIClient, req *http.Request, opts RequestOptions) ([]byte, *http.Response, error) {
	return sendAndDispatch(client, req, opts)
}

func sendAndDispatch(client *APIClient, req *http.Request, opts RequestOptions) ([]byte, *http.Response, error) {
	ctx, cancel := opts.applyTimeout(req.Context())
	defer cancel()
	req = req.WithContext(ctx)

	for _, interceptor := range client.Interceptors {
		next, err := interceptor(req)
		if err != nil {
			return nil, nil, Wrap(APIErrorKindTransport, err)
		}
		req = next
	}
	for _, interceptor := range opts.RequestInterceptors {
		next, err := interceptor(req)
		if err != nil {
			return nil, nil, Wrap(APIErrorKindTransport, err)
		}
		req = next
	}

	resp, err := client.HTTPClient.Do(req)
	if err != nil {
		return nil, nil, Wrap(APIErrorKindTransport, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp, Wrap(APIErrorKindTransport, err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, resp, HTTPError(resp.StatusCode, body)
	}

	if opts.ResponseValidator != nil {
		if err := opts.ResponseValidator(body, resp); err != nil {
			return nil, resp, err
		}
	}
	if opts.ResponseTransformer != nil {
		transformed, err := opts.ResponseTransformer(body)
		if err != nil {
			return nil, resp, err
		}
		body = transformed
	}

	return body, resp, nil
}

