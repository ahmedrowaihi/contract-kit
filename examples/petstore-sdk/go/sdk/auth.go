package petstore

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"net/url"
)

// Auth is the interface implemented by Bearer / APIKey / Basic. Per-
// operation auto-wiring (when the spec declares securitySchemes) walks
// the configured client.Auth map and calls Apply on the matching scheme.
//
// Apply mutates the request in-place for header / cookie auth and
// returns the (possibly rewritten) URL for query auth. Generated impl
// code re-attaches the URL via req.URL = u after the loop.
type Auth interface {
	Apply(req *http.Request, u *url.URL) *url.URL
}

// BearerAuth — Authorization: Bearer <token>.
type BearerAuth struct{ Token string }

func (a BearerAuth) Apply(req *http.Request, u *url.URL) *url.URL {
	req.Header.Set("Authorization", "Bearer "+a.Token)
	return u
}

// APIKeyAuth — header / query / cookie placement of <name>=<value>.
type APIKeyAuth struct {
	Name     string
	Value    string
	Location APIKeyLocation
}

func (a APIKeyAuth) Apply(req *http.Request, u *url.URL) *url.URL {
	switch a.Location {
	case APIKeyHeader:
		req.Header.Set(a.Name, a.Value)
		return u
	case APIKeyQuery:
		q := u.Query()
		q.Set(a.Name, a.Value)
		u2 := *u
		u2.RawQuery = q.Encode()
		return &u2
	case APIKeyCookie:
		existing := req.Header.Get("Cookie")
		cookie := fmt.Sprintf("%s=%s", a.Name, a.Value)
		if existing != "" {
			cookie = existing + "; " + cookie
		}
		req.Header.Set("Cookie", cookie)
		return u
	}
	return u
}

// BasicAuth — Authorization: Basic base64(user:pass).
type BasicAuth struct{ Username, Password string }

func (a BasicAuth) Apply(req *http.Request, u *url.URL) *url.URL {
	creds := base64.StdEncoding.EncodeToString([]byte(a.Username + ":" + a.Password))
	req.Header.Set("Authorization", "Basic "+creds)
	return u
}
