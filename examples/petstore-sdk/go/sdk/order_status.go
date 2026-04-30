package petstore

type OrderStatus string

const (
	OrderStatusPlaced OrderStatus = "placed"
	OrderStatusApproved OrderStatus = "approved"
	OrderStatusDelivered OrderStatus = "delivered"
)
