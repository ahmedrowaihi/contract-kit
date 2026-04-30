package petstore

type Pet struct {
	Id *int64 `json:"id,omitempty"`
	Name string `json:"name"`
	Category *Category `json:"category,omitempty"`
	PhotoUrls []string `json:"photoUrls"`
	Tags []Tag `json:"tags,omitempty"`
	Status *PetStatus `json:"status,omitempty"`
}
