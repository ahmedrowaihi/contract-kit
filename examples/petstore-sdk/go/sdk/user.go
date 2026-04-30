package petstore

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"path"
)

type UserAPI interface {
	// POST /user
	CreateUser(ctx context.Context, body *User, opts RequestOptions) (*User, error)
	// POST /user
	CreateUserWithResponse(ctx context.Context, body *User, opts RequestOptions) (*User, *http.Response, error)
	// POST /user/createWithList
	CreateUsersWithListInput(ctx context.Context, body *[]User, opts RequestOptions) (*User, error)
	// POST /user/createWithList
	CreateUsersWithListInputWithResponse(ctx context.Context, body *[]User, opts RequestOptions) (*User, *http.Response, error)
	// GET /user/login
	LoginUser(ctx context.Context, username *string, password *string, opts RequestOptions) (string, error)
	// GET /user/login
	LoginUserWithResponse(ctx context.Context, username *string, password *string, opts RequestOptions) (string, *http.Response, error)
	// GET /user/logout
	LogoutUser(ctx context.Context, opts RequestOptions) error
	// GET /user/logout
	LogoutUserWithResponse(ctx context.Context, opts RequestOptions) (*http.Response, error)
	// GET /user/{username}
	GetUserByName(ctx context.Context, username string, opts RequestOptions) (*User, error)
	// GET /user/{username}
	GetUserByNameWithResponse(ctx context.Context, username string, opts RequestOptions) (*User, *http.Response, error)
	// PUT /user/{username}
	UpdateUser(ctx context.Context, username string, body *User, opts RequestOptions) error
	// PUT /user/{username}
	UpdateUserWithResponse(ctx context.Context, username string, body *User, opts RequestOptions) (*http.Response, error)
	// DELETE /user/{username}
	DeleteUser(ctx context.Context, username string, opts RequestOptions) error
	// DELETE /user/{username}
	DeleteUserWithResponse(ctx context.Context, username string, opts RequestOptions) (*http.Response, error)
	// POST /profile
	UpdateProfile(ctx context.Context, body *UpdateProfileBody, opts RequestOptions) (*UpdateProfileResponse, error)
	// POST /profile
	UpdateProfileWithResponse(ctx context.Context, body *UpdateProfileBody, opts RequestOptions) (*UpdateProfileResponse, *http.Response, error)
}

type NetHTTPUserAPI struct {
	client *APIClient
}

func NewNetHTTPUserAPI(client *APIClient) *NetHTTPUserAPI {
	return &NetHTTPUserAPI{client: client}
}

// POST /user
func (a *NetHTTPUserAPI) CreateUser(ctx context.Context, body *User, opts RequestOptions) (result *User, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user")
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	payload, err := json.Marshal(body)
	if err != nil {
		err = Wrap(APIErrorKindEncoding, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(payload))
	req.ContentLength = int64(len(payload))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*User](client, req, opts)
}

// POST /user
func (a *NetHTTPUserAPI) CreateUserWithResponse(ctx context.Context, body *User, opts RequestOptions) (result *User, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user")
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	payload, err := json.Marshal(body)
	if err != nil {
		err = Wrap(APIErrorKindEncoding, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(payload))
	req.ContentLength = int64(len(payload))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*User](client, req, opts)
}

// POST /user/createWithList
func (a *NetHTTPUserAPI) CreateUsersWithListInput(ctx context.Context, body *[]User, opts RequestOptions) (result *User, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", "createWithList")
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	payload, err := json.Marshal(body)
	if err != nil {
		err = Wrap(APIErrorKindEncoding, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(payload))
	req.ContentLength = int64(len(payload))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*User](client, req, opts)
}

// POST /user/createWithList
func (a *NetHTTPUserAPI) CreateUsersWithListInputWithResponse(ctx context.Context, body *[]User, opts RequestOptions) (result *User, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", "createWithList")
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	payload, err := json.Marshal(body)
	if err != nil {
		err = Wrap(APIErrorKindEncoding, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(payload))
	req.ContentLength = int64(len(payload))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*User](client, req, opts)
}

// GET /user/login
func (a *NetHTTPUserAPI) LoginUser(ctx context.Context, username *string, password *string, opts RequestOptions) (result string, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", "login")
	q := u.Query()
	URLEncoding.AddScalar(q, "username", username)
	URLEncoding.AddScalar(q, "password", password)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[string](client, req, opts)
}

// GET /user/login
func (a *NetHTTPUserAPI) LoginUserWithResponse(ctx context.Context, username *string, password *string, opts RequestOptions) (result string, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", "login")
	q := u.Query()
	URLEncoding.AddScalar(q, "username", username)
	URLEncoding.AddScalar(q, "password", password)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[string](client, req, opts)
}

// GET /user/logout
func (a *NetHTTPUserAPI) LogoutUser(ctx context.Context, opts RequestOptions) (err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", "logout")
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteUnit(client, req, opts)
}

// GET /user/logout
func (a *NetHTTPUserAPI) LogoutUserWithResponse(ctx context.Context, opts RequestOptions) (resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", "logout")
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteUnitWithResponse(client, req, opts)
}

// GET /user/{username}
func (a *NetHTTPUserAPI) GetUserByName(ctx context.Context, username string, opts RequestOptions) (result *User, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", username)
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*User](client, req, opts)
}

// GET /user/{username}
func (a *NetHTTPUserAPI) GetUserByNameWithResponse(ctx context.Context, username string, opts RequestOptions) (result *User, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", username)
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*User](client, req, opts)
}

// PUT /user/{username}
func (a *NetHTTPUserAPI) UpdateUser(ctx context.Context, username string, body *User, opts RequestOptions) (err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", username)
	req, err := http.NewRequestWithContext(ctx, "PUT", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	payload, err := json.Marshal(body)
	if err != nil {
		err = Wrap(APIErrorKindEncoding, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(payload))
	req.ContentLength = int64(len(payload))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteUnit(client, req, opts)
}

// PUT /user/{username}
func (a *NetHTTPUserAPI) UpdateUserWithResponse(ctx context.Context, username string, body *User, opts RequestOptions) (resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", username)
	req, err := http.NewRequestWithContext(ctx, "PUT", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	payload, err := json.Marshal(body)
	if err != nil {
		err = Wrap(APIErrorKindEncoding, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(payload))
	req.ContentLength = int64(len(payload))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteUnitWithResponse(client, req, opts)
}

// DELETE /user/{username}
func (a *NetHTTPUserAPI) DeleteUser(ctx context.Context, username string, opts RequestOptions) (err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", username)
	req, err := http.NewRequestWithContext(ctx, "DELETE", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteUnit(client, req, opts)
}

// DELETE /user/{username}
func (a *NetHTTPUserAPI) DeleteUserWithResponse(ctx context.Context, username string, opts RequestOptions) (resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "user", username)
	req, err := http.NewRequestWithContext(ctx, "DELETE", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteUnitWithResponse(client, req, opts)
}

// POST /profile
func (a *NetHTTPUserAPI) UpdateProfile(ctx context.Context, body *UpdateProfileBody, opts RequestOptions) (result *UpdateProfileResponse, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "profile")
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	payload, err := json.Marshal(body)
	if err != nil {
		err = Wrap(APIErrorKindEncoding, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(payload))
	req.ContentLength = int64(len(payload))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*UpdateProfileResponse](client, req, opts)
}

// POST /profile
func (a *NetHTTPUserAPI) UpdateProfileWithResponse(ctx context.Context, body *UpdateProfileBody, opts RequestOptions) (result *UpdateProfileResponse, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	baseURL := opts.BaseURL
	if baseURL == "" {
		baseURL = client.BaseURL
	}
	u, err := url.Parse(baseURL)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	u.Path = path.Join(u.Path, "profile")
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	payload, err := json.Marshal(body)
	if err != nil {
		err = Wrap(APIErrorKindEncoding, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(payload))
	req.ContentLength = int64(len(payload))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*UpdateProfileResponse](client, req, opts)
}
