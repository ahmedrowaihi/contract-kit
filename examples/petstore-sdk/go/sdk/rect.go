package petstore

type Rect struct {
	Kind RectKind `json:"kind"`
	Width float64 `json:"width"`
	Height float64 `json:"height"`
}
