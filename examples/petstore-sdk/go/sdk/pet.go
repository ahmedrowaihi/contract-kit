package petstore

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
)

type PetAPI interface {
	// POST /pet
	AddPet(ctx context.Context, body *Pet, opts RequestOptions) (*Pet, error)
	// POST /pet
	AddPetWithResponse(ctx context.Context, body *Pet, opts RequestOptions) (*Pet, *http.Response, error)
	// PUT /pet
	UpdatePet(ctx context.Context, body *Pet, opts RequestOptions) (*Pet, error)
	// PUT /pet
	UpdatePetWithResponse(ctx context.Context, body *Pet, opts RequestOptions) (*Pet, *http.Response, error)
	// GET /pet/findByStatus
	FindPetsByStatus(ctx context.Context, status FindPetsByStatusParamStatus, opts RequestOptions) ([]Pet, error)
	// GET /pet/findByStatus
	FindPetsByStatusWithResponse(ctx context.Context, status FindPetsByStatusParamStatus, opts RequestOptions) ([]Pet, *http.Response, error)
	// GET /pet/findByTags
	FindPetsByTags(ctx context.Context, tags []string, opts RequestOptions) ([]Pet, error)
	// GET /pet/findByTags
	FindPetsByTagsWithResponse(ctx context.Context, tags []string, opts RequestOptions) ([]Pet, *http.Response, error)
	// GET /pet/{petId}
	GetPetById(ctx context.Context, petId int64, opts RequestOptions) (*Pet, error)
	// GET /pet/{petId}
	GetPetByIdWithResponse(ctx context.Context, petId int64, opts RequestOptions) (*Pet, *http.Response, error)
	// POST /pet/{petId}
	UpdatePetWithForm(ctx context.Context, petId int64, name *string, status *string, opts RequestOptions) (*Pet, error)
	// POST /pet/{petId}
	UpdatePetWithFormWithResponse(ctx context.Context, petId int64, name *string, status *string, opts RequestOptions) (*Pet, *http.Response, error)
	// DELETE /pet/{petId}
	DeletePet(ctx context.Context, petId int64, apiKey *string, opts RequestOptions) error
	// DELETE /pet/{petId}
	DeletePetWithResponse(ctx context.Context, petId int64, apiKey *string, opts RequestOptions) (*http.Response, error)
	// POST /pet/{petId}/uploadImage
	UploadFile(ctx context.Context, petId int64, additionalMetadata *string, body []byte, opts RequestOptions) (*ApiResponse, error)
	// POST /pet/{petId}/uploadImage
	UploadFileWithResponse(ctx context.Context, petId int64, additionalMetadata *string, body []byte, opts RequestOptions) (*ApiResponse, *http.Response, error)
	// POST /pet/{petId}/uploadDocument
	UploadPetDocument(ctx context.Context, petId int64, file []byte, title *string, description *string, opts RequestOptions) (*ApiResponse, error)
	// POST /pet/{petId}/uploadDocument
	UploadPetDocumentWithResponse(ctx context.Context, petId int64, file []byte, title *string, description *string, opts RequestOptions) (*ApiResponse, *http.Response, error)
	// POST /tags
	SubmitTags(ctx context.Context, body *SubmitTagsBody, opts RequestOptions) (*SubmitTagsResponse, error)
	// POST /tags
	SubmitTagsWithResponse(ctx context.Context, body *SubmitTagsBody, opts RequestOptions) (*SubmitTagsResponse, *http.Response, error)
}

type NetHTTPPetAPI struct {
	client *APIClient
}

func NewNetHTTPPetAPI(client *APIClient) *NetHTTPPetAPI {
	return &NetHTTPPetAPI{client: client}
}

// POST /pet
func (a *NetHTTPPetAPI) AddPet(ctx context.Context, body *Pet, opts RequestOptions) (result *Pet, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet")
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
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*Pet](client, req, opts)
}

// POST /pet
func (a *NetHTTPPetAPI) AddPetWithResponse(ctx context.Context, body *Pet, opts RequestOptions) (result *Pet, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet")
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
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*Pet](client, req, opts)
}

// PUT /pet
func (a *NetHTTPPetAPI) UpdatePet(ctx context.Context, body *Pet, opts RequestOptions) (result *Pet, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet")
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
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*Pet](client, req, opts)
}

// PUT /pet
func (a *NetHTTPPetAPI) UpdatePetWithResponse(ctx context.Context, body *Pet, opts RequestOptions) (result *Pet, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet")
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
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*Pet](client, req, opts)
}

// GET /pet/findByStatus
func (a *NetHTTPPetAPI) FindPetsByStatus(ctx context.Context, status FindPetsByStatusParamStatus, opts RequestOptions) (result []Pet, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", "findByStatus")
	q := u.Query()
	URLEncoding.AddScalar(q, "status", status)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[[]Pet](client, req, opts)
}

// GET /pet/findByStatus
func (a *NetHTTPPetAPI) FindPetsByStatusWithResponse(ctx context.Context, status FindPetsByStatusParamStatus, opts RequestOptions) (result []Pet, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", "findByStatus")
	q := u.Query()
	URLEncoding.AddScalar(q, "status", status)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[[]Pet](client, req, opts)
}

// GET /pet/findByTags
func (a *NetHTTPPetAPI) FindPetsByTags(ctx context.Context, tags []string, opts RequestOptions) (result []Pet, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", "findByTags")
	q := u.Query()
	URLEncoding.AddArray(q, "tags", tags, QueryStyleForm, true)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[[]Pet](client, req, opts)
}

// GET /pet/findByTags
func (a *NetHTTPPetAPI) FindPetsByTagsWithResponse(ctx context.Context, tags []string, opts RequestOptions) (result []Pet, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", "findByTags")
	q := u.Query()
	URLEncoding.AddArray(q, "tags", tags, QueryStyleForm, true)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[[]Pet](client, req, opts)
}

// GET /pet/{petId}
func (a *NetHTTPPetAPI) GetPetById(ctx context.Context, petId int64, opts RequestOptions) (result *Pet, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", url.PathEscape(fmt.Sprint(petId)))
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for _, name := range []string{"api_key", "petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*Pet](client, req, opts)
}

// GET /pet/{petId}
func (a *NetHTTPPetAPI) GetPetByIdWithResponse(ctx context.Context, petId int64, opts RequestOptions) (result *Pet, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", url.PathEscape(fmt.Sprint(petId)))
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for _, name := range []string{"api_key", "petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*Pet](client, req, opts)
}

// POST /pet/{petId}
func (a *NetHTTPPetAPI) UpdatePetWithForm(ctx context.Context, petId int64, name *string, status *string, opts RequestOptions) (result *Pet, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", url.PathEscape(fmt.Sprint(petId)))
	q := u.Query()
	URLEncoding.AddScalar(q, "name", name)
	URLEncoding.AddScalar(q, "status", status)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*Pet](client, req, opts)
}

// POST /pet/{petId}
func (a *NetHTTPPetAPI) UpdatePetWithFormWithResponse(ctx context.Context, petId int64, name *string, status *string, opts RequestOptions) (result *Pet, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", url.PathEscape(fmt.Sprint(petId)))
	q := u.Query()
	URLEncoding.AddScalar(q, "name", name)
	URLEncoding.AddScalar(q, "status", status)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*Pet](client, req, opts)
}

// DELETE /pet/{petId}
func (a *NetHTTPPetAPI) DeletePet(ctx context.Context, petId int64, apiKey *string, opts RequestOptions) (err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", url.PathEscape(fmt.Sprint(petId)))
	req, err := http.NewRequestWithContext(ctx, "DELETE", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	if apiKey != nil {
		req.Header.Set("api_key", fmt.Sprint(*apiKey))
	}
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteUnit(client, req, opts)
}

// DELETE /pet/{petId}
func (a *NetHTTPPetAPI) DeletePetWithResponse(ctx context.Context, petId int64, apiKey *string, opts RequestOptions) (resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", url.PathEscape(fmt.Sprint(petId)))
	req, err := http.NewRequestWithContext(ctx, "DELETE", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	if apiKey != nil {
		req.Header.Set("api_key", fmt.Sprint(*apiKey))
	}
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteUnitWithResponse(client, req, opts)
}

// POST /pet/{petId}/uploadImage
func (a *NetHTTPPetAPI) UploadFile(ctx context.Context, petId int64, additionalMetadata *string, body []byte, opts RequestOptions) (result *ApiResponse, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", url.PathEscape(fmt.Sprint(petId)), "uploadImage")
	q := u.Query()
	URLEncoding.AddScalar(q, "additionalMetadata", additionalMetadata)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(body))
	req.ContentLength = int64(len(body))
	req.Header.Set("Content-Type", "application/octet-stream")
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*ApiResponse](client, req, opts)
}

// POST /pet/{petId}/uploadImage
func (a *NetHTTPPetAPI) UploadFileWithResponse(ctx context.Context, petId int64, additionalMetadata *string, body []byte, opts RequestOptions) (result *ApiResponse, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", url.PathEscape(fmt.Sprint(petId)), "uploadImage")
	q := u.Query()
	URLEncoding.AddScalar(q, "additionalMetadata", additionalMetadata)
	u.RawQuery = q.Encode()
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(body))
	req.ContentLength = int64(len(body))
	req.Header.Set("Content-Type", "application/octet-stream")
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*ApiResponse](client, req, opts)
}

// POST /pet/{petId}/uploadDocument
func (a *NetHTTPPetAPI) UploadPetDocument(ctx context.Context, petId int64, file []byte, title *string, description *string, opts RequestOptions) (result *ApiResponse, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", url.PathEscape(fmt.Sprint(petId)), "uploadDocument")
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	multipart := NewMultipartFormBody()
	multipart.AppendFile("file", "file", file)
	if title != nil {
		multipart.AppendText("title", fmt.Sprint(*title))
	}
	if description != nil {
		multipart.AppendText("description", fmt.Sprint(*description))
	}
	payload := multipart.Bytes()
	req.Header.Set("Content-Type", multipart.ContentType())
	req.Body = io.NopCloser(bytes.NewReader(payload))
	req.ContentLength = int64(len(payload))
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*ApiResponse](client, req, opts)
}

// POST /pet/{petId}/uploadDocument
func (a *NetHTTPPetAPI) UploadPetDocumentWithResponse(ctx context.Context, petId int64, file []byte, title *string, description *string, opts RequestOptions) (result *ApiResponse, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "pet", url.PathEscape(fmt.Sprint(petId)), "uploadDocument")
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	multipart := NewMultipartFormBody()
	multipart.AppendFile("file", "file", file)
	if title != nil {
		multipart.AppendText("title", fmt.Sprint(*title))
	}
	if description != nil {
		multipart.AppendText("description", fmt.Sprint(*description))
	}
	payload := multipart.Bytes()
	req.Header.Set("Content-Type", multipart.ContentType())
	req.Body = io.NopCloser(bytes.NewReader(payload))
	req.ContentLength = int64(len(payload))
	for _, name := range []string{"petstore_auth"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*ApiResponse](client, req, opts)
}

// POST /tags
func (a *NetHTTPPetAPI) SubmitTags(ctx context.Context, body *SubmitTagsBody, opts RequestOptions) (result *SubmitTagsResponse, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "tags")
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
	return Execute[*SubmitTagsResponse](client, req, opts)
}

// POST /tags
func (a *NetHTTPPetAPI) SubmitTagsWithResponse(ctx context.Context, body *SubmitTagsBody, opts RequestOptions) (result *SubmitTagsResponse, resp *http.Response, err error) {
	client := opts.Client
	if client == nil {
		client = a.client
	}
	if client == nil {
		err = Wrap(APIErrorKindTransport, errors.New("APIClient is nil"))
		return
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
	u.Path = path.Join(u.Path, "tags")
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
	return ExecuteWithResponse[*SubmitTagsResponse](client, req, opts)
}
