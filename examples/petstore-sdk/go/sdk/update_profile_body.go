package petstore

type UpdateProfileBody struct {
	Name string `json:"name"`
	Nickname *string `json:"nickname,omitempty"`
}
