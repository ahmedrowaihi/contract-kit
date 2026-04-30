package petstore

import "time"

type CircleKind string

const (
	CircleKindCircle CircleKind = "circle"
)

type Circle struct {
	Kind CircleKind `json:"kind"`
	Radius float64 `json:"radius"`
}

type RectKind string

const (
	RectKindRect RectKind = "rect"
)

type Rect struct {
	Kind RectKind `json:"kind"`
	Width float64 `json:"width"`
	Height float64 `json:"height"`
}

type OrderStatus string

const (
	OrderStatusPlaced OrderStatus = "placed"
	OrderStatusApproved OrderStatus = "approved"
	OrderStatusDelivered OrderStatus = "delivered"
)

type Order struct {
	Id *int64 `json:"id,omitempty"`
	PetId *int64 `json:"petId,omitempty"`
	Quantity *int32 `json:"quantity,omitempty"`
	ShipDate *time.Time `json:"shipDate,omitempty"`
	Status *OrderStatus `json:"status,omitempty"`
	Complete *bool `json:"complete,omitempty"`
}

type Category struct {
	Id *int64 `json:"id,omitempty"`
	Name *string `json:"name,omitempty"`
}

type User struct {
	Id *int64 `json:"id,omitempty"`
	Username *string `json:"username,omitempty"`
	FirstName *string `json:"firstName,omitempty"`
	LastName *string `json:"lastName,omitempty"`
	Email *string `json:"email,omitempty"`
	Password *string `json:"password,omitempty"`
	Phone *string `json:"phone,omitempty"`
	UserStatus *int32 `json:"userStatus,omitempty"`
}

type Tag struct {
	Id *int64 `json:"id,omitempty"`
	Name *string `json:"name,omitempty"`
}

type PetStatus string

const (
	PetStatusAvailable PetStatus = "available"
	PetStatusPending PetStatus = "pending"
	PetStatusSold PetStatus = "sold"
)

type Pet struct {
	Id *int64 `json:"id,omitempty"`
	Name string `json:"name"`
	Category *Category `json:"category,omitempty"`
	PhotoUrls []string `json:"photoUrls"`
	Tags []Tag `json:"tags,omitempty"`
	Status *PetStatus `json:"status,omitempty"`
}

type ApiResponse struct {
	Code *int32 `json:"code,omitempty"`
	Type *string `json:"type,omitempty"`
	Message *string `json:"message,omitempty"`
}

type FindPetsByStatusParamStatus string

const (
	FindPetsByStatusParamStatusAvailable FindPetsByStatusParamStatus = "available"
	FindPetsByStatusParamStatusPending FindPetsByStatusParamStatus = "pending"
	FindPetsByStatusParamStatusSold FindPetsByStatusParamStatus = "sold"
)

type SubmitTagsBody struct {
	Tags []string `json:"tags"`
}

type SubmitTagsResponse struct {
	Count *int32 `json:"count,omitempty"`
}

type UpdateProfileBody struct {
	Name string `json:"name"`
	Nickname *string `json:"nickname,omitempty"`
}

type UpdateProfileResponse struct {
	Ok *bool `json:"ok,omitempty"`
}

type CreateShapeResponse struct {
	Id *string `json:"id,omitempty"`
}

type SubmitMeasurementBody struct {
	Value float64 `json:"value"`
}
