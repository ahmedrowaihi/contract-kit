package petstore

import (
	"context"
	"net/http"
)

type StoreAPI interface {
	// GET /store/inventory
	GetInventory(ctx context.Context, opts RequestOptions) (map[string]int32, error)
	// GET /store/inventory
	GetInventoryWithResponse(ctx context.Context, opts RequestOptions) (map[string]int32, *http.Response, error)
	// POST /store/order
	PlaceOrder(ctx context.Context, body *Order, opts RequestOptions) (*Order, error)
	// POST /store/order
	PlaceOrderWithResponse(ctx context.Context, body *Order, opts RequestOptions) (*Order, *http.Response, error)
	// GET /store/order/{orderId}
	GetOrderById(ctx context.Context, orderId int64, opts RequestOptions) (*Order, error)
	// GET /store/order/{orderId}
	GetOrderByIdWithResponse(ctx context.Context, orderId int64, opts RequestOptions) (*Order, *http.Response, error)
	// DELETE /store/order/{orderId}
	DeleteOrder(ctx context.Context, orderId int64, opts RequestOptions) error
	// DELETE /store/order/{orderId}
	DeleteOrderWithResponse(ctx context.Context, orderId int64, opts RequestOptions) (*http.Response, error)
	// POST /shapes
	CreateShape(ctx context.Context, body []byte, opts RequestOptions) (*CreateShapeResponse, error)
	// POST /shapes
	CreateShapeWithResponse(ctx context.Context, body []byte, opts RequestOptions) (*CreateShapeResponse, *http.Response, error)
	// POST /measurements
	SubmitMeasurement(ctx context.Context, body *SubmitMeasurementBody, opts RequestOptions) error
	// POST /measurements
	SubmitMeasurementWithResponse(ctx context.Context, body *SubmitMeasurementBody, opts RequestOptions) (*http.Response, error)
}
