package petstore

import "fmt"

// APIErrorKind classifies the failure mode an APIError represents.
type APIErrorKind int

const (
	APIErrorKindClient APIErrorKind = iota
	APIErrorKindServer
	APIErrorKindUnexpected
	APIErrorKindEncoding
	APIErrorKindDecoding
	APIErrorKindTransport
)

func (k APIErrorKind) String() string {
	switch k {
	case APIErrorKindClient:
		return "client_error"
	case APIErrorKindServer:
		return "server_error"
	case APIErrorKindUnexpected:
		return "unexpected_status"
	case APIErrorKindEncoding:
		return "encoding"
	case APIErrorKindDecoding:
		return "decoding"
	case APIErrorKindTransport:
		return "transport"
	default:
		return fmt.Sprintf("unknown(%d)", int(k))
	}
}

// APIError is the typed error every generated method returns.
//
//   - Kind tags the failure mode (client / server / unexpected status,
//     decoding, transport).
//   - StatusCode + Body are populated for non-2xx HTTP responses.
//   - Cause wraps an underlying error (network, json, etc.); use
//     errors.Is / errors.As to inspect.
type APIError struct {
	Kind       APIErrorKind
	StatusCode int    // populated for ClientError / ServerError / Unexpected
	Body       []byte // raw response body for HTTP errors
	Cause      error  // underlying error for transport / encoding / decoding
}

func (e *APIError) Error() string {
	if e.StatusCode != 0 {
		return fmt.Sprintf("%s: status %d", e.Kind, e.StatusCode)
	}
	if e.Cause != nil {
		return fmt.Sprintf("%s: %v", e.Kind, e.Cause)
	}
	return e.Kind.String()
}

func (e *APIError) Unwrap() error { return e.Cause }

// Wrap is a convenience constructor for transient (non-HTTP) failures.
func Wrap(kind APIErrorKind, cause error) *APIError {
	return &APIError{Kind: kind, Cause: cause}
}

// HTTPError builds an APIError for a non-2xx response. The kind is
// derived from the status range — 4xx → Client, 5xx → Server,
// otherwise Unexpected.
func HTTPError(statusCode int, body []byte) *APIError {
	var kind APIErrorKind
	switch {
	case statusCode >= 400 && statusCode < 500:
		kind = APIErrorKindClient
	case statusCode >= 500 && statusCode < 600:
		kind = APIErrorKindServer
	default:
		kind = APIErrorKindUnexpected
	}
	return &APIError{Kind: kind, StatusCode: statusCode, Body: body}
}

// Unexpected — sugar for APIError on an unrecognized status code.
func Unexpected(statusCode int, body []byte) *APIError {
	return &APIError{Kind: APIErrorKindUnexpected, StatusCode: statusCode, Body: body}
}
