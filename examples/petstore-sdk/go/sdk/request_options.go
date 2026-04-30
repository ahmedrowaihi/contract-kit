package petstore

import (
	"context"
	"net/http"
	"time"
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
	Client               *APIClient
	BaseURL              string
	Timeout              time.Duration
	Headers              map[string]string
	RequestInterceptors  []func(*http.Request) (*http.Request, error)
	ResponseValidator    func(body []byte, resp *http.Response) error
	ResponseTransformer  func(body []byte) ([]byte, error)
}

// applyTimeout returns a context derived from ctx with opts.Timeout
// as a deadline. Returns ctx unchanged when Timeout is zero.
func (opts RequestOptions) applyTimeout(ctx context.Context) (context.Context, context.CancelFunc) {
	if opts.Timeout <= 0 {
		return ctx, func() {}
	}
	return context.WithTimeout(ctx, opts.Timeout)
}
