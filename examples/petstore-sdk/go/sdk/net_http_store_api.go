package petstore

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
)

type NetHTTPStoreAPI struct {
	client *APIClient
}

func NewNetHTTPStoreAPI(client *APIClient) *NetHTTPStoreAPI {
	return &NetHTTPStoreAPI{client: client}
}

// GET /store/inventory
func (a *NetHTTPStoreAPI) GetInventory(ctx context.Context, opts RequestOptions) (result map[string]int32, err error) {
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
	u.Path = path.Join(u.Path, "store", "inventory")
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for _, name := range []string{"api_key"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[map[string]int32](client, req, opts)
}

// GET /store/inventory
func (a *NetHTTPStoreAPI) GetInventoryWithResponse(ctx context.Context, opts RequestOptions) (result map[string]int32, resp *http.Response, err error) {
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
	u.Path = path.Join(u.Path, "store", "inventory")
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for _, name := range []string{"api_key"} {
		auth, ok := client.Auth[name]
		if ok {
			u = auth.Apply(req, u)
		}
	}
	req.URL = u
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[map[string]int32](client, req, opts)
}

// POST /store/order
func (a *NetHTTPStoreAPI) PlaceOrder(ctx context.Context, body *Order, opts RequestOptions) (result *Order, err error) {
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
	u.Path = path.Join(u.Path, "store", "order")
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
	return Execute[*Order](client, req, opts)
}

// POST /store/order
func (a *NetHTTPStoreAPI) PlaceOrderWithResponse(ctx context.Context, body *Order, opts RequestOptions) (result *Order, resp *http.Response, err error) {
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
	u.Path = path.Join(u.Path, "store", "order")
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
	return ExecuteWithResponse[*Order](client, req, opts)
}

// GET /store/order/{orderId}
func (a *NetHTTPStoreAPI) GetOrderById(ctx context.Context, orderId int64, opts RequestOptions) (result *Order, err error) {
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
	u.Path = path.Join(u.Path, "store", "order", fmt.Sprint(orderId))
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*Order](client, req, opts)
}

// GET /store/order/{orderId}
func (a *NetHTTPStoreAPI) GetOrderByIdWithResponse(ctx context.Context, orderId int64, opts RequestOptions) (result *Order, resp *http.Response, err error) {
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
	u.Path = path.Join(u.Path, "store", "order", fmt.Sprint(orderId))
	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*Order](client, req, opts)
}

// DELETE /store/order/{orderId}
func (a *NetHTTPStoreAPI) DeleteOrder(ctx context.Context, orderId int64, opts RequestOptions) (err error) {
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
	u.Path = path.Join(u.Path, "store", "order", fmt.Sprint(orderId))
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

// DELETE /store/order/{orderId}
func (a *NetHTTPStoreAPI) DeleteOrderWithResponse(ctx context.Context, orderId int64, opts RequestOptions) (resp *http.Response, err error) {
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
	u.Path = path.Join(u.Path, "store", "order", fmt.Sprint(orderId))
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

// POST /shapes
func (a *NetHTTPStoreAPI) CreateShape(ctx context.Context, body []byte, opts RequestOptions) (result *CreateShapeResponse, err error) {
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
	u.Path = path.Join(u.Path, "shapes")
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(body))
	req.ContentLength = int64(len(body))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return Execute[*CreateShapeResponse](client, req, opts)
}

// POST /shapes
func (a *NetHTTPStoreAPI) CreateShapeWithResponse(ctx context.Context, body []byte, opts RequestOptions) (result *CreateShapeResponse, resp *http.Response, err error) {
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
	u.Path = path.Join(u.Path, "shapes")
	req, err := http.NewRequestWithContext(ctx, "POST", u.String(), nil)
	if err != nil {
		err = Wrap(APIErrorKindTransport, err)
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(body))
	req.ContentLength = int64(len(body))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	return ExecuteWithResponse[*CreateShapeResponse](client, req, opts)
}

// POST /measurements
func (a *NetHTTPStoreAPI) SubmitMeasurement(ctx context.Context, body *SubmitMeasurementBody, opts RequestOptions) (err error) {
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
	u.Path = path.Join(u.Path, "measurements")
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
	return ExecuteUnit(client, req, opts)
}

// POST /measurements
func (a *NetHTTPStoreAPI) SubmitMeasurementWithResponse(ctx context.Context, body *SubmitMeasurementBody, opts RequestOptions) (resp *http.Response, err error) {
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
	u.Path = path.Join(u.Path, "measurements")
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
	return ExecuteUnitWithResponse(client, req, opts)
}
