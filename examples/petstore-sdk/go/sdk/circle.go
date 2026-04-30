package petstore

type Circle struct {
	Kind CircleKind `json:"kind"`
	Radius float64 `json:"radius"`
}
